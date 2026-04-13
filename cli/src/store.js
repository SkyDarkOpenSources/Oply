/**
 * Oply CLI — Local Project State Store
 * 
 * Manages the .oply/ directory inside the user's project for tracking
 * deployments, pipeline runs, rollbacks, and logs WITHOUT requiring
 * the Oply API server.
 * 
 * Structure:
 *   myproject/.oply/
 *   ├── store.json       — deployment history, pipeline runs, rollbacks
 *   └── logs/            — pipeline run log files (one per run)
 */

import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { apiSync } from './api.js';
import { loadProject } from './project.js';

const STORE_DIR = '.oply';
const STORE_FILE = 'store.json';
const LOGS_DIR = 'logs';

function getStorePath(cwd = process.cwd()) {
  return path.join(cwd, STORE_DIR);
}

function getStoreFilePath(cwd = process.cwd()) {
  return path.join(getStorePath(cwd), STORE_FILE);
}

function getLogsDir(cwd = process.cwd()) {
  return path.join(getStorePath(cwd), LOGS_DIR);
}

/**
 * Generate a short unique run ID
 */
function genId() {
  return 'run-' + crypto.randomBytes(4).toString('hex');
}

/**
 * Initialize the .oply/ directory and store.json
 */
export function initStore(cwd = process.cwd()) {
  const storeDir = getStorePath(cwd);
  const logsDir = getLogsDir(cwd);

  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const storeFile = getStoreFilePath(cwd);
  if (!fs.existsSync(storeFile)) {
    const initialStore = {
      version: '1.0',
      createdAt: new Date().toISOString(),
      deployments: [],
      pipelineRuns: [],
      rollbacks: [],
    };
    fs.writeFileSync(storeFile, JSON.stringify(initialStore, null, 2));
  }
}

/**
 * Read the store.json
 */
export function readStore(cwd = process.cwd()) {
  const storeFile = getStoreFilePath(cwd);
  if (!fs.existsSync(storeFile)) {
    return { deployments: [], pipelineRuns: [], rollbacks: [] };
  }
  try {
    return JSON.parse(fs.readFileSync(storeFile, 'utf8'));
  } catch {
    return { deployments: [], pipelineRuns: [], rollbacks: [] };
  }
}

/**
 * Write the store.json
 */
function writeStore(data, cwd = process.cwd()) {
  const storeFile = getStoreFilePath(cwd);
  const storeDir = getStorePath(cwd);
  if (!fs.existsSync(storeDir)) {
    fs.mkdirSync(storeDir, { recursive: true });
  }
  fs.writeFileSync(storeFile, JSON.stringify(data, null, 2));
}

// ─── Deployments ─────────────────────────────────

/**
 * Get all tracked deployments
 */
export function getDeployments(cwd = process.cwd()) {
  return readStore(cwd).deployments || [];
}

/**
 * Get the latest deployment for a given environment
 */
export function getLatestDeployment(environment, cwd = process.cwd()) {
  const deployments = getDeployments(cwd);
  return deployments
    .filter(d => d.environment === environment)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0] || null;
}

/**
 * Add a deployment record
 */
export function addDeployment(data, cwd = process.cwd()) {
  const store = readStore(cwd);
  const deployment = {
    id: genId(),
    environment: data.environment,
    commitHash: data.commitHash,
    commitMessage: data.commitMessage || '',
    version: data.version || data.commitHash,
    branch: data.branch || '',
    status: data.status || 'SUCCESS',
    strategy: data.strategy || 'ROLLING',
    duration: data.duration || 0,
    timestamp: new Date().toISOString(),
    pipelineRunId: data.pipelineRunId || null,
  };
  store.deployments = store.deployments || [];
  store.deployments.unshift(deployment);
  // Keep last 100
  if (store.deployments.length > 100) store.deployments = store.deployments.slice(0, 100);
  writeStore(store, cwd);

  // Background sync to SaaS
  try {
    const project = loadProject(cwd);
    if (project?.config?.project?.name) {
      apiSync('/v1/sync/deployments', { 
        projectName: project.config.project.name, 
        deployment 
      });
    }
  } catch (err) {}

  return deployment;
}

/**
 * Update a deployment's status
 */
export function updateDeployment(id, updates, cwd = process.cwd()) {
  const store = readStore(cwd);
  const dep = (store.deployments || []).find(d => d.id === id);
  if (dep) {
    Object.assign(dep, updates);
    writeStore(store, cwd);
  }
  return dep;
}

// ─── Pipeline Runs ───────────────────────────────

