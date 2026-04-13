/**
 * oply ai-debug — Interactive AI debugging session + auto-fix
 * 
 * Reads actual project context:
 * - oply.config.json (stack, framework)
 * - Recent git commits and diffs
 * - Latest pipeline run logs from .oply/
 * - Project source files for error context
 * 
 * --auto-fix: Self-healing loop that:
 *   1. Runs the pipeline
 *   2. If it fails → reads error logs → calls AI
 *   3. AI returns patch → auto-applies it
 *   4. Re-runs the pipeline
 *   5. Repeats up to 3 times or until success
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { loadProject, tryLoadProject } from '../project.js';
import { getPipelineRuns, getRunLogs } from '../store.js';
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
    .description('AI-powered debugging with optional self-healing')
    .option('--logs <file>', 'Path to log file to analyze')
    .option('--error <message>', 'Error message to debug')
    .option('--file <path>', 'Source file to include in context')
    .option('--run <id>', 'Pipeline run ID to debug')
    .option('--auto-fix', 'Self-healing mode: detect → fix → re-run pipeline (up to 3 attempts)')
    .action(async (options) => {
      try {
        console.log(chalk.bold('\n  🤖 Oply AI Debugger'));
        console.log(chalk.gray('  Powered by LangChain + Groq • Full project context'));
        if (options.autoFix) console.log(chalk.cyan.bold('  🔄 AUTO-FIX MODE ENABLED'));
        console.log('');

        // ─── Auto-Fix Loop ────────────────────────
        if (options.autoFix) {
          await selfHealingLoop();
          return;
        }

        // ─── Standard Debug Flow ──────────────────
        await standardDebugFlow(options);

      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });
}

/**
 * Self-healing loop: pipeline trigger → detect failure → AI fix → re-run
 */
