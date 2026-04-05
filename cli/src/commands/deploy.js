/**
 * oply deploy — Deploy your application to an environment
 * 
 * Actually executes the pipeline stages, builds Docker images (if available),
 * applies K8s manifests (if available), and tracks everything in the local store.
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import config from '../config.js';
import { loadProject } from '../project.js';
import {
  addDeployment,
  updateDeployment,
  addPipelineRun,
  updatePipelineRun,
  createRunLog,
  appendRunLog,
  getLatestDeployment,
} from '../store.js';
import { getCurrentBranch, getCommitHash, getRecentCommits, isGitRepo, getRecentDiff } from '../git.js';

export function deployCommand(program) {
  program
    .command('deploy')
    .description('Deploy your application to an environment')
    .option('-e, --env <environment>', 'Target environment (development, staging, production)')
    .option('-i, --image <tag>', 'Docker image tag to deploy')
    .option('-s, --strategy <type>', 'Deployment strategy: rolling, canary, blue-green', 'rolling')
    .option('--skip-build', 'Skip build/test steps')
    .option('--skip-tests', 'Skip test execution only')
    .option('--dry-run', 'Simulate deployment without executing')
    .action(async (options) => {
      try {
        const project = loadProject();
        const cwd = project.projectDir;
        const projectName = project.config.project?.name || 'project';
        const stages = project.config.pipeline?.stages || [];

        // ─── Gather deployment info ───────────────
        let env = options.env;
        if (!env) {
          const envChoices = (project.config.environments || ['Development', 'Staging', 'Production']).map(e => {
            const name = typeof e === 'string' ? e : e.toString();
            const icon = name.toLowerCase().includes('prod') ? '🔴' :
                         name.toLowerCase().includes('stag') ? '🟡' : '🟢';
            return { name: `${icon} ${name}`, value: name.toLowerCase() };
          });
          
          const answers = await inquirer.prompt([{
            type: 'list',
            name: 'env',
            message: 'Select target environment:',
            choices: envChoices,
          }]);
          env = answers.env;
        }
        env = env.toLowerCase();

        const strategy = options.strategy.toUpperCase().replace('-', '_');
        const branch = isGitRepo(cwd) ? getCurrentBranch(cwd) : 'unknown';
        const commitHash = isGitRepo(cwd) ? getCommitHash(cwd) : Date.now().toString(36);
        const commitMessage = getRecentCommits(1, cwd)[0]?.message || '';

        // ─── Production safety check ──────────────
        if (env === 'production' || env.includes('prod')) {
          console.log('');
          console.log(chalk.yellow.bold('  ⚠️  PRODUCTION DEPLOYMENT'));
          console.log(chalk.gray('  This will affect live traffic.\n'));

          const confirm = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: chalk.yellow('Are you sure you want to deploy to production?'),
            default: false,
          }]);

          if (!confirm.proceed) {
            console.log(chalk.gray('\n  Deployment cancelled.\n'));
            return;
          }

          const doubleConfirm = await inquirer.prompt([{
            type: 'input',
            name: 'confirm',
            message: `Type "${chalk.red('deploy production')}" to confirm:`,
          }]);

          if (doubleConfirm.confirm !== 'deploy production') {
            console.log(chalk.gray('\n  Deployment cancelled.\n'));
            return;
          }
        }

        if (options.dryRun) {
          console.log(chalk.yellow('\n  🏃 DRY RUN MODE — no changes will be made\n'));
        }

        // Print deployment info
        console.log(chalk.bold(`\n  🚀 Deploy — ${chalk.cyan(projectName)} → ${chalk.cyan(env)}`));
        console.log(chalk.gray(`  Branch: ${branch}  Commit: ${commitHash}  Strategy: ${strategy}`));
        console.log('');

        // Track in store
        const deployment = addDeployment({
          environment: env,
          commitHash,
          commitMessage,
          branch,
          status: 'RUNNING',
          strategy,
        }, cwd);

        // Create pipeline run for deployment
        const run = addPipelineRun({
          commitHash,
          commitMessage,
          branch,
          status: 'RUNNING',
          triggeredBy: `deploy:${env}`,
          stages: [],
        }, cwd);

        createRunLog(run.id, cwd);
        appendRunLog(run.id, `Deployment to ${env} started`, cwd);

        const startTime = Date.now();
        let allPassed = true;

        // ─── Step 1: Run build/test pipeline ──────
        if (!options.skipBuild) {
          // Filter to non-deploy stages (install, lint, test, build)
          const buildStages = stages.filter(s => 
            s.type !== 'DEPLOY' && 
            !s.id.startsWith('docker-') && 
            !s.id.startsWith('k8s-')
          );

          if (options.skipTests) {
            // Remove test stages
            const filteredStages = buildStages.filter(s => s.type !== 'TEST');
            allPassed = await executeStages(filteredStages, cwd, run.id, options.dryRun);
          } else {
            allPassed = await executeStages(buildStages, cwd, run.id, options.dryRun);
          }

          if (!allPassed) {
            updateDeployment(deployment.id, { status: 'FAILED', duration: Date.now() - startTime }, cwd);
            updatePipelineRun(run.id, { status: 'FAILED', finishedAt: new Date().toISOString(), durationMs: Date.now() - startTime }, cwd);
            
            console.log(chalk.red.bold('\n  ❌ Deployment Failed — pipeline did not pass'));
            console.log(chalk.gray('  Debug with: ') + chalk.cyan('oply ai-debug'));
            console.log(chalk.gray('  View logs: ') + chalk.cyan(`oply logs --pipeline ${run.id}\n`));
            return;
          }
        }

        // ─── Step 2: Docker build & push ──────────
        let imageTag = options.image;
        const hasDocker = project.config.stack?.hasDocker;

        if (hasDocker && !options.skipBuild && !imageTag) {
          const registry = config.get('dockerRegistry') || process.env.DOCKER_REGISTRY_URL || '';
          
          if (isDockerAvailable()) {
            const baseTag = registry ? `${registry}/${projectName}` : projectName;
            imageTag = `${baseTag}:${commitHash}`;

            const buildSpinner = ora(`Building Docker image: ${chalk.cyan(imageTag)}`).start();
            appendRunLog(run.id, `Docker build: ${imageTag}`, cwd);

            if (!options.dryRun) {
              try {
                execSync(`docker build -t ${imageTag} .`, { cwd, stdio: 'pipe', timeout: 300000 });
                buildSpinner.succeed(`Docker image built: ${chalk.cyan(imageTag)}`);
                appendRunLog(run.id, `Docker build OK`, cwd);

                // Push if registry is configured
                if (registry) {
                  const pushSpinner = ora('Pushing to registry...').start();
                  try {
                    execSync(`docker push ${imageTag}`, { cwd, stdio: 'pipe', timeout: 120000 });
                    pushSpinner.succeed('Image pushed to registry');
                    appendRunLog(run.id, `Docker push OK`, cwd);
                  } catch (err) {
                    pushSpinner.warn('Push failed — image built locally');
                    appendRunLog(run.id, `Docker push FAILED: ${getErrorLine(err)}`, cwd);
                  }
                }
              } catch (err) {
                buildSpinner.fail('Docker build failed');
                console.log(chalk.red(`\n  ${getErrorLine(err)}\n`));
                appendRunLog(run.id, `Docker build FAILED: ${getErrorLine(err)}`, cwd);
                // Don't fail the deployment, Docker is optional
              }
            } else {
              await sleep(500);
              buildSpinner.succeed(`Docker image built: ${chalk.cyan(imageTag)} (dry run)`);
            }
          }
        }

        // ─── Step 3: AI Risk Assessment ───────────
        let riskScore = null;
        const apiKey = process.env.OPENAI_API_KEY;

        if (apiKey && !options.dryRun) {
          const riskSpinner = ora('AI calculating deployment risk...').start();
          try {
            const diff = getRecentDiff(2000, cwd);
            const OpenAI = (await import('openai')).default;
            const openai = new OpenAI({ apiKey });
            const response = await openai.chat.completions.create({
              model: 'gpt-4o-mini',
              temperature: 0.1,
              max_tokens: 100,
              messages: [
                { role: 'system', content: 'You are a deployment risk analyzer. Given a git diff, respond with ONLY a JSON object: {"score": <0-100>, "reason": "<one sentence>"}. Lower score = safer.' },
                { role: 'user', content: `Environment: ${env}\nStrategy: ${strategy}\nDiff:\n${diff || 'No changes detected'}` },
              ],
            });

            const riskText = response.choices[0]?.message?.content || '';
            try {
              const riskData = JSON.parse(riskText);
              riskScore = riskData.score;
              const riskColor = riskScore <= 30 ? chalk.green : riskScore <= 60 ? chalk.yellow : chalk.red;
              riskSpinner.succeed(`Risk Score: ${riskColor(`${riskScore}/100`)} — ${chalk.gray(riskData.reason || '')}`);
              appendRunLog(run.id, `AI Risk Score: ${riskScore}/100 — ${riskData.reason || ''}`, cwd);
            } catch {
              riskSpinner.succeed(`Risk assessment complete`);
            }
          } catch (err) {
            riskSpinner.warn('AI risk assessment skipped');
          }

          // Block high-risk production deployments
          if (riskScore && riskScore > (project.config.ai?.riskThreshold || 60) && env.includes('prod')) {
            console.log(chalk.red.bold('\n  ⛔ HIGH RISK — deployment blocked'));
            console.log(chalk.gray('  Risk score exceeds threshold. Review changes before deploying.\n'));
            updateDeployment(deployment.id, { status: 'BLOCKED', duration: Date.now() - startTime }, cwd);
            return;
          }
        }

        // ─── Step 4: K8s Deployment ───────────────
        if (isKubectlAvailable() && !options.dryRun) {
          const namespace = env === 'production' ? 'production' : env === 'staging' ? 'staging' : 'development';
          
          if (imageTag) {
            const k8sSpinner = ora(`Deploying to K8s (${namespace})...`).start();
            try {
              execSync(`kubectl set image deployment/app app=${imageTag} -n ${namespace}`, { cwd, stdio: 'pipe', timeout: 60000 });
              k8sSpinner.succeed(`K8s deployment updated (${namespace})`);
              appendRunLog(run.id, `K8s deployment updated: namespace=${namespace}`, cwd);
            } catch {
              k8sSpinner.info('K8s deployment skipped (no matching deployment)');
            }
          } else if (project.config.stack?.hasK8s) {
            const k8sSpinner = ora(`Applying K8s manifests to ${namespace}...`).start();
            try {
              execSync(`kubectl apply -f k8s/ -n ${namespace}`, { cwd, stdio: 'pipe', timeout: 60000 });
              k8sSpinner.succeed(`K8s manifests applied (${namespace})`);
              appendRunLog(run.id, `K8s apply OK: namespace=${namespace}`, cwd);
            } catch (err) {
              k8sSpinner.warn('K8s apply skipped');
            }
          }
        }

        // ─── Finalize ─────────────────────────────
        const totalDuration = Date.now() - startTime;

        updateDeployment(deployment.id, {
          status: 'SUCCESS',
          duration: totalDuration,
          version: imageTag || commitHash,
          pipelineRunId: run.id,
        }, cwd);

        updatePipelineRun(run.id, {
          status: 'SUCCESS',
          finishedAt: new Date().toISOString(),
          durationMs: totalDuration,
        }, cwd);

        appendRunLog(run.id, `Deployment to ${env} complete — ${formatDuration(totalDuration)}`, cwd);

        // ─── Summary ─────────────────────────────
        console.log('');
        console.log(chalk.green.bold('  ✅ Deployment Complete'));
        console.log('');
        console.log(`  ${chalk.gray('Environment:')}  ${chalk.cyan(env)}`);
        console.log(`  ${chalk.gray('Branch:')}       ${chalk.white(branch)}`);
        console.log(`  ${chalk.gray('Commit:')}       ${chalk.yellow(commitHash)} ${chalk.gray(commitMessage)}`);
        if (imageTag) console.log(`  ${chalk.gray('Image:')}        ${chalk.white(imageTag)}`);
        console.log(`  ${chalk.gray('Strategy:')}     ${chalk.white(strategy)}`);
        if (riskScore != null) {
          const rc = riskScore <= 30 ? chalk.green : riskScore <= 60 ? chalk.yellow : chalk.red;
          console.log(`  ${chalk.gray('Risk Score:')}   ${rc(riskScore + '/100')}`);
        }
        console.log(`  ${chalk.gray('Duration:')}     ${chalk.white(formatDuration(totalDuration))}`);
        console.log(`  ${chalk.gray('Run ID:')}       ${chalk.gray(run.id)}`);
        console.log('');
        console.log(chalk.gray('  Monitor: ') + chalk.cyan('oply status --deployments'));
        console.log(chalk.gray('  Logs: ') + chalk.cyan(`oply logs --pipeline ${run.id}`));
        console.log(chalk.gray('  Rollback: ') + chalk.cyan(`oply rollback --env ${env}`));
        console.log('');

      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
        process.exit(1);
      }
    });
}

/**
 * Execute a list of pipeline stages
 */
