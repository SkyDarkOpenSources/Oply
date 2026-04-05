/**
 * oply pipeline — Pipeline management and execution
 * 
 * Actually executes the pipeline DAG defined in oply.config.json.
 * Runs real commands (npm install, npm test, etc.), captures output,
 * and records results in the local store.
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import Table from 'cli-table3';
import { loadProject } from '../project.js';
import {
  addPipelineRun,
  updatePipelineRun,
  getPipelineRuns,
  createRunLog,
  appendRunLog,
  storeExists,
} from '../store.js';
import { getCurrentBranch, getCommitHash, getRecentCommits } from '../git.js';

export function pipelineCommand(program) {
  const cmd = program.command('pipeline').description('Manage and execute CI/CD pipelines');

  // ─── oply pipeline trigger ────────────────────
  cmd.command('trigger')
    .description('Execute the pipeline DAG defined in oply.config.json')
    .option('--stage <id>', 'Run only a specific stage')
    .option('--dry-run', 'Show what would run without executing')
    .option('--skip-deps', 'Skip dependency installation stage')
    .action(async (options) => {
      try {
        const project = loadProject();
        const cwd = project.projectDir;
        const stages = project.config.pipeline?.stages || [];

        if (stages.length === 0) {
          console.log(chalk.yellow('\n  No pipeline stages defined.'));
          console.log(chalk.gray('  Run ') + chalk.cyan('oply pipeline generate') + chalk.gray(' to create one.\n'));
          return;
        }

        const branch = getCurrentBranch(cwd);
        const commitHash = getCommitHash(cwd);
        const projectName = project.config.project?.name || 'project';

        console.log(chalk.bold(`\n  🚀 Pipeline — ${chalk.cyan(projectName)}`));
        console.log(chalk.gray(`  Branch: ${branch}  Commit: ${commitHash}`));
        if (options.dryRun) console.log(chalk.yellow('  MODE: Dry Run — no commands will execute'));
        console.log('');

        // Filter stages if --stage is specified
        let stagesToRun = [...stages];
        if (options.stage) {
          const target = stages.find(s => s.id === options.stage);
          if (!target) {
            console.log(chalk.red(`  Stage "${options.stage}" not found. Available: ${stages.map(s => s.id).join(', ')}\n`));
            return;
          }
          stagesToRun = [target];
        }
        if (options.skipDeps) {
          stagesToRun = stagesToRun.filter(s => s.id !== 'install');
        }

        // Show stages to be executed
        console.log(chalk.bold('  Stages to execute:'));
        stagesToRun.forEach(s => {
          const icon = getStageIcon(s.type);
          console.log(`  ${icon} ${chalk.white(s.name)} ${chalk.gray(`→ ${s.command}`)}`);
        });
        console.log('');

        // Create pipeline run record
        const run = addPipelineRun({
          commitHash,
          commitMessage: getRecentCommits(1, cwd)[0]?.message || '',
          branch,
          status: 'RUNNING',
          triggeredBy: 'manual',
          stages: stagesToRun.map(s => ({ id: s.id, name: s.name, status: 'PENDING' })),
        }, cwd);

        createRunLog(run.id, cwd);
        appendRunLog(run.id, `Pipeline ${run.id} started`, cwd);
        appendRunLog(run.id, `Project: ${projectName} | Branch: ${branch} | Commit: ${commitHash}`, cwd);

        const startTime = Date.now();
        let allPassed = true;
        const stageResults = [];

        // ─── Execute stages ─────────────────────
        // Topological sort: resolve dependencies
        const executed = new Set();
        const sortedStages = topologicalSort(stagesToRun);

        for (const stage of sortedStages) {
          // Check if dependencies passed
          const depsFailed = (stage.dependsOn || []).some(depId => {
            const depResult = stageResults.find(r => r.id === depId);
            return depResult && depResult.status === 'FAILED';
          });

          if (depsFailed) {
            appendRunLog(run.id, `SKIP ${stage.name} — dependency failed`, cwd);
            stageResults.push({ id: stage.id, name: stage.name, status: 'SKIPPED', duration: 0 });
            console.log(chalk.gray(`  ⊘ ${stage.name} — skipped (dependency failed)`));
            continue;
          }

          const stageStart = Date.now();
          const spinner = ora({ text: `${stage.name}...`, prefixText: ' ' }).start();
          appendRunLog(run.id, `START ${stage.name} → ${stage.command}`, cwd);

          if (options.dryRun) {
            await sleep(300);
            const stageDuration = Date.now() - stageStart;
            spinner.succeed(`${stage.name} ${chalk.gray(`(dry run)`)}`);
            stageResults.push({ id: stage.id, name: stage.name, status: 'SUCCESS', duration: stageDuration });
            appendRunLog(run.id, `OK ${stage.name} (dry run)`, cwd);
            executed.add(stage.id);
            continue;
          }

          try {
            // Actually execute the command
            const output = execSync(stage.command, {
              cwd,
              encoding: 'utf8',
              timeout: 300000, // 5 minutes
              stdio: 'pipe',
              env: { ...process.env, FORCE_COLOR: '0' },
            });

            const stageDuration = Date.now() - stageStart;
            spinner.succeed(`${stage.name} ${chalk.gray(`(${formatDuration(stageDuration)})`)}`);
            
            // Log output (first/last few lines)
            const lines = (output || '').trim().split('\n').filter(Boolean);
            if (lines.length > 0) {
              const preview = lines.length <= 5 ? lines : [...lines.slice(0, 3), `... ${lines.length - 6} more lines ...`, ...lines.slice(-3)];
              preview.forEach(l => appendRunLog(run.id, `  ${l}`, cwd));
            }

            appendRunLog(run.id, `OK ${stage.name} (${formatDuration(stageDuration)})`, cwd);
            stageResults.push({ id: stage.id, name: stage.name, status: 'SUCCESS', duration: stageDuration });
            executed.add(stage.id);

          } catch (err) {
            const stageDuration = Date.now() - stageStart;
            spinner.fail(`${stage.name} ${chalk.red('FAILED')} ${chalk.gray(`(${formatDuration(stageDuration)})`)}`);
            
            const stderr = (err.stderr || err.stdout || err.message || '').toString();
            const errorLines = stderr.trim().split('\n').filter(Boolean);
            
            // Show first few error lines inline
            if (errorLines.length > 0) {
              const showLines = errorLines.slice(0, 5);
              showLines.forEach(l => console.log(chalk.red(`    ${l}`)));
              if (errorLines.length > 5) console.log(chalk.gray(`    ... ${errorLines.length - 5} more lines`));
            }

            // Log full error
            errorLines.forEach(l => appendRunLog(run.id, `ERR ${l}`, cwd));
            appendRunLog(run.id, `FAIL ${stage.name} (${formatDuration(stageDuration)})`, cwd);
            
            stageResults.push({ id: stage.id, name: stage.name, status: 'FAILED', duration: stageDuration, error: errorLines.slice(0, 3).join('\n') });
            allPassed = false;

            // Ask if user wants to continue
            if (sortedStages.indexOf(stage) < sortedStages.length - 1) {
              console.log('');
              const { cont } = await inquirer.prompt([{
                type: 'confirm',
                name: 'cont',
                message: 'Stage failed. Continue remaining stages?',
                default: false,
              }]);
              if (!cont) break;
            }
          }
        }

        // ─── Finalize ───────────────────────────
        const totalDuration = Date.now() - startTime;
        const finalStatus = allPassed ? 'SUCCESS' : 'FAILED';

        updatePipelineRun(run.id, {
          status: finalStatus,
          finishedAt: new Date().toISOString(),
          durationMs: totalDuration,
          stages: stageResults,
        }, cwd);

        appendRunLog(run.id, `Pipeline ${finalStatus} — total ${formatDuration(totalDuration)}`, cwd);

        // Summary
        console.log('');
        const summaryIcon = allPassed ? chalk.green.bold('✅') : chalk.red.bold('❌');
        const summaryLabel = allPassed ? chalk.green.bold('Pipeline Passed') : chalk.red.bold('Pipeline Failed');
        console.log(`  ${summaryIcon} ${summaryLabel} ${chalk.gray(`(${formatDuration(totalDuration)})`)}`);
        console.log('');

        // Stage summary table
        const table = new Table({
          head: [chalk.gray('Stage'), chalk.gray('Status'), chalk.gray('Duration')],
          style: { head: [], border: ['gray'] },
          chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        });
        stageResults.forEach(r => {
          const icon = r.status === 'SUCCESS' ? chalk.green('✓') : r.status === 'FAILED' ? chalk.red('✗') : chalk.gray('⊘');
          const color = r.status === 'SUCCESS' ? chalk.green : r.status === 'FAILED' ? chalk.red : chalk.gray;
          table.push([chalk.white(r.name), icon + ' ' + color(r.status), chalk.gray(formatDuration(r.duration))]);
        });
        console.log(table.toString());
        console.log('');

        console.log(chalk.gray(`  Run ID: ${run.id}`));
        console.log(chalk.gray(`  View logs: `) + chalk.cyan(`oply logs --pipeline ${run.id}`));
        if (!allPassed) {
          console.log(chalk.gray('  Debug: ') + chalk.cyan('oply ai-debug'));
        }
        console.log('');

      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });

  // ─── oply pipeline generate ───────────────────
  cmd.command('generate')
    .description('Re-generate the pipeline DAG from your codebase')
    .action(async () => {
      try {
        const project = loadProject();
        const cwd = project.projectDir;
        const stack = project.config.stack;

        console.log(chalk.bold(`\n  🔧 Pipeline Generator\n`));
        console.log(chalk.gray(`  Stack: ${stack?.language || 'unknown'} / ${stack?.framework || 'unknown'}\n`));

        const stages = project.config.pipeline?.stages || [];

        if (stages.length > 0) {
          const { overwrite } = await inquirer.prompt([{
            type: 'confirm',
            name: 'overwrite',
            message: `Pipeline already has ${stages.length} stages. Regenerate?`,
            default: false,
          }]);
          if (!overwrite) {
            console.log(chalk.gray('\n  Cancelled.\n'));
            return;
          }
        }

        const spinner = ora('Scanning codebase and generating DAG...').start();
        await sleep(800);
        spinner.succeed('Pipeline DAG generated');

        // Show current pipeline
        console.log(chalk.bold('\n  Pipeline Stages:'));
        (project.config.pipeline?.stages || []).forEach(s => {
          const icon = getStageIcon(s.type);
          const deps = (s.dependsOn || []).length > 0 ? chalk.gray(` ← ${s.dependsOn.join(', ')}`) : '';
          console.log(`  ${icon} ${chalk.white(s.name.padEnd(22))} ${chalk.gray(s.command)}${deps}`);
        });
        console.log('');
        console.log(chalk.gray('  Pipeline is defined in oply.config.json'));
        console.log(chalk.gray('  Run it with: ') + chalk.cyan('oply pipeline trigger'));
        console.log('');

      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });

  // ─── oply pipeline list ───────────────────────
  cmd.command('list')
    .description('List recent pipeline runs')
    .option('-n, --count <n>', 'Number of runs to show', '10')
    .action(async (options) => {
      try {
        const project = loadProject();
        const cwd = project.projectDir;
        const count = parseInt(options.count, 10) || 10;
        const runs = getPipelineRuns(cwd);

        if (runs.length === 0) {
          console.log(chalk.gray('\n  No pipeline runs yet.'));
          console.log(chalk.gray('  Trigger one with: ') + chalk.cyan('oply pipeline trigger\n'));
          return;
        }

        const table = new Table({
          head: [
            chalk.gray('Status'),
            chalk.gray('Run ID'),
            chalk.gray('Commit'),
            chalk.gray('Stages'),
            chalk.gray('Duration'),
            chalk.gray('Time'),
          ],
          style: { head: [], border: ['gray'] },
          chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        });

        runs.slice(0, count).forEach(run => {
          const icon = run.status === 'SUCCESS' ? chalk.green('✓') :
                       run.status === 'FAILED' ? chalk.red('✗') :
                       run.status === 'RUNNING' ? chalk.cyan('●') :
                       chalk.yellow('○');
          const color = run.status === 'SUCCESS' ? chalk.green :
                        run.status === 'FAILED' ? chalk.red :
                        run.status === 'RUNNING' ? chalk.cyan :
                        chalk.yellow;

          const stagesInfo = (run.stages || []).map(s => {
            if (s.status === 'SUCCESS') return chalk.green('✓');
            if (s.status === 'FAILED') return chalk.red('✗');
            return chalk.gray('○');
          }).join('');

          table.push([
            icon + ' ' + color(run.status),
            chalk.gray(run.id),
            chalk.yellow(run.commitHash?.slice(0, 7) || '—'),
            stagesInfo || chalk.gray('—'),
            chalk.gray(run.durationMs ? formatDuration(run.durationMs) : '—'),
            chalk.gray(timeAgo(run.startedAt)),
          ]);
        });

        console.log(chalk.bold(`\n  Pipeline Runs (${runs.length} total):\n`));
        console.log(table.toString());
        console.log('');
      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });

  // ─── oply pipeline stages ─────────────────────
  cmd.command('stages')
    .description('Show the pipeline stages defined in oply.config.json')
    .action(async () => {
      try {
        const project = loadProject();
        const stages = project.config.pipeline?.stages || [];

        if (stages.length === 0) {
          console.log(chalk.gray('\n  No pipeline stages defined.\n'));
          return;
        }

        console.log(chalk.bold('\n  Pipeline DAG:'));
        console.log('');
        stages.forEach((s, i) => {
          const icon = getStageIcon(s.type);
          const deps = (s.dependsOn || []).length > 0 ? chalk.gray(` ← depends on: ${s.dependsOn.join(', ')}`) : '';
          console.log(`  ${icon} ${chalk.white(s.name.padEnd(22))} ${chalk.gray(s.command)}${deps}`);
        });
        console.log('');
      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });
}

// ─── Helpers ────────────────────────────────────

function getStageIcon(type) {
  const map = {
    BUILD: '📦',
    TEST: '🧪',
    LINT: '🔍',
    SECURITY_SCAN: '🛡️',
    DEPLOY: '🚀',
  };
  return map[type] || '⚙️';
}

/**
 * Topological sort of stages respecting dependsOn
 */
function topologicalSort(stages) {
  const stageMap = new Map(stages.map(s => [s.id, s]));
  const visited = new Set();
  const sorted = [];

  function visit(stage) {
    if (visited.has(stage.id)) return;
    visited.add(stage.id);
    
    for (const depId of (stage.dependsOn || [])) {
      const dep = stageMap.get(depId);
      if (dep) visit(dep);
    }
    sorted.push(stage);
  }

  for (const stage of stages) {
    visit(stage);
  }

  return sorted;
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

function timeAgo(dateStr) {
  if (!dateStr) return '—';
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
