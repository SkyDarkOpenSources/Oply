/**
 * oply init — Initialize a new Oply project
 * 
 * Scans the repo, detects stack, creates .oply/ directory,
 * generates AI pipeline config, and sets up .env.oply.
 */

import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import fs from 'fs';
import path from 'path';
import config from '../config.js';
import { initStore, addDeployment } from '../store.js';
import { isGitRepo, getCurrentBranch, getCommitHash, getRemoteUrl } from '../git.js';
import { apiSync } from '../api.js';

export function initCommand(program) {
  program
    .command('init')
    .description('Initialize an Oply project in the current directory')
    .option('-r, --repo <url>', 'GitHub repository URL')
    .option('-n, --name <name>', 'Project name')
    .option('--api <url>', 'Oply API URL (default: http://localhost:3000/api)')
    .action(async (options) => {
      try {
        if (options.api) {
          config.set('apiUrl', options.api);
        }

        const cwd = process.cwd();
        console.log(chalk.gray(`  Working directory: ${cwd}\n`));

        // ─── Check for existing config ────────────
        const existingConfig = path.join(cwd, 'oply.config.json');
        if (fs.existsSync(existingConfig)) {
          const overwrite = await inquirer.prompt([{
            type: 'confirm',
            name: 'proceed',
            message: 'oply.config.json already exists. Overwrite?',
            default: false,
          }]);
          if (!overwrite.proceed) {
            console.log(chalk.gray('\n  Init cancelled.\n'));
            return;
          }
        }

        // ─── Step 1: Detect project info ──────────
        const spinner = ora('Scanning project structure...').start();

        const detected = detectProjectType(cwd);
        const isGit = isGitRepo(cwd);
        const branch = isGit ? getCurrentBranch(cwd) : 'main';
        const commitHash = isGit ? getCommitHash(cwd) : 'none';
        const remoteUrl = isGit ? getRemoteUrl(cwd) : '';

        spinner.succeed(
          `Detected: ${chalk.cyan(detected.language)} / ${chalk.cyan(detected.framework)} / ${chalk.cyan(detected.packageManager)}`
        );

        if (isGit) {
          console.log(chalk.gray(`  Git: ${branch} @ ${commitHash}`));
          if (remoteUrl) console.log(chalk.gray(`  Remote: ${remoteUrl}`));
        } else {
          console.log(chalk.yellow('  ⚠ Not a git repository — some features will be limited'));
        }
        console.log('');

        // ─── Step 2: Gather project info ──────────
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
            default: options.repo || remoteUrl || '',
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
            default: branch,
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

        // ─── Step 3: Ask for API keys ─────────────
        console.log('');
        console.log(chalk.bold('  🔑 API Keys (optional — stored in .env.oply)'));
        console.log(chalk.gray('  Press Enter to skip any key.\n'));

        const keyAnswers = await inquirer.prompt([
          {
            type: 'password',
            name: 'groqKey',
            message: 'Groq API Key (from console.groq.com):',
            default: process.env.GROQ_API_KEY || '',
            mask: '*',
          },
          {
            type: 'password',
            name: 'githubToken',
            message: 'GitHub Token (for deployment status):',
            default: process.env.GITHUB_TOKEN || '',
            mask: '*',
          },
        ]);

        // ─── Step 4: Generate pipeline DAG ────────
        const dagSpinner = ora('Generating optimal pipeline DAG...').start();
        
        const dag = generateDefaultDAG(detected);
        
        await sleep(800);
        dagSpinner.succeed('Pipeline DAG generated');

        console.log('');
        console.log(chalk.bold('  Pipeline Stages:'));
        dag.forEach((step) => {
          const icon = step.type === 'BUILD' ? '📦' :
                       step.type === 'TEST' ? '🧪' :
                       step.type === 'LINT' ? '🔍' :
                       step.type === 'SECURITY_SCAN' ? '🛡️' :
                       step.type === 'DEPLOY' ? '🚀' : '⚙️';
          const deps = step.dependsOn.length > 0 ? chalk.gray(` ← depends on: ${step.dependsOn.join(', ')}`) : '';
          console.log(`  ${icon} ${chalk.white(step.name)} ${chalk.gray(`(${step.command})`)}${deps}`);
        });
        console.log('');

        // ─── Step 5: Write oply.config.json ───────
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

        // ─── Step 6: Create .oply/ directory ──────
        const storeSpinner = ora('Initializing local state store...').start();
        initStore(cwd);
        storeSpinner.succeed('Local state store created (.oply/)');

        // ─── Step 6.5: Sync Project to SaaS ───────
        try {
          await apiSync('/v1/projects', {
            name: answers.name,
            provider: answers.provider,
            repositoryUrl: answers.repo,
          });
        } catch (err) {}

        // ─── Step 7: Write .env.oply ──────────────
        const envLines = [
          '# ═══════════════════════════════════════════════════',
          '# Oply — Project Environment Variables',
          '# This file is gitignored. Do NOT commit it.',
          '# ═══════════════════════════════════════════════════',
          '',
          '# Groq API Key (required for AI features)',
          `GROQ_API_KEY=${keyAnswers.groqKey || ''}`,
          '',
          '# GitHub Personal Access Token (optional, for deployment status)',
          `GITHUB_TOKEN=${keyAnswers.githubToken || ''}`,
          '',
          '# Docker Registry (optional)',
          `DOCKER_REGISTRY_URL=${process.env.DOCKER_REGISTRY_URL || ''}`,
          '',
        ];

        const envOplyPath = path.join(cwd, '.env.oply');
        fs.writeFileSync(envOplyPath, envLines.join('\n'));
        console.log(chalk.gray('  ✓ .env.oply created'));

        // ─── Step 8: Update .gitignore ────────────
        updateGitignore(cwd);

        // ─── Step 9: Record initial deployment ────
        if (isGit && commitHash !== 'none') {
          addDeployment({
            environment: 'development',
            commitHash,
            commitMessage: 'Initial Oply setup',
            branch,
            status: 'SUCCESS',
            strategy: 'ROLLING',
          }, cwd);
          console.log(chalk.gray(`  ✓ Initial deployment recorded (dev @ ${commitHash})`));
        }

        // ─── Done ─────────────────────────────────
        console.log('');
        console.log(chalk.green.bold('  ✅ Oply project initialized successfully!'));
        console.log('');
        console.log(chalk.gray('  Created:'));
        console.log(chalk.white('  • ') + chalk.gray('oply.config.json — project configuration'));
        console.log(chalk.white('  • ') + chalk.gray('.oply/ — local state store (gitignored)'));
        console.log(chalk.white('  • ') + chalk.gray('.env.oply — API keys (gitignored)'));
        console.log('');
        console.log(chalk.gray('  Next steps:'));
        console.log(chalk.white('  1. ') + chalk.cyan('oply stage') + chalk.gray(' — View git staging info'));
        console.log(chalk.white('  2. ') + chalk.cyan('oply status') + chalk.gray(' — Check project & deployment status'));
        console.log(chalk.white('  3. ') + chalk.cyan('oply pipeline trigger') + chalk.gray(' — Run your CI/CD pipeline'));
        console.log(chalk.white('  4. ') + chalk.cyan('oply deploy --env dev') + chalk.gray(' — Deploy to development'));
        console.log(chalk.white('  5. ') + chalk.cyan('oply ai-debug') + chalk.gray(' — AI debugging session'));
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
    hasDocker: files.includes('Dockerfile') || files.includes('docker-compose.yml') || files.includes('docker-compose.yaml'),
    hasK8s: files.includes('k8s') || files.includes('kubernetes') || files.includes('helm'),
    hasTests: false,
    buildCommand: '',
    testCommand: '',
    lintCommand: '',
    startCommand: '',
  };

  // Node.js / JavaScript / TypeScript
  if (files.includes('package.json')) {
    try {
      const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
      result.language = (pkg.devDependencies?.typescript || files.includes('tsconfig.json')) ? 'TypeScript' : 'JavaScript';
      result.packageManager = files.includes('pnpm-lock.yaml') ? 'pnpm' : files.includes('yarn.lock') ? 'yarn' : files.includes('bun.lockb') ? 'bun' : 'npm';
      
      const pm = result.packageManager;
      result.buildCommand = pkg.scripts?.build ? `${pm} run build` : '';
      result.testCommand = pkg.scripts?.test ? `${pm} test` : '';
      result.lintCommand = pkg.scripts?.lint ? `${pm} run lint` : '';
      result.startCommand = pkg.scripts?.start ? `${pm} start` : (pkg.scripts?.dev ? `${pm} run dev` : '');
      result.hasTests = !!(pkg.scripts?.test && pkg.scripts.test !== 'echo "Error: no test specified" && exit 1');

      if (pkg.dependencies?.next) result.framework = 'Next.js';
      else if (pkg.dependencies?.nuxt) result.framework = 'Nuxt.js';
      else if (pkg.dependencies?.['@nestjs/core']) result.framework = 'NestJS';
      else if (pkg.dependencies?.express) result.framework = 'Express';
      else if (pkg.dependencies?.fastify) result.framework = 'Fastify';
      else if (pkg.dependencies?.react) result.framework = 'React';
      else if (pkg.dependencies?.vue) result.framework = 'Vue.js';
      else if (pkg.dependencies?.svelte || pkg.devDependencies?.svelte) result.framework = 'Svelte';
      else if (pkg.dependencies?.['@angular/core']) result.framework = 'Angular';
      else result.framework = 'Node.js';
    } catch {
      result.language = 'JavaScript';
      result.framework = 'Node.js';
      result.packageManager = 'npm';
    }
  }
  // Python
  else if (files.includes('requirements.txt') || files.includes('pyproject.toml') || files.includes('Pipfile') || files.includes('setup.py')) {
    result.language = 'Python';
    result.packageManager = files.includes('Pipfile') ? 'pipenv' : files.includes('pyproject.toml') ? 'poetry' : 'pip';
    result.framework = files.includes('manage.py') ? 'Django' : 
                       files.includes('app.py') || files.includes('main.py') ? 'FastAPI/Flask' : 'Python';
    result.buildCommand = result.packageManager === 'poetry' ? 'poetry install' : 'pip install -r requirements.txt';
    result.testCommand = 'pytest';
    result.lintCommand = 'flake8 . || pylint .';
    result.hasTests = fs.existsSync(path.join(dir, 'tests')) || fs.existsSync(path.join(dir, 'test'));
  }
  // Go
  else if (files.includes('go.mod')) {
    result.language = 'Go';
    result.packageManager = 'go';
    result.framework = 'Go';
    result.buildCommand = 'go build ./...';
    result.testCommand = 'go test ./...';
    result.lintCommand = 'go vet ./...';
    result.hasTests = true;
  }
  // Rust
  else if (files.includes('Cargo.toml')) {
    result.language = 'Rust';
    result.packageManager = 'cargo';
    result.framework = 'Rust';
    result.buildCommand = 'cargo build --release';
    result.testCommand = 'cargo test';
    result.lintCommand = 'cargo clippy';
    result.hasTests = true;
  }
  // Java (Maven)
  else if (files.includes('pom.xml')) {
    result.language = 'Java';
    result.packageManager = 'maven';
    result.framework = 'Spring Boot';
    result.buildCommand = 'mvn package -DskipTests';
    result.testCommand = 'mvn test';
    result.lintCommand = 'mvn checkstyle:check || true';
    result.hasTests = true;
  }
  // Java (Gradle)
  else if (files.includes('build.gradle') || files.includes('build.gradle.kts')) {
    result.language = 'Java';
    result.packageManager = 'gradle';
    result.framework = 'Spring Boot';
    result.buildCommand = './gradlew build -x test';
    result.testCommand = './gradlew test';
    result.lintCommand = './gradlew check || true';
    result.hasTests = true;
  }

  return result;
}

function generateDefaultDAG(detected) {
  const steps = [];
  const pm = detected.packageManager || 'npm';

  // Install dependencies
  if (detected.language === 'TypeScript' || detected.language === 'JavaScript') {
    steps.push({ id: 'install', type: 'BUILD', name: 'Install Dependencies', command: `${pm} install`, dependsOn: [] });
    
    if (detected.lintCommand) {
      steps.push({ id: 'lint', type: 'LINT', name: 'Lint Code', command: detected.lintCommand, dependsOn: ['install'] });
    }
    if (detected.hasTests && detected.testCommand) {
      steps.push({ id: 'test', type: 'TEST', name: 'Run Tests', command: detected.testCommand, dependsOn: ['install'] });
    }
    if (detected.buildCommand) {
      const deps = ['install'];
      if (detected.lintCommand) deps.push('lint');
      if (detected.hasTests) deps.push('test');
      steps.push({ id: 'build', type: 'BUILD', name: 'Build', command: detected.buildCommand, dependsOn: deps });
    }
  } else if (detected.language === 'Python') {
    steps.push({ id: 'install', type: 'BUILD', name: 'Install Dependencies', command: detected.buildCommand, dependsOn: [] });
    if (detected.lintCommand) {
      steps.push({ id: 'lint', type: 'LINT', name: 'Lint', command: detected.lintCommand, dependsOn: ['install'] });
    }
    if (detected.hasTests) {
      steps.push({ id: 'test', type: 'TEST', name: 'Tests', command: detected.testCommand, dependsOn: ['install'] });
    }
  } else if (detected.language === 'Go') {
    steps.push({ id: 'lint', type: 'LINT', name: 'Go Vet', command: 'go vet ./...', dependsOn: [] });
    steps.push({ id: 'test', type: 'TEST', name: 'Tests', command: 'go test ./...', dependsOn: [] });
    steps.push({ id: 'build', type: 'BUILD', name: 'Build', command: 'go build -o bin/app ./...', dependsOn: ['lint', 'test'] });
  } else if (detected.language === 'Rust') {
    steps.push({ id: 'lint', type: 'LINT', name: 'Clippy', command: 'cargo clippy', dependsOn: [] });
    steps.push({ id: 'test', type: 'TEST', name: 'Tests', command: 'cargo test', dependsOn: [] });
    steps.push({ id: 'build', type: 'BUILD', name: 'Build', command: 'cargo build --release', dependsOn: ['lint', 'test'] });
  } else {
    if (detected.buildCommand) {
      steps.push({ id: 'build', type: 'BUILD', name: 'Build', command: detected.buildCommand, dependsOn: [] });
    }
  }

  // Docker stages (only if Dockerfile exists)
  if (detected.hasDocker) {
    const lastBuildStep = steps.length > 0 ? steps[steps.length - 1].id : null;
    const dockerDeps = lastBuildStep ? [lastBuildStep] : [];
    steps.push({ id: 'docker-build', type: 'BUILD', name: 'Docker Build', command: 'docker build -t $IMAGE .', dependsOn: dockerDeps });
    steps.push({ id: 'docker-push', type: 'BUILD', name: 'Docker Push', command: 'docker push $IMAGE', dependsOn: ['docker-build'] });
  }

  // K8s deploy (only if k8s manifests exist)
  if (detected.hasK8s) {
    const lastStep = steps.length > 0 ? steps[steps.length - 1].id : null;
    const k8sDeps = lastStep ? [lastStep] : [];
    steps.push({ id: 'k8s-deploy', type: 'DEPLOY', name: 'Deploy to K8s', command: 'kubectl apply -f k8s/', dependsOn: k8sDeps });
  }

  return steps;
}

function updateGitignore(cwd) {
  const gitignorePath = path.join(cwd, '.gitignore');
  const entriesToAdd = ['.oply/', '.env.oply'];
  
  let content = '';
  if (fs.existsSync(gitignorePath)) {
    content = fs.readFileSync(gitignorePath, 'utf8');
  }

  const lines = content.split('\n');
  let modified = false;

  entriesToAdd.forEach(entry => {
    if (!lines.some(line => line.trim() === entry)) {
      lines.push(entry);
      modified = true;
    }
  });

  if (modified) {
    // Add a section header if we're adding new entries
    if (!content.includes('# Oply')) {
      const insertIdx = lines.length - entriesToAdd.length;
      lines.splice(insertIdx, 0, '', '# Oply');
    }
    fs.writeFileSync(gitignorePath, lines.join('\n'));
    console.log(chalk.gray('  ✓ .gitignore updated (.oply/, .env.oply)'));
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
