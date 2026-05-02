# Lyzr Credit Calculator

## Overview
The Lyzr Credit Calculator is an interactive application built with Next.js 15, TypeScript, and Anthropic Claude. Its primary purpose is to help users understand the cost and ROI of building AI agents on the Lyzr platform. It features a Claude-like artifact experience and utilizes a transparent Agent Run pricing model. The project aims to provide clear credit and ROI calculations based on user-defined use cases, facilitating informed decisions for adopting Lyzr's AI agent solutions.

## User Preferences
- Layout: Landing page → 40% chat, 60% calculation results
- Uses own Anthropic API key
- Terminology: "use case" instead of "automation"

## System Architecture
The application uses Next.js 15.5.0 with the App Router, TypeScript 5, and Anthropic Claude Opus 4.7 (`claude-opus-4-7`, using the user's API key). The temperature parameter is intentionally omitted — it is deprecated on this model. Styling is handled by Tailwind CSS 4 and shadcn/ui. Diagrams are rendered with Mermaid.js, and markdown support is provided by react-markdown.

The user interface transitions from a simple landing page to a 40-60 split layout after the initial user input. The AI assesses complexity (LOW/MEDIUM/HIGH) and generates four artifacts: an agent architecture diagram, a credit cost calculation showing Lyzr agent-run cost and LLM pass-through cost separately, an ROI comparison against human labor costs, and a review/validation pass.

The core pricing model is based on Agent Runs, with two deployment options: Lyzr Cloud ($0.08 per agent run) and Lyzr VPC / On-Prem ($0.03 per agent run). LLM costs are pass-through without markup. Agent runs are defined as one invocation of an agent performing a discrete reasoning task. The system includes tools for generating architecture diagrams (`generate_architecture`), calculating credits (`calculate_credits`), performing web searches for labor rates (`web_search`), calculating ROI (`calculate_roi`), and reviewing/validating artifacts (`review_and_validate`).

LLM cost estimation uses a 4-step framework codified in the system prompt: (A) classify each agent by task type, context size, volume, and quality bar; (B) pick the cheapest model that clears the quality bar from the May 2026 lineup (OpenAI GPT-5.4 Nano / GPT-5.4 / o4-mini / o3 / o3-pro, Anthropic Claude Haiku 4.5 / Sonnet 4.6 / Opus 4.7, Google Gemini 3.1 Flash-Lite / Gemini 3 Flash / Gemini 3.1 Pro with 2M context); (C) mix models across agents in multi-agent architectures (cheap routers, mid-tier workers, strong orchestrators); (D) estimate tokens per run by task type. Provider rates are baked into the prompt and refreshed for May 2026.

The application features a streaming API (`/api/chat`) for real-time text output and tool execution, using Server-Sent Events (SSE).

## External Dependencies
- **AI Model:** Anthropic Claude Opus 4.7 (`claude-opus-4-7`)
- **Database:** External Neon PostgreSQL
- **UI Components:** shadcn/ui (with Radix UI primitives)
- **Diagramming:** Mermaid.js
- **Markdown Rendering:** react-markdown with remark-gfm
- **Icons:** Lucide React, Tabler Icons