/**
 * oply docker — Docker operations (build, push, scan, prune)
 */
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import config from '../config.js';

export function dockerCommand(program) {
  const cmd = program.command('docker').description('Docker build, push, and management');

  cmd.command('build')
    .description('Build a Docker image from the current directory')
    .option('-t, --tag <tag>', 'Image tag')
    .option('-f, --file <path>', 'Dockerfile path', 'Dockerfile')
    .action(async (options) => {
      const registry = config.get('dockerRegistry') || process.env.DOCKER_REGISTRY_URL || 'registry.oply.io';
      const commitHash = getHash();
      const tag = options.tag || `${registry}/app:${commitHash}`;

      const spinner = ora(`Building image: ${chalk.cyan(tag)}`).start();
      try {
        execSync(`docker build -t ${tag} -f ${options.file} .`, { stdio: 'pipe', timeout: 300000 });
        spinner.succeed(`Image built: ${chalk.cyan(tag)}`);
        console.log(chalk.gray(`\n  Push with: oply docker push --tag ${tag}\n`));
      } catch (err) {
        spinner.fail('Docker build failed');
        console.log(chalk.red(`\n  ${getErrorSummary(err)}`));
        console.log(chalk.gray('  Debug with: oply ai-debug\n'));
      }
    });

  cmd.command('push')
    .description('Push a Docker image to the registry')
    .option('-t, --tag <tag>', 'Image tag to push')
    .action(async (options) => {
      if (!options.tag) {
        console.log(chalk.red('\n  --tag is required. Example: oply docker push --tag myapp:latest\n'));
        return;
      }
      const spinner = ora(`Pushing: ${chalk.cyan(options.tag)}`).start();
      try {
        execSync(`docker push ${options.tag}`, { stdio: 'pipe', timeout: 120000 });
        spinner.succeed(`Pushed: ${chalk.cyan(options.tag)}`);
      } catch (err) {
        spinner.fail('Push failed');
        console.log(chalk.red(`\n  ${getErrorSummary(err)}`));
        console.log(chalk.gray('  Check registry credentials and Docker login.\n'));
      }
    });

  cmd.command('ps')
    .description('List running Docker containers')
    .action(async () => {
      try {
        const output = execSync('docker ps --format "table {{.Names}}\\t{{.Image}}\\t{{.Status}}\\t{{.Ports}}"', { encoding: 'utf8' });
        console.log(chalk.bold('\n  Running Containers:\n'));
        console.log(output);
      } catch {
        console.log(chalk.red('\n  Docker is not running or not installed.\n'));
      }
    });

  cmd.command('scan')
    .description('Security scan a Docker image with Trivy')
    .option('-t, --tag <tag>', 'Image tag to scan')
    .action(async (options) => {
      const tag = options.tag || '.';
      const spinner = ora(`Scanning ${tag}...`).start();
      try {
        const output = execSync(`trivy image ${tag} --severity HIGH,CRITICAL --format table 2>&1`, { encoding: 'utf8', timeout: 120000 });
        spinner.succeed('Scan complete');
        console.log(output);
      } catch {
        spinner.warn('Trivy not installed — install with: brew install trivy');
        try {
          execSync(`docker run --rm aquasec/trivy image ${tag} --severity HIGH,CRITICAL`, { stdio: 'inherit', timeout: 120000 });
        } catch { console.log(chalk.gray('\n  Could not run security scan.\n')); }
      }
    });

  cmd.command('prune')
    .description('Clean up unused Docker resources')
    .action(async () => {
      const confirm = await inquirer.prompt([{ type: 'confirm', name: 'proceed', message: 'Remove all unused Docker images, containers, and volumes?', default: false }]);
      if (!confirm.proceed) return;
      const spinner = ora('Pruning Docker resources...').start();
      try {
        execSync('docker system prune -af --volumes', { stdio: 'pipe', timeout: 60000 });
        spinner.succeed('Docker resources cleaned');
      } catch (err) { spinner.fail('Prune failed: ' + getErrorSummary(err)); }
    });
}

function getHash() {
  try { return execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(); }
  catch { return Date.now().toString(36); }
}
function getErrorSummary(err) {
  return (err.stderr || err.message || 'Unknown error').toString().split('\n')[0];
}
