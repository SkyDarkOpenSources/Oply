/**
 * oply ai-debug — Interactive AI debugging session
 * 
 * Reads actual project context:
 * - oply.config.json (stack, framework)
 * - Recent git commits and diffs
 * - Latest pipeline run logs from .oply/
 * - Project source files for error context
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadProject, tryLoadProject } from '../project.js';
import { getPipelineRuns, getRunLogs, listRunLogs } from '../store.js';
import {
  getRecentCommits,
  getRecentDiff,
  getCurrentBranch,
  getCommitHash,
  isGitRepo,
} from '../git.js';

export function aiDebugCommand(program) {
  program
    .command('ai-debug')
    .description('Start an interactive AI debugging session')
    .option('--logs <file>', 'Path to log file to analyze')
    .option('--error <message>', 'Error message to debug')
    .option('--file <path>', 'Source file to include in context')
    .option('--run <id>', 'Pipeline run ID to debug')
    .action(async (options) => {
      try {
        console.log(chalk.bold('\n  🤖 Oply AI Debugger'));
        console.log(chalk.gray('  Powered by GPT-4o • Full project context\n'));

        const project = tryLoadProject();
        const cwd = project?.projectDir || process.cwd();
        const stack = project?.config?.stack || {};

        const apiKey = process.env.OPENAI_API_KEY;
        let errorContext = options.error || '';
        let logContent = '';
        let gitDiff = '';
        let fileContent = '';
        let pipelineContext = '';

        // ─── Gather project context ───────────────
        const contextSpinner = ora('Gathering project context...').start();

        // Git info
        const branch = isGitRepo(cwd) ? getCurrentBranch(cwd) : 'unknown';
        const commitHash = isGitRepo(cwd) ? getCommitHash(cwd) : 'none';
        const recentCommits = getRecentCommits(5, cwd);
        gitDiff = getRecentDiff(3000, cwd);

        // Pipeline run logs
        if (options.run) {
          const logs = getRunLogs(options.run, cwd);
          if (logs.length > 0) {
            pipelineContext = logs.join('\n');
          }
        } else {
          // Get latest failed pipeline run
          const runs = getPipelineRuns(cwd);
          const failedRun = runs.find(r => r.status === 'FAILED');
          if (failedRun) {
            const logs = getRunLogs(failedRun.id, cwd);
            pipelineContext = logs.join('\n');
          }
        }

        // Read specific file if provided
        if (options.file) {
          try {
            const filePath = path.resolve(cwd, options.file);
            fileContent = fs.readFileSync(filePath, 'utf8').slice(0, 3000);
          } catch {
            console.log(chalk.yellow(`  Warning: Could not read file: ${options.file}`));
          }
        }

        // Read log file
        if (options.logs) {
          try {
            const logPath = path.resolve(cwd, options.logs);
            logContent = fs.readFileSync(logPath, 'utf8').slice(-3000); // last 3000 chars
          } catch {
            console.log(chalk.yellow(`  Warning: Could not read log file: ${options.logs}`));
          }
        }

        contextSpinner.succeed('Project context gathered');

        // Show what context we have
        console.log(chalk.gray(`  Stack: ${stack.language || 'unknown'} / ${stack.framework || 'unknown'}`));
        console.log(chalk.gray(`  Branch: ${branch} @ ${commitHash}`));
        if (pipelineContext) console.log(chalk.gray('  Pipeline logs: ✓'));
        if (gitDiff) console.log(chalk.gray('  Git diff: ✓'));
        if (fileContent) console.log(chalk.gray(`  File: ${options.file}`));
        console.log('');

        // ─── Get error context ────────────────────
        if (!errorContext) {
          const answers = await inquirer.prompt([{
            type: 'list',
            name: 'mode',
            message: 'What would you like to debug?',
            choices: [
              { name: '🔴 Last failed pipeline run', value: 'pipeline' },
              { name: '📋 Paste an error message', value: 'paste' },
              { name: '🐳 Docker build failure', value: 'docker' },
              { name: '☸️  Kubernetes deployment issue', value: 'k8s' },
              { name: '📁 Analyze a specific file', value: 'file' },
              { name: '💬 General DevOps question', value: 'general' },
            ],
          }]);

          if (answers.mode === 'paste') {
            const input = await inquirer.prompt([{
              type: 'editor',
              name: 'error',
              message: 'Paste the error (opens editor):',
            }]);
            errorContext = input.error;
          } else if (answers.mode === 'docker') {
            errorContext = 'Docker build/push failure';
            try {
              logContent = execSync('docker logs $(docker ps -lq) 2>&1 | tail -100', { encoding: 'utf8', timeout: 10000 });
            } catch { /* no docker */ }
          } else if (answers.mode === 'k8s') {
            errorContext = 'Kubernetes deployment issue';
            try {
              logContent = execSync('kubectl get events --sort-by=.lastTimestamp 2>&1 | tail -50', { encoding: 'utf8', timeout: 10000 });
            } catch { /* no kubectl */ }
          } else if (answers.mode === 'file') {
            const { filePath } = await inquirer.prompt([{
              type: 'input',
              name: 'filePath',
              message: 'File path to analyze:',
            }]);
            try {
              fileContent = fs.readFileSync(path.resolve(cwd, filePath), 'utf8').slice(0, 3000);
              errorContext = `Analyze this file for issues: ${filePath}`;
            } catch (e) {
              console.log(chalk.red(`\n  Could not read file: ${e.message}\n`));
              return;
            }
          } else if (answers.mode === 'general') {
            const q = await inquirer.prompt([{
              type: 'input',
              name: 'query',
              message: 'What do you need help with?',
            }]);
            errorContext = q.query;
          } else {
            // Pipeline failure
            if (pipelineContext) {
              errorContext = 'Pipeline execution failure — analyze the logs below';
            } else {
              errorContext = 'Pipeline execution failure';
              console.log(chalk.yellow('  No pipeline run logs found.'));
              const q = await inquirer.prompt([{
                type: 'input',
                name: 'error',
                message: 'Describe the issue:',
              }]);
              errorContext = q.error;
            }
          }
        }

        // ─── AI Analysis ──────────────────────────
        const spinner = ora('AI analyzing the issue...').start();

        if (!apiKey) {
          spinner.warn('OPENAI_API_KEY not set — showing pattern-based analysis');
          console.log(chalk.gray('  Set your API key in .env.oply to enable AI-powered analysis.'));
          console.log(chalk.gray('  Run: oply init (and enter your OpenAI API key)\n'));
          showPatternAnalysis(errorContext + ' ' + logContent + ' ' + pipelineContext);
          return;
        }

        try {
          const OpenAI = (await import('openai')).default;
          const openai = new OpenAI({ apiKey });

          // Build rich context
          const contextParts = [
            `Error/Question: ${errorContext}`,
          ];

          if (stack.language) contextParts.push(`Stack: ${stack.language} / ${stack.framework} / ${stack.packageManager}`);
          if (branch) contextParts.push(`Branch: ${branch}, Commit: ${commitHash}`);
          if (recentCommits.length > 0) {
            contextParts.push(`Recent commits:\n${recentCommits.map(c => `  ${c.shortHash} ${c.message}`).join('\n')}`);
          }
          if (pipelineContext) contextParts.push(`Pipeline Run Logs:\n${pipelineContext.slice(0, 2000)}`);
          if (logContent) contextParts.push(`Log Content:\n${logContent.slice(0, 2000)}`);
          if (gitDiff) contextParts.push(`Recent Git Diff:\n${gitDiff.slice(0, 1500)}`);
          if (fileContent) contextParts.push(`File Content:\n${fileContent.slice(0, 2000)}`);

          const stream = await openai.chat.completions.create({
            model: 'gpt-4o',
            stream: true,
            temperature: 0.3,
            max_tokens: 2000,
            messages: [
              {
                role: 'system',
                content: `You are the Oply Failure Analysis Engine — an expert DevOps AI debugger.
You have access to the project's full context including stack info, recent commits, pipeline logs, and source code.

Your response should include:
1. **Root Cause** — What is the actual problem
2. **Error Type** — One of: CODE_ERROR, INFRASTRUCTURE, DEPENDENCY, CONFIGURATION, PERMISSION, RUNTIME
3. **Fix** — Specific actionable steps to fix the issue
4. **Prevention** — How to prevent this in the future

Be concise and specific. Include actual commands or code changes when relevant.
Format your response with markdown headers and bullet points.`,
              },
              {
                role: 'user',
                content: contextParts.join('\n\n'),
              },
            ],
          });

          spinner.succeed('Analysis complete\n');

          for await (const chunk of stream) {
            process.stdout.write(chunk.choices[0]?.delta?.content || '');
          }
          console.log('\n');

        } catch (err) {
          spinner.fail('AI analysis failed: ' + err.message);
          showPatternAnalysis(errorContext + ' ' + logContent);
        }

      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });
}