async function selfHealingLoop() {
  const MAX_ATTEMPTS = 3;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    console.log(chalk.bold(`\n  ── Attempt ${attempt}/${MAX_ATTEMPTS} ──────────────────────────\n`));

    // Step 1: Run the pipeline
    const pipelineSpinner = ora('Running pipeline...').start();
    let pipelineOutput = '';
    let pipelinePassed = false;

    try {
      const project = tryLoadProject();
      const cwd = project?.projectDir || process.cwd();
      const stages = project?.config?.pipeline?.stages || [];
      
      if (stages.length === 0) {
        pipelineSpinner.fail('No pipeline stages defined. Run: oply pipeline generate');
        return;
      }

      // Execute each stage
      for (const stage of stages) {
        pipelineSpinner.text = `Running: ${stage.name}...`;
        try {
          execSync(stage.command, {
            cwd,
            encoding: 'utf8',
            timeout: 300000,
            stdio: 'pipe',
            env: { ...process.env, FORCE_COLOR: '0' },
          });
        } catch (err) {
          pipelineOutput = (err.stderr || err.stdout || err.message || '').toString();
          throw new Error(`Stage "${stage.name}" failed`);
        }
      }

      pipelinePassed = true;
      pipelineSpinner.succeed(chalk.green('Pipeline passed! ✅'));
    } catch (err) {
      pipelineSpinner.fail(`Pipeline failed: ${err.message}`);
    }

    if (pipelinePassed) {
      console.log(chalk.green.bold('\n  ✅ All stages passed. No fixes needed.\n'));
      return;
    }

    // Step 2: Gather context
    const project = tryLoadProject();
    const cwd = project?.projectDir || process.cwd();
    const stack = project?.config?.stack || {};
    const branch = isGitRepo(cwd) ? getCurrentBranch(cwd) : 'unknown';
    const commitHash = isGitRepo(cwd) ? getCommitHash(cwd) : 'none';
    const gitDiff = getRecentDiff(2000, cwd);

    // Try to detect the failing file from the error output
    const failedFile = extractFileFromLogs(pipelineOutput);
    let fileContent = '';
    if (failedFile) {
      try {
        const filePath = path.resolve(cwd, failedFile);
        if (fs.existsSync(filePath)) {
          fileContent = fs.readFileSync(filePath, 'utf8').slice(0, 4000);
          console.log(chalk.cyan(`  📁 Detected failing file: ${failedFile}`));
        }
      } catch { /* ignore */ }
    }

    // Step 3: Call AI for fix
    const aiSpinner = ora('AI analyzing failure...').start();
    try {
      const { ChatGroq } = await import('@langchain/groq');
      const { ChatPromptTemplate } = await import('@langchain/core/prompts');
      const { StringOutputParser } = await import('@langchain/core/output_parsers');

      const groqApiKey = process.env.GROQ_API_KEY;
      if (!groqApiKey) {
        aiSpinner.fail('GROQ_API_KEY not set in .env.oply');
        return;
      }

      const model = new ChatGroq({
        model: process.env.GROQ_MODEL || "llama-3.1-70b-versatile",
        maxTokens: 2048,
        temperature: 0.2,
        apiKey: groqApiKey,
      });

      const prompt = ChatPromptTemplate.fromMessages([
        ["system", REPAIR_PROMPT],
        ["user", `Error Output:\n{errorOutput}\n\nStack: {stackInfo}\nBranch: {branch} @ {commitHash}\nGit Diff:\n{diff}\nFile Content ({failedFile}):\n{fileContent}`],
      ]);

      const chain = prompt.pipe(model).pipe(new StringOutputParser());
      const result = await chain.invoke({
        errorOutput: pipelineOutput.slice(0, 2000),
        stackInfo: JSON.stringify(stack),
        branch,
        commitHash,
        diff: gitDiff.slice(0, 1000),
        failedFile: failedFile || 'unknown',
        fileContent: fileContent.slice(0, 2000),
      });

      aiSpinner.succeed('AI analysis complete');
      console.log(chalk.gray('\n  ' + result.split('\n').slice(0, 3).join('\n  ')));

      // Step 4: Parse and apply patch
      const patchInfo = parsePatch(result);
      if (patchInfo) {
        console.log('');
        console.log(chalk.bold.yellow('  🛠 Applying AI Patch:'));
        console.log(chalk.white(`  File:  ${patchInfo.file}`));
        console.log(chalk.gray(`  Fix:   ${patchInfo.description}`));

        const applySpinner = ora('Applying fix...').start();
        try {
          const filePath = path.resolve(cwd, patchInfo.file);
          if (!fs.existsSync(filePath)) throw new Error(`File not found: ${patchInfo.file}`);

          let content = fs.readFileSync(filePath, 'utf8');
          if (!content.includes(patchInfo.original)) {
            throw new Error('Original code block not found — patch cannot be applied safely');
          }

          const newContent = content.replace(patchInfo.original, patchInfo.replacement);
          fs.writeFileSync(filePath, newContent);
          applySpinner.succeed(chalk.green(`Patch applied to ${patchInfo.file}`));

          // Show diff
          console.log(chalk.gray('  ─────────────────────────────────────'));
          patchInfo.original.split('\n').forEach(l => console.log(chalk.red('  - ' + l)));
          patchInfo.replacement.split('\n').forEach(l => console.log(chalk.green('  + ' + l)));
          console.log(chalk.gray('  ─────────────────────────────────────'));

        } catch (applyErr) {
          applySpinner.fail(`Patch failed: ${applyErr.message}`);
          console.log(chalk.yellow('\n  The AI suggested a fix but it could not be applied automatically.'));
          console.log(chalk.gray('  Review the suggestion above and apply manually.\n'));
          return;
        }
      } else {
        // AI didn't provide a code patch — it might be an infra issue
        console.log(chalk.yellow('\n  ℹ AI did not provide a code patch (may be an infrastructure issue).'));
        console.log(chalk.gray('  Review the analysis above.\n'));
        return;
      }
    } catch (aiErr) {
      aiSpinner.fail('AI analysis failed: ' + aiErr.message);
      showPatternAnalysis(pipelineOutput);
      return;
    }
  }

  console.log(chalk.red.bold(`\n  ⛔ Auto-fix exhausted ${MAX_ATTEMPTS} attempts. Manual intervention needed.\n`));
}

/**
 * Standard interactive debug flow (non --auto-fix)
 */
