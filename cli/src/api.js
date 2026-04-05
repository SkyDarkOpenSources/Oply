/**
 * Oply CLI — API Client
 * 
 * HTTP client for communicating with the Oply API server
 * and optional GitHub API for deployment/workflow status.
 */

import axios from 'axios';
import config from './config.js';

// ─── Oply API Client ────────────────────────────────

function getClient() {
  const baseURL = config.get('apiUrl') || process.env.OPLY_API_URL || 'http://localhost:3000/api';
  const token = config.get('authToken');

  return axios.create({
    baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

export async function apiGet(path, params = {}) {
  const client = getClient();
  const response = await client.get(path, { params });
  return response.data;
}

export async function apiPost(path, data = {}) {
  const client = getClient();
  const response = await client.post(path, data);
  return response.data;
}

export async function apiPatch(path, data = {}) {
  const client = getClient();
  const response = await client.patch(path, data);
  return response.data;
}

export async function healthCheck() {
  try {
    const client = getClient();
    await client.get('/');
    return true;
  } catch {
    return false;
  }
}

// ─── GitHub API Client ──────────────────────────────

function getGitHubToken() {
  return config.get('githubToken') || process.env.GITHUB_TOKEN || process.env.GITHUB_PAT || '';
}

function getGitHubClient() {
  const token = getGitHubToken();
  return axios.create({
    baseURL: 'https://api.github.com',
    timeout: 15000,
    headers: {
      Accept: 'application/vnd.github.v3+json',
      ...(token ? { Authorization: `token ${token}` } : {}),
    },
  });
}

/**
 * Check if GitHub API is accessible (with or without token)
 */
export function hasGitHubToken() {
  return !!getGitHubToken();
}

/**
 * Parse owner/repo from a GitHub URL
 * Handles: https://github.com/owner/repo.git, git@github.com:owner/repo.git
 */
export function parseGitHubRepo(url) {
  if (!url) return null;
  // HTTPS
  let match = url.match(/github\.com\/([^/]+)\/([^/.]+)/);
  if (match) return { owner: match[1], repo: match[2] };
  // SSH
  match = url.match(/github\.com:([^/]+)\/([^/.]+)/);
  if (match) return { owner: match[1], repo: match[2] };
  return null;
}

/**
 * Get recent GitHub Actions workflow runs
 */
export async function getGitHubWorkflowRuns(owner, repo, limit = 5) {
  try {
    const client = getGitHubClient();
    const { data } = await client.get(`/repos/${owner}/${repo}/actions/runs`, {
      params: { per_page: limit },
    });
    return (data.workflow_runs || []).map(run => ({
      id: run.id,
      name: run.name,
      status: run.status,
      conclusion: run.conclusion,
      branch: run.head_branch,
      commit: run.head_sha?.slice(0, 7),
      url: run.html_url,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
    }));
  } catch {
    return [];
  }
}

/**
 * Get recent GitHub deployments
 */
export async function getGitHubDeployments(owner, repo, limit = 5) {
  try {
    const client = getGitHubClient();
    const { data } = await client.get(`/repos/${owner}/${repo}/deployments`, {
      params: { per_page: limit },
    });
    
    // Get status for each deployment
    const deployments = [];
    for (const dep of data) {
      let status = 'pending';
      try {
        const statusRes = await client.get(`/repos/${owner}/${repo}/deployments/${dep.id}/statuses`, {
          params: { per_page: 1 },
        });
        if (statusRes.data.length > 0) {
          status = statusRes.data[0].state;
        }
      } catch { /* ignore */ }
      
      deployments.push({
        id: dep.id,
        environment: dep.environment,
        ref: dep.ref,
        sha: dep.sha?.slice(0, 7),
        status,
        creator: dep.creator?.login || 'unknown',
        createdAt: dep.created_at,
      });
    }
    return deployments;
  } catch {
    return [];
  }
}
