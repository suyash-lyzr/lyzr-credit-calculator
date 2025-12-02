# Lyzr Credit Calculator

## Overview
This is an interactive Lyzr Credit Calculator built with Next.js 15, TypeScript, and Anthropic Claude. It features a Claude-like artifact experience with a dual-pane interface.

**Current State:** Fully configured and running on Replit
**Last Updated:** December 2, 2025

## Application Features

### Credit Calculator
A Claude-like chat interface that helps users understand the cost and ROI of building AI agents on the Lyzr platform.

**Features:**
- **Chat Interface**: Full conversation experience with markdown support
- **Architecture Diagram**: Mermaid-rendered agent flow diagrams
- **Credit Calculation**: Detailed cost breakdown with per-run, monthly, and yearly estimates
- **ROI Calculation**: Comparison against human labor costs with savings metrics

**How it works:**
1. User describes their automation needs
2. AI analyzes the requirements and generates:
   - Agent architecture diagram (Mermaid)
   - Credit cost calculation
   - ROI comparison vs human costs
3. Conversation can continue with updates to calculations

## Project Architecture

### Technology Stack
- **Framework:** Next.js 15.5.0 with App Router
- **Language:** TypeScript 5
- **AI:** Anthropic Claude (via Replit AI Integrations - no API key required, billed to credits)
- **Styling:** Tailwind CSS 4 with tw-animate-css
- **UI Components:** shadcn/ui with Radix UI primitives
- **Diagrams:** Mermaid.js
- **Markdown:** react-markdown with remark-gfm
- **Icons:** Lucide React, Tabler Icons

### Project Structure
```
lyzr-boilerplate/
├── src/
│   ├── app/
│   │   ├── api/chat/         # Streaming API with Claude tool use
│   │   ├── credit-calculator/ # Main application page
│   │   └── layout.tsx
│   ├── components/
│   │   ├── credit-calculator/ # Application-specific components
│   │   │   ├── chat-sidebar.tsx
│   │   │   ├── chat-interface.tsx
│   │   │   ├── artifact-panel.tsx
│   │   │   ├── architecture-diagram.tsx
│   │   │   ├── credit-calculation.tsx
│   │   │   └── roi-calculation.tsx
│   │   └── ui/               # shadcn/ui components
│   ├── hooks/
│   └── lib/
│       ├── types.ts          # Type definitions
│       └── utils.ts
├── public/
└── [config files]
```

### API Routes

#### POST /api/chat
Streaming chat API with Claude tool use.

**Request:**
```json
{
  "messages": [
    { "role": "user", "content": "..." },
    { "role": "assistant", "content": "..." }
  ]
}
```

**Response:** Server-Sent Events (SSE) stream with events:
- `text`: Streaming text content
- `tool_start`: Tool execution started
- `tool_result`: Tool output data
- `done`: Stream complete
- `error`: Error occurred

**Tools:**
1. `generate_architecture` - Creates Mermaid diagram
2. `calculate_credits` - Calculates Lyzr credit costs
3. `calculate_roi` - Compares against human costs

## Recent Changes
- **2025-12-02:** Built Lyzr Credit Calculator
  - Created dual-pane Claude-like interface
  - Implemented streaming chat with tool use
  - Added Mermaid diagram rendering
  - Built credit and ROI calculation panels
  - Integrated Anthropic via Replit AI Integrations

## Development

### Local Development
```bash
cd lyzr-boilerplate
npm run dev -- -p 5000 -H 0.0.0.0
```

### Building for Production
```bash
cd lyzr-boilerplate
npm run build
```

## Replit Configuration

### Workflow
- **Name:** Next.js Dev Server
- **Command:** `cd lyzr-boilerplate && npm run dev -- -p 5000 -H 0.0.0.0`
- **Port:** 5000
- **Output:** Webview

### Deployment
- **Type:** Autoscale (stateless web application)
- **Build:** `cd lyzr-boilerplate && npm run build`
- **Run:** `cd lyzr-boilerplate && npm start -- -p 5000 -H 0.0.0.0`

### Environment Variables (Auto-configured)
- `AI_INTEGRATIONS_ANTHROPIC_API_KEY` - Replit AI Integrations
- `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` - Replit AI Integrations

## Available Routes
- `/` - Redirects to /credit-calculator
- `/credit-calculator` - Main application

## User Preferences
None specified yet.
