/**
 * Oply CLI — Main Application
 * 
 * Production-grade CLI for the Oply Autonomous Software Delivery Platform.
 * Provides commands for pipeline management, deployment, Docker, K8s, AI debugging,
 * and real git integration that works against any local project.
 */

import { Command } from 'commander';
import chalk from 'chalk';
import figlet from 'figlet';
import gradient from 'gradient-string';
import boxen from 'boxen';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Load .env from Oply repo root (for development)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const oplyEnvPath = join(__dirname, '..', '..', '.env');
if (fs.existsSync(oplyEnvPath)) {
  dotenv.config({ path: oplyEnvPath });
}

// Load .env and .env.oply from the user's current working directory
const cwdEnvPath = join(process.cwd(), '.env');
if (fs.existsSync(cwdEnvPath)) {
  dotenv.config({ path: cwdEnvPath });
}
const cwdOplyEnvPath = join(process.cwd(), '.env.oply');
if (fs.existsSync(cwdOplyEnvPath)) {
  dotenv.config({ path: cwdOplyEnvPath });
}

import { initCommand } from './commands/init.js';
import { statusCommand } from './commands/status.js';
import { deployCommand } from './commands/deploy.js';
import { logsCommand } from './commands/logs.js';
import { aiDebugCommand } from './commands/ai-debug.js';
import { pipelineCommand } from './commands/pipeline.js';
import { dockerCommand } from './commands/docker.js';
import { k8sCommand } from './commands/k8s.js';
import { rollbackCommand } from './commands/rollback.js';
import { stageCommand } from './commands/stage.js';

// ─── Banner ──────────────────────────────────────────
const oplyGradient = gradient(['#6366f1', '#8b5cf6', '#a78bfa']);

function showBanner() {
  const banner = figlet.textSync('OPLY-CLI', {
    font: 'ANSI Shadow',
    horizontalLayout: 'fitted',
  });
  
  console.log('');
  console.log(oplyGradient(banner));
  console.log(
    boxen(
      chalk.gray('Autonomous Software Delivery Platform') +
      '\n' +
      chalk.gray('v1.0.0 — AI-Powered CI/CD - SkyDark OpenSources'),
      {
        padding: { top: 0, bottom: 0, left: 2, right: 2 },
        borderColor: 'gray',
        borderStyle: 'round',
        dimBorder: true,
      }
    )
  );
  console.log('');
}

// ─── Program ─────────────────────────────────────────
const program = new Command();

program
  .name('oply')
  .description('Oply CLI — Autonomous Software Delivery Platform')
  .version('1.0.0')
  .hook('preAction', () => {
    showBanner();
  });

// Register all commands
initCommand(program);
stageCommand(program);
statusCommand(program);
deployCommand(program);
logsCommand(program);
aiDebugCommand(program);
pipelineCommand(program);
dockerCommand(program);
k8sCommand(program);
rollbackCommand(program);

// Default: show help with banner
if (process.argv.length <= 2) {
  showBanner();
  program.help();
}

program.parse();