async function standardDebugFlow(options) {
  const project = tryLoadProject();
  const cwd = project?.projectDir || process.cwd();
  const stack = project?.config?.stack || {};

  let errorContext = options.error || '';
  let logContent = '';
  let gitDiff = '';
  let fileContent = '';
  let pipelineContext = '';

  // ─── Gather project context ───────────────
  const contextSpinner = ora('Gathering project context...').start();

  const branch = isGitRepo(cwd) ? getCurrentBranch(cwd) : 'unknown';
  const commitHash = isGitRepo(cwd) ? getCommitHash(cwd) : 'none';
  const recentCommits = getRecentCommits(5, cwd);
  gitDiff = getRecentDiff(3000, cwd);

  // Pipeline run logs
  let failedRunFile = null;
  if (options.run) {
    const logs = getRunLogs(options.run, cwd);
    if (logs.length > 0) {
      pipelineContext = logs.join('\n');
      failedRunFile = extractFileFromLogs(pipelineContext);
    }
  } else {
    const runs = getPipelineRuns(cwd);
    const failedRun = runs.find(r => r.status === 'FAILED');
    if (failedRun) {
      const logs = getRunLogs(failedRun.id, cwd);
      pipelineContext = logs.join('\n');
      failedRunFile = extractFileFromLogs(pipelineContext);
      if (!errorContext) {
        errorContext = `Pipeline failure in run ${failedRun.id}. Detected issue in: ${failedRunFile || 'unknown file'}`;
      }
    }
  }

  // Auto-load detected file
  if (failedRunFile && !options.file) {
    try {
      const filePath = path.resolve(cwd, failedRunFile);
      if (fs.existsSync(filePath)) {
        fileContent = fs.readFileSync(filePath, 'utf8').slice(0, 4000);
        console.log(chalk.cyan(`  ✓ Auto-loaded suspect file: ${failedRunFile}`));
      }
    } catch { /* ignore */ }
  }

  if (options.file) {
    try {
      const filePath = path.resolve(cwd, options.file);
      fileContent = fs.readFileSync(filePath, 'utf8').slice(0, 4000);
    } catch {
      console.log(chalk.yellow(`  Warning: Could not read file: ${options.file}`));
    }
  }

  if (options.logs) {
    try {
      const logPath = path.resolve(cwd, options.logs);
      logContent = fs.readFileSync(logPath, 'utf8').slice(-3000);
    } catch {
      console.log(chalk.yellow(`  Warning: Could not read log file: ${options.logs}`));
    }
  }

  contextSpinner.succeed('Project context gathered');

  console.log(chalk.gray(`  Stack: ${stack.language || 'unknown'} / ${stack.framework || 'unknown'}`));
  console.log(chalk.gray(`  Branch: ${branch} @ ${commitHash}`));
  if (pipelineContext) console.log(chalk.gray('  Pipeline logs: ✓'));
  if (gitDiff) console.log(chalk.gray('  Git diff: ✓'));
  if (fileContent) console.log(chalk.gray(`  File: ${options.file || failedRunFile}`));
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
        type: 'editor', name: 'error', message: 'Paste the error (opens editor):',
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
        type: 'input', name: 'filePath', message: 'File path to analyze:',
      }]);
      try {
        fileContent = fs.readFileSync(path.resolve(cwd, filePath), 'utf8').slice(0, 4000);
        errorContext = `Analyze this file for issues: ${filePath}`;
      } catch (e) {
        console.log(chalk.red(`\n  Could not read file: ${e.message}\n`));
        return;
      }
    } else if (answers.mode === 'general') {
      const q = await inquirer.prompt([{
        type: 'input', name: 'query', message: 'What do you need help with?',
      }]);
      errorContext = q.query;
    } else {
      if (pipelineContext) {
        errorContext = 'Pipeline execution failure — analyze the logs below';
      } else {
        console.log(chalk.yellow('  No pipeline run logs found.'));
        const q = await inquirer.prompt([{
          type: 'input', name: 'error', message: 'Describe the issue:',
        }]);
        errorContext = q.error;
      }
    }
  } else if (failedRunFile) {
    console.log(chalk.bold.red(`\n  🚨 Auto-detecting failure in: ${failedRunFile}\n`));
  }

  // ─── AI Analysis ──────────────────────────
  const spinner = ora('AI analyzing the issue...').start();

  try {
    const { ChatGroq } = await import('@langchain/groq');
    const { ChatPromptTemplate } = await import('@langchain/core/prompts');
    const { StringOutputParser } = await import('@langchain/core/output_parsers');

    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      spinner.warn('GROQ_API_KEY not set — showing pattern-based analysis');
      console.log(chalk.gray('  Set GROQ_API_KEY in .env.oply to enable AI analysis.'));
      console.log(chalk.gray('  Run: oply init\n'));
      showPatternAnalysis(errorContext + ' ' + logContent + ' ' + pipelineContext);
      return;
    }

    const model = new ChatGroq({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
      maxTokens: 2048,
      temperature: 0.2,
      apiKey: groqApiKey,
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", REPAIR_PROMPT],
      ["user", `Error: {errorContext}\n\nContext:\n- Git: {branch} @ {commitHash}\n- Recent Commits: {recentCommits}\n- Pipeline Logs: {pipelineContext}\n- Log Content: {logContent}\n- Git Diff: {gitDiff}\n- File Content: {fileContent}`],
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    const result = await chain.invoke({
      errorContext,
      branch,
      commitHash,
      recentCommits: JSON.stringify(recentCommits.slice(0, 3)),
      pipelineContext: pipelineContext.slice(0, 1500),
      logContent: logContent.slice(0, 1500),
      gitDiff: gitDiff.slice(0, 1000),
      fileContent: fileContent.slice(0, 2000),
    });

    spinner.succeed('Analysis complete\n');
    console.log(result);
    console.log('\n');

    // ─── Patch Detection & Application ───────
    const patchInfo = parsePatch(result);
    if (patchInfo) {
      console.log(chalk.bold.yellow('  🛠 AI Suggested a Patch:'));
      console.log(chalk.white(`  File:        ${patchInfo.file}`));
      console.log(chalk.white(`  Description: ${patchInfo.description}`));
      console.log(chalk.gray('  ──────────────────────────────────────────────────'));
      console.log(chalk.red('- ' + patchInfo.original.split('\n').join('\n- ')));
      console.log(chalk.green('+ ' + patchInfo.replacement.split('\n').join('\n+ ')));
      console.log(chalk.gray('  ──────────────────────────────────────────────────\n'));

      const { apply } = await inquirer.prompt([{
        type: 'confirm',
        name: 'apply',
        message: chalk.cyan(`Apply this fix to ${patchInfo.file}?`),
        default: false,
      }]);

      if (apply) {
        const applySpinner = ora('Applying patch...').start();
        try {
          const filePath = path.resolve(cwd, patchInfo.file);
          if (!fs.existsSync(filePath)) throw new Error(`File not found: ${patchInfo.file}`);

          let content = fs.readFileSync(filePath, 'utf8');
          if (!content.includes(patchInfo.original)) {
            throw new Error('Original code block not found exactly — patch cannot be applied safely');
          }

          const newContent = content.replace(patchInfo.original, patchInfo.replacement);
          fs.writeFileSync(filePath, newContent);

          applySpinner.succeed(chalk.green(`Patch applied to ${patchInfo.file}!`));
          console.log(chalk.gray('  Run ') + chalk.cyan('oply pipeline trigger') + chalk.gray(' to test the fix.\n'));
        } catch (err) {
          applySpinner.fail(`Failed to apply patch: ${err.message}`);
        }
      }
    }

    // ─── Conversational Loop ──────────────────
    let exitChat = false;
    while (!exitChat) {
      const { followUp } = await inquirer.prompt([{
        type: 'input',
        name: 'followUp',
        message: chalk.cyan('Follow-up (Enter to exit):'),
      }]);

      if (!followUp) { exitChat = true; break; }

      const chatSpinner = ora('Thinking...').start();
      try {
        const followUpPrompt = ChatPromptTemplate.fromMessages([
          ["system", `You are the Oply CLI DevOps assistant. Be concise and action-oriented. Give exact commands when possible.`],
          ["user", `Previous error context: {errorContext}\n\nNew question: {followUp}`],
        ]);
        const followUpChain = followUpPrompt.pipe(model).pipe(new StringOutputParser());
        const followUpResult = await followUpChain.invoke({ errorContext, followUp });
        chatSpinner.stop();
        console.log('\n' + followUpResult + '\n');
      } catch (chatErr) {
        chatSpinner.fail('Error: ' + chatErr.message);
        exitChat = true;
      }
    }

  } catch (err) {
    spinner.fail('AI analysis failed: ' + err.message);
    showPatternAnalysis(errorContext + ' ' + logContent);
  }
}

