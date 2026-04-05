/**
 * Oply CLI — Project Loader
 * 
 * Reads oply.config.json from the current directory, validates it,
 * and provides project context to all commands.
 * Also loads .env.oply from the project directory for API keys.
 */

import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import dotenv from 'dotenv';

const CONFIG_FILE = 'oply.config.json';
const ENV_FILE = '.env.oply';

/**
 * Load the oply.config.json from cwd (or walk up directories to find it).
 * Throws a helpful error if not found.
 */
export function loadProject(cwd = process.cwd()) {
  const configPath = findConfigFile(cwd);
  
  if (!configPath) {
    console.error(chalk.red('\n  ✗ No oply.config.json found in this directory.'));
    console.error(chalk.gray('  Run ') + chalk.cyan('oply init') + chalk.gray(' to initialize your project.\n'));
    process.exit(1);
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);
    
    // Load .env.oply from the same directory as oply.config.json
    const projectDir = path.dirname(configPath);
    const envPath = path.join(projectDir, ENV_FILE);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }

    // Also load regular .env if it exists
    const dotenvPath = path.join(projectDir, '.env');
    if (fs.existsSync(dotenvPath)) {
      dotenv.config({ path: dotenvPath });
    }

    return {
      config,
      configPath,
      projectDir,
    };
  } catch (err) {
    console.error(chalk.red(`\n  ✗ Failed to parse oply.config.json: ${err.message}\n`));
    process.exit(1);
  }
}

/**
 * Try to load project config without exiting on failure.
 * Returns null if not found.
 */
export function tryLoadProject(cwd = process.cwd()) {
  const configPath = findConfigFile(cwd);
  if (!configPath) return null;

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const config = JSON.parse(raw);

    const projectDir = path.dirname(configPath);
    const envPath = path.join(projectDir, ENV_FILE);
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
    }
    const dotenvPath = path.join(projectDir, '.env');
    if (fs.existsSync(dotenvPath)) {
      dotenv.config({ path: dotenvPath });
    }

    return { config, configPath, projectDir };
  } catch {
    return null;
  }
}

/**
 * Find oply.config.json by walking up the directory tree
 */
function findConfigFile(startDir) {
  let dir = path.resolve(startDir);
  const root = path.parse(dir).root;

  while (dir !== root) {
    const candidate = path.join(dir, CONFIG_FILE);
    if (fs.existsSync(candidate)) {
      return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return null;
}

/**
 * Get project name from config
 */
export function getProjectName(cwd = process.cwd()) {
  const project = tryLoadProject(cwd);
  return project?.config?.project?.name || path.basename(cwd);
}

/**
 * Get pipeline stages from config
 */
export function getPipelineStages(cwd = process.cwd()) {
  const project = tryLoadProject(cwd);
  return project?.config?.pipeline?.stages || [];
}

/**
 * Get environments from config
 */
export function getEnvironments(cwd = process.cwd()) {
  const project = tryLoadProject(cwd);
  return project?.config?.environments || ['Development', 'Staging', 'Production'];
}

/**
 * Get stack info from config
 */
export function getStack(cwd = process.cwd()) {
  const project = tryLoadProject(cwd);
  return project?.config?.stack || { language: 'unknown', framework: 'unknown' };
}

/**
 * Save/update the oply.config.json
 */
export function saveConfig(config, cwd = process.cwd()) {
  const configPath = path.join(cwd, CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
}

/**
 * Check if project is initialized
 */
export function isProjectInitialized(cwd = process.cwd()) {
  return findConfigFile(cwd) !== null;
}
