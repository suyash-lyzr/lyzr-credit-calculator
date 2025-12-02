# Lyzr Credit Calculator

## Overview
This is an interactive Lyzr Credit Calculator built with Next.js 15, TypeScript, and Anthropic Claude. It features a Claude-like artifact experience with a sophisticated 3-part agent architecture.

**Current State:** Fully configured and running on Replit
**Last Updated:** December 2, 2025

## Application Features

### Credit Calculator
A Claude-like chat interface that helps users understand the cost and ROI of building AI agents on the Lyzr platform.

**Features:**
- **Chat Interface**: Full conversation experience with markdown support (40% width)
- **Architecture Diagram**: Mermaid-rendered agent flow diagrams with complexity badges
- **Credit Calculation**: Detailed cost breakdown using exact rate card with 20% overhead
- **ROI Calculation**: Comparison against human labor costs with fully loaded rates (60% width)

**How it works:**
1. User describes their automation needs
2. AI assesses complexity (LOW/MEDIUM/HIGH) using Connection & Workflow tests
3. AI generates three artifacts:
   - Agent architecture diagram with complexity profile
   - Credit cost calculation (fixed + variable + 20% overhead)
   - ROI comparison vs human costs (with 1.3x fully loaded rates)
4. Conversation can continue with updates to calculations

## Agent Architecture

### 3-Part System Design

**Part 1: Interaction Layer**
- Business Value Engineer & Solution Architect persona
- Clarifying questions for scope, volume, integrations
- Professional, data-driven communication

**Part 2: Complexity Assessment Matrix**
- Test 1: Connection Type Count (KB, DC, Tools)
- Test 2: Workflow Analysis (Sequential, Aggregation, Human-in-Loop)
- Classification: LOW (0.12 credits), MEDIUM (0.30), HIGH (0.52)

**Part 3: Calculation Logic**
- Fixed Costs: KB ($1), RAI ($1), Tool ($0.10), Agent ($0.05)
- Variable Costs: API ($0.20), KB Retrieval ($0.05), Memory ($0.005), etc.
- Model Costs: 25% handling markup
- 20% overhead for testing/simulation
- ROI: 1.3x fully loaded labor rates

### Tools
1. `generate_architecture` - Assess complexity, create Mermaid diagram
2. `calculate_credits` - Compute costs using rate card
3. `web_search` - Find real-time US labor rates
4. `calculate_roi` - Human vs AI cost comparison

## Project Architecture

### Technology Stack
- **Framework:** Next.js 15.5.0 with App Router
- **Language:** TypeScript 5
- **AI:** Anthropic Claude 3.5 Sonnet (user's API key)
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
│   │   ├── credit-calculator/ # Main application page (40-60 split)
│   │   └── layout.tsx
│   ├── components/
│   │   ├── credit-calculator/
│   │   │   ├── chat-sidebar.tsx
│   │   │   ├── chat-interface.tsx
│   │   │   ├── artifact-panel.tsx
│   │   │   ├── architecture-diagram.tsx (complexity badges)
│   │   │   ├── credit-calculation.tsx (rate breakdown)
│   │   │   └── roi-calculation.tsx (human vs AI)
│   │   └── ui/
│   ├── hooks/
│   └── lib/
│       ├── types.ts          # Comprehensive type definitions
│       └── utils.ts
├── public/
└── [config files]
```

### API Routes

#### POST /api/chat
Streaming chat API with Claude tool use and web search.

**Response:** Server-Sent Events (SSE) stream with events:
- `text`: Streaming text content
- `tool_start`: Tool execution started
- `tool_result`: Tool output data (architecture, credits, ROI)
- `done`: Stream complete
- `error`: Error occurred

## Recent Changes
- **2025-12-02:** Major Update - Sophisticated 3-Part Agent Architecture
  - Implemented Complexity Assessment Matrix (LOW/MEDIUM/HIGH)
  - Added exact rate card with 20% overhead calculation
  - Web search for real-time US labor rates
  - Fully loaded cost calculation (1.3x multiplier)
  - 40-60 layout split (chat vs calculation panel)
  - Updated all artifact components for new data structures

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

### Environment Variables
- `ANTHROPIC_API_KEY` - User's Anthropic API key (required)

## Available Routes
- `/` - Redirects to /credit-calculator
- `/credit-calculator` - Main application

## User Preferences
- Layout: 40% chat, 60% calculation results
- Uses own Anthropic API key