// ─── Inline Prompts ─────────────────────────────────────────

const REPAIR_PROMPT = `You are the Oply Autonomous Repair Agent. You fix broken CI/CD pipelines by editing code files directly.

CRITICAL RULES:
1. When fixing code, you MUST use this exact patch format so the CLI can apply it:

[FIX_FILE]: <relative_path_to_file>
[FIX_DESCRIPTION]: <what the fix does in one sentence>
[FIX_REPLACE_START]
<exact original code to replace — must match file content>
[FIX_REPLACE_WITH]
<fixed code>
[FIX_REPLACE_END]

2. Provide ONLY ONE patch per response.
3. The [FIX_REPLACE_START] block must match the source file EXACTLY (including whitespace).
4. Be surgical — change the minimum lines needed.
5. Write 1-2 sentences explaining the fix. No more.

If the error is NOT a code bug (e.g., timeout, OOM, missing binary):
- Do NOT output a patch
- Give the exact terminal command to fix it`;

// ─── Helpers ────────────────────────────────────────────────

function showPatternAnalysis(text) {
  const t = (text || '').toLowerCase();
  console.log(chalk.bold('\n  📋 Pattern-Based Analysis\n'));

  const patterns = [
    { match: ['permission denied', 'eacces', 'access denied'], cause: 'Insufficient permissions', fix: 'chmod +x <file>, check service account roles' },
    { match: ['oom', 'out of memory', 'heap out of memory', 'javascript heap'], cause: 'Out of memory', fix: 'NODE_OPTIONS="--max-old-space-size=4096" or update K8s resource limits' },
    { match: ['timeout', 'timedout', 'etimedout', 'socket hang up'], cause: 'Operation timed out', fix: 'Check network, increase timeout values, verify DNS' },
    { match: ['npm err', 'module not found', 'cannot find module', 'eresolve'], cause: 'Dependency failure', fix: 'rm -rf node_modules && npm install' },
    { match: ['econnrefused', 'connection refused'], cause: 'Service unreachable', fix: 'Check if the target service is running, verify host/port' },
    { match: ['docker', 'dockerfile', 'image build'], cause: 'Docker build failure', fix: 'Check Dockerfile syntax, verify base image exists' },
    { match: ['kubectl', 'kubernetes', 'pod'], cause: 'Kubernetes issue', fix: 'kubectl describe pod <name>, kubectl get events' },
    { match: ['syntax error', 'unexpected token', 'parsing error'], cause: 'Syntax error', fix: 'Check file in error, run: npm run lint' },
    { match: ['type error', 'typeerror', 'is not a function'], cause: 'Runtime type error', fix: 'Add null checks, verify function signatures' },
    { match: ['enoent', 'no such file', 'file not found'], cause: 'File not found', fix: 'Verify file path, check cwd' },
    { match: ['port', 'eaddrinuse', 'address already in use'], cause: 'Port in use', fix: 'Kill existing process or use a different port' },
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
    console.log(chalk.gray('  Could not identify a pattern.'));
    console.log(chalk.gray('  Set GROQ_API_KEY in .env.oply for AI analysis.'));
    console.log(chalk.gray('  Run: oply init\n'));
  }
}

