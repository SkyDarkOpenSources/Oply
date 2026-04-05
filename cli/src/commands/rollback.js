/**
 * oply rollback — Rollback deployments to previous versions
 * 
 * Supports:
 * 1. Git-based rollback (revert commits) — works everywhere
 * 2. K8s rollback (kubectl rollout undo) — when kubectl is available
 * 3. Shows deployment history from local store for informed decisions
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import Table from 'cli-table3';
import { loadProject } from '../project.js';
import {
  getDeployments,
  getLatestDeployment,
  addDeployment,
  addRollback,
} from '../store.js';
import {
  getCurrentBranch,
  getCommitHash,
  getRecentCommits,
  getCommitsBetween,
  gitRevert,
  isGitRepo,
  isClean,
} from '../git.js';

export function rollbackCommand(program) {
  program
    .command('rollback')
    .description('Rollback a deployment to a previous version')
    .option('-e, --env <environment>', 'Target environment')
    .option('-d, --deployment <name>', 'K8s deployment name')
    .option('-n, --namespace <ns>', 'Kubernetes namespace')
    .option('--revision <n>', 'K8s revision to rollback to')
    .option('--to-commit <hash>', 'Git commit hash to rollback to')
    .option('--k8s', 'Force Kubernetes rollback method')
    .option('--git', 'Force git revert method')
    .action(async (options) => {
      try {
        const project = loadProject();
        const cwd = project.projectDir;
        const projectName = project.config.project?.name || 'project';

        // ─── Select environment ───────────────────
        let env = options.env;
        if (!env) {
          const envChoices = (project.config.environments || ['Development', 'Staging', 'Production']).map(e => {
            const name = typeof e === 'string' ? e.toLowerCase() : e.toString().toLowerCase();
            return { name: name, value: name };
          });

          const answer = await inquirer.prompt([{
            type: 'list',
            name: 'env',
            message: 'Rollback which environment?',
            choices: envChoices,
          }]);
          env = answer.env;
        }
        env = env.toLowerCase();

        console.log(chalk.bold(`\n  ↩️  Rollback — ${chalk.cyan(projectName)} (${chalk.yellow(env)})\n`));

        // ─── Production safety ────────────────────
        if (env === 'production' || env.includes('prod')) {
          console.log(chalk.yellow.bold('  ⚠️  PRODUCTION ROLLBACK'));
          const confirm = await inquirer.prompt([{
            type: 'input',
            name: 'confirm',
            message: `Type "${chalk.red('rollback production')}" to confirm:`,
          }]);
          if (confirm.confirm !== 'rollback production') {
            console.log(chalk.gray('\n  Rollback cancelled.\n'));
            return;
          }
          console.log('');
        }

        // ─── Show deployment history ──────────────
        const deployments = getDeployments(cwd).filter(d => d.environment === env);

        if (deployments.length === 0) {
          console.log(chalk.yellow('  No deployment history found for this environment.'));
          console.log(chalk.gray('  Deploy first with: ') + chalk.cyan(`oply deploy --env ${env}\n`));
          
          if (options.k8s || options.deployment) {
            await doK8sRollback(options, env, cwd);
          }
          return;
        }

        console.log(chalk.bold('  Deployment History:'));
        const table = new Table({
          head: [
            chalk.gray('#'),
            chalk.gray('Status'),
            chalk.gray('Commit'),
            chalk.gray('Message'),
            chalk.gray('Branch'),
            chalk.gray('Time'),
          ],
          style: { head: [], border: ['gray'] },
          chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        });

        deployments.slice(0, 10).forEach((d, i) => {
          const icon = d.status === 'SUCCESS' ? chalk.green('✓') :
                       d.status === 'FAILED' ? chalk.red('✗') :
                       d.status === 'ROLLED_BACK' ? chalk.red('↩') :
                       chalk.yellow('●');
          table.push([
            chalk.gray(i === 0 ? 'current' : `${i} ago`),
            icon + ' ' + chalk.gray(d.status),
            chalk.yellow(d.commitHash?.slice(0, 7) || '—'),
            chalk.white((d.commitMessage || '').slice(0, 30)),
            chalk.gray(d.branch || '—'),
            chalk.gray(timeAgo(d.timestamp)),
          ]);
        });
        console.log(table.toString());
        console.log('');

        // ─── Determine rollback method ────────────
        if (options.k8s || options.deployment) {
          await doK8sRollback(options, env, cwd);
          return;
        }

        // Choose rollback target
        let targetCommit = options.toCommit;
        
        if (!targetCommit) {
          if (deployments.length < 2) {
            console.log(chalk.yellow('  Only one deployment — nothing to rollback to.'));
            
            // Offer git-based rollback
            if (isGitRepo(cwd)) {
              const commits = getRecentCommits(5, cwd);
              if (commits.length > 1) {
                const { useGit } = await inquirer.prompt([{
                  type: 'confirm',
                  name: 'useGit',
                  message: 'Would you like to revert the last git commit instead?',
                  default: false,
                }]);
                if (useGit) {
                  targetCommit = commits[1].hash;
                } else {
                  console.log('');
                  return;
                }
              }
            }
            if (!targetCommit) return;
          } else {
            // Let user pick from deployment history
            const choices = deployments.slice(1, 10).map((d, i) => ({
              name: `${chalk.yellow(d.commitHash?.slice(0, 7))} — ${d.commitMessage || 'no message'} (${timeAgo(d.timestamp)})`,
              value: d.commitHash,
            }));

            const { target } = await inquirer.prompt([{
              type: 'list',
              name: 'target',
              message: 'Rollback to which deployment?',
              choices,
            }]);
            targetCommit = target;
          }
        }

        if (!targetCommit) {
          console.log(chalk.red('\n  No rollback target specified.\n'));
          return;
        }

        // ─── Execute git rollback ─────────────────
        const currentCommit = getCommitHash(cwd);
        console.log(chalk.gray(`  Rolling back: ${currentCommit} → ${targetCommit.slice(0, 7)}`));

        if (!isClean(cwd)) {
          console.log(chalk.yellow('\n  ⚠ Working tree has uncommitted changes.'));
          const { stash } = await inquirer.prompt([{
            type: 'confirm',
            name: 'stash',
            message: 'Stash changes and continue?',
            default: true,
          }]);
          if (!stash) {
            console.log(chalk.gray('\n  Rollback cancelled.\n'));
            return;
          }
          try {
            execSync('git stash', { cwd, stdio: 'pipe' });
            console.log(chalk.gray('  Changes stashed.'));
          } catch {
            console.log(chalk.red('  Failed to stash changes.\n'));
            return;
          }
        }

        const spinner = ora(`Reverting to ${targetCommit.slice(0, 7)}...`).start();

        try {
          // Get commits between target and current
          const commits = getCommitsBetween(targetCommit, 'HEAD', cwd);

          if (commits.length === 0) {
            spinner.info('Already at target commit');
          } else if (commits.length === 1) {
            // Single commit revert
            gitRevert(commits[0].hash, cwd);
            spinner.succeed(`Reverted commit ${chalk.yellow(commits[0].shortHash)}: ${commits[0].message}`);
          } else {
            // Revert each commit from newest to oldest
            for (let i = 0; i < commits.length; i++) {
              spinner.text = `Reverting ${i + 1}/${commits.length}: ${commits[i].shortHash}...`;
              gitRevert(commits[i].hash, cwd);
            }
            spinner.succeed(`Reverted ${commits.length} commits back to ${chalk.yellow(targetCommit.slice(0, 7))}`);
          }

          // Record rollback
          addRollback({
            environment: env,
            fromCommit: currentCommit,
            toCommit: targetCommit.slice(0, 7),
            method: 'git',
            status: 'SUCCESS',
          }, cwd);

          // Record as new deployment
          addDeployment({
            environment: env,
            commitHash: targetCommit.slice(0, 7),
            commitMessage: `Rollback from ${currentCommit}`,
            branch: getCurrentBranch(cwd),
            status: 'ROLLED_BACK',
            strategy: 'ROLLBACK',
          }, cwd);

          console.log(chalk.green.bold('\n  ✅ Rollback Complete'));
          console.log('');
          console.log(`  ${chalk.gray('From:')}  ${chalk.red(currentCommit)}`);
          console.log(`  ${chalk.gray('To:')}    ${chalk.green(targetCommit.slice(0, 7))}`);
          console.log(`  ${chalk.gray('Env:')}   ${chalk.cyan(env)}`);
          console.log('');
          console.log(chalk.gray('  Monitor: ') + chalk.cyan('oply status --deployments'));
          console.log(chalk.gray('  Unstash: ') + chalk.cyan('git stash pop'));
          console.log('');

        } catch (err) {
          spinner.fail('Git rollback failed');
          console.log(chalk.red(`\n  ${err.message}`));
          console.log(chalk.gray('  Try: git revert --abort'));
          console.log(chalk.gray('  Or manually: git checkout ' + targetCommit + '\n'));

          addRollback({
            environment: env,
            fromCommit: currentCommit,
            toCommit: targetCommit.slice(0, 7),
            method: 'git',
            status: 'FAILED',
          }, cwd);
        }

      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });
}

async function doK8sRollback(options, env, cwd) {
  const namespace = options.namespace || env;
  const deployment = options.deployment;

  if (!deployment) {
    // Try to list deployments
    try {
      const deps = execSync(
        `kubectl get deployments -n ${namespace} --no-headers -o custom-columns=":metadata.name"`,
        { encoding: 'utf8', timeout: 10000 }
      ).trim();
      
      if (!deps) {
        console.log(chalk.yellow(`  No K8s deployments found in namespace: ${namespace}\n`));
        return;
      }

      const choices = deps.split('\n').map(d => d.trim()).filter(Boolean);
      const { dep } = await inquirer.prompt([{
        type: 'list',
        name: 'dep',
        message: 'Select K8s deployment to rollback:',
        choices,
      }]);
      
      options.deployment = dep;
    } catch {
      console.log(chalk.red('  Cannot connect to Kubernetes cluster.'));
      console.log(chalk.gray('  Use --git flag for git-based rollback instead.\n'));
      return;
    }
  }

  const spinner = ora(`Rolling back K8s deployment: ${options.deployment}...`).start();

  try {
    const revFlag = options.revision ? ` --to-revision=${options.revision}` : '';
    execSync(
      `kubectl rollout undo deployment/${options.deployment} -n ${namespace}${revFlag}`,
      { stdio: 'pipe', timeout: 30000 }
    );
    spinner.succeed(`Rolled back ${chalk.cyan(options.deployment)} in ${chalk.cyan(namespace)}`);

    // Verify
    const statusSpinner = ora('Verifying rollback...').start();
    try {
      execSync(
        `kubectl rollout status deployment/${options.deployment} -n ${namespace} --timeout=60s`,
        { stdio: 'pipe' }
      );
      statusSpinner.succeed('Rollback healthy — all pods running');
    } catch {
      statusSpinner.warn('Rollback applied but rollout still in progress');
    }

    addRollback({
      environment: env,
      fromCommit: 'k8s',
      toCommit: options.revision || 'previous',
      method: 'k8s',
      status: 'SUCCESS',
    }, cwd);

    console.log(chalk.green.bold('\n  ✅ K8s Rollback Complete'));
    console.log(chalk.gray(`\n  Monitor: oply k8s rollout -d ${options.deployment} -n ${namespace}\n`));

  } catch (err) {
    spinner.fail('K8s rollback failed');
    console.log(chalk.red(`\n  ${(err.stderr || err.message || '').toString().split('\n')[0]}`));
    console.log(chalk.gray('  Check: kubectl config get-contexts\n'));
  }
}

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}
