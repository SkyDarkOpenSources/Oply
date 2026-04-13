/**
 * Oply CLI — Login Command
 * 
 * Device-code login flow similar to GitHub CLI / Vercel CLI.
 * 1. Generates a code via the backend
 * 2. User opens browser and enters the code
 * 3. CLI polls until verified, then stores the token
 */

import chalk from 'chalk';
import ora from 'ora';
import open from 'open';
import fs from 'fs';
import path from 'path';
import os from 'os';

const OPLY_CONFIG_DIR = path.join(os.homedir(), '.oply');
const OPLY_CONFIG_FILE = path.join(OPLY_CONFIG_DIR, 'config.json');

function getBaseUrl() {
  return process.env.OPLY_API_URL || 'http://localhost:3000';
}

function saveConfig(config) {
  if (!fs.existsSync(OPLY_CONFIG_DIR)) {
    fs.mkdirSync(OPLY_CONFIG_DIR, { recursive: true });
  }
  fs.writeFileSync(OPLY_CONFIG_FILE, JSON.stringify(config, null, 2));
}

function loadConfig() {
  if (!fs.existsSync(OPLY_CONFIG_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(OPLY_CONFIG_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

async function startLogin() {
  const baseUrl = getBaseUrl();

  const res = await fetch(`${baseUrl}/api/v1/cli/login/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userAgent: `oply-cli/${process.env.npm_package_version || '1.0.0'}` }),
  });

  if (!res.ok) {
    throw new Error(`Failed to start login: ${res.statusText}`);
  }

  return await res.json();
}

async function pollLogin(code, maxAttempts = 60) {
  const baseUrl = getBaseUrl();

  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000)); // poll every 3s

    try {
      const res = await fetch(`${baseUrl}/api/v1/cli/login/poll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (data.status === 'verified') {
        return data;
      }

      if (data.status === 'expired') {
        throw new Error('Code expired');
      }
    } catch (err) {
      if (err.message === 'Code expired') throw err;
      // Network error, retry
    }
  }

  throw new Error('Login timed out');
}

export function loginCommand(program) {
  program
    .command('login')
    .description('Authenticate the CLI with your Oply account')
    .option('--status', 'Check current login status')
    .option('--logout', 'Log out and remove stored credentials')
    .action(async (options) => {
      // Check status
      if (options.status) {
        const config = loadConfig();
        if (config?.token && config?.user) {
          console.log(chalk.green('✓') + ' Logged in as ' + chalk.cyan(config.user.email || config.user.name));
          console.log(chalk.gray('  Token: ') + chalk.dim(config.token.slice(0, 12) + '...'));
        } else {
          console.log(chalk.yellow('⚠') + ' Not logged in. Run ' + chalk.cyan('oply login') + ' to authenticate.');
        }
        return;
      }

      // Logout
      if (options.logout) {
        if (fs.existsSync(OPLY_CONFIG_FILE)) {
          fs.unlinkSync(OPLY_CONFIG_FILE);
          console.log(chalk.green('✓') + ' Logged out successfully.');
        } else {
          console.log(chalk.gray('Already logged out.'));
        }
        return;
      }

      // Check if already logged in
      const existing = loadConfig();
      if (existing?.token) {
        console.log(chalk.yellow('⚠') + ' Already logged in as ' + chalk.cyan(existing.user?.email || 'unknown'));
        console.log(chalk.gray('  Use --logout to log out first.'));
        return;
      }

      const spinner = ora('Requesting login code...').start();

      try {
        // Step 1: Get device code
        const { code, verifyUrl } = await startLogin();
        spinner.stop();

        console.log('');
        console.log(chalk.bold('  🔑 Oply CLI Login'));
        console.log('');
        console.log('  Open this URL in your browser:');
        console.log('  ' + chalk.cyan.underline(verifyUrl));
        console.log('');
        console.log('  Then enter this code:');
        console.log('  ' + chalk.bold.white.bgBlue(` ${code} `));
        console.log('');
        console.log(chalk.gray('  Code expires in 5 minutes.'));
        console.log('');

        // Try to open browser
        try {
          await open(verifyUrl);
          console.log(chalk.gray('  ✓ Opened browser automatically'));
        } catch {
          // Ignore if browser can't be opened
        }

        // Step 2: Poll for verification
        const pollSpinner = ora('Waiting for authentication...').start();

        const result = await pollLogin(code);
        pollSpinner.stop();

        // Step 3: Save token
        saveConfig({
          token: result.token,
          user: result.user,
          authenticatedAt: new Date().toISOString(),
        });

        console.log('');
        console.log(chalk.green('  ✓ ') + chalk.bold('Authentication successful!'));
        console.log('');
        console.log('  Logged in as ' + chalk.cyan(result.user?.email || result.user?.name || 'unknown'));
        console.log('  Token saved to ' + chalk.gray(OPLY_CONFIG_FILE));
        console.log('');

      } catch (err) {
        spinner.stop();
        console.error(chalk.red('  ✗ Login failed: ') + err.message);
        process.exit(1);
      }
    });
}
