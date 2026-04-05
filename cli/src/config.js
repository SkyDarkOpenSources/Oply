/**
 * Oply CLI — Configuration Manager
 * 
 * Persists CLI configuration (API URL, auth token, current project)
 * using the `conf` package (stored in OS config directory).
 */

import Conf from 'conf';

const config = new Conf({
  projectName: 'oply-cli',
  schema: {
    apiUrl: {
      type: 'string',
      default: 'http://localhost:3000/api',
    },
    authToken: {
      type: 'string',
      default: '',
    },
    currentProject: {
      type: 'string',
      default: '',
    },
    currentProjectName: {
      type: 'string',
      default: '',
    },
    dockerRegistry: {
      type: 'string',
      default: '',
    },
    kubeconfigPath: {
      type: 'string',
      default: '',
    },
    githubToken: {
      type: 'string',
      default: '',
    },
  },
});

export default config;
