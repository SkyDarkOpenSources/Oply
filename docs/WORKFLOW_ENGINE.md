# CI/CD Workflow Engine Design

Unlike traditional CI/CD engines that rely on static YAML (`.gitlab-ci.yml` or `.github/workflows`), Oply uses a "Dynamic Execution Graph." The AI Engine generates a JSON-based Directed Acyclic Graph (DAG) denoting dependencies between jobs (Build, Test, Scan, Deploy) which the Core Engine traverses.

## Execution Flow logic
1. Webhook triggers Oply.
2. AI Engine determines necessary steps based on changed files (e.g., if only frontend code changes, skip backend testing).
3. Core Engine receives a DAG like: `[ Lint -> (Unit Test, E2E Test) -> Build Docker -> Deploy to Staging ]`
4. Core Engine queues `Lint` into Kafka. 
5. Worker nodes pick it up, run Docker-in-Docker (or Kaniko natively in K8s), and stream output logs back to Redis.
6. Upon `Lint` completion, Core Engine queues `Unit Test` and `E2E Test` in parallel.

## Sample Snippet: Pipeline Execution Worker (Node.js/BullMQ Concept)
This snippet shows how the worker listens for tasks and executes a Docker build step autonomously.

```javascript
import { Worker } from 'bullmq';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// A Worker that listens to the 'pipeline-executions' queue
const pipelineWorker = new Worker('pipeline-executions', async (job) => {
    const { taskId, type, repositoryUrl, commitHash } = job.data;
    
    // Notify Core Engine that the task has started
    await reportStatusToCore(taskId, 'RUNNING');

    try {
        if (type === 'BUILD') {
            const workspace = `/tmp/workspace/${commitHash}`;
            
            // Step 1: Clone exactly the requested commit
            await execAsync(`git clone ${repositoryUrl} ${workspace}`);
            await execAsync(`cd ${workspace} && git checkout ${commitHash}`);

            // Step 2: Build the artifact
            // Assuming AI generated the Dockerfile beforehand if missing
            const imageName = `registry.oply.io/project-${taskId}:${commitHash}`;
            const { stdout, stderr } = await execAsync(`cd ${workspace} && docker build -t ${imageName} .`);

            // Stream logs back to Redis (Simplified)
            await streamLogsToRedis(taskId, stdout);
            
            // Step 3: Push artifact
            await execAsync(`docker push ${imageName}`);

            // Report success
            await reportStatusToCore(taskId, 'SUCCESS', { artifactPath: imageName });
        }
    } catch (error) {
        // Stream error logs natively to AI failure analyzer module
        await reportStatusToCore(taskId, 'FAILED', { errorLog: error.message });
        throw error; // Fail the BullMQ job
    }
}, { connection: { host: 'localhost', port: 6379 } });
```

## Sample Snippet: Deployment Automation (Kubernetes Service)

When the pipeline reaches a "Deploy" Node, the deployment manager patches the Kubernetes cluster.

```javascript
import * as k8s from '@kubernetes/client-node';

async function triggerRollingUpdate(deploymentName, namespace, newImageTag) {
    const kc = new k8s.KubeConfig();
    kc.loadFromDefault(); // In production, this loads cluster credentials securely
    
    const k8sApi = kc.makeApiClient(k8s.AppsV1Api);
    
    console.log(`Patching deployment ${deploymentName} to image ${newImageTag}...`);

    try {
        // Prepare patch payload
        const patch = [
            {
                op: 'replace',
                path: '/spec/template/spec/containers/0/image',
                value: newImageTag,
            }
        ];

        // Apply Native Kubernetes Patch using JSON Patch representation
        const response = await k8sApi.patchNamespacedDeployment(
            deploymentName, 
            namespace, 
            patch, 
            undefined, 
            undefined, 
            undefined, 
            undefined, 
            { headers: { "Content-type": k8s.PatchUtils.PATCH_FORMAT_JSON_PATCH } }
        );

        console.log(`Deployment ${deploymentName} successfully patched.`);
        return response.body;
    } catch (err) {
        console.error(`Failed to patch deployment:`, err);
        throw err;
    }
}
```
