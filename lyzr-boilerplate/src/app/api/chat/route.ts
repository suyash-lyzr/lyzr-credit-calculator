import Anthropic from "@anthropic-ai/sdk";
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tools: Anthropic.Tool[] = [
  {
    name: "generate_architecture",
    description: `Analyze the user's use case and design a multi-agent architecture.

Determine these architecture properties:

N_Agents: How many agents are needed?
- Single Agent = 1
- Orchestrator Pattern = 1 Manager + X Sub-agents
- Multi-Agent Chain = Total agents in workflow

N_KB: Does the use case involve Docs, PDFs, or Policies? (1 = Yes, 0 = No)
N_RAI: Is the domain Regulated (Finance/HR/Legal) or Public Facing? (1 = Yes, 0 = No)
N_Tools: Count of distinct external tool integrations

Determine scenario flags (these still inform LLM model selection):
B_Mem: 1 if Conversational, 0 if Transactional
B_KB: 1 if Search/Analysis is needed, 0 otherwise
B_RAI: 1 if High Complexity / External Output, 0 otherwise
B_API: Number of external tool calls per run

Choose complexity:
- LOW: 1 agent, 0-1 connections, simple Q&A
- MEDIUM: 2-3 agents OR orchestrator pattern, 2+ connections
- HIGH: 3+ agents in chain, mission-critical, 3+ connections

Mermaid diagram MUST use clean professional text. NEVER include emojis anywhere.`,
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Agent Workflow title" },
        summary: { type: "string", description: "High-level summary of what the workflow does" },
        complexity_profile: {
          type: "string",
          enum: ["LOW", "MEDIUM", "HIGH"],
        },
        architecture_pattern: {
          type: "string",
          enum: ["Single Agent", "Orchestrator", "Multi-Agent Chain"],
        },
        architecture_counts: {
          type: "object",
          properties: {
            n_agents: { type: "number" },
            n_kb: { type: "number" },
            n_rai: { type: "number" },
            n_tools: { type: "number" },
          },
          required: ["n_agents", "n_kb", "n_rai", "n_tools"],
        },
        scenario_variables: {
          type: "object",
          properties: {
            b_mem: { type: "number" },
            b_kb: { type: "number" },
            b_rai: { type: "number" },
            b_api: { type: "number" },
          },
          required: ["b_mem", "b_kb", "b_rai", "b_api"],
        },
        mermaidCode: {
          type: "string",
          description: "Mermaid.js flowchart code using graph TD format. NEVER use emojis. Clean professional text only.",
        },
      },
      required: [
        "title", "summary", "complexity_profile", "architecture_pattern",
        "architecture_counts", "scenario_variables", "mermaidCode",
      ],
    },
  },
  {
    name: "calculate_credits",
    description: `Calculate Lyzr cost using the AGENT RUN model. This pricing is fully transparent and customer-facing.

=== LYZR PRICING (PUBLIC, TRANSPARENT) ===

Lyzr charges ONLY for agent runs. Nothing else gets billed - no platform fee, no LLM markup, no service fee, no infrastructure fee.

Two deployment options:
- Lyzr Cloud:       $0.08 per agent run  (fully managed, no compute overhead)
- Lyzr VPC/On-Prem: $0.03 per agent run  (customer's own VPC, full data sovereignty)

LLM costs are passed through SEPARATELY at provider rates. Customer pays OpenAI / Anthropic / Google directly.

=== WHAT IS AN AGENT RUN ===

An agent run = one invocation of an agent that performs a discrete reasoning task.

INSIDE one agent run, the following are FREE (not separately billed):
- Knowledge Base lookups
- Tool / API calls
- Sub-agent calls
- Memory reads/writes
- Responsible AI Guardrails
- Agent Security Policy checks

One agent run = one billable unit, regardless of how much work happens inside it.

=== HOW TO COUNT AGENT RUNS PER USE CASE ===

CRITICAL MENTAL MODEL: The number a user gives you (e.g. "200 contracts/month" or "60,000
invoices/year") is almost always the SUCCESSFUL FINAL OUTPUT at the bottom of a funnel.
The real workload is bigger because:
  (a) FUNNEL — to ship N successful outputs the system processes more candidates upstream
      (rejections, reroutes, escalations, classification dead-ends).
  (b) PER-STEP REWORK — each step rarely passes first time. Real workflows have compliance
      checks, review loops, exception handling, and human-in-the-loop back-and-forth that
      multiply runs at specific stages. THIS IS WHERE THE TO-AND-FRO LIVES — bake it into
      the per-step iteration_multiplier, not into a separate aggregate adder.
  (c) OPERATIONAL BUFFER — one outer safety margin for surge volume, edge cases, copilot
      questions, and model retries. Keep this as a SINGLE clear number — do not fragment it.

Treating use cases as flat deterministic pipelines under-counts runs by 3-10x. Be defensible.

Step 1: Map the workflow into discrete reasoning steps INCLUDING compliance/review/approval
        gates that the user might omit. For invoice processing you typically have:
        intake → extract → policy/PO check → compliance/duplicate check → approval routing →
        post → confirm. Don't skip the validation/review steps.
        Tag each step with a phase (discovery / validation / processing / review / delivery / monitoring).

Step 2: For each step set:
  - runs (base reasoning calls per unit on first pass through this step)
  - iteration_multiplier (captures THE TO-AND-FRO at this stage)
       1.0  = always passes first time (rare)
       1.2  = 20% redo on average
       1.5  = ~50% need rework / second look
       2.0  = avg ~2 passes (review loops, compliance objection-and-fix)
       2.5+ = heavy back-and-forth (multiple rounds of approval, regulated workflows)
  - reasoning (1 sentence justifying both — name the rework reason: "compliance flag rate ~30%
    triggers re-extract + re-validate" / "approver kicks back ~40% for missing PO link")
  - effective_runs = runs × iteration_multiplier

  Default iteration_multiplier by step type — pick the HIGHER end for regulated workflows:
     classification / routing      → 1.05 - 1.20
     extraction / parsing          → 1.10 - 1.40   (higher when source quality is low)
     validation against rules      → 1.30 - 1.80   (compliance / 3-way match: high)
     judgment / review / scoring   → 1.40 - 1.80
     drafting / generation         → 1.50 - 2.50
     orchestration / planning      → 1.20 - 1.50
     critic / approval gate        → 1.50 - 2.50   (kickback rates 30-50% are normal)

Step 3: Apply the FUNNEL multiplier to volume.
  funnel_multiplier ≥ 1, applied to user-stated unit_volume.
  effective_unit_volume = unit_volume × funnel_multiplier
  Use the defaults library below; explain in funnel_rationale.

Step 4: STEADY-STATE math.
  base_runs_per_unit       = sum(step.runs)
  effective_runs_per_unit  = sum(step.runs × step.iteration_multiplier)
  steady_state_annual_runs = effective_unit_volume × effective_runs_per_unit

Step 5: ONE OPERATIONAL BUFFER (do not split into multiple categories).
  iteration_buffer_pct (typical 20-40%) — single outer margin covering everything not in the
  per-step iteration: surge volume, copilot questions on top of the core workflow, model
  retries/timeouts, novel inputs, ramp-up calibration in early months. Pick ONE number and
  state plainly what it covers in volume_breakdown_note.

  total_annual_runs = steady_state_annual_runs × (1 + iteration_buffer_pct/100)

  DO NOT emit separate continuous_ops_runs / onboarding_runs / edge_buffer_runs lines.
  Those are confusing for procurement. The single buffer above is the only adder.

Step 6: PHASE BREAKDOWN.
  Group runs_breakdown by phase and emit phase_breakdown[] with runs, pct_of_total, and a short
  note. This makes the number procurement-defensible and enables modular adoption.

=== DEFAULTS LIBRARY BY USE CASE CATEGORY ===

Pick the closest match, set use_case_category, and use these as starting points (adjust per
specifics). These are based on real enterprise deployments — do NOT default to lower numbers.

| Category                                                   | funnel_mult | per-step iter (avg) | operational buffer |
|------------------------------------------------------------|-------------|---------------------|--------------------|
| Document processing — high-throughput, structured          | 1.3 - 1.8   | 1.2 - 1.4           | 20 - 30%           |
| Document processing — judgment-heavy, regulated            | 1.5 - 2.5   | 1.6 - 2.2           | 25 - 35%           |
| Marketing campaigns — test-and-learn / creative            | 5.0 - 10.0  | 2.0 - 3.0           | 30 - 40%           |
| Customer service triage / support                          | 1.1 - 1.3   | 1.1 - 1.3           | 25 - 35%           |
| Decision workflows (CFO close, KYC, underwriting)          | 1.8 - 2.5   | 1.6 - 2.2           | 25 - 35%           |
| Real-time decisioning (next-best-action, fraud)            | 1.0 - 1.1   | 1.0 - 1.2           | 15 - 25%           |
| Research / analyst workflows (multi-source synthesis)      | 2.0 - 4.0   | 1.5 - 2.5           | 30 - 40%           |
| Code / engineering automation (review, refactor, tests)    | 1.5 - 3.0   | 2.0 - 3.0           | 25 - 35%           |
| Sales workflows (lead qual, outreach, enrichment)          | 2.0 - 5.0   | 1.3 - 1.8           | 25 - 35%           |

If the user only gave one volume number, ASSUME it is the successful-output bottom-of-funnel and
apply the category default. If they explicitly said "we receive X documents and process Y", set
funnel_multiplier = X/Y and skip the default. Always state your assumption in funnel_rationale.

=== QUICK CONVERSION EXAMPLES ===
  Generate one document from a prompt = 1 run
  Generate 50 variants in one structured-output call = 1 run
  Score one document across 5 independent rubric dimensions = 5 runs
  4 reviewers × 8 dimensions = 32 runs
  100 synthetic agents reacting across 4 channels = 400 runs
  One copilot turn = 1 run
  Tool / DB call inside an agent run = 0 (free)

=== COMMON MISTAKES TO AVOID ===
1. Counting outputs instead of reasoning steps
2. Counting tool calls as runs (they're free inside a run)
3. Forgetting the funnel (upstream volume widens)
4. Ignoring iteration buffer

=== LLM COST ESTIMATION (PASS-THROUGH, SHOWN SEPARATELY) ===

You MUST follow this 4-step framework. Do not just pick "GPT-4o for everything" — that is wasteful.

--- STEP A: Classify each agent in the architecture ---

For every agent (planner, worker, classifier, extractor, etc.) determine:
  • Task type: ROUTING/EXTRACTION (deterministic, narrow), CHAT/RAG (conversational), LONG-DOC (>20K input tokens), REASONING (multi-step planning, math, code), or FRONTIER (autonomous, high-stakes)
  • Context size per call: <8K, 8-100K, 100K-1M
  • Volume: high (>100K runs/yr), medium, low
  • Quality bar: production-critical vs best-effort

--- STEP B: Pick the cheapest model that clears the quality bar ---

Latest May 2026 provider rates (USD per 1M tokens, fully public, NO markup):

| Agent Role                                          | Recommended Model         | Provider  | Input  | Output | Ctx   |
|-----------------------------------------------------|---------------------------|-----------|--------|--------|-------|
| Cheapest routing / classification / extraction      | GPT-5.4 Nano              | OpenAI    | 0.20   | 1.25   | 272K  |
| Ultra-cheap workers (alt)                           | Gemini 3.1 Flash-Lite     | Google    | 0.25   | 1.50   | 1M    |
| Budget reasoning (math, logic, structured thinking) | o4-mini                   | OpenAI    | 0.55   | 2.20   | 200K  |
| Standard chat, RAG, customer support                | Gemini 3 Flash            | Google    | 0.50   | 3.00   | 1M    |
| Structured extraction, strong instruction follow    | Claude Haiku 4.5          | Anthropic | 1.00   | 5.00   | 200K  |
| Reasoning workhorse (best balance)                  | o3                        | OpenAI    | 2.00   | 8.00   | 200K  |
| Long-context multimodal (≤200K input)               | Gemini 3.1 Pro            | Google    | 2.00   | 12.00  | 2M    |
| Long-context multimodal (>200K input)               | Gemini 3.1 Pro            | Google    | 4.00   | 18.00  | 2M    |
| Standard general agent (≤272K context)              | GPT-5.4                   | OpenAI    | 2.50   | 15.00  | 272K  |
| GPT-5.4 long-context (>272K input)                  | GPT-5.4                   | OpenAI    | 5.00   | 22.50  | —     |
| Production coding, high-quality RAG, critic         | Claude Sonnet 4.6         | Anthropic | 3.00   | 15.00  | 1M    |
| Frontier autonomous coding / agentic loops          | Claude Opus 4.7           | Anthropic | 5.00   | 25.00  | 1M    |
| Hardest 5% of reasoning problems (use sparingly)    | o3-pro                    | OpenAI    | 20.00  | 80.00  | 200K  |

--- STEP C: MIX models in multi-agent architectures ---

Don't use one model everywhere. A typical multi-agent system looks like:
  • Triage / router agent     → GPT-5.4 Nano or Gemini 3.1 Flash-Lite (cheap)
  • Extraction / worker agents → Claude Haiku 4.5 or Gemini 3 Flash (mid-tier)
  • RAG / Q&A agent           → Gemini 3 Flash or GPT-5.4 Nano
  • Reasoning / validator     → o4-mini (cheap) or o3 (workhorse)
  • Long-doc analyzer         → Gemini 3.1 Pro (2M context, multimodal)
  • Orchestrator / planner    → GPT-5.4 or Claude Sonnet 4.6
  • Critic / reviewer         → Claude Sonnet 4.6 (best instruction following)
  • ONLY use Opus 4.7 / o3-pro when frontier reasoning truly needed (high stakes, autonomous)

--- STEP D: Estimate tokens per run by task type ---

| Task type                              | Avg input tokens | Avg output tokens |
|----------------------------------------|------------------|-------------------|
| Routing / classification               | 600              | 150               |
| Standard chat / RAG (with KB snippet)  | 2,000            | 500               |
| Multi-step orchestration / planning    | 4,500            | 1,200             |
| Long-doc analysis (legal/research)     | 10,000           | 1,500             |
| Very long context (full case/codebase) | 50,000           | 2,000             |

Adjust based on actual KB context size and conversational vs transactional nature.

--- STEP E: Build the detailed LLM step table (llm_steps) ---

CORE PRINCIPLE: EVERY agent run consumes at least one LLM call. The sum of llm_steps[].annual_calls
MUST equal total_annual_runs × (1 + llm_buffer_pct/100) within ±1%. If it doesn't, your math is wrong
and the customer will spot it immediately.

You MUST emit ONE row in llm_steps for EVERY step in runs_breakdown. (If a step legitimately uses
two different models — e.g., cheap router + reasoner inside one agent run — emit one row per model
and split runs_per_unit between them so they sum to the step's effective_runs.)

Compute the OVERHEAD FACTOR once and reuse it for every row:

    overhead_factor = 1 + iteration_buffer_pct / 100
                    = total_annual_runs / steady_state_annual_runs

(This is the SAME single buffer from the agent-run waterfall — typically 1.20–1.40.
If you compute < 1.0 you've made an error.)

For each LLM step row:
  • step_name           → MUST exactly match the step_name in runs_breakdown
  • action              → 1 sentence on what the LLM is doing in that step
  • runs_per_unit       → the EFFECTIVE runs for this step per business unit
                          = step.runs × step.iteration_multiplier
                          (i.e. step.effective_runs from runs_breakdown — NOT the raw "runs" value)
                          If two models split a step, the two rows' runs_per_unit must sum to step.effective_runs.
  • model_name + provider → pick from the May 2026 lineup using STEPS A-C. Mix models — do NOT use one model everywhere.
  • model_rationale     → 1 short sentence on why THIS model for THIS step
  • input_tokens / output_tokens → average per LLM call for THAT step (use Step D table, adjusted for KB context)
  • input_rate_per_1m / output_rate_per_1m → from the pricing table above
  • cost_per_call       = (input_tokens × input_rate_per_1m + output_tokens × output_rate_per_1m) / 1,000,000
  • cost_per_unit       = cost_per_call × runs_per_unit
  • annual_calls        = runs_per_unit × effective_unit_volume × overhead_factor × (1 + llm_buffer_pct/100)

                          For MULTIPLE WORKLOADS (rows[] populated): replace effective_unit_volume with
                          sum of effective_unit_volume across all rows (i.e. total effective volume
                          processed across backlog + ongoing). The LLM table is a CONSOLIDATED view.

  • annual_cost         = annual_calls × cost_per_call

MANDATORY SANITY CHECKS before emitting:
  1. sum(llm_steps[].annual_calls) ≈ total_annual_runs × (1 + llm_buffer_pct/100)   (within ±1%)
  2. sum(row.runs_per_unit) ≈ effective_runs_per_unit (when one model per step) or = effective_runs_per_unit (when steps are split across models)
  3. Every annual_calls value is ≥ unit_volume (because overhead_factor ≥ 1 and effective volume ≥ stated volume)
  4. llm_per_unit_cost = sum of cost_per_unit (one-pass per-unit cost, no overhead factor — that's per-unit not annual)

If a check fails, RECOMPUTE — do not ship a bad table.

llm_buffer_pct: 15-30% (separate from agent-run buffers). LLM buffer accounts for retries, self-correction loops, multi-sample generation, and tool-use iterations WITHIN a single agent run. Keep this LOWER than before since funnel/iteration/onboarding/continuous-ops are now modeled explicitly in the volume waterfall.

llm_per_unit_cost = sum of cost_per_unit across all llm_steps  (cost to process ONE business unit, no overhead)
llm_annual_cost   = sum of annual_cost across all llm_steps    (this fully reconciles with the agent-run total)

llm_breakdown (per-model rollup) is OPTIONAL — only fill it if it adds clarity, otherwise omit.

=== VOLUME RULES ===

unit_volume = annual volume of business units the user processes (NOT runs).

For BACKLOG (one-time): use the exact backlog count as unit_volume. No buffer needed beyond iteration_buffer_pct.
For ONGOING (monthly): unit_volume = monthly_volume × 12.
For COMBINED: use the "rows" array to show BOTH workloads as separate rows.

total_annual_runs = steady_state_annual_runs + continuous_ops_runs + onboarding_runs + edge_buffer_runs
(see Steps 3-8 above for the full waterfall — do NOT use the old flat formula.)

=== CALCULATION ===

rate_per_run = 0.08 (cloud) OR 0.03 (vpc) - default to cloud unless user says otherwise.

lyzr_annual_cost = total_annual_runs × rate_per_run
llm_annual_cost  = sum of llm_steps[i].annual_cost  (each row = annual_calls × cost_per_call)
total_annual_cost = lyzr_annual_cost + llm_annual_cost

=== MULTIPLE WORKLOADS ===

If user has both backlog and ongoing volume, populate "rows" array:
  rows: [
    { workload_name: "Backlog Migration", runs_per_unit, volume, annual_runs, lyzr_cost, llm_cost, total_cost },
    { workload_name: "Ongoing Processing", ... }
  ]
  combined_lyzr_total = sum of row lyzr_cost
  combined_llm_total = sum of row llm_cost
  combined_total = combined_lyzr_total + combined_llm_total
  combined_note = brief explanation

In multi-workload mode, set unit_volume = sum of rows[].volume so the llm_steps table footer (sum of annual_cost) reconciles exactly with combined_llm_total. Use the same runs_per_unit assumption that applies across the consolidated workload (or the volume-weighted average if backlog vs ongoing differ).`,
    input_schema: {
      type: "object" as const,
      properties: {
        agent_architecture_summary: { type: "string", description: "1-2 sentence summary of the agent architecture" },

        deployment: {
          type: "string",
          enum: ["cloud", "vpc"],
          description: "Deployment option. Default to 'cloud' unless user specifies VPC/on-prem.",
        },
        rate_per_run: {
          type: "number",
          description: "0.08 for cloud, 0.03 for vpc",
        },

        workload_name: { type: "string", description: "Name of the workload (e.g., 'Invoice Processing')" },
        unit_volume: { type: "number", description: "User-stated annual volume of successful business units (bottom-of-funnel output)" },

        use_case_category: { type: "string", description: "Closest match from the defaults library (e.g., 'Document processing — judgment-heavy, regulated')" },
        funnel_multiplier: { type: "number", description: "≥1. Ratio of upstream input volume to stated successful output volume. Use defaults library." },
        funnel_rationale: { type: "string", description: "1-2 sentences on why this funnel multiplier (rejections, reroutes, escalations)" },
        effective_unit_volume: { type: "number", description: "= unit_volume × funnel_multiplier" },

        runs_per_unit: { type: "number", description: "DEPRECATED legacy field — set equal to effective_runs_per_unit" },
        base_runs_per_unit: { type: "number", description: "Sum of step.runs across runs_breakdown (no iteration applied)" },
        effective_runs_per_unit: { type: "number", description: "Sum of step.runs × step.iteration_multiplier across runs_breakdown" },

        runs_breakdown: {
          type: "array",
          description: "Discrete reasoning steps. Each step MUST have an iteration_multiplier and effective_runs.",
          items: {
            type: "object",
            properties: {
              step_name: { type: "string", description: "Name of the reasoning step" },
              phase: {
                type: "string",
                enum: ["discovery", "validation", "processing", "review", "delivery", "monitoring"],
                description: "Workflow phase this step belongs to",
              },
              runs: { type: "number", description: "Base agent runs per unit at first attempt" },
              iteration_multiplier: { type: "number", description: "≥1. Avg attempts per unit for this step (rework, revision loops). Use the per-step-type defaults from the prompt." },
              effective_runs: { type: "number", description: "= runs × iteration_multiplier" },
              reasoning: { type: "string", description: "1 sentence justifying both runs and iteration_multiplier for this step" },
            },
            required: ["step_name", "phase", "runs", "iteration_multiplier", "effective_runs", "reasoning"],
          },
        },

        steady_state_annual_runs: { type: "number", description: "= effective_unit_volume × effective_runs_per_unit" },

        iteration_buffer_pct: {
          type: "number",
          description: "SINGLE operational buffer (typical 20-40%). One number covering surge volume, copilot questions, model retries, novel inputs, and ramp-up calibration. DO NOT split this into multiple categories.",
        },

        total_annual_runs: {
          type: "number",
          description: "= steady_state_annual_runs × (1 + iteration_buffer_pct/100). One single buffer applied — no separate continuous-ops/onboarding/edge lines.",
        },

        phase_breakdown: {
          type: "array",
          description: "Per-phase rollup of total_annual_runs grouped by phase. Enables modular adoption discussions.",
          items: {
            type: "object",
            properties: {
              phase: { type: "string" },
              runs: { type: "number" },
              pct_of_total: { type: "number", description: "% of total_annual_runs in this phase, 0-100" },
              note: { type: "string", description: "1 short sentence on what happens in this phase" },
            },
            required: ["phase", "runs", "pct_of_total"],
          },
        },
        volume_breakdown_note: { type: "string", description: "1-2 sentence summary of the volume model assumptions for this estimate" },

        lyzr_annual_cost: {
          type: "number",
          description: "= total_annual_runs × rate_per_run",
        },

        llm_steps: {
          type: "array",
          description: "DETAILED per-step LLM breakdown. ONE row per agent reasoning step in runs_breakdown. Each row picks the most suitable model for THAT step and shows tokens, rates, and cost.",
          items: {
            type: "object",
            properties: {
              step_name: { type: "string", description: "MUST match a step_name from runs_breakdown (e.g., 'Triage', 'Extract Fields', 'Validate')" },
              action: { type: "string", description: "1 sentence describing what the LLM is doing in this step (e.g., 'Classify ticket intent and route', 'Extract structured invoice fields')" },
              runs_per_unit: { type: "number", description: "EFFECTIVE LLM calls per business unit for this step = step.runs × step.iteration_multiplier (i.e. step.effective_runs from runs_breakdown). NOT the raw base runs. If a step is split across two models, the two rows' runs_per_unit must sum to step.effective_runs." },
              model_name: { type: "string", description: "Latest May 2026 model name, e.g., 'GPT-5.4 Nano', 'GPT-5.4', 'o3', 'o4-mini', 'Claude Sonnet 4.6', 'Claude Haiku 4.5', 'Claude Opus 4.7', 'Gemini 3 Flash', 'Gemini 3.1 Pro', 'Gemini 3.1 Flash-Lite'" },
              provider: { type: "string", description: "OpenAI | Anthropic | Google" },
              model_rationale: { type: "string", description: "1 short sentence on why THIS model for THIS step (e.g., 'Cheap classification — Nano is enough', 'Long-context contract analysis needs 1M ctx')" },
              input_tokens: { type: "number", description: "Average input tokens per LLM call for this step" },
              output_tokens: { type: "number", description: "Average output tokens per LLM call for this step" },
              input_rate_per_1m: { type: "number", description: "USD per 1M input tokens for the chosen model (provider rate, no markup)" },
              output_rate_per_1m: { type: "number", description: "USD per 1M output tokens for the chosen model (provider rate, no markup)" },
              cost_per_call: { type: "number", description: "= (input_tokens × input_rate_per_1m + output_tokens × output_rate_per_1m) / 1,000,000" },
              cost_per_unit: { type: "number", description: "= cost_per_call × runs_per_unit" },
              annual_calls: { type: "number", description: "= runs_per_unit (effective) × effective_unit_volume × overhead_factor × (1 + llm_buffer_pct/100), where overhead_factor = total_annual_runs / steady_state_annual_runs. For multi-workload (rows[]), use sum of effective_unit_volume across rows. SANITY CHECK: sum across all llm_steps MUST ≈ total_annual_runs × (1 + llm_buffer_pct/100)." },
              annual_cost: { type: "number", description: "= annual_calls × cost_per_call" },
            },
            required: [
              "step_name", "action", "runs_per_unit", "model_name", "provider",
              "model_rationale",
              "input_tokens", "output_tokens", "input_rate_per_1m", "output_rate_per_1m",
              "cost_per_call", "cost_per_unit", "annual_calls", "annual_cost",
            ],
          },
        },
        llm_buffer_pct: {
          type: "number",
          description: "Small within-run LLM buffer (15-25% typical). Accounts for retries, self-correction loops, and multi-sample generation INSIDE a single agent run. Keep low — the to-and-fro between steps is already in iteration_multiplier and the operational buffer.",
        },
        llm_per_unit_cost: { type: "number", description: "Sum of cost_per_unit across all llm_steps (LLM cost to process ONE business unit)" },
        llm_breakdown: {
          type: "array",
          description: "OPTIONAL rollup per model (sum of llm_steps grouped by model_name). Provide if useful, otherwise omit.",
          items: {
            type: "object",
            properties: {
              model_name: { type: "string" },
              provider: { type: "string" },
              runs_using_model: { type: "number" },
              avg_input_tokens: { type: "number" },
              avg_output_tokens: { type: "number" },
              input_rate_per_1m: { type: "number" },
              output_rate_per_1m: { type: "number" },
              annual_cost: { type: "number" },
            },
            required: [
              "model_name", "provider", "runs_using_model", "avg_input_tokens",
              "avg_output_tokens", "input_rate_per_1m", "output_rate_per_1m", "annual_cost",
            ],
          },
        },
        llm_annual_cost: { type: "number", description: "Sum of annual_cost across all llm_steps" },
        llm_note: {
          type: "string",
          description: "e.g., 'Pass-through to providers at public rates. Customer billed directly.'",
        },

        total_annual_cost: {
          type: "number",
          description: "= lyzr_annual_cost + llm_annual_cost",
        },

        rows: {
          type: "array",
          description: "Use ONLY when there are multiple workloads (e.g., backlog + ongoing)",
          items: {
            type: "object",
            properties: {
              workload_name: { type: "string" },
              runs_per_unit: { type: "number" },
              volume: { type: "number" },
              annual_runs: { type: "number" },
              lyzr_cost: { type: "number" },
              llm_cost: { type: "number" },
              total_cost: { type: "number" },
            },
            required: ["workload_name", "runs_per_unit", "volume", "annual_runs", "lyzr_cost", "llm_cost", "total_cost"],
          },
        },
        combined_lyzr_total: { type: "number" },
        combined_llm_total: { type: "number" },
        combined_total: { type: "number" },
        combined_note: { type: "string" },
      },
      required: [
        "agent_architecture_summary", "deployment", "rate_per_run",
        "workload_name", "unit_volume",
        "use_case_category", "funnel_multiplier", "funnel_rationale", "effective_unit_volume",
        "base_runs_per_unit", "effective_runs_per_unit",
        "runs_per_unit", "runs_breakdown",
        "steady_state_annual_runs",
        "iteration_buffer_pct",
        "total_annual_runs",
        "phase_breakdown",
        "lyzr_annual_cost",
        "llm_steps", "llm_buffer_pct", "llm_per_unit_cost", "llm_annual_cost",
        "total_annual_cost",
      ],
    },
  },
  {
    name: "web_search",
    description: `Search the web for real-time US labor rates. Source priority: Bureau of Labor Statistics (BLS), Salary.com, Glassdoor.`,
    input_schema: {
      type: "object" as const,
      properties: {
        query: { type: "string", description: "The search query" },
      },
      required: ["query"],
    },
  },
  {
    name: "calculate_roi",
    description: `Calculate ROI comparing total AI cost (Lyzr agent runs + LLM pass-through) vs human labor.

CRITICAL: Use ai_analysis.cost_per_unit = total_annual_cost / unit_volume from the credit calculation.
This means cost_per_unit INCLUDES both the Lyzr agent run cost AND the LLM pass-through cost.

Base country: USA. Savings should typically be 80-95%.

Role Mapping (US Median 2024 + 1.3x Loaded):
- Contract Analysis → Paralegal: $32/hr base → $41.60/hr loaded
- Legal Document Review → Legal Assistant: $30/hr base → $39/hr loaded
- Invoice Processing → AP Clerk: $25/hr base → $32.50/hr loaded
- KYC/AML → Compliance Officer: $45/hr base → $58.50/hr loaded
- Customer Support → CSR: $22/hr base → $28.60/hr loaded
- Data Entry → Specialist: $20/hr base → $26/hr loaded
- HR Queries → HR Coordinator: $27/hr base → $35.10/hr loaded

Human time per task (be realistic):
- Ticket triage: 8-12 minutes
- Invoice processing: 15-25 minutes
- Document review: 20-40 minutes
- Contract analysis: 45-90 minutes

Cost_Human = Volume × (Loaded_Rate / 60) × Minutes_Per_Task`,
    input_schema: {
      type: "object" as const,
      properties: {
        use_case: { type: "string" },
        unit_name: { type: "string" },
        human_analysis: {
          type: "object",
          properties: {
            mapped_role: { type: "string" },
            base_hourly_wage: { type: "number" },
            wage_source: { type: "string" },
            fully_loaded_rate: { type: "number" },
            time_per_task_minutes: { type: "number" },
            cost_per_unit: { type: "number" },
          },
          required: ["mapped_role", "base_hourly_wage", "wage_source", "fully_loaded_rate", "time_per_task_minutes", "cost_per_unit"],
        },
        ai_analysis: {
          type: "object",
          properties: {
            cost_per_unit: { type: "number", description: "Total cost per unit including Lyzr agent runs + LLM pass-through" },
            time_per_task_seconds: { type: "number" },
          },
          required: ["cost_per_unit", "time_per_task_seconds"],
        },
        volume_estimates: {
          type: "object",
          properties: {
            units_per_month: { type: "number" },
            units_per_year: { type: "number" },
          },
          required: ["units_per_month", "units_per_year"],
        },
        comparison: {
          type: "object",
          properties: {
            human_monthly_cost: { type: "number" },
            ai_monthly_cost: { type: "number" },
            monthly_savings: { type: "number" },
            human_yearly_cost: { type: "number" },
            ai_yearly_cost: { type: "number" },
            yearly_savings: { type: "number" },
            savings_percentage: { type: "number" },
            time_savings_percentage: { type: "number" },
            payback_period_days: { type: "number" },
          },
          required: ["human_monthly_cost", "ai_monthly_cost", "monthly_savings", "human_yearly_cost", "ai_yearly_cost", "yearly_savings", "savings_percentage", "time_savings_percentage", "payback_period_days"],
        },
        roi_percentage: { type: "number" },
      },
      required: ["use_case", "unit_name", "human_analysis", "ai_analysis", "volume_estimates", "comparison", "roi_percentage"],
    },
  },
  {
    name: "review_and_validate",
    description: `Quality assurance review for the full estimate. Validate all artifacts against business logic and the agent run model.

Pricing is fully TRANSPARENT in this model - you can refer to agent runs, the $0.08/$0.03 rates, and LLM pass-through directly. No confidentiality required.

Validation checks:
1. Architecture: Agent count matches workflow, KB/RAI/Tool flags reasonable
2. Agent Runs: runs_per_unit matches the discrete reasoning steps shown in runs_breakdown
3. Iteration buffer: 30-50% is typical, more only if heavy revision workflow
4. LLM model selection: matches complexity (simple → small models, complex → larger models)
5. Token estimates: reasonable for the use case domain
6. Volumes: total_annual_runs = unit_volume × runs_per_unit × (1 + buffer/100)
7. Lyzr cost = total_annual_runs × rate_per_run
8. ROI: ai_analysis.cost_per_unit equals total_annual_cost / unit_volume (Lyzr + LLM)
9. Savings percentage realistic (80-95% typical)

Write issues in clear business language. Since pricing is transparent you may reference agent runs, rates, and LLM costs directly.

DECISION:
- All checks pass → status: "approved", issues: []
- Any failure → status: "needs_revision", issues: [...]`,
    input_schema: {
      type: "object" as const,
      properties: {
        status: { type: "string", enum: ["approved", "needs_revision"] },
        issues: {
          type: "array",
          items: {
            type: "object",
            properties: {
              artifact: { type: "string", enum: ["architecture", "credits", "roi", "cross_check"] },
              severity: { type: "string", enum: ["critical", "warning"] },
              issue: { type: "string" },
              expected: { type: "string" },
            },
            required: ["artifact", "severity", "issue", "expected"],
          },
        },
        summary: { type: "string" },
      },
      required: ["status", "issues", "summary"],
    },
  },
];

