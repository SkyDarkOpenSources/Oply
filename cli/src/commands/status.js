/**
 * oply status — View real pipeline and deployment status
 * 
 * Shows data from:
 * 1. Local git state (branch, commits, ahead/behind)
 * 2. Local store (.oply/store.json — real pipeline runs & deployments)
 * 3. GitHub API (if GITHUB_TOKEN is set — workflow runs & deployments)
 */

import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { loadProject } from '../project.js';
import { getPipelineRuns, getDeployments, storeExists } from '../store.js';
import {
  getCurrentBranch,
  getCommitHash,
  getRecentCommits,
  getAheadBehind,
  getRemoteUrl,
  isGitRepo,
  getCommitCount,
} from '../git.js';
import {
  healthCheck,
  apiGet,
  hasGitHubToken,
  parseGitHubRepo,
  getGitHubWorkflowRuns,
  getGitHubDeployments,
} from '../api.js';

export function statusCommand(program) {
  program
    .command('status')
    .description('View pipeline runs, deployment status, and project health')
    .option('-l, --limit <n>', 'Number of recent items to show', '10')
    .option('--deployments', 'Show deployment history')
    .option('--github', 'Show GitHub Actions status (requires GITHUB_TOKEN)')
    .option('--git', 'Show detailed git status')
    .action(async (options) => {
      try {
        const project = loadProject();
        const cwd = project.projectDir;
        const projectName = project.config.project?.name || 'project';
        const limit = parseInt(options.limit, 10) || 10;

        // ─── Header ─────────────────────────────
        const branch = isGitRepo(cwd) ? getCurrentBranch(cwd) : '—';
        const hash = isGitRepo(cwd) ? getCommitHash(cwd) : '—';
        const { ahead, behind } = isGitRepo(cwd) ? getAheadBehind(cwd) : { ahead: 0, behind: 0 };

        console.log('');
        console.log(chalk.bold(`  📊 Status — ${chalk.cyan(projectName)}`));
        console.log(chalk.gray(`  Branch: ${chalk.yellow(branch)}  Commit: ${chalk.yellow(hash)}  Stack: ${chalk.cyan(project.config.stack?.framework || '—')}`));
        
        let syncLine = '';
        if (ahead > 0) syncLine += chalk.green(` ↑${ahead} ahead`);
        if (behind > 0) syncLine += chalk.red(` ↓${behind} behind`);
        if (syncLine) console.log(chalk.gray('  Remote:') + syncLine);
        console.log('');

        // ─── Route to sub-views ─────────────────
        if (options.deployments) {
          showDeployments(cwd, limit);
        } else if (options.github) {
          await showGitHubStatus(project, limit);
        } else if (options.git) {
          showGitStatus(cwd);
        } else {
          // Default: show everything
          showPipelineRuns(cwd, limit);
          showDeployments(cwd, limit);
          
          // If GitHub token is available, show GitHub status too
          if (hasGitHubToken()) {
            await showGitHubStatus(project, 5);
          }
        }

      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });
}

function showPipelineRuns(cwd, limit) {
  const runs = getPipelineRuns(cwd);

  if (runs.length === 0) {
    console.log(chalk.gray('  No pipeline runs yet. Trigger one with: ') + chalk.cyan('oply pipeline trigger'));
    console.log('');
    return;
  }

  const table = new Table({
    head: [
      chalk.gray('Status'),
      chalk.gray('Run ID'),
      chalk.gray('Commit'),
      chalk.gray('Branch'),
      chalk.gray('Duration'),
      chalk.gray('Triggered'),
      chalk.gray('Time'),
    ],
    style: { head: [], border: ['gray'] },
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
  });

  runs.slice(0, limit).forEach(run => {
    const icon = statusIcon(run.status);
    const color = statusColor(run.status);

    table.push([
      icon + ' ' + color,
      chalk.gray(run.id),
      chalk.yellow(run.commitHash?.slice(0, 7) || '—'),
      chalk.gray(run.branch || '—'),
      chalk.gray(run.durationMs ? formatDuration(run.durationMs) : run.status === 'RUNNING' ? chalk.cyan('running...') : '—'),
      chalk.gray(run.triggeredBy || '—'),
      chalk.gray(timeAgo(run.startedAt)),
    ]);
  });

  console.log(chalk.bold('  Pipeline Runs:'));
  console.log(table.toString());
  console.log('');
}

function showDeployments(cwd, limit) {
  const deployments = getDeployments(cwd);

  if (deployments.length === 0) {
    console.log(chalk.gray('  No deployments yet. Deploy with: ') + chalk.cyan('oply deploy --env dev'));
    console.log('');
    return;
  }

  // Current status per environment
  const envMap = {};
  deployments.forEach(d => {
    if (!envMap[d.environment]) envMap[d.environment] = d;
  });

  console.log(chalk.bold('  Current Deployments:'));
  Object.values(envMap).forEach(d => {
    const icon = d.status === 'SUCCESS' ? chalk.green('✓') :
                 d.status === 'FAILED' ? chalk.red('✗') :
                 d.status === 'ROLLED_BACK' ? chalk.red('↩') :
                 chalk.yellow('●');
    const statusLabel = d.status === 'SUCCESS' ? chalk.green('LIVE') :
                        d.status === 'FAILED' ? chalk.red('FAILED') :
                        d.status === 'ROLLED_BACK' ? chalk.red('ROLLED BACK') :
                        chalk.yellow(d.status);
    console.log(`  ${icon} ${chalk.cyan(d.environment.padEnd(14))} ${statusLabel}  commit ${chalk.yellow(d.commitHash?.slice(0, 7) || '—')}  ${chalk.gray(timeAgo(d.timestamp))}`);
  });
  console.log('');

  // Recent deployment history
  if (deployments.length > Object.keys(envMap).length) {
    const table = new Table({
      head: [
        chalk.gray('Status'),
        chalk.gray('Environment'),
        chalk.gray('Commit'),
        chalk.gray('Strategy'),
        chalk.gray('Duration'),
        chalk.gray('Time'),
      ],
      style: { head: [], border: ['gray'] },
      chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
    });

    deployments.slice(0, limit).forEach(d => {
      table.push([
        statusIcon(d.status) + ' ' + statusColor(d.status),
        chalk.cyan(d.environment),
        chalk.yellow(d.commitHash?.slice(0, 7) || '—'),
        chalk.gray(d.strategy || 'ROLLING'),
        chalk.gray(d.duration ? formatDuration(d.duration) : '—'),
        chalk.gray(timeAgo(d.timestamp)),
      ]);
    });

    console.log(chalk.bold('  Deployment History:'));
    console.log(table.toString());
    console.log('');
  }
}

async function showGitHubStatus(project, limit) {
  if (!hasGitHubToken()) {
    console.log(chalk.yellow('  ⚠ GITHUB_TOKEN not set — cannot fetch GitHub status'));
    console.log(chalk.gray('  Set it in .env.oply or run: oply init\n'));
    return;
  }

  const repoUrl = project.config.project?.repository || '';
  const repo = parseGitHubRepo(repoUrl);
  if (!repo) {
    console.log(chalk.yellow('  ⚠ Could not parse GitHub repo from: ' + (repoUrl || '(no URL)')));
    console.log(chalk.gray('  Set a valid GitHub repo URL in oply.config.json\n'));
    return;
  }

  const spinner = ora('Fetching GitHub status...').start();

  try {
    const [workflowRuns, ghDeployments] = await Promise.all([
      getGitHubWorkflowRuns(repo.owner, repo.repo, limit),
      getGitHubDeployments(repo.owner, repo.repo, limit),
    ]);

    spinner.succeed(`GitHub status for ${chalk.cyan(`${repo.owner}/${repo.repo}`)}`);

    // Workflow runs
    if (workflowRuns.length > 0) {
      const table = new Table({
        head: [
          chalk.gray('Status'),
          chalk.gray('Workflow'),
          chalk.gray('Branch'),
          chalk.gray('Commit'),
          chalk.gray('Time'),
        ],
        style: { head: [], border: ['gray'] },
        chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
      });

      workflowRuns.forEach(run => {
        const ghStatus = run.conclusion || run.status;
        const icon = ghStatus === 'success' ? chalk.green('✓') :
                     ghStatus === 'failure' ? chalk.red('✗') :
                     ghStatus === 'in_progress' ? chalk.cyan('●') :
                     chalk.yellow('○');
        const color = ghStatus === 'success' ? chalk.green(ghStatus) :
                      ghStatus === 'failure' ? chalk.red(ghStatus) :
                      ghStatus === 'in_progress' ? chalk.cyan(ghStatus) :
                      chalk.yellow(ghStatus);

        table.push([
          icon + ' ' + color,
          chalk.white(run.name || '—'),
          chalk.gray(run.branch || '—'),
          chalk.yellow(run.commit || '—'),
          chalk.gray(timeAgo(run.createdAt)),
        ]);
      });

      console.log(chalk.bold('\n  GitHub Actions:'));
      console.log(table.toString());
    }

    // GitHub Deployments
    if (ghDeployments.length > 0) {
      const depTable = new Table({
        head: [
          chalk.gray('Status'),
          chalk.gray('Environment'),
          chalk.gray('Ref'),
          chalk.gray('Commit'),
          chalk.gray('Creator'),
          chalk.gray('Time'),
        ],
        style: { head: [], border: ['gray'] },
        chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
      });

      ghDeployments.forEach(dep => {
        const icon = dep.status === 'success' ? chalk.green('✓') :
                     dep.status === 'failure' ? chalk.red('✗') :
                     dep.status === 'in_progress' ? chalk.cyan('●') :
                     chalk.yellow('○');

        depTable.push([
          icon + ' ' + chalk.gray(dep.status),
          chalk.cyan(dep.environment),
          chalk.gray(dep.ref),
          chalk.yellow(dep.sha || '—'),
          chalk.gray(dep.creator),
          chalk.gray(timeAgo(dep.createdAt)),
        ]);
      });

      console.log(chalk.bold('\n  GitHub Deployments:'));
      console.log(depTable.toString());
    }
    
    console.log('');
  } catch (err) {
    spinner.fail('Could not fetch GitHub status: ' + err.message);
  }
}

function showGitStatus(cwd) {
  const commits = getRecentCommits(10, cwd);
  const totalCommits = getCommitCount(cwd);

  console.log(chalk.bold(`  Git History (${totalCommits} total commits):\n`));

  if (commits.length === 0) {
    console.log(chalk.gray('  No commits yet.\n'));
    return;
  }

  const table = new Table({
    head: [chalk.gray('Hash'), chalk.gray('Message'), chalk.gray('Author'), chalk.gray('When')],
    style: { head: [], border: ['gray'] },
    chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
  });

  commits.forEach(c => {
    table.push([
      chalk.yellow(c.shortHash),
      chalk.white(c.message.length > 50 ? c.message.slice(0, 50) + '...' : c.message),
      chalk.gray(c.author),
      chalk.gray(c.relativeDate),
    ]);
  });

  console.log(table.toString());
  console.log('');
}

// ─── Helpers ─────────────────────────────────────

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
