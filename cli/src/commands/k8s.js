/**
 * oply k8s — Kubernetes cluster operations
 */
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import Table from 'cli-table3';

export function k8sCommand(program) {
  const cmd = program.command('k8s').description('Kubernetes cluster operations');

  cmd.command('status')
    .description('Show cluster and node status')
    .option('-n, --namespace <ns>', 'Namespace', 'default')
    .action(async (options) => {
      const spinner = ora('Connecting to cluster...').start();
      try {
        const context = execSync('kubectl config current-context', { encoding: 'utf8' }).trim();
        spinner.succeed(`Connected to: ${chalk.cyan(context)}`);

        console.log(chalk.bold('\n  Nodes:'));
        execSync('kubectl get nodes -o wide', { stdio: 'inherit' });

        console.log(chalk.bold('\n  Pods in ' + options.namespace + ':'));
        execSync(`kubectl get pods -n ${options.namespace} -o wide`, { stdio: 'inherit' });

        console.log(chalk.bold('\n  Services:'));
        execSync(`kubectl get svc -n ${options.namespace}`, { stdio: 'inherit' });
        console.log('');
      } catch {
        spinner.fail('Cannot connect to Kubernetes cluster');
        console.log(chalk.gray('\n  Ensure kubectl is installed and configured.'));
        console.log(chalk.gray('  Run: kubectl config get-contexts\n'));
      }
    });

  cmd.command('pods')
    .description('List pods with status')
    .option('-n, --namespace <ns>', 'Namespace', 'default')
    .option('-A, --all-namespaces', 'All namespaces')
    .action(async (options) => {
      try {
        const nsFlag = options.allNamespaces ? '-A' : `-n ${options.namespace}`;
        execSync(`kubectl get pods ${nsFlag} -o wide`, { stdio: 'inherit' });
      } catch {
        console.log(chalk.red('\n  Failed to list pods. Check kubectl configuration.\n'));
      }
    });

  cmd.command('apply')
    .description('Apply Kubernetes manifests')
    .option('-f, --file <path>', 'Manifest file or directory', 'k8s/')
    .option('-n, --namespace <ns>', 'Namespace', 'default')
    .option('--dry-run', 'Client-side dry run')
    .action(async (options) => {
      const dryRun = options.dryRun ? ' --dry-run=client' : '';
      const spinner = ora(`Applying manifests from ${options.file}...`).start();
      try {
        const output = execSync(`kubectl apply -f ${options.file} -n ${options.namespace}${dryRun}`, { encoding: 'utf8' });
        spinner.succeed('Manifests applied');
        console.log(chalk.gray(output));
      } catch (err) {
        spinner.fail('Apply failed');
        console.log(chalk.red(`  ${(err.stderr || err.message).toString().split('\n')[0]}\n`));
      }
    });

  cmd.command('rollout')
    .description('Check rollout status of a deployment')
    .option('-d, --deployment <name>', 'Deployment name')
    .option('-n, --namespace <ns>', 'Namespace', 'default')
    .action(async (options) => {
      if (!options.deployment) {
        try {
          const deps = execSync(`kubectl get deployments -n ${options.namespace} --no-headers -o custom-columns=":metadata.name"`, { encoding: 'utf8' }).trim();
          if (!deps) { console.log(chalk.yellow('\n  No deployments found.\n')); return; }
          const answer = await inquirer.prompt([{
            type: 'list', name: 'dep', message: 'Select deployment:',
            choices: deps.split('\n').map(d => d.trim()).filter(Boolean),
          }]);
          options.deployment = answer.dep;
        } catch { console.log(chalk.red('\n  Cannot list deployments.\n')); return; }
      }
      try {
        execSync(`kubectl rollout status deployment/${options.deployment} -n ${options.namespace}`, { stdio: 'inherit' });
      } catch { console.log(chalk.red('\n  Rollout status check failed.\n')); }
    });

  cmd.command('scale')
    .description('Scale a deployment')
    .option('-d, --deployment <name>', 'Deployment name')
    .option('-r, --replicas <n>', 'Number of replicas')
    .option('-n, --namespace <ns>', 'Namespace', 'default')
    .action(async (options) => {
      if (!options.deployment || !options.replicas) {
        console.log(chalk.red('\n  --deployment and --replicas required.'));
        console.log(chalk.gray('  Example: oply k8s scale -d api-gateway -r 3\n'));
        return;
      }
      const spinner = ora(`Scaling ${options.deployment} to ${options.replicas} replicas...`).start();
      try {
        execSync(`kubectl scale deployment/${options.deployment} --replicas=${options.replicas} -n ${options.namespace}`, { stdio: 'pipe' });
        spinner.succeed(`Scaled ${chalk.cyan(options.deployment)} to ${chalk.white(options.replicas)} replicas`);
      } catch (err) {
        spinner.fail('Scale failed: ' + (err.stderr || err.message).toString().split('\n')[0]);
      }
    });

  cmd.command('events')
    .description('Show recent cluster events')
    .option('-n, --namespace <ns>', 'Namespace', 'default')
    .action(async (options) => {
      try {
        execSync(`kubectl get events -n ${options.namespace} --sort-by='.lastTimestamp' | tail -30`, { stdio: 'inherit' });
      } catch { console.log(chalk.red('\n  Cannot fetch events.\n')); }
    });
}
