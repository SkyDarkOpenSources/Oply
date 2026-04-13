import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { ChatGroq } from '@langchain/groq';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import rateLimit from 'express-rate-limit';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Rate Limiter for Copilot API ────────────
const copilotLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Initialize Groq model
const model = new ChatGroq({
  model: process.env.GROQ_MODEL || "openai/gpt-oss-120b",
  maxTokens: 2048,
  apiKey: process.env.GROQ_API_KEY,
});

// ─── CLI Fix Endpoint ────────────────────────
app.post('/api/ai/fix', async (req, res) => {
  try {
    const { context, error } = req.body;
    
    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are the Oply Failure Analysis Engine. Your goal is to FIX issues in a CI/CD pipeline.
You have access to:
- Stack info (language, framework)
- Git history and diffs
- Pipeline logs
- Source code context

Your response MUST follow this structure:
1. **Root Cause**: Identify exactly why it failed.
2. **Recommended Fix**: Provide the exact terminal command or code diff to resolve the issue.
3. **Reasoning**: Briefly explain why this fix works.

Be technical, concise, and accurate.`],
      ["user", "Context: {context}\n\nError: {error}"]
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    
    const result = await chain.invoke({
      context: JSON.stringify(context, null, 2),
      error: error,
    });

    res.json({ analysis: result });
  } catch (err: any) {
    console.error('AI Fix Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Deployment Risk Endpoint ────────────────
app.post('/api/ai/risk', async (req, res) => {
  try {
    const { env, strategy, diff } = req.body;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are the Oply Deployment Risk Analyzer. 
Given a git diff, environment, and strategy, calculate a risk score (0-100) and provide a one-sentence reason.
Respond with ONLY a JSON object: {{"score": <0-100>, "reason": "<one sentence>"}}.
Lower score = safer.`],
      ["user", `Environment: {env}\nStrategy: {strategy}\nDiff:\n{diff}`]
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    
    const result = await chain.invoke({
      env: env,
      strategy: strategy,
      diff: diff || 'No changes detected',
    });

    // Extract JSON from result (Gemini might wrap it in code blocks)
    const jsonStr = result.replace(/```json|```/g, '').trim();
    res.json(JSON.parse(jsonStr));
  } catch (err: any) {
    console.error('AI Risk Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ─── Web Copilot Endpoint ────────────────────
app.post('/api/ai/chat', copilotLimiter, async (req, res) => {
  try {
    const { message } = req.body;

    const prompt = ChatPromptTemplate.fromMessages([
      ["system", `You are the Oply Copilot, an expert in CI/CD, Kubernetes, Software Delivery, and general DevOps.
Your goal is to answer developer questions regarding their Oply project and general DevOps practices.
Use a professional, helpful, and slightly technical tone. 
If the user asks about Oply, remember it's an autonomous CI/CD platform that uses DAGs (Directed Acyclic Graphs) instead of YAML for pipeline orchestration.

CRITICAL INSTRUCTION: You are strictly limited to answering questions related to DevOps, cloud engineering, code pipelines, and software development. 
If the user asks anything unrelated (e.g., recipes, politics, general chats outside of software), politely decline and state that you are the Oply DevOps Copilot and only answer development-related questions.`],
      ["user", "{message}"]
    ]);

    const chain = prompt.pipe(model).pipe(new StringOutputParser());
    
    const result = await chain.invoke({
      message: message,
    });

    res.json({ response: result });
  } catch (err: any) {
    console.error('AI Chat Error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`🤖 Oply AI Proxy (Groq + LangChain) — Targeting Website Dashboard`);
  console.log(`📡 Listening at http://localhost:${port}`);
});
