# UI/UX Dashboard Layout

Oply’s dashboard needs to be ultra-premium, dark-themed natively, highly responsive, and feel like a professional DevOps control center (similar to Vercel, Render, or Linear).

## Wireframe Summary

### 1. Global Navigation Bar (Top)
- **Brand Identity:** Oply Logo (Left)
- **Project Switcher:** Dropdown to switch between configured organization projects.
- **Global Actions:** Create Project button, Invite Member.
- **User Avatar:** Settings & Profile (Right)

### 2. Main Canvas (Three-pane layout)
- **Left Sidebar (Navigation):**
  - Environments (Dev, Staging, Prod)
  - Deployments & History
  - Metrics / Service Map
  - Logs Explorer
  - Settings

- **Center Pane (Context-Aware Activity):**
  - Contains the dynamic DAG pipeline visualizations.
  - Hovering over a pipeline node displays its real-time tailing logs.
  - Success states glow with a subtle green `#10B981` shadow; Failures flash abruptly in red `#EF4444`.

- **Right Drawer (AI Assistant Panel):**
  - Collapsible pane named "Oply Copilot".
  - Offers immediate failure analysis if the current pipeline in the Center Pane is broken.
  - Conversational input at the bottom to ask things like: *"Why is memory jumping in the Staging cluster?"*

## Sample Snippet: AI Assistant Integration (Next.js App Router Component)

This component implements a chat UI that takes advantage of Server Actions or API routes to stream the response back.

```tsx
'use client';

import { useState } from 'react';
import { useChat } from 'ai/react'; // the Vercel AI SDK

export default function OplyCopilot({ currentRunId }: { currentRunId: string }) {
  // Chat stream handler, automatically passes the context
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/v1/ai/assistant/chat',
    body: { context: { pipelineRunId: currentRunId } } 
  });

  return (
    <div className="flex flex-col h-full bg-slate-900 border-l border-slate-800 shadow-2xl">
      <div className="p-4 border-b border-slate-800">
        <h3 className="text-white font-semibold">Oply Copilot</h3>
      </div>
      
      {/* Messages Window */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map(m => (
          <div key={m.id} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`px-4 py-2 rounded-lg max-w-[85%] text-sm ${
              m.role === 'user' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-200'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
      </div>

      {/* Input Field */}
      <div className="p-4 border-t border-slate-800 bg-slate-950">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input 
            className="flex-1 bg-slate-800 text-white rounded-md px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500 text-sm"
            value={input}
            onChange={handleInputChange}
            placeholder="Ask why a build failed..." 
          />
          <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-md font-medium transition-colors">
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
```