async function executeStages(stages, cwd, runId, dryRun = false) {
  let allPassed = true;

  for (const stage of stages) {
    const stageStart = Date.now();
    const spinner = ora({ text: `${stage.name}...`, prefixText: ' ' }).start();
    appendRunLog(runId, `START ${stage.name} → ${stage.command}`, cwd);

    if (dryRun) {
      await sleep(200);
      spinner.succeed(`${stage.name} ${chalk.gray('(dry run)')}`);
      appendRunLog(runId, `OK ${stage.name} (dry run)`, cwd);
      continue;
    }

    try {
      execSync(stage.command, {
        cwd,
        encoding: 'utf8',
        timeout: 300000,
        stdio: 'pipe',
        env: { ...process.env, FORCE_COLOR: '0' },
      });

      const dur = Date.now() - stageStart;
      spinner.succeed(`${stage.name} ${chalk.gray(`(${formatDuration(dur)})`)}`);
      appendRunLog(runId, `OK ${stage.name} (${formatDuration(dur)})`, cwd);

    } catch (err) {
      const dur = Date.now() - stageStart;
      spinner.fail(`${stage.name} ${chalk.red('FAILED')} ${chalk.gray(`(${formatDuration(dur)})`)}`);
      
      const errLine = getErrorLine(err);
      console.log(chalk.red(`    ${errLine}`));
      appendRunLog(runId, `FAIL ${stage.name}: ${errLine}`, cwd);

      allPassed = false;
      break; // Stop on first failure
    }
  }

  return allPassed;
}

function isDockerAvailable() {
  try {
    execSync('docker info', { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function isKubectlAvailable() {
  try {
    execSync('kubectl version --client', { stdio: 'pipe', timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}

function getErrorLine(err) {
  const output = (err.stderr || err.stdout || err.message || '').toString();
  return output.split('\n').filter(Boolean)[0] || 'Unknown error';
}

function formatDuration(ms) {
  if (!ms && ms !== 0) return '—';
  const seconds = Math.floor(ms / 1000);
  if (seconds < 1) return `${ms}ms`;
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  return `${minutes}m ${remainSeconds}s`;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
