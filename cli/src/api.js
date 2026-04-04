/**
 * Oply CLI — API Client
 * 
 * HTTP client for communicating with the Oply API server.
 */

import axios from 'axios';
import config from './config.js';

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
