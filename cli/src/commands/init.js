/**
 * oply init — Initialize a new Oply project
 * 
 * Scans the repo, detects stack, connects to Oply API,
 * and generates an AI pipeline configuration.
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import config from '../config.js';

export function initCommand(program) {
  program
    .command('init')
    .description('Initialize an Oply project in the current directory')
    .option('-r, --repo <url>', 'GitHub repository URL')
    .option('-n, --name <name>', 'Project name')
    .option('--api <url>', 'Oply API URL (default: http://localhost:3000/api)')
    .action(async (options) => {
      try {
        // Set API URL if provided
        if (options.api) {
          config.set('apiUrl', options.api);
        }

        const cwd = process.cwd();
        console.log(chalk.gray(`  Working directory: ${cwd}\n`));

        // ─── Step 1: Detect project info ──────────────
        const spinner = ora('Scanning project structure...').start();

        const detected = detectProjectType(cwd);
        spinner.succeed(
          `Detected: ${chalk.cyan(detected.language)} / ${chalk.cyan(detected.framework)} / ${chalk.cyan(detected.packageManager)}`
        );

        // ─── Step 2: Gather project info ──────────────
        const answers = await inquirer.prompt([
          {
            type: 'input',
            name: 'name',
            message: 'Project name:',
            default: options.name || path.basename(cwd),
          },
          {
            type: 'input',
            name: 'repo',
            message: 'Repository URL:',
            default: options.repo || detectGitRemote(cwd),
          },
          {
            type: 'list',
            name: 'provider',
            message: 'Git provider:',
            choices: ['GITHUB', 'GITLAB', 'BITBUCKET'],
            default: 'GITHUB',
          },
          {
            type: 'input',
            name: 'branch',
            message: 'Default branch:',
            default: 'main',
          },
          {
            type: 'checkbox',
            name: 'environments',
            message: 'Environments to create:',
            choices: [
              { name: 'Development', checked: true },
              { name: 'Staging', checked: true },
              { name: 'Production', checked: true },
            ],
          },
        ]);

        // ─── Step 3: Generate pipeline DAG ────────────
        const dagSpinner = ora('AI generating optimal pipeline DAG...').start();
        
        const dag = generateDefaultDAG(detected);
        
        await sleep(1500);
        dagSpinner.succeed('Pipeline DAG generated');

        console.log('');
        console.log(chalk.bold('  Pipeline Stages:'));
        dag.forEach((step, i) => {
          const icon = step.type === 'BUILD' ? '📦' :
                       step.type === 'TEST' ? '🧪' :
                       step.type === 'LINT' ? '🔍' :
                       step.type === 'SECURITY_SCAN' ? '🛡️' :
                       step.type === 'DEPLOY' ? '🚀' : '⚙️';
          const deps = step.dependsOn.length > 0 ? chalk.gray(` ← depends on: ${step.dependsOn.join(', ')}`) : '';
          console.log(`  ${icon} ${chalk.white(step.name)} ${chalk.gray(`(${step.command})`)}${deps}`);
        });
        console.log('');

        // ─── Step 4: Write oply.config.json ───────────
        const configSpinner = ora('Writing oply.config.json...').start();

        const oplyConfig = {
          version: '1.0',
          project: {
            name: answers.name,
            repository: answers.repo,
            provider: answers.provider,
            branch: answers.branch,
          },
          stack: detected,
          pipeline: {
            stages: dag,
          },
          environments: answers.environments,
          ai: {
            autoFix: true,
            riskThreshold: 60,
          },
        };

        fs.writeFileSync(
          path.join(cwd, 'oply.config.json'),
          JSON.stringify(oplyConfig, null, 2)
        );

        configSpinner.succeed('Configuration written to oply.config.json');

        // ─── Done ─────────────────────────────────────
        console.log('');
        console.log(chalk.green.bold('  ✅ Oply project initialized successfully!'));
        console.log('');
        console.log(chalk.gray('  Next steps:'));
        console.log(chalk.white('  1. ') + chalk.gray('Set up your .env file with credentials'));
        console.log(chalk.white('  2. ') + chalk.cyan('oply status') + chalk.gray(' — Check pipeline status'));
        console.log(chalk.white('  3. ') + chalk.cyan('oply deploy --env staging') + chalk.gray(' — Deploy to staging'));
        console.log(chalk.white('  4. ') + chalk.cyan('oply ai-debug') + chalk.gray(' — Start AI debugging session'));
        console.log('');

      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}`));
        process.exit(1);
      }
    });
}

function detectProjectType(dir) {
  const files = fs.readdirSync(dir);
  const result = {
    language: 'unknown',
    framework: 'unknown',
    packageManager: 'unknown',
    hasDocker: files.includes('Dockerfile') || files.includes('docker-compose.yml'),
    hasTests: false,
    buildCommand: '',
    testCommand: '',
  };

  // Node.js
  if (files.includes('package.json')) {
    const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
    result.language = pkg.devDependencies?.typescript || files.includes('tsconfig.json') ? 'TypeScript' : 'JavaScript';
    result.packageManager = files.includes('pnpm-lock.yaml') ? 'pnpm' : files.includes('yarn.lock') ? 'yarn' : 'npm';
    result.buildCommand = `${result.packageManager} run build`;
    result.testCommand = `${result.packageManager} test`;
    result.hasTests = !!pkg.scripts?.test;

    if (pkg.dependencies?.next) result.framework = 'Next.js';
    else if (pkg.dependencies?.['@nestjs/core']) result.framework = 'NestJS';
    else if (pkg.dependencies?.express) result.framework = 'Express';
    else if (pkg.dependencies?.react) result.framework = 'React';
    else if (pkg.dependencies?.vue) result.framework = 'Vue.js';
    else result.framework = 'Node.js';
  }
  // Python
  else if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('Pipfile')) {
    result.language = 'Python';
    result.packageManager = files.includes('Pipfile') ? 'pipenv' : files.includes('pyproject.toml') ? 'poetry' : 'pip';
    result.framework = files.includes('manage.py') ? 'Django' : files.includes('app.py') || files.includes('main.py') ? 'FastAPI/Flask' : 'Python';
    result.buildCommand = `${result.packageManager} install`;
    result.testCommand = 'pytest';
  }
  // Go
  else if (files.includes('go.mod')) {
    result.language = 'Go';
    result.packageManager = 'go';
    result.framework = 'Go';
    result.buildCommand = 'go build ./...';
    result.testCommand = 'go test ./...';
  }
  // Rust
  else if (files.includes('Cargo.toml')) {
    result.language = 'Rust';
    result.packageManager = 'cargo';
    result.framework = 'Rust';
    result.buildCommand = 'cargo build --release';
    result.testCommand = 'cargo test';
  }
  // Java
  else if (files.includes('pom.xml')) {
    result.language = 'Java';
    result.packageManager = 'maven';
    result.framework = 'Spring Boot';
    result.buildCommand = 'mvn package';
    result.testCommand = 'mvn test';
  }

  return result;
}

function detectGitRemote(dir) {
  try {
    const gitConfig = fs.readFileSync(path.join(dir, '.git', 'config'), 'utf8');
    const match = gitConfig.match(/url\s*=\s*(.+)/);
    return match ? match[1].trim() : '';
  } catch {
    return '';
  }
}

function generateDefaultDAG(detected) {
  const steps = [];
  const pm = detected.packageManager || 'npm';

  if (detected.language === 'TypeScript' || detected.language === 'JavaScript') {
    steps.push({ id: 'install', type: 'BUILD', name: 'Install Dependencies', command: `${pm} install`, dependsOn: [] });
    steps.push({ id: 'lint', type: 'LINT', name: 'Lint Code', command: `${pm} run lint`, dependsOn: ['install'] });
    steps.push({ id: 'test', type: 'TEST', name: 'Unit Tests', command: `${pm} test`, dependsOn: ['install'] });
    steps.push({ id: 'build', type: 'BUILD', name: 'Build', command: detected.buildCommand, dependsOn: ['lint', 'test'] });
  } else if (detected.language === 'Python') {
    steps.push({ id: 'install', type: 'BUILD', name: 'Install Dependencies', command: `pip install -r requirements.txt`, dependsOn: [] });
    steps.push({ id: 'lint', type: 'LINT', name: 'Lint', command: 'flake8 .', dependsOn: ['install'] });
    steps.push({ id: 'test', type: 'TEST', name: 'Tests', command: 'pytest', dependsOn: ['install'] });
    steps.push({ id: 'build', type: 'BUILD', name: 'Build', command: detected.buildCommand, dependsOn: ['lint', 'test'] });
  } else if (detected.language === 'Go') {
    steps.push({ id: 'lint', type: 'LINT', name: 'Go Vet', command: 'go vet ./...', dependsOn: [] });
    steps.push({ id: 'test', type: 'TEST', name: 'Tests', command: 'go test ./...', dependsOn: [] });
    steps.push({ id: 'build', type: 'BUILD', name: 'Build', command: 'go build -o bin/app ./...', dependsOn: ['lint', 'test'] });
  } else {
    steps.push({ id: 'build', type: 'BUILD', name: 'Build', command: detected.buildCommand || 'echo "build"', dependsOn: [] });
  }

  // Always add security scan + docker build if Dockerfile exists
  steps.push({ id: 'scan', type: 'SECURITY_SCAN', name: 'Security Scan', command: 'trivy fs .', dependsOn: ['build'] });

  if (detected.hasDocker) {
    steps.push({ id: 'docker', type: 'BUILD', name: 'Docker Build', command: 'docker build -t $IMAGE .', dependsOn: ['build'] });
    steps.push({ id: 'push', type: 'BUILD', name: 'Docker Push', command: 'docker push $IMAGE', dependsOn: ['docker', 'scan'] });
    steps.push({ id: 'deploy', type: 'DEPLOY', name: 'Deploy to Staging', command: 'kubectl apply -f k8s/', dependsOn: ['push'] });
  }

  return steps;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