const systemPrompt = `You are the Lyzr Credit Calculator, a Business Value Engineer that helps users estimate the cost of running AI agents on Lyzr.

## YOUR ROLE
You provide precise, transparent cost estimates using the AGENT RUN pricing model. Be conversational but professional.

## ========== LYZR PRICING MODEL (PUBLIC, TRANSPARENT) ==========

Lyzr charges ONLY for AGENT RUNS. Nothing else. No platform fee, no LLM markup, no service fee.

Two deployment options - both priced per agent run:
- Lyzr Cloud:       $0.08 per agent run  (fully managed)
- Lyzr VPC/On-Prem: $0.03 per agent run  (customer's environment)

LLM costs are passed through SEPARATELY at provider rates (OpenAI, Anthropic, Google). Customer pays the provider directly. Lyzr adds NO markup.

## WHAT IS AN AGENT RUN

One agent run = one invocation of an agent that performs a discrete reasoning task.

INSIDE one agent run, the following are FREE:
- Knowledge Base lookups
- Tool / API calls
- Sub-agent calls
- Memory operations
- Responsible AI Guardrails
- Agent Security Policy checks

## TRANSPARENCY POLICY

This pricing is FULLY PUBLIC. You SHOULD openly explain:
- The $0.08 Cloud / $0.03 VPC rate per agent run
- How agent runs are counted (discrete reasoning steps)
- That LLM cost is a pass-through to providers at public rates
- The token estimates and which models you assume

Do NOT use any old internal rate card terminology like Cost_Inference, B_Mem, B_KB, PRICE_RETRIEVE_*, etc. Those concepts no longer apply.

## OTHER RESTRICTIONS
- NEVER use emojis in ANY response - text, diagrams, anywhere
- NEVER show raw Mermaid code in chat - it renders in the artifact panel
- NEVER ask a second questionnaire - only ONE per conversation, then proceed to tools
- When user message starts with "My selections:" - STOP asking questions, START calling tools
- Use clean markdown with proper bullet points and tables

## CRITICAL: SEQUENTIAL TOOL EXECUTION
Call tools ONE AT A TIME in this order:
1. generate_architecture → STOP and wait
2. calculate_credits → STOP and wait
3. calculate_roi → STOP and wait
4. review_and_validate → STOP and wait

NEVER call multiple tools at once.

## INTERACTION FLOW

### STEP 1: Quick Assessment (4 questions, MUST include numeric volume)
When user describes a use case, ALWAYS ask the questionnaire below. Volume numbers are MANDATORY — without them you cannot estimate cost. Tailor the unit name (tickets / invoices / contracts / documents / leads / chats / etc.) and the placeholder value to match the use case the user described.

Supported question types:
- "radio"  → \`options: [...]\` (required)
- "number" → \`placeholder\` (suggested numeric example) and \`unit\` (e.g. "tickets/month") are required; \`helper\` is optional one-liner

\`\`\`json
{
  "type": "questionnaire",
  "intro": "Quick details so I can size the cost accurately:",
  "questions": [
    {
      "id": "workload_type",
      "question": "Is this an ongoing recurring workload, a one-time backlog, or both?",
      "type": "radio",
      "options": ["Ongoing (monthly recurring)", "One-time backlog", "Both ongoing + backlog"]
    },
    {
      "id": "ongoing_volume",
      "question": "Approximate ONGOING volume per month (enter 0 if backlog only)",
      "type": "number",
      "placeholder": "10000",
      "unit": "<UNIT>/month",
      "helper": "Replace <UNIT> with the actual unit (tickets, invoices, contracts, etc.)"
    },
    {
      "id": "backlog_volume",
      "question": "Total BACKLOG to process one-time (enter 0 if ongoing only)",
      "type": "number",
      "placeholder": "50000",
      "unit": "<UNIT> total",
      "helper": "Optional one-time migration / catch-up volume"
    },
    {
      "id": "deployment",
      "question": "Preferred deployment?",
      "type": "radio",
      "options": ["Lyzr Cloud ($0.08/run, managed)", "Lyzr VPC / On-Prem ($0.03/run, data sovereignty)"]
    }
  ]
}
\`\`\`

Volume validation rules:
- A "number" answer of 0 means "not applicable" for that workload type and is allowed ONLY when the workload_type radio excludes it.
- If workload_type is "Ongoing" → ongoing_volume MUST be > 0; backlog_volume should be 0.
- If workload_type is "One-time backlog" → backlog_volume MUST be > 0; ongoing_volume should be 0.
- If workload_type is "Both" → BOTH must be > 0.
- The questionnaire UI enforces > 0 — but if the user later sends contradictory selections, ask one short follow-up to resolve.

Conversational vs transactional should be inferred from the use case description; do not waste a question on it unless genuinely ambiguous.

### STEP 2: Analyze & Calculate
Once user sends "My selections:", DO NOT ask more questions. Immediately call tools sequentially:
1. generate_architecture - Design the agent architecture
2. calculate_credits - Compute agent runs and total cost (Lyzr + LLM separately)
3. calculate_roi - Compare against human labor cost
4. review_and_validate - Quality check all artifacts

### STEP 3: Review Iteration (MAX 3 ITERATIONS)
After review, if status="needs_revision":
- Revise the problematic artifact and re-call review_and_validate
- MAX 3 revision iterations - then approve with note about remaining minor issues
- Iteration count RESETS when user sends a new message

---

## AGENT RUN COUNTING FRAMEWORK

The mental model: count discrete REASONING steps, not outputs.

For each step in the workflow ask:
- Is this ONE reasoning task or MANY?
  "Score brief" = 1 run
  "Score brief across 4 independent dimensions" = 4 runs
- Does it batch via structured output?
  "Generate 11 segment variants in one call" = 1 run
  "Reason independently per segment" = 11 runs
- Is iteration involved?
  Re-runs after revision = additional runs
  Each copilot turn = 1 run

Apply the FUNNEL: upstream volume widens. If shipping 600 outputs but exploring 5,000 candidates, count 5,000.

ITERATION BUFFER: 30-50% over baseline for re-runs, revisions, copilot, edge cases.

QUICK EXAMPLES:
- 1 document from a prompt = 1 run
- 50 variants in one structured-output call = 1 run
- Score 1 doc across 5 independent dimensions = 5 runs
- 4 reviewers × 8 dimensions = 32 runs
- 100 synthetic agents × 4 channels = 400 runs
- 1 copilot turn = 1 run
- Tool call inside a run = 0 (free)

## COST FORMULAS (TRANSPARENT)

unit_volume = annual business units to process
runs_per_unit = sum of discrete reasoning steps per unit
total_annual_runs = unit_volume × runs_per_unit × (1 + iteration_buffer_pct/100)

rate_per_run = 0.08 (Cloud) or 0.03 (VPC)
lyzr_annual_cost = total_annual_runs × rate_per_run

LLM cost is computed PER STEP via llm_steps (canonical):
  cost_per_call    = (input_tokens × input_rate_per_1m + output_tokens × output_rate_per_1m) / 1,000,000
  cost_per_unit    = cost_per_call × runs_per_unit
  annual_calls     = runs_per_unit × unit_volume × (1 + llm_buffer_pct / 100)
  annual_cost      = annual_calls × cost_per_call
  llm_per_unit_cost = sum of cost_per_unit across all llm_steps
  llm_annual_cost   = sum of annual_cost across all llm_steps

total_annual_cost = lyzr_annual_cost + llm_annual_cost

## VOLUME RULES

- BACKLOG (one-time): unit_volume = exact backlog count. NO ×12 annualization.
- ONGOING (monthly): unit_volume = monthly_volume × 12.
- COMBINED: use "rows" array with both workloads.

## LLM MODEL SELECTION FRAMEWORK (LATEST MAY 2026 RATES, PASS-THROUGH, NO MARKUP)

Pick the cheapest model that clears each agent's quality bar. Mix models across agents — never use one model for everything.

| Agent Role                                          | Recommended Model         | Provider  | Input  | Output | Ctx   |
|-----------------------------------------------------|---------------------------|-----------|--------|--------|-------|
| Cheapest routing / classification / extraction      | GPT-5.4 Nano              | OpenAI    | 0.20   | 1.25   | 272K  |
| Ultra-cheap workers (alt)                           | Gemini 3.1 Flash-Lite     | Google    | 0.25   | 1.50   | 1M    |
| Budget reasoning (math, logic, structured thinking) | o4-mini                   | OpenAI    | 0.55   | 2.20   | 200K  |
| Standard chat, RAG, customer support                | Gemini 3 Flash            | Google    | 0.50   | 3.00   | 1M    |
| Structured extraction, strong instruction follow    | Claude Haiku 4.5          | Anthropic | 1.00   | 5.00   | 200K  |
| Reasoning workhorse (best balance)                  | o3                        | OpenAI    | 2.00   | 8.00   | 200K  |
| Long-context multimodal (≤200K input)               | Gemini 3.1 Pro            | Google    | 2.00   | 12.00  | 2M    |
| Long-context multimodal (>200K input)               | Gemini 3.1 Pro            | Google    | 4.00   | 18.00  | 2M    |
| Standard general agent (≤272K context)              | GPT-5.4                   | OpenAI    | 2.50   | 15.00  | 272K  |
| GPT-5.4 long-context (>272K input)                  | GPT-5.4                   | OpenAI    | 5.00   | 22.50  | —     |
| Production coding, high-quality RAG, critic         | Claude Sonnet 4.6         | Anthropic | 3.00   | 15.00  | 1M    |
| Frontier autonomous coding / agentic loops          | Claude Opus 4.7           | Anthropic | 5.00   | 25.00  | 1M    |
| Hardest 5% of reasoning problems (use sparingly)    | o3-pro                    | OpenAI    | 20.00  | 80.00  | 200K  |

Typical multi-agent mix: triage → GPT-5.4 Nano / Gemini 3.1 Flash-Lite • workers → Haiku 4.5 / Gemini 3 Flash • reasoning → o4-mini or o3 • long-doc → Gemini 3.1 Pro (2M ctx) • orchestrator → GPT-5.4 / Sonnet 4.6 • only use Opus 4.7 / o3-pro when frontier reasoning truly needed.

Token estimates per run:
- Routing / classification:                 600 in /   150 out
- Standard chat / RAG with KB snippet:    2,000 in /   500 out
- Multi-step orchestration / planning:    4,500 in / 1,200 out
- Long-doc analysis (legal / research):  10,000 in / 1,500 out
- Very long context (full case/codebase):50,000 in / 2,000 out

## LLM_STEPS — DETAILED PER-STEP TABLE (REQUIRED, CANONICAL)

You MUST emit ONE row in llm_steps for EVERY step in runs_breakdown. Per-step model selection (with rationale) is the customer-facing detail — do NOT collapse into vague aggregates.

For each step provide: step_name (matches runs_breakdown), action, runs_per_unit, model_name, provider, model_rationale (REQUIRED — 1 sentence on why THIS model for THIS step), input_tokens, output_tokens, input_rate_per_1m, output_rate_per_1m, cost_per_call, cost_per_unit, annual_calls, annual_cost.

llm_buffer_pct (30-50%): SEPARATE iteration buffer for LLM calls — accounts for retries, self-correction, multi-sample generation, tool-use iterations within a single agent run.

MULTI-WORKLOAD (rows[] populated): the llm_steps table is computed for ONE consolidated unit_volume = sum of all rows[].volume so footer totals reconcile with combined_llm_total. Set unit_volume to that combined sum.

llm_breakdown (per-model rollup) is OPTIONAL — only include if it adds clarity.

## OUTPUT GUIDELINES

- Be precise with numbers
- Always show Lyzr cost and LLM cost SEPARATELY in your summary
- Highlight the simplicity: one rate, no markup
- Highlight savings vs human labor prominently
- After all tools complete, give 1-2 sentence summary emphasizing total annual cost and ROI`;

