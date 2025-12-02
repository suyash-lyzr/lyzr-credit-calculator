# Lyzr Credit Calculator

## Overview
This is an interactive Lyzr Credit Calculator built with Next.js 15, TypeScript, and Anthropic Claude. It features a Claude-like artifact experience with a sophisticated 3-part agent architecture.

**Current State:** Fully configured and running on Replit
**Last Updated:** December 2, 2025
**Model:** Claude Opus 4.5 (claude-opus-4-5)

## Application Features

### Credit Calculator
A Claude-like chat interface that helps users understand the cost and ROI of building AI agents on the Lyzr platform.

**Features:**
- **Landing Page**: Simple centered layout with Lyzr logo, heading, and input box
- **Chat Interface**: Full conversation experience with markdown support (40% width)
- **Architecture Diagram**: Mermaid-rendered agent flow diagrams with complexity badges
- **Credit Calculation**: Detailed cost breakdown using exact rate card with 20% overhead
- **ROI Calculation**: Comparison against human labor costs with fully loaded rates (60% width)

**How it works:**
1. User lands on a clean page with Lyzr logo and single input
2. User describes their use case
3. UI transitions to 40-60 split layout
4. AI assesses complexity (LOW/MEDIUM/HIGH) using Connection & Workflow tests
5. AI generates three artifacts:
   - Agent architecture diagram with complexity profile
   - Credit cost calculation (fixed + variable + 20% overhead)
   - ROI comparison vs human costs (with 1.3x fully loaded rates)
6. Conversation can continue with updates to calculations

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
- **AI:** Anthropic Claude Sonnet 4 (user's API key)
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
│   │   ├── credit-calculator/
│   │   │   ├── landing-page.tsx       # Initial landing with logo and input
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
- **2025-12-02:** Claude Opus 4.5 & Interactive Canvas
  - Upgraded to Claude Opus 4.5 (claude-opus-4-5) - most intelligent model
  - Enforced sequential tool calling (one tool at a time, wait for result)
  - Added tabbed interface for artifacts (Architecture / Credits / ROI)
  - Interactive Mermaid diagram with zoom, pan, and drag (react-zoom-pan-pinch)
  - Fixed web search error handling with proper JSON parsing
  - Tabs auto-switch as each result comes in

- **2025-12-02:** Streaming & UI Updates
  - Implemented SSE streaming for real-time text output
  - Fixed chat scrolling with proper height constraints
  - Updated sidebar header with Lyzr logo (no circle) + "Credit Calculator" text
  - Added Lyzr icon for AI responses in chat
  - Improved markdown list formatting with proper bullet point styles

- **2025-12-02:** UI Improvements
  - Added clean landing page with Lyzr logo and single input
  - Page transitions to 40-60 split after first message
  - Replaced all gradient "L" icons with actual Lyzr logo
  - Changed "automation" to "use case" throughout
  - Added example chips for quick starts

- **2025-12-02:** Major Update - Sophisticated 3-Part Agent Architecture
  - Implemented Complexity Assessment Matrix (LOW/MEDIUM/HIGH)
  - Added exact rate card with 20% overhead calculation
  - Web search for real-time US labor rates
  - Fully loaded cost calculation (1.3x multiplier)
  - 40-60 layout split (chat vs calculation panel)

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
- Layout: Landing page → 40% chat, 60% calculation results
- Uses own Anthropic API key
- Terminology: "use case" instead of "automation"
