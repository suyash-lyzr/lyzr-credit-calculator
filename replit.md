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

**Part 3: Calculation Engine (Exact Formulas)**
Uses the confidential Lyzr rate card with exact formulas:

**Fixed Setup Cost:**
`Cost_Fixed = (N_Agents × $0.05) + (N_KB × $1.00) + (N_RAI × $1.00) + (N_Tools × $0.10)`

**Model Cost Per Inference (2000 in / 500 out tokens):**
- LOW → GPT_NANO: ~$0.000375
- MEDIUM → GPT_MINI: ~$0.001875  
- HIGH → GPT_MAIN: ~$0.009375

**Variable Cost Per Inference:**
`Cost_Inference = Cost_Model + $0.05 + (B_Mem × $0.005) + (B_KB × $0.05) + (B_RAI × $0.15) + (B_API × $0.20)`

**Volume Dynamics:**
- N_Runs_Annual = Monthly_Volume × 12 × 1.20 (20% buffer)
- N_Sessions = Chat: Vol/5, Transactional: Vol

**Total Annual Cost:**
`Total_Annual = Cost_Fixed + (N_Sessions_Annual × $0.05) + (N_Runs_Annual × Cost_Inference)`

ROI: 1.3x fully loaded labor rates comparison

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
- **2025-12-02:** Questionnaire UX & Architecture Summary
  - Hide raw JSON streaming when questionnaire is generating - shows "Preparing follow-up questions..." thinking state instead
  - Added agent_architecture_summary to credit calculation - shows agent flow (e.g., "3-Agent Chain: Ingestion → Extraction → Validation with KB")
  - Added strict confidentiality rules - micro-costing and rate card formulas are NEVER exposed to users
  - Credit calculation now references the built architecture for context

- **2025-12-02:** Exact Calculation Engine Implementation
  - Completely rewrote system prompt with exact rate card formulas from confidential intelligence
  - Fixed volume math: Vol_User is monthly, N_Runs_Annual = Vol_User × 12 × 1.20
  - Added complete calculation breakdown: Cost_Fixed, Cost_Model, Cost_Inference, N_Sessions, N_Runs
  - Simplified credit table output: Action Profile | Complexity | Unit Price | Volume | Total Annual
  - Simplified ROI table: Human vs AI comparison with net savings
  - Tightened UI spacing throughout artifact panel
  - Fixed Mermaid ID generation to avoid hydration errors

- **2025-12-02:** True Sequential Streaming
  - Rewrote API to use conversation loop for proper sequential tool execution
  - Each tool result streams immediately to frontend as it completes
  - Architecture → Credits → ROI appear one after another with loading states
  - Replaced tabs with stacked vertical sections for progressive display
  - Only processes first tool per response to ensure strict ordering

- **2025-12-02:** Interactive Questionnaire UI
  - Added interactive questionnaire component with checkboxes and radio buttons
  - AI now asks only 2-3 focused questions with predefined options
  - User selects options and clicks "Calculate Credits & ROI" to submit
  - Questions auto-detected from AI response JSON and rendered as interactive UI

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