/**
 * Get all pipeline runs
 */
export function getPipelineRuns(cwd = process.cwd()) {
  return readStore(cwd).pipelineRuns || [];
}

/**
 * Get a specific pipeline run
 */
export function getPipelineRun(id, cwd = process.cwd()) {
  return (getPipelineRuns(cwd)).find(r => r.id === id) || null;
}

/**
 * Add a pipeline run
 */
export function addPipelineRun(data, cwd = process.cwd()) {
  const store = readStore(cwd);
  const run = {
    id: data.id || genId(),
    commitHash: data.commitHash || '',
    commitMessage: data.commitMessage || '',
    branch: data.branch || '',
    status: data.status || 'RUNNING',
    triggeredBy: data.triggeredBy || 'manual',
    stages: data.stages || [],
    startedAt: new Date().toISOString(),
    finishedAt: null,
    durationMs: null,
  };
  store.pipelineRuns = store.pipelineRuns || [];
  store.pipelineRuns.unshift(run);
  // Keep last 50
  if (store.pipelineRuns.length > 50) store.pipelineRuns = store.pipelineRuns.slice(0, 50);
  writeStore(store, cwd);

  // Background sync to SaaS
  try {
    const project = loadProject(cwd);
    if (project?.config?.project?.name) {
      apiSync('/v1/sync/pipelines', { 
        projectName: project.config.project.name, 
        run 
      });
    }
  } catch (err) {}

  return run;
}

/**
 * Update a pipeline run
 */
export function updatePipelineRun(id, updates, cwd = process.cwd()) {
  const store = readStore(cwd);
  const run = (store.pipelineRuns || []).find(r => r.id === id);
  if (run) {
    Object.assign(run, updates);
    writeStore(store, cwd);

    // Sync updates to SaaS
    try {
      const project = loadProject(cwd);
      if (project?.config?.project?.name) {
        apiSync('/v1/sync/pipelines', { 
          projectName: project.config.project.name, 
          run 
        });
      }
    } catch (err) {}
  }
  return run;
}

// ─── Rollbacks ───────────────────────────────────

/**
 * Get rollback history
 */
export function getRollbacks(cwd = process.cwd()) {
  return readStore(cwd).rollbacks || [];
}

/**
 * Add a rollback record
 */
export function addRollback(data, cwd = process.cwd()) {
  const store = readStore(cwd);
  const rollback = {
    id: genId(),
    environment: data.environment,
    fromCommit: data.fromCommit,
    toCommit: data.toCommit,
    method: data.method || 'git', // 'git' | 'k8s' | 'api'
    status: data.status || 'SUCCESS',
    timestamp: new Date().toISOString(),
  };
  store.rollbacks = store.rollbacks || [];
  store.rollbacks.unshift(rollback);
  if (store.rollbacks.length > 50) store.rollbacks = store.rollbacks.slice(0, 50);
  writeStore(store, cwd);
  return rollback;
}

// ─── Pipeline Run Logs ───────────────────────────

/**
 * Create a log file for a pipeline run
 */
export function createRunLog(runId, cwd = process.cwd()) {
  const logsDir = getLogsDir(cwd);
  if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });
  const logFile = path.join(logsDir, `${runId}.log`);
  fs.writeFileSync(logFile, '');
  return logFile;
}

/**
 * Append a log line to a pipeline run's log file
 */
export function appendRunLog(runId, line, cwd = process.cwd()) {
  const logFile = path.join(getLogsDir(cwd), `${runId}.log`);
  const timestamp = new Date().toISOString().split('T')[1].split('.')[0];
  fs.appendFileSync(logFile, `[${timestamp}] ${line}\n`);
}

/**
 * Read all log lines for a pipeline run
 */
export function getRunLogs(runId, cwd = process.cwd()) {
  const logFile = path.join(getLogsDir(cwd), `${runId}.log`);
  if (!fs.existsSync(logFile)) return [];
  return fs.readFileSync(logFile, 'utf8').split('\n').filter(Boolean);
}

/**
 * List all available run log IDs
 */
export function listRunLogs(cwd = process.cwd()) {
  const logsDir = getLogsDir(cwd);
  if (!fs.existsSync(logsDir)) return [];
  return fs.readdirSync(logsDir)
    .filter(f => f.endsWith('.log'))
    .map(f => f.replace('.log', ''))
    .sort()
    .reverse();
}

/**
 * Check if store exists (i.e., oply init has been run)
 */
export function storeExists(cwd = process.cwd()) {
  return fs.existsSync(getStoreFilePath(cwd));
}
