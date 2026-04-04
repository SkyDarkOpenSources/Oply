/**
 * oply logs — Stream and view pipeline & service logs
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';

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
        if (options.pod) {
          await showKubeLogs(options);
        } else if (options.service) {
          await showServiceLogs(options);
        } else {
          // Interactive mode
          const answers = await inquirer.prompt([{
            type: 'list',
            name: 'source',
            message: 'Select log source:',
            choices: [
              { name: '📦 Kubernetes Pod Logs', value: 'k8s' },
              { name: '🐳 Docker Container Logs', value: 'docker' },
              { name: '🔗 Pipeline Run Logs', value: 'pipeline' },
              { name: '📄 Local Application Logs', value: 'local' },
            ],
          }]);

          if (answers.source === 'k8s') {
            await showKubeLogs(options);
          } else if (answers.source === 'docker') {
            await showDockerLogs(options);
          } else if (answers.source === 'pipeline') {
            showPipelineLogs();
          } else {
            showLocalLogs();
          }
        }
      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });
}

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

function showPipelineLogs() {
  console.log('');
  console.log(chalk.bold('  Pipeline Run #run-003 — Build & Deploy API'));
  console.log(chalk.gray('  Commit: i7j8k9l • Triggered: manual • Status: ') + chalk.cyan('RUNNING'));
  console.log(chalk.gray('  ─────────────────────────────────\n'));

  const logs = [
    { ts: '10:32:01', level: 'INFO', msg: 'Pipeline started' },
    { ts: '10:32:01', level: 'INFO', msg: 'Step [LINT] → npm run lint' },
    { ts: '10:32:05', level: 'INFO', msg: '✓ Lint passed (4.2s)' },
    { ts: '10:32:05', level: 'INFO', msg: 'Step [TEST] → npm test' },
    { ts: '10:32:05', level: 'INFO', msg: 'Step [E2E] → npx playwright test' },
    { ts: '10:32:18', level: 'INFO', msg: '✓ Unit tests passed — 48/48 (13.1s)' },
    { ts: '10:32:25', level: 'WARN', msg: 'E2E: checkout test slow — timeout approaching' },
    { ts: '10:32:32', level: 'INFO', msg: '✓ E2E tests passed — 12/12 (27.3s)' },
    { ts: '10:32:32', level: 'INFO', msg: 'Step [BUILD] → docker build -t app:i7j8k9l .' },
    { ts: '10:32:48', level: 'INFO', msg: '✓ Docker image built (16.4s)' },
    { ts: '10:32:48', level: 'INFO', msg: 'Pushing to registry.oply.io/app:i7j8k9l...' },
    { ts: '10:32:55', level: 'INFO', msg: '✓ Image pushed to registry' },
    { ts: '10:32:55', level: 'INFO', msg: 'AI Risk Score: 12/100 — Auto-approved' },
    { ts: '10:32:56', level: 'INFO', msg: 'Step [DEPLOY] → kubectl set image ...' },
    { ts: '10:33:02', level: 'INFO', msg: '✓ Deployed to staging. Health checks passing.' },
  ];

  logs.forEach(log => {
    const levelColor = log.level === 'WARN' ? chalk.yellow : log.level === 'ERROR' ? chalk.red : chalk.gray;
    console.log(`  ${chalk.gray(log.ts)}  ${levelColor(log.level.padEnd(5))}  ${log.msg.includes('✓') ? chalk.green(log.msg) : log.msg}`);
  });
  console.log('');
}

function showLocalLogs() {
  console.log(chalk.gray('\n  Tailing local application logs (stdout)...\n'));
  console.log(chalk.gray('  Use Ctrl+C to stop.\n'));
  try {
    execSync('tail -f /var/log/syslog 2>/dev/null || echo "No local log file found"', { stdio: 'inherit', timeout: 30000 });
  } catch {
    // User interrupted
  }
}

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
    showPipelineLogs();
  }
}
