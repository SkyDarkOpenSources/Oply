/**
 * oply stage — View real git staging information
 * 
 * Shows staged/unstaged changes, recent commits, and environment
 * deployment status from the local store.
 */

import chalk from 'chalk';
import Table from 'cli-table3';
import inquirer from 'inquirer';
import { loadProject } from '../project.js';
import {
  getStagedFiles,
  getStagedDiffStats,
  getUnstagedFiles,
  getUntrackedFiles,
  getRecentCommits,
  getCurrentBranch,
  getCommitHash,
  getAheadBehind,
  getStagedDiff,
  isGitRepo,
} from '../git.js';
import { getDeployments, getLatestDeployment, storeExists } from '../store.js';

export function stageCommand(program) {
  const cmd = program.command('stage').description('View git staging info, commits, and environment status');

  // ─── Default: Overview ─────────────────────────
  cmd
    .description('Show staged changes, recent commits, and deployment status')
    .action(async () => {
      try {
        const project = loadProject();
        const cwd = project.projectDir;
        const projectName = project.config.project?.name || 'project';

        if (!isGitRepo(cwd)) {
          console.log(chalk.red('\n  ✗ Not a git repository. Run `git init` first.\n'));
          return;
        }

        const branch = getCurrentBranch(cwd);
        const commitHash = getCommitHash(cwd);
        const { ahead, behind } = getAheadBehind(cwd);

        // Header
        console.log('');
        console.log(chalk.bold(`  📋 Git Stage — ${chalk.cyan(projectName)} (${chalk.yellow(branch)})`));
        
        let syncInfo = '';
        if (ahead > 0) syncInfo += chalk.green(` ↑${ahead}`);
        if (behind > 0) syncInfo += chalk.red(` ↓${behind}`);
        if (syncInfo) console.log(chalk.gray(`  HEAD: ${commitHash}`) + syncInfo);
        else console.log(chalk.gray(`  HEAD: ${commitHash}`));
        console.log('');

        // ─── Staged Changes ───────────────────────
        const staged = getStagedFiles(cwd);
        const stagedStats = getStagedDiffStats(cwd);

        if (staged.length > 0) {
          const table = new Table({
            head: [chalk.gray('Status'), chalk.gray('File'), chalk.gray('Changes')],
            style: { head: [], border: ['gray'] },
            chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
          });

          staged.forEach(({ status, file }) => {
            const icon = status === 'A' ? chalk.green('✚ ADD') :
                         status === 'M' ? chalk.yellow('✎ MOD') :
                         status === 'D' ? chalk.red('✖ DEL') :
                         status === 'R' ? chalk.blue('↻ REN') :
                         chalk.gray(status);
            
            const stats = stagedStats[file];
            let changes = '';
            if (stats) {
              const parts = [];
              if (stats.insertions > 0) parts.push(chalk.green(`+${stats.insertions}`));
              if (stats.deletions > 0) parts.push(chalk.red(`-${stats.deletions}`));
              changes = parts.join(' / ');
            }

            table.push([icon, chalk.white(file), changes]);
          });

          console.log(chalk.bold(`  Staged Changes (${staged.length} file${staged.length !== 1 ? 's' : ''}):`));
          console.log(table.toString());
          console.log('');
        } else {
          console.log(chalk.gray('  No staged changes.'));
          console.log('');
        }

        // ─── Unstaged Changes ─────────────────────
        const unstaged = getUnstagedFiles(cwd);
        const untracked = getUntrackedFiles(cwd);

        if (unstaged.length > 0 || untracked.length > 0) {
          console.log(chalk.bold(`  Unstaged / Untracked (${unstaged.length + untracked.length} file${(unstaged.length + untracked.length) !== 1 ? 's' : ''}):`));
          unstaged.forEach(({ status, file }) => {
            const icon = status === 'M' ? chalk.yellow('•') : status === 'D' ? chalk.red('•') : chalk.gray('•');
            const label = status === 'M' ? 'Modified' : status === 'D' ? 'Deleted' : status;
            console.log(`  ${icon} ${chalk.gray(label + ':')} ${file}`);
          });
          untracked.forEach(file => {
            console.log(`  ${chalk.green('•')} ${chalk.gray('Untracked:')} ${file}`);
          });
          console.log('');
        }

        // ─── Recent Commits ──────────────────────
        const commits = getRecentCommits(5, cwd);
        if (commits.length > 0) {
          console.log(chalk.bold(`  Recent Commits:`));
          commits.forEach(c => {
            console.log(`  ${chalk.yellow(c.shortHash)}  ${chalk.white(c.message)}  ${chalk.gray('(' + c.relativeDate + ')')}`);
          });
          console.log('');
        }

        // ─── Environment Status ─────────────────
        if (storeExists(cwd)) {
          const envNames = project.config.environments || ['Development', 'Staging', 'Production'];
          const envKeys = envNames.map(e => typeof e === 'string' ? e.toLowerCase() : e);
          
          console.log(chalk.bold('  Environments:'));
          envKeys.forEach(envName => {
            const normalizedName = typeof envName === 'string' ? envName : envName.toString();
            const latest = getLatestDeployment(normalizedName, cwd);
            if (latest) {
              const statusIcon = latest.status === 'SUCCESS' ? chalk.green('✓') : 
                                 latest.status === 'FAILED' ? chalk.red('✗') : chalk.yellow('●');
              const timeAgo = getTimeAgo(latest.timestamp);
              console.log(`  ${statusIcon} ${chalk.cyan(normalizedName.padEnd(14))} deployed  ${chalk.gray(`(commit ${latest.commitHash?.slice(0, 7)}, ${timeAgo})`)}`);
            } else {
              console.log(`  ${chalk.gray('○')} ${chalk.cyan(normalizedName.padEnd(14))} ${chalk.gray('not deployed')}`);
            }
          });
          console.log('');
        }

      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });

  // ─── oply stage diff ──────────────────────────
  cmd.command('diff')
    .description('Show the staged diff (git diff --cached)')
    .action(async () => {
      try {
        loadProject();
        const diff = getStagedDiff();
        if (!diff) {
          console.log(chalk.gray('\n  No staged changes to diff.\n'));
          return;
        }
        console.log('');
        // Colorize diff output
        diff.split('\n').forEach(line => {
          if (line.startsWith('+') && !line.startsWith('+++')) {
            console.log(chalk.green(line));
          } else if (line.startsWith('-') && !line.startsWith('---')) {
            console.log(chalk.red(line));
          } else if (line.startsWith('@@')) {
            console.log(chalk.cyan(line));
          } else if (line.startsWith('diff')) {
            console.log(chalk.bold.white(line));
          } else {
            console.log(chalk.gray(line));
          }
        });
        console.log('');
      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });

  // ─── oply stage log ───────────────────────────
  cmd.command('log')
    .description('Show formatted git log with recent commits')
    .option('-n, --count <n>', 'Number of commits', '15')
    .action(async (options) => {
      try {
        loadProject();
        const count = parseInt(options.count, 10) || 15;
        const commits = getRecentCommits(count);

        if (commits.length === 0) {
          console.log(chalk.gray('\n  No commits yet.\n'));
          return;
        }

        const branch = getCurrentBranch();
        console.log(chalk.bold(`\n  Git Log — ${chalk.yellow(branch)} (${commits.length} commits)\n`));

        const table = new Table({
          head: [chalk.gray('Hash'), chalk.gray('Message'), chalk.gray('Author'), chalk.gray('When')],
          style: { head: [], border: ['gray'] },
          chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
          colWidths: [10, 50, 16, 16],
        });

        commits.forEach(c => {
          table.push([
            chalk.yellow(c.shortHash),
            chalk.white(c.message.length > 47 ? c.message.slice(0, 47) + '...' : c.message),
            chalk.gray(c.author.length > 13 ? c.author.slice(0, 13) + '..' : c.author),
            chalk.gray(c.relativeDate),
          ]);
        });

        console.log(table.toString());
        console.log('');
      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });

  // ─── oply stage envs ──────────────────────────
  cmd.command('envs')
    .description('Show deployment status per environment')
    .action(async () => {
      try {
        const project = loadProject();
        const cwd = project.projectDir;

        if (!storeExists(cwd)) {
          console.log(chalk.gray('\n  No deployment history yet. Run `oply deploy` first.\n'));
          return;
        }

        const deployments = getDeployments(cwd);
        if (deployments.length === 0) {
          console.log(chalk.gray('\n  No deployments recorded yet.\n'));
          return;
        }

        const table = new Table({
          head: [
            chalk.gray('Environment'),
            chalk.gray('Status'),
            chalk.gray('Commit'),
            chalk.gray('Branch'),
            chalk.gray('Strategy'),
            chalk.gray('Time'),
          ],
          style: { head: [], border: ['gray'] },
          chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        });

        // Group by environment, show latest per env
        const envMap = {};
        deployments.forEach(d => {
          if (!envMap[d.environment]) envMap[d.environment] = d;
        });

        Object.values(envMap).forEach(d => {
          const statusIcon = d.status === 'SUCCESS' ? chalk.green('✓ LIVE') :
                             d.status === 'FAILED' ? chalk.red('✗ FAILED') :
                             d.status === 'ROLLED_BACK' ? chalk.red('↩ ROLLED BACK') :
                             chalk.yellow('● ' + d.status);
          table.push([
            chalk.cyan(d.environment),
            statusIcon,
            chalk.yellow(d.commitHash?.slice(0, 7) || '—'),
            chalk.gray(d.branch || '—'),
            chalk.gray(d.strategy || 'ROLLING'),
            chalk.gray(getTimeAgo(d.timestamp)),
          ]);
        });

        console.log(chalk.bold('\n  Environment Deployment Status:\n'));
        console.log(table.toString());

        // Show full deployment history
        console.log(chalk.bold(`\n  Recent Deployments (${Math.min(deployments.length, 10)}):\n`));
        const historyTable = new Table({
          head: [
            chalk.gray('ID'),
            chalk.gray('Env'),
            chalk.gray('Commit'),
            chalk.gray('Status'),
            chalk.gray('Duration'),
            chalk.gray('Time'),
          ],
          style: { head: [], border: ['gray'] },
          chars: { mid: '', 'left-mid': '', 'mid-mid': '', 'right-mid': '' },
        });

        deployments.slice(0, 10).forEach(d => {
          const statusIcon = d.status === 'SUCCESS' ? chalk.green('✓') : 
                             d.status === 'FAILED' ? chalk.red('✗') : chalk.yellow('●');
          historyTable.push([
            chalk.gray(d.id),
            chalk.cyan(d.environment),
            chalk.yellow(d.commitHash?.slice(0, 7) || '—'),
            statusIcon + ' ' + (d.status === 'SUCCESS' ? chalk.green(d.status) : 
                                d.status === 'FAILED' ? chalk.red(d.status) : chalk.yellow(d.status)),
            chalk.gray(d.duration ? `${(d.duration / 1000).toFixed(1)}s` : '—'),
            chalk.gray(getTimeAgo(d.timestamp)),
          ]);
        });

        console.log(historyTable.toString());
        console.log('');
      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });
}

function getTimeAgo(dateStr) {
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
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