function extractFileFromLogs(logs) {
  if (!logs) return null;
  const patterns = [
    /(?:at\s+.*\s+\()([^)]+\.[jt]sx?):(\d+):(\d+)\)/,
    /(\/[^:\s]+\.[jt]sx?):(\d+):(\d+)/,
    /\s+([^:\s]+\.[jt]sx?):(\d+)/,
  ];
  for (const pattern of patterns) {
    const match = logs.match(pattern);
    if (match) {
      const file = match[1];
      if (!file.includes('node_modules') && !file.includes('internal/')) return file;
    }
  }
  return null;
}

function parsePatch(text) {
  try {
    const fileMatch = text.match(/\[FIX_FILE\]:\s*(.*)/);
    const descMatch = text.match(/\[FIX_DESCRIPTION\]:\s*(.*)/);
    const startIdx = text.indexOf('[FIX_REPLACE_START]');
    const midIdx = text.indexOf('[FIX_REPLACE_WITH]');
    const endIdx = text.indexOf('[FIX_REPLACE_END]');

    if (fileMatch && startIdx !== -1 && midIdx !== -1 && endIdx !== -1) {
      return {
        file: fileMatch[1].trim(),
        description: descMatch ? descMatch[1].trim() : 'AI-generated fix',
        original: text.slice(startIdx + '[FIX_REPLACE_START]'.length, midIdx).trim(),
        replacement: text.slice(midIdx + '[FIX_REPLACE_WITH]'.length, endIdx).trim(),
      };
    }
  } catch { /* ignore */ }
  return null;
}
