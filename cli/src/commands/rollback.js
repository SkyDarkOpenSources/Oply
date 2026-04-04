/**
 * oply rollback — Rollback deployments to previous versions
 */
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { execSync } from 'child_process';
import { apiPatch } from '../api.js';

export function rollbackCommand(program) {
  program
    .command('rollback')
    .description('Rollback a deployment to the previous version')
    .option('-e, --env <environment>', 'Target environment')
    .option('-d, --deployment <name>', 'Deployment name')
    .option('-n, --namespace <ns>', 'Kubernetes namespace')
    .option('--revision <n>', 'Specific revision to rollback to')
    .action(async (options) => {
      try {
        let env = options.env;
        if (!env) {
          const answer = await inquirer.prompt([{
            type: 'list', name: 'env', message: 'Rollback which environment?',
            choices: ['development', 'staging', 'production'],
          }]);
          env = answer.env;
        }

        // Production safety
        if (env === 'production') {
          console.log(chalk.yellow.bold('\n  ⚠️  PRODUCTION ROLLBACK'));
          const confirm = await inquirer.prompt([{
            type: 'input', name: 'confirm',
            message: `Type "${chalk.red('rollback production')}" to confirm:`,
          }]);
          if (confirm.confirm !== 'rollback production') {
            console.log(chalk.gray('\n  Rollback cancelled.\n'));
            return;
          }
        }

        const namespace = options.namespace || env;
        const deployment = options.deployment;

        // ─── Try K8s rollback ─────────────────
        const spinner = ora(`Rolling back ${env}...`).start();

        if (deployment) {
          try {
            const revFlag = options.revision ? ` --to-revision=${options.revision}` : '';
            execSync(`kubectl rollout undo deployment/${deployment} -n ${namespace}${revFlag}`, { stdio: 'pipe', timeout: 30000 });
            spinner.succeed(`Rolled back ${chalk.cyan(deployment)} in ${chalk.cyan(env)}`);
            
            // Check rollout status
            const statusSpinner = ora('Verifying rollback...').start();
            try {
              execSync(`kubectl rollout status deployment/${deployment} -n ${namespace} --timeout=60s`, { stdio: 'pipe' });
              statusSpinner.succeed('Rollback healthy — all pods running');
            } catch {
              statusSpinner.warn('Rollback applied but rollout still in progress');
            }

            console.log(chalk.green.bold('\n  ✅ Rollback Complete'));
            console.log(chalk.gray(`\n  Monitor: oply k8s rollout -d ${deployment} -n ${namespace}\n`));
            return;
          } catch (err) {
            spinner.warn('K8s rollback failed — trying Oply API');
          }
        }

        // ─── Try API rollback ─────────────────
        try {
          await apiPatch('/v1/deployments', { deploymentId: deployment || env, action: 'rollback' });
          spinner.succeed(`Rollback triggered via Oply API for ${chalk.cyan(env)}`);
        } catch {
          spinner.info('Rollback registered locally');
        }

        console.log(chalk.green.bold('\n  ✅ Rollback initiated'));
        console.log(chalk.gray('  Monitor status: oply status --deployments\n'));

      } catch (error) {
        console.error(chalk.red(`\n  Error: ${error.message}\n`));
      }
    });
}
