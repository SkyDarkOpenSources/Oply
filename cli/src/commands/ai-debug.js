/**
 * oply ai-debug — Interactive AI debugging session
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';

export function aiDebugCommand(program) {
  program
    .command('ai-debug')
    .description('Start an interactive AI debugging session')
    .option('--logs <file>', 'Path to log file to analyze')
    .option('--error <message>', 'Error message to debug')
    .action(async (options) => {
      try {
        console.log(chalk.bold('\n  🤖 Oply AI Debugger'));
        console.log(chalk.gray('  Powered by GPT-4o • Full project context\n'));

        const apiKey = process.env.OPENAI_API_KEY;
        let errorContext = options.error || '';
        let logContent = '';
        let gitDiff = '';

        if (!errorContext) {
          const answers = await inquirer.prompt([{
            type: 'list', name: 'mode', message: 'What would you like to debug?',
            choices: [
              { name: '🔴 Last failed pipeline run', value: 'pipeline' },
              { name: '📋 Paste an error message', value: 'paste' },
              { name: '🐳 Docker build failure', value: 'docker' },
              { name: '☸️  Kubernetes deployment issue', value: 'k8s' },
              { name: '💬 General DevOps question', value: 'general' },
            ],
          }]);

          if (answers.mode === 'paste') {
            const input = await inquirer.prompt([{ type: 'input', name: 'error', message: 'Paste the error:' }]);
            errorContext = input.error;
          } else if (answers.mode === 'docker') {
            errorContext = 'Docker build/push failure';
            try { logContent = execSync('docker logs $(docker ps -lq) 2>&1 | tail -100', { encoding: 'utf8' }); } catch { logContent = ''; }
          } else if (answers.mode === 'k8s') {
            errorContext = 'Kubernetes deployment issue';
            try { logContent = execSync('kubectl get events --sort-by=.lastTimestamp 2>&1 | tail -50', { encoding: 'utf8' }); } catch { logContent = ''; }
          } else if (answers.mode === 'general') {
            const q = await inquirer.prompt([{ type: 'input', name: 'query', message: 'What do you need help with?' }]);
            errorContext = q.query;
          } else {
            errorContext = 'Pipeline execution failure';
          }
        }

        try { gitDiff = execSync('git diff HEAD~1 2>/dev/null || echo ""', { encoding: 'utf8' }).slice(0, 2000); } catch { gitDiff = ''; }

        const spinner = ora('AI analyzing the issue...').start();

        if (!apiKey) {
          spinner.warn('OPENAI_API_KEY not set — showing pattern-based analysis');
          showPatternAnalysis(errorContext + ' ' + logContent);
          return;
        }

        try {
          const OpenAI = (await import('openai')).default;
          const openai = new OpenAI({ apiKey });
          const stream = await openai.chat.completions.create({
            model: 'gpt-4o', stream: true, temperature: 0.3, max_tokens: 1500,
            messages: [
              { role: 'system', content: 'You are the Oply Failure Analysis Engine. Identify root cause, classify error type (CODE_ERROR|INFRASTRUCTURE|DEPENDENCY|CONFIGURATION|PERMISSION), and give actionable fixes. Be concise.' },
              { role: 'user', content: `Error: ${errorContext}\nLogs:\n${logContent}\nDiff:\n${gitDiff}` },
            ],
          });
          spinner.succeed('Analysis complete\n');
          for await (const chunk of stream) {
            process.stdout.write(chunk.choices[0]?.delta?.content || '');
          }
          console.log('\n');
        } catch (err) {
          spinner.fail('AI analysis failed: ' + err.message);
          showPatternAnalysis(errorContext);
        }
      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });
}

function showPatternAnalysis(text) {
  const t = text.toLowerCase();
  console.log(chalk.bold('\n  📋 Pattern-Based Analysis\n'));
  if (t.includes('permission denied') || t.includes('eacces')) {
    console.log('  Root Cause: Insufficient permissions');
    console.log('  Fix: ' + chalk.cyan('chmod +x <file> or check service account'));
  } else if (t.includes('oom') || t.includes('out of memory')) {
    console.log('  Root Cause: Out of memory');
    console.log('  Fix: ' + chalk.cyan('Increase memory limits in K8s/Docker'));
  } else if (t.includes('timeout')) {
    console.log('  Root Cause: Operation timeout');
    console.log('  Fix: ' + chalk.cyan('Check network and increase timeout'));
  } else if (t.includes('npm err') || t.includes('module not found')) {
    console.log('  Root Cause: Dependency failure');
    console.log('  Fix: ' + chalk.cyan('rm -rf node_modules && npm install'));
  } else {
    console.log('  Set OPENAI_API_KEY for deep AI-powered analysis');
  }
  console.log('');
}