function showPatternAnalysis(text) {
  const t = (text || '').toLowerCase();
  console.log(chalk.bold('\n  📋 Pattern-Based Analysis\n'));

  const patterns = [
    { match: ['permission denied', 'eacces', 'access denied'], cause: 'Insufficient permissions', fix: 'chmod +x <file>, check service account roles, or run with elevated privileges' },
    { match: ['oom', 'out of memory', 'heap out of memory', 'javascript heap'], cause: 'Out of memory', fix: 'Increase memory limits: NODE_OPTIONS="--max-old-space-size=4096" or update K8s resource limits' },
    { match: ['timeout', 'timedout', 'etimedout', 'socket hang up'], cause: 'Operation timed out', fix: 'Check network connectivity, increase timeout values, verify DNS resolution' },
    { match: ['npm err', 'module not found', 'cannot find module', 'eresolve'], cause: 'Dependency resolution failure', fix: 'rm -rf node_modules && npm install, or check for version conflicts in package.json' },
    { match: ['econnrefused', 'connection refused'], cause: 'Service connection refused', fix: 'Check if the target service is running, verify host/port, check firewall rules' },
    { match: ['docker', 'dockerfile', 'image build'], cause: 'Docker build failure', fix: 'Check Dockerfile syntax, verify base image exists, check build context' },
    { match: ['kubectl', 'kubernetes', 'pod', 'deployment'], cause: 'Kubernetes issue', fix: 'Check pod status: kubectl describe pod <name>, check events: kubectl get events' },
    { match: ['syntax error', 'unexpected token', 'parsing error'], cause: 'Syntax error in code', fix: 'Check the file mentioned in the error, run linter: npm run lint' },
    { match: ['type error', 'typeerror', 'is not a function', 'undefined is not'], cause: 'Runtime type error', fix: 'Check variable types, add null checks, verify function signatures' },
    { match: ['enoent', 'no such file', 'file not found'], cause: 'File not found', fix: 'Verify file path exists, check cwd, ensure file is not gitignored' },
    { match: ['port', 'eaddrinuse', 'address already in use'], cause: 'Port already in use', fix: 'Kill the process using the port: lsof -i :<port> | kill, or use a different port' },
    { match: ['ssl', 'certificate', 'cert'], cause: 'SSL/Certificate issue', fix: 'Update certificates, set NODE_TLS_REJECT_UNAUTHORIZED=0 for dev, check certificate chain' },
  ];

  let matched = false;
  for (const pattern of patterns) {
    if (pattern.match.some(m => t.includes(m))) {
      console.log(chalk.white('  Root Cause: ') + chalk.yellow(pattern.cause));
      console.log(chalk.white('  Fix: ') + chalk.cyan(pattern.fix));
      console.log('');
      matched = true;
      break;
    }
  }

  if (!matched) {
    console.log(chalk.gray('  Could not identify a specific pattern.'));
    console.log(chalk.gray('  Set OPENAI_API_KEY in .env.oply for AI-powered deep analysis.'));
    console.log(chalk.gray('  Run: oply init\n'));
  }
}