async function performWebSearch(query: string): Promise<string> {
  try {
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const response = await fetch(searchUrl);
    const text = await response.text();

    if (!text || text.trim() === '') {
      return `Using standard Bureau of Labor Statistics wage data for US median rates.`;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return `Using standard Bureau of Labor Statistics wage data for US median rates.`;
    }

    if (data.Abstract) {
      return `Search Result: ${data.Abstract} (Source: ${data.AbstractSource || 'DuckDuckGo'})`;
    }

    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics.slice(0, 3).map((t: { Text?: string }) => t.Text).filter(Boolean).join('; ');
      if (topics) {
        return `Search Results: ${topics}`;
      }
    }

    return `Based on Bureau of Labor Statistics and salary data sources, typical US wages for this role range from the median rates. Using standard BLS data for calculation.`;
  } catch (error) {
    console.error("Web search error:", error);
    return `Using standard Bureau of Labor Statistics wage data for US median rates.`;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        const sendEvent = (event: string, data: unknown) => {
          const payload = `data: ${JSON.stringify({ event, data })}\n\n`;
          controller.enqueue(encoder.encode(payload));
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        };

        const runConversationLoop = async (
          conversationMessages: Anthropic.MessageParam[]
        ): Promise<void> => {
          const MAX_ITERATIONS = 10;
          let iteration = 0;
          let currentMessages = [...conversationMessages];

          while (iteration < MAX_ITERATIONS) {
            iteration++;

            let accumulatedText = "";
            let toolUseBlock: Anthropic.ToolUseBlock | null = null;
            let currentToolInput = "";
            let isProcessingTool = false;

            const response = anthropic.messages.stream({
              model: "claude-opus-4-7",
              max_tokens: 8192,
              system: systemPrompt,
              tools,
              tool_choice: { type: "auto" },
              messages: currentMessages,
            });

            for await (const event of response) {
              if (event.type === "content_block_delta") {
                const delta = event.delta;
                if ("text" in delta && delta.text) {
                  accumulatedText += delta.text;
                  sendEvent("text", { content: delta.text });
                } else if ("partial_json" in delta && delta.partial_json && isProcessingTool) {
                  currentToolInput += delta.partial_json;
                }
              } else if (event.type === "content_block_start") {
                if (event.content_block.type === "tool_use") {
                  if (!toolUseBlock) {
                    isProcessingTool = true;
                    console.log(`[SSE] Sending tool_start for: ${event.content_block.name}`);
                    sendEvent("tool_start", { tool: event.content_block.name });
                    toolUseBlock = {
                      type: "tool_use",
                      id: event.content_block.id,
                      name: event.content_block.name,
                      input: {},
                    };
                    currentToolInput = "";
                  } else {
                    console.log(`[SSE] Ignoring additional tool: ${event.content_block.name}`);
                  }
                }
              } else if (event.type === "content_block_stop") {
                if (toolUseBlock && currentToolInput && isProcessingTool) {
                  try {
                    toolUseBlock.input = JSON.parse(currentToolInput);
                    console.log(`[SSE] Parsed tool input for: ${toolUseBlock.name}`);
                  } catch (e) {
                    console.error(`[SSE] Failed to parse tool input:`, e);
                  }
                  isProcessingTool = false;
                }
              }
            }

            const finalResponse = await response.finalMessage();
            console.log(`[SSE] Iteration ${iteration} complete. stop_reason: ${finalResponse.stop_reason}, has toolUseBlock: ${!!toolUseBlock}`);

            if (toolUseBlock && toolUseBlock.input && Object.keys(toolUseBlock.input).length > 0) {
              const toolInput = toolUseBlock.input as Record<string, unknown>;
              const hasValidInput = Object.values(toolInput).some(v => v !== undefined && v !== null && v !== '');

              console.log(`[SSE] Tool: ${toolUseBlock.name}, hasValidInput: ${hasValidInput}, keys: ${Object.keys(toolInput).join(', ')}`);

              if (hasValidInput) {
                let toolResult: string;

                if (toolUseBlock.name === "web_search") {
                  const query = toolInput.query as string;
                  toolResult = await performWebSearch(query);
                  sendEvent("tool_result", { tool: toolUseBlock.name, data: { result: toolResult } });
                } else {
                  console.log(`[SSE] Sending tool_result for ${toolUseBlock.name}`);
                  sendEvent("tool_result", { tool: toolUseBlock.name, data: toolInput });
                  toolResult = JSON.stringify(toolInput);
                }

                const contentBlocks: Array<Anthropic.TextBlock | Anthropic.ToolUseBlock> = [];
                if (accumulatedText) {
                  contentBlocks.push({ type: "text", text: accumulatedText, citations: [] } as Anthropic.TextBlock);
                }
                contentBlocks.push(toolUseBlock);

                currentMessages = [
                  ...currentMessages,
                  { role: "assistant" as const, content: contentBlocks },
                  {
                    role: "user" as const,
                    content: [{
                      type: "tool_result" as const,
                      tool_use_id: toolUseBlock.id,
                      content: toolResult,
                    }],
                  },
                ];

                continue;
              }
            }

            if (finalResponse.stop_reason === "end_turn" || !toolUseBlock) {
              console.log(`[SSE] Ending loop - no more tools to call`);
              break;
            }
          }

          sendEvent("done", {});
          controller.close();
        };

        const anthropicMessages: Anthropic.MessageParam[] = messages.map(
          (m: { role: string; content: string }) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })
        );

        await runConversationLoop(anthropicMessages);
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json(
      { error: "Failed to process chat request" },
      { status: 500 }
    );
  }
}
