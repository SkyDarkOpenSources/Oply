/**
 * oply logs — Stream and view logs from pipelines, K8s, and Docker
 * 
 * Shows REAL logs from:
 * 1. Pipeline runs — from .oply/logs/ (actual command output)
 * 2. Kubernetes pods — via kubectl
 * 3. Docker containers — via docker logs
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { loadProject, tryLoadProject } from '../project.js';
import {
  getPipelineRuns,
  getRunLogs,
  listRunLogs,
} from '../store.js';

export function logsCommand(program) {
  program
    .command('logs')
    .description('View logs from pipelines, services, or Kubernetes pods')
    .option('-s, --service <name>', 'Service name to tail logs from')
    .option('-n, --namespace <ns>', 'Kubernetes namespace', 'default')
    .option('-f, --follow', 'Follow log output (tail -f)')
    .option('--lines <n>', 'Number of lines to show', '50')
    .option('--pod', 'Show Kubernetes pod logs directly')
    .option('--pipeline <id>', 'Show logs for a specific pipeline run')
    .action(async (options) => {
      try {
        if (options.pipeline) {
          showPipelineRunLogs(options.pipeline);
        } else if (options.pod) {
          await showKubeLogs(options);
        } else if (options.service) {
          await showServiceLogs(options);
        } else {
          // Interactive mode
          const choices = [
            { name: '🔗 Pipeline Run Logs', value: 'pipeline' },
            { name: '📦 Kubernetes Pod Logs', value: 'k8s' },
            { name: '🐳 Docker Container Logs', value: 'docker' },
          ];

          const answers = await inquirer.prompt([{
            type: 'list',
            name: 'source',
            message: 'Select log source:',
            choices,
          }]);

          if (answers.source === 'k8s') {
            await showKubeLogs(options);
          } else if (answers.source === 'docker') {
            await showDockerLogs(options);
          } else {
            await selectAndShowPipelineLogs();
          }
        }
      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });
}

/**
 * Show logs for a specific pipeline run from the local store
 */
function showPipelineRunLogs(runId) {
  const project = tryLoadProject();
  const cwd = project?.projectDir || process.cwd();

  const runs = getPipelineRuns(cwd);
  const run = runs.find(r => r.id === runId);

  if (!run) {
    console.log(chalk.yellow(`\n  Pipeline run "${runId}" not found.`));
    console.log(chalk.gray('  List runs with: ') + chalk.cyan('oply pipeline list\n'));
    return;
  }

  const logs = getRunLogs(runId, cwd);

  // Header
  console.log('');
  console.log(chalk.bold(`  Pipeline Run — ${chalk.gray(run.id)}`));
  
  const statusIcon = run.status === 'SUCCESS' ? chalk.green('✓') :
                     run.status === 'FAILED' ? chalk.red('✗') :
                     run.status === 'RUNNING' ? chalk.cyan('●') :
                     chalk.yellow('○');
  const statusColor = run.status === 'SUCCESS' ? chalk.green :
                      run.status === 'FAILED' ? chalk.red :
                      run.status === 'RUNNING' ? chalk.cyan :
                      chalk.yellow;
  
  console.log(`  ${statusIcon} ${statusColor(run.status)}  Commit: ${chalk.yellow(run.commitHash?.slice(0, 7) || '—')}  Branch: ${chalk.gray(run.branch || '—')}  Triggered: ${chalk.gray(run.triggeredBy || '—')}`);
  if (run.durationMs) console.log(chalk.gray(`  Duration: ${formatDuration(run.durationMs)}`));
  console.log(chalk.gray('  ─────────────────────────────────\n'));

  if (logs.length === 0) {
    console.log(chalk.gray('  No logs recorded for this run.\n'));
    return;
  }

  // Display logs with syntax highlighting
  logs.forEach(line => {
    if (line.includes('FAIL') || line.includes('ERR')) {
      console.log(chalk.red(`  ${line}`));
    } else if (line.includes('OK') || line.includes('SUCCESS')) {
      console.log(chalk.green(`  ${line}`));
    } else if (line.includes('START')) {
      console.log(chalk.cyan(`  ${line}`));
    } else if (line.includes('SKIP')) {
      console.log(chalk.yellow(`  ${line}`));
    } else if (line.includes('WARN')) {
      console.log(chalk.yellow(`  ${line}`));
    } else {
      console.log(chalk.gray(`  ${line}`));
    }
  });
  console.log('');

  // Show stage results if available
  if (run.stages && run.stages.length > 0) {
    console.log(chalk.bold('  Stage Results:'));
    run.stages.forEach(s => {
      const icon = s.status === 'SUCCESS' ? chalk.green('✓') :
                   s.status === 'FAILED' ? chalk.red('✗') :
                   s.status === 'SKIPPED' ? chalk.gray('⊘') :
                   chalk.yellow('○');
      const color = s.status === 'SUCCESS' ? chalk.green :
                    s.status === 'FAILED' ? chalk.red :
                    chalk.gray;
      const dur = s.duration ? chalk.gray(` (${formatDuration(s.duration)})`) : '';
      console.log(`  ${icon} ${color(s.name)}${dur}`);
    });
    console.log('');
  }
}

/**
 * Interactive: select a pipeline run and show its logs
 */
async function selectAndShowPipelineLogs() {
  const project = tryLoadProject();
  const cwd = project?.projectDir || process.cwd();
  const runs = getPipelineRuns(cwd);

  if (runs.length === 0) {
    console.log(chalk.gray('\n  No pipeline runs found.'));
    console.log(chalk.gray('  Trigger one with: ') + chalk.cyan('oply pipeline trigger\n'));
    return;
  }

  const choices = runs.slice(0, 15).map(run => {
    const icon = run.status === 'SUCCESS' ? '✓' :
                 run.status === 'FAILED' ? '✗' :
                 run.status === 'RUNNING' ? '●' : '○';
    const statusLabel = run.status === 'SUCCESS' ? chalk.green(icon) :
                        run.status === 'FAILED' ? chalk.red(icon) :
                        run.status === 'RUNNING' ? chalk.cyan(icon) :
                        chalk.yellow(icon);
    
    return {
      name: `${statusLabel} ${run.id}  ${chalk.yellow(run.commitHash?.slice(0, 7) || '—')}  ${chalk.gray(run.triggeredBy || '—')}  ${chalk.gray(timeAgo(run.startedAt))}`,
      value: run.id,
    };
  });

  const { selectedRun } = await inquirer.prompt([{
    type: 'list',
    name: 'selectedRun',
    message: 'Select a pipeline run:',
    choices,
  }]);

  showPipelineRunLogs(selectedRun);
}

/**
 * Show Kubernetes pod logs (real kubectl)
 */
async function showKubeLogs(options) {
  const spinner = ora('Fetching Kubernetes pods...').start();
  
  try {
    const pods = execSync(
      `kubectl get pods -n ${options.namespace} --no-headers -o custom-columns=":metadata.name,:status.phase"`,
      { encoding: 'utf8', timeout: 10000 }
    ).trim();

    spinner.succeed('Pods fetched');
    
    if (!pods) {
      console.log(chalk.yellow('\n  No pods found in namespace: ' + options.namespace + '\n'));
      return;
    }

    const podList = pods.split('\n').map(line => {
      const [name, phase] = line.trim().split(/\s+/);
      const icon = phase === 'Running' ? '🟢' : phase === 'Pending' ? '🟡' : '🔴';
      return { name: `${icon} ${name} (${phase})`, value: name };
    });

    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'pod',
      message: 'Select pod:',
      choices: podList,
    }]);

    const tailFlag = options.follow ? '-f' : '';
    const cmd = `kubectl logs ${answer.pod} -n ${options.namespace} ${tailFlag} --tail=${options.lines}`;
    
    console.log(chalk.gray(`\n  $ ${cmd}\n`));
    console.log(chalk.gray('  ─────────────────────────────────\n'));
    
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    spinner.fail('Could not connect to Kubernetes cluster');
    console.log(chalk.gray('\n  Make sure kubectl is configured and the cluster is reachable.'));
    console.log(chalk.gray('  Check: kubectl config current-context\n'));
  }
}

/**
 * Show Docker container logs (real docker)
 */
async function showDockerLogs(options) {
  const spinner = ora('Fetching Docker containers...').start();
  
  try {
    const containers = execSync(
      'docker ps --format "{{.Names}}\\t{{.Status}}\\t{{.Image}}"',
      { encoding: 'utf8', timeout: 10000 }
    ).trim();

    spinner.succeed('Containers fetched');

    if (!containers) {
      console.log(chalk.yellow('\n  No running containers found.\n'));
      return;
    }

    const containerList = containers.split('\n').map(line => {
      const [name, status, image] = line.split('\t');
      return { name: `🐳 ${name} — ${chalk.gray(image)} (${status})`, value: name };
    });

    const answer = await inquirer.prompt([{
      type: 'list',
      name: 'container',
      message: 'Select container:',
      choices: containerList,
    }]);

    const tailFlag = options.follow ? '-f' : '';
    const cmd = `docker logs ${answer.container} ${tailFlag} --tail ${options.lines}`;
    
    console.log(chalk.gray(`\n  $ ${cmd}\n`));
    execSync(cmd, { stdio: 'inherit' });
  } catch (err) {
    spinner.fail('Could not connect to Docker');
    console.log(chalk.gray('\n  Make sure Docker is running.\n'));
  }
}

/**
 * Show service logs via kubectl
 */
async function showServiceLogs(options) {
  const spinner = ora(`Fetching logs for service: ${options.service}...`).start();
  try {
    execSync(
      `kubectl logs -l app=${options.service} -n ${options.namespace} --tail=${options.lines} ${options.follow ? '-f' : ''}`,
      { stdio: 'inherit', timeout: options.follow ? 0 : 30000 }
    );
    spinner.succeed('');
  } catch (err) {
    spinner.fail('Could not fetch service logs');
    console.log(chalk.gray('  Make sure the service exists and kubectl is configured.\n'));
  }
}

function formatDuration(ms) {
  if (!ms) return '—';
  const seconds = Math.floor(ms / 1000);
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
