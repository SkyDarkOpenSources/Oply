/**
 * oply status — View pipeline and deployment status
 */

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { apiGet, healthCheck } from '../api.js';

export function statusCommand(program) {
  program
    .command('status')
    .description('View pipeline runs and deployment status')
    .option('-l, --limit <n>', 'Number of recent runs to show', '10')
    .option('--deployments', 'Show deployment status instead of pipelines')
    .action(async (options) => {
      try {
        const spinner = ora('Fetching status from Oply...').start();

        const isOnline = await healthCheck();

        if (!isOnline) {
          spinner.warn('Oply API not reachable — showing local status');
          showLocalStatus();
          return;
        }

        if (options.deployments) {
          spinner.text = 'Fetching deployments...';
          const data = await apiGet('/v1/deployments', { limit: options.limit });
          spinner.succeed('Deployments fetched');
          showDeploymentTable(data.deployments || []);
        } else {
          spinner.text = 'Fetching pipeline runs...';
          const data = await apiGet('/v1/pipelines', { limit: options.limit });
          spinner.succeed('Pipeline runs fetched');
          showPipelineTable(data.runs || []);
        }
      } catch (error) {
        // Fallback to demo data when API not available
        console.log(chalk.yellow('\n  ⚠ Could not reach Oply API — showing demo status\n'));
        showLocalStatus();
      }
    });
}

function statusIcon(status) {
  const map = {
    SUCCESS: chalk.green('✓'),
    HEALTHY: chalk.green('✓'),
    RUNNING: chalk.cyan('●'),
    PROGRESSING: chalk.cyan('●'),
    QUEUED: chalk.yellow('○'),
    PENDING: chalk.gray('○'),
    FAILED: chalk.red('✗'),
    ROLLED_BACK: chalk.red('↩'),
    CANCELLED: chalk.gray('—'),
  };
  return map[status] || chalk.gray('?');
}

function statusColor(status) {
  const map = {
    SUCCESS: chalk.green,
    HEALTHY: chalk.green,
    RUNNING: chalk.cyan,
    PROGRESSING: chalk.cyan,
    QUEUED: chalk.yellow,
    PENDING: chalk.gray,
    FAILED: chalk.red,
    ROLLED_BACK: chalk.red,
  };
  return (map[status] || chalk.gray)(status);
}

function riskColor(score) {
  if (score <= 30) return chalk.green(score + '/100');
  if (score <= 60) return chalk.yellow(score + '/100');
  return chalk.red(score + '/100');
}

function showPipelineTable(runs) {
  const table = new Table({
    head: [
      chalk.gray('Status'),
      chalk.gray('Pipeline'),
      chalk.gray('Commit'),
      chalk.gray('Duration'),
      chalk.gray('Triggered By'),
      chalk.gray('Time'),
    ],
    style: { head: [], border: ['gray'] },
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
  });

  if (runs.length === 0) {
    console.log(chalk.gray('\n  No pipeline runs found. Trigger one with: oply pipeline trigger\n'));
    return;
  }

  runs.forEach((run) => {
    table.push([
      statusIcon(run.status) + ' ' + statusColor(run.status),
      chalk.white(run.workflow?.name || 'Unknown'),
      chalk.gray(run.commitHash?.slice(0, 7) || '—'),
      chalk.gray(run.durationMs ? `${(run.durationMs / 1000).toFixed(1)}s` : '—'),
      chalk.gray(run.triggeredBy || '—'),
      chalk.gray(timeAgo(run.createdAt)),
    ]);
  });

  console.log('');
  console.log(table.toString());
  console.log('');
}

function showDeploymentTable(deps) {
  const table = new Table({
    head: [
      chalk.gray('Status'),
      chalk.gray('Service'),
      chalk.gray('Environment'),
      chalk.gray('Version'),
      chalk.gray('Strategy'),
      chalk.gray('Risk'),
    ],
    style: { head: [], border: ['gray'] },
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
  });

  deps.forEach((dep) => {
    table.push([
      statusIcon(dep.status) + ' ' + statusColor(dep.status),
      chalk.white(dep.project?.name || 'unknown'),
      chalk.cyan(dep.environment?.name || '—'),
      chalk.gray(dep.version || '—'),
      chalk.gray(dep.strategy || 'ROLLING'),
      dep.aiRiskScore != null ? riskColor(dep.aiRiskScore) : chalk.gray('—'),
    ]);
  });

  console.log('');
  console.log(table.toString());
  console.log('');
}

function showLocalStatus() {
  const table = new Table({
    head: [
      chalk.gray('Status'),
      chalk.gray('Pipeline'),
      chalk.gray('Commit'),
      chalk.gray('Duration'),
      chalk.gray('Triggered'),
      chalk.gray('Time'),
    ],
    style: { head: [], border: ['gray'] },
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
  });

  const demoRuns = [
    { status: 'SUCCESS', name: 'Build & Deploy API', commit: 'a1b2c3d', duration: '42s', by: 'webhook', time: '2 min ago' },
    { status: 'SUCCESS', name: 'Frontend CI', commit: 'e4f5g6h', duration: '38s', by: 'webhook', time: '15 min ago' },
    { status: 'RUNNING', name: 'Build & Deploy API', commit: 'i7j8k9l', duration: '—', by: 'manual', time: 'just now' },
    { status: 'FAILED', name: 'E2E Test Suite', commit: 'm0n1o2p', duration: '1m 23s', by: 'webhook', time: '1 hour ago' },
    { status: 'SUCCESS', name: 'Security Scan', commit: 'q3r4s5t', duration: '55s', by: 'schedule', time: '3 hours ago' },
  ];

  demoRuns.forEach((run) => {
    table.push([
      statusIcon(run.status) + ' ' + statusColor(run.status),
      chalk.white(run.name),
      chalk.gray(run.commit),
      chalk.gray(run.duration),
      chalk.gray(run.by),
      chalk.gray(run.time),
    ]);
  });

  console.log('');
  console.log(table.toString());
  console.log('');
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
