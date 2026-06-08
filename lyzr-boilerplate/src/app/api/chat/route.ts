import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { computeTotals, computeRoiComparison, type Deployment, type WorkloadInput } from "@/lib/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const tools: Anthropic.Tool[] = [
  {
    name: "generate_architecture",
    description: `Design the production-grade solution for the use case, decompose it into agent WORKLOADS, assign each the right orchestration tier, then produce a Mermaid diagram.

=== DESIGN ALTITUDE: PRODUCTION-REALISTIC (think like a solutions architect) ===

A user gives a one-line use case. Do NOT design the bare-minimum that technically works. First envision the COMPLETE solution a competent Lyzr solutions architect would actually deploy to PRODUCTION — including the supporting capabilities the use case implies even if unstated:
  ingestion/trigger · classification/triage · KB retrieval (RAG) · drafting/resolution · validation/quality checks · confidence-based decisioning · human-in-the-loop escalation · system-of-record logging/write-back · monitoring.
THEN apply the rubric to that REAL design. Two guardrails:
  - NO SANDBAGGING: don't collapse a confidence-gated, human-escalating, system-integrated workflow into a lone single agent just because it's cheaper. Under-scoping under-prices and loses customer trust.
  - NO PADDING: every agent/node must earn its place via a real production need (quality, reliability, compliance, escalation, integration). Don't split into many sub-agents if one agent + KB does the job just as well.
"Cheapest pattern that does the job" means the cheapest pattern that does the REAL production job — not a toy version.

Worked example: "customer support ticket triage" in production = classify intent/urgency + retrieve KB + draft resolution OR route + confidence gate (auto-resolve vs escalate) + escalate low-confidence to a human + log outcome to the ticketing system. That has a confidence branch + HITL + external write-back => it is a SUPERFLOW, not a lone single agent. (A pure "just tag and route" with nothing else would be a single agent.)

=== ORCHESTRATION SELECTION RUBRIC (decide per workload) ===

Break the production solution into its separate jobs (sub-use-cases). For EACH job pick the cheapest pattern that does that real job well. A real application is usually a MIXTURE.

1. SIMPLE / Single Agent — one task one agent can finish end-to-end. An agent may use Knowledge Base, tools, memory, data query, voice, a scheduler, or a webhook trigger and STILL be a Single Agent — none of those change the tier. This is the common case; default here.

2. COMPLEX / Superflow — a deterministic workflow that needs any of Superflow's SPECIAL NODES (this is the decisive test):
   - Human-in-the-loop approval (Wait for Approval)
   - Deterministic control flow: If/Else, Switch, Loop, Filter, Merge
   - Non-LLM / integration steps: HTTP, Code, Parse/Extract documents, Crypto, Set/transform
   - AI Swarm (parallel subtask decomposition as a workflow step)
   - Durable, long-running execution (waits of days/weeks, retries, exactly-once)
   - A fixed multi-step pipeline / agents chained in a defined order
   IMPORTANT: scheduling/cron or a webhook trigger ALONE does NOT force a Superflow — single agents and managers can be scheduled too. The special nodes above are the test.

3. INTERMEDIATE / Manager — several specialist agents coordinated by a manager that decides at runtime which to call and synthesizes. Pure reasoning/LLM work, NO special nodes. If it needs any special node, it is a Superflow instead.

4. VOICE — spoken channel (per-minute). Enable on the agent handling the call.

Always justify the cheapest pattern and NAME the capability that forces any escalation (e.g. "needs human approval -> Superflow"). A Superflow can contain single-agent and manager nodes (it is the superset).

=== MERMAID DIAGRAM (draw each workload at its TRUE tier) ===
- Clean professional text. NEVER use emojis.
- Do NOT add colors or styling — no classDef, style, linkStyle, ":::class", or %%{init}%% directives. The app applies the Lyzr brand theme; node TYPE is conveyed by the label (e.g. "If: ...", "Wait for Approval", "HTTP: ...", "LLM: ...") and shape, not color.
- ORIENTATION (match Lyzr Studio):
  - SUPERFLOW → HORIZONTAL: start the diagram with 'graph LR'.
  - SINGLE AGENT or MANAGER → VERTICAL: start with 'graph TD'.
  - MIXTURE → 'graph LR' at top level; wrap each workload in a 'subgraph' and set 'direction LR' inside a Superflow subgraph, 'direction TB' inside a Single/Manager subgraph.
- SINGLE AGENT: ONE agent node, with its Knowledge Base / tools shown as attached adjuncts (KB and Tool boxes pointing INTO the agent). Do NOT draw its internal steps (classify/draft/route) as separate sequential flow nodes — that misleads the viewer into thinking it's a multi-step pipeline (it's one run).
- MANAGER: the manager node with its sub-agent nodes hanging off it (delegation).
- SUPERFLOW: a real NODE GRAPH like the builder — Trigger --> nodes --> If/Switch branches / Loop / Wait for Approval --> end. Label node types (LLM, Code, If, HTTP, Wait for Approval, etc.).
- EDGE LABELS: keep branch labels short and clear, e.g. A -->|Yes| B and A -->|No| C (or |high confidence| / |low confidence|). They render as dark text on a cream chip.`,
    input_schema: {
      type: "object" as const,
      properties: {
        title: { type: "string", description: "Short title for the overall solution" },
        summary: { type: "string", description: "1-2 sentence summary of the whole solution" },
        workloads: {
          type: "array",
          description: "One entry per sub-use-case / workload, each assigned an orchestration tier.",
          items: {
            type: "object",
            properties: {
              name: { type: "string", description: "Name of this workload (e.g. 'Invoice intake pipeline', 'Data chat agent')" },
              complexity: {
                type: "string",
                enum: ["simple", "intermediate", "complex", "voice"],
                description: "simple=Single Agent, intermediate=Manager, complex=Superflow, voice=Voice agent",
              },
              reasoning: { type: "string", description: "1 sentence: why this tier — name the capability that forced it (or 'one task -> single agent')." },
            },
            required: ["name", "complexity", "reasoning"],
          },
        },
        mermaidCode: {
          type: "string",
          description: "Mermaid 'graph TD' code. Superflows rendered as node graphs. NEVER use emojis.",
        },
      },
      required: ["title", "summary", "workloads", "mermaidCode"],
    },
  },
  {
    name: "calculate_credits",
    description: `Provide the DESIGN for each workload. The server computes ALL costs deterministically from your design — DO NOT compute platform $ yourself. Your job is to supply accurate design inputs.

=== HOW PRICING WORKS (so your inputs are right) ===

Total Cost = Lyzr Platform Cost + LLM Cost.

PLATFORM COST depends on two things only — number of runs x complexity tier:
- A RUN = one execution request (one chat message, one pipeline fire, one schedule tick). A manager calling 5 sub-agents = 1 run. A Superflow with 12 nodes = 1 run. Scheduled daily for a year = 365 runs.
- Tier price per run (server applies it):
  - Simple (Single Agent): flat — $0.06 SaaS / $0.03 on-prem.
  - Intermediate (Manager): by sub_agents_executed — 1-4 / 5-8 / >=9.
  - Complex (Superflow): by nodes_executed — 1-10 / 11-20 / 21-30 / >30 (incremental). Loops x N, only the taken branch, retries, and AI-swarm spawns all COUNT as nodes executed. Nested superflows: list each one's node count.
  - Voice: per minute.

RUNTIME DRIVERS you must estimate (these set the band):
- sub_agents_executed: for a Manager, how many sub-agents actually run per request (executed, not configured).
- nodes_executed: for a Superflow, how many nodes fire on the path actually taken per run (count loops x iterations, only the branch taken, retries, swarm spawns).
- execution_paths (band-straddling): if a Superflow's branches land in DIFFERENT node bands (e.g. a short auto-resolve path of 8 nodes vs a long human-review path of 14 nodes), DON'T average them into one nodes_executed — instead provide execution_paths = [{nodes_executed, probability}, ...] and the server blends the price by probability. Use plain nodes_executed only when every path is in the same band.
- nested_superflow_node_counts: if a Superflow calls other Superflows, list each child's node count.
- voice_minutes_per_run: for Voice.

RUNS — estimate runs_per_period (ANNUAL) per workload from the user's volume:
- Chat: 1 run per user message. Ongoing monthly volume x 12. Backlog: the one-time count.
- Be realistic about the true funnel of work (rework that RE-TRIGGERS the whole workflow adds runs; rework that loops INSIDE one run raises nodes_executed, not runs).
- Each workload has its OWN volume — split the user's stated usage across workloads and explain in runs_rationale.

LLM COST (separate, pass-through, no markup) — provide llm_calls = the LLM-bearing executions in ONE run of the workload:
- Single Agent: ~1 call/run for pure Q&A; ~2 calls/run if it uses a tool or KB (one call to decide/use the tool, one to finalize) — count realistically.
- Manager: manager call + one per sub-agent executed.
- Superflow: one per LLM / AI-Agent / AI-Swarm node executed (x loop iterations). Non-LLM nodes (Code, HTTP, If, Set, Approval) have NO llm_calls.
- For each call give: label (the node/agent name), node_type (e.g. "LLM Agent", "Agent", "LLM node", "AI Swarm"), purpose (ONE short line on what the node does), model (from the real Studio catalog), provider, model_rationale (ONE short line on WHY this model fits this node — tie it to the node's job, e.g. "Cheapest router-class model — narrow classification fits it easily" / "Strong structured extraction with reliable instruction-following at low cost"), input_tokens, output_tokens. Pick the CHEAPEST model that clears the quality bar; MIX models across nodes. The server looks up the rate. Keep purpose and model_rationale to a single concise line each.
- RESEARCH / WEB-SEARCH NODES: if a node does live web research, news lookup, web search, or fetches up-to-date external information, it MUST use a research-capable model with built-in web access — Perplexity "sonar" (cheap) or "sonar-pro" (higher quality), or "sonar-reasoning-pro" / "sonar-deep-research" for heavier research. A plain chat model like gpt-4o-mini or gemini-2.5-flash CANNOT search the web on its own, so do NOT use it for the search/research step. (If the customer specifically wants Claude/GPT with web search, claude-sonnet-4-6 or gpt-5 with web search is acceptable; default to Perplexity Sonar for pure research.)
- byo_model: true if the customer brings their own model (then LLM cost is $0 on the Lyzr bill).

=== MODEL SELECTION BY TASK COMPLEXITY (match model power to each node's job) ===
Cost matters — default to the CHEAPEST model that clears the node's quality bar, and MIX models across nodes within one workflow. ALWAYS prefer the LATEST version in a family. Use this ladder to pick:
- TRIVIAL / high-volume (routing, classification, tagging, simple extraction, short canned replies): cheapest tier — gpt-5-nano, gpt-5.4-nano, gemini-2.5-flash-lite, claude-haiku-4-5, nova-micro.
- GENERAL-PURPOSE (standard chat, Q&A, RAG answers, summaries, everyday drafting): use a GPT model — gpt-5.4-mini by default, gpt-5.4 or gpt-5.5 when a bit more capability helps. (Default general-purpose tasks to GPT.)
- COMPLEX / HIGH-QUALITY (nuanced drafting, careful multi-field extraction, risk/quality analysis, coding): use Claude Sonnet — claude-sonnet-4-6 (gpt-5.5 is an alternative).
- COMPLEX REASONING (hard multi-step planning, deep legal/financial reasoning, tricky trade-offs, high-stakes decisions): use Opus — claude-opus-4-8 (latest, priciest — use only where reasoning truly demands it); o3 or gpt-5.5 are reasoning alternatives.
- RESEARCH / web search / news / "latest" info (REQUIRED for any search step — built-in web access): sonar (cheap), sonar-pro (quality), sonar-reasoning-pro / sonar-deep-research (heavy). Never use a plain chat model for the actual web-search step.
- LONG-CONTEXT (very large documents): gemini-2.5-pro, gemini-3.1-pro-preview.
Rule of thumb: don't put Opus on a node a cheap model handles (wastes money), and don't put a cheap model on a node that genuinely needs reasoning or quality (loses trust). Example mix in one Superflow: gpt-5.4-mini to classify -> sonar-pro to research -> claude-sonnet-4-6 to draft the hard part -> gpt-5.4-mini to format/log.

Token estimates per call by task type: routing 600/150 · chat/RAG 2000/500 · planning 4500/1200 · long-doc 10000/1500 · very-long 50000/2000.

Set deployment to "cloud" (SaaS) or "vpc" (on-prem) per the user. Provide agent_architecture_summary. The workload NAMES should match generate_architecture.`,
    input_schema: {
      type: "object" as const,
      properties: {
        agent_architecture_summary: { type: "string", description: "1-2 sentence summary of the architecture being priced" },
        deployment: { type: "string", enum: ["cloud", "vpc"], description: "cloud=SaaS, vpc=Customer VPC/On-Prem. Default cloud." },
        workloads: {
          type: "array",
          description: "One entry per workload (match names from generate_architecture). Provide DESIGN inputs only; server computes costs.",
          items: {
            type: "object",
            properties: {
              name: { type: "string" },
              complexity: { type: "string", enum: ["simple", "intermediate", "complex", "voice"] },
              reasoning: { type: "string", description: "Why this tier" },
              sub_agents_executed: { type: "number", description: "Manager only: sub-agents executed per run" },
              nodes_executed: { type: "number", description: "Superflow only: nodes executed on the path taken per run (loops x N, taken branch, retries, swarm spawns). Use this for the typical path when all branches land in the SAME node band." },
              execution_paths: {
                type: "array",
                description: "Superflow only, OPTIONAL: use INSTEAD of nodes_executed when branches land in DIFFERENT node bands (e.g. a short 8-node auto path vs a long 14-node human-review path). List each path; the server blends the per-run price by probability. Omit when one band covers all paths.",
                items: {
                  type: "object",
                  properties: {
                    nodes_executed: { type: "number", description: "Nodes executed on this path" },
                    probability: { type: "number", description: "Relative likelihood of this path (0-1; the server normalizes)" },
                  },
                  required: ["nodes_executed", "probability"],
                },
              },
              nested_superflow_node_counts: { type: "array", items: { type: "number" }, description: "Superflow only: node count of each nested superflow invoked" },
              voice_minutes_per_run: { type: "number", description: "Voice only: minutes per run" },
              runs_per_period: { type: "number", description: "ANNUAL runs for this workload" },
              runs_rationale: { type: "string", description: "How runs_per_period was derived (volume, frequency, funnel, split across workloads)" },
              byo_model: { type: "boolean", description: "True if customer brings own model for this workload (LLM cost $0 on Lyzr bill)" },
              llm_calls: {
                type: "array",
                description: "LLM-bearing executions in ONE run of this workload. Empty for non-LLM-only workloads.",
                items: {
                  type: "object",
                  properties: {
                    label: { type: "string", description: "The node/agent name, e.g. 'Classify intent + urgency'" },
                    node_type: { type: "string", description: "Kind of node, e.g. 'LLM Agent', 'Agent', 'LLM node', 'AI Swarm'" },
                    purpose: { type: "string", description: "ONE short line on what this node does, e.g. 'Tags each ticket with intent and urgency'" },
                    model: { type: "string", description: "Model name from the real Studio catalog" },
                    provider: { type: "string" },
                    model_rationale: { type: "string", description: "ONE short line on WHY this model fits this node, e.g. 'Cheapest router-class model — narrow classification fits it easily'" },
                    input_tokens: { type: "number" },
                    output_tokens: { type: "number" },
                  },
                  required: ["label", "node_type", "purpose", "model", "provider", "model_rationale", "input_tokens", "output_tokens"],
                },
              },
            },
            required: ["name", "complexity", "reasoning", "runs_per_period", "llm_calls"],
          },
        },
        notes: { type: "string", description: "Any assumptions worth surfacing to the customer" },
      },
      required: ["agent_architecture_summary", "deployment", "workloads"],
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
    description: `Provide the DESIGN INPUTS for an ROI comparison (AI cost vs human labor). The SERVER computes the comparison deterministically (yearly costs, residual human cost, net savings, %, payback, roi_percentage) and returns it — DO NOT compute savings/percentages yourself. After the result returns, quote ITS comparison numbers exactly in your chat summary.

Use ai_analysis.cost_per_unit = total_annual_cost (from the calculate_credits result) / annual business-unit volume. This INCLUDES both platform and LLM cost.

VOLUME CONSISTENCY (critical): volume_estimates.units_per_year MUST equal the total annual runs of the primary business workload you already priced in calculate_credits (e.g. if that workload had runs_per_period = 200, then units_per_year = 200 and units_per_month = 200/12). Do NOT re-estimate or round it to a different number — the ROI volume and the credits volume must match exactly.

Base country: USA. Savings typically 80-95%.

Role Mapping (US Median 2024 + 1.3x Loaded):
- Contract Analysis -> Paralegal: $32/hr -> $41.60/hr
- Legal Document Review -> Legal Assistant: $30/hr -> $39/hr
- Invoice Processing -> AP Clerk: $25/hr -> $32.50/hr
- KYC/AML -> Compliance Officer: $45/hr -> $58.50/hr
- Customer Support -> CSR: $22/hr -> $28.60/hr
- Data Entry -> Specialist: $20/hr -> $26/hr
- HR Queries -> HR Coordinator: $27/hr -> $35.10/hr

Human time per task: ticket triage 8-12 min · invoice 15-25 min · doc review 20-40 min · contract 45-90 min.
Cost_Human = Volume x (Loaded_Rate / 60) x Minutes_Per_Task

=== HUMAN-IN-THE-LOOP: DO NOT OVERSTATE SAVINGS ===
If the architecture KEEPS a human in the loop (any Wait-for-Approval / review / escalation node), the AI does NOT replace 100% of the labor. Reflect the retained human work using the right one of TWO patterns:

PATTERN A — mandatory approval/sign-off on EVERY run (e.g. a PM approves every PRD, a lawyer signs every contract):
  - automation_rate = 0 (nothing is fully hands-off; every unit gets a human touch). This is CORRECT and expected — not a flaw.
  - residual_human_minutes_per_unit = the SHORT review/approval time per unit (the quick sign-off on an AI-produced draft, typically 10-30% of the full manual time_per_task_minutes — the AI did the heavy lifting). Applied to every unit.

PATTERN B — confidence-gated escalation (only a SUBSET reaches a human, e.g. low-confidence support tickets):
  - automation_rate = the fraction auto-handled end-to-end (e.g. 0.7 if ~70% auto-resolve).
  - residual_human_minutes_per_unit = (1 - automation_rate) x review_minutes_per_escalated_unit, amortized across ALL units.

Fully autonomous (no human node anywhere): automation_rate = 1, residual_human_minutes_per_unit = 0.

The server folds residual human cost into the AI-solution total so savings stay honest. Pick the pattern that matches the diagram; never claim 100% replacement when a human node exists.

TIME SAVINGS must reflect the reduction in HUMAN effort, not AI compute latency. If a human still spends ~12 min reviewing each unit (vs 60 min manual), that is an 80% time saving, NOT 95%. Quote comparison.time_savings_percentage from the returned result — do not compute a higher number from the AI's processing speed.`,
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
            cost_per_unit: { type: "number", description: "total_annual_cost / annual unit volume (platform + LLM)" },
            time_per_task_seconds: { type: "number" },
            automation_rate: { type: "number", description: "Fraction of units handled end-to-end with NO human touch (0-1). 1.0 only if the design is fully autonomous (no human node). < 1 if there is any HITL / approval / review / escalation node." },
            residual_human_minutes_per_unit: { type: "number", description: "Avg human minutes still spent per unit after automation, amortized across ALL units = (1 - automation_rate) x review_minutes_per_escalated_unit. 0 if fully autonomous." },
          },
          required: ["cost_per_unit", "time_per_task_seconds", "automation_rate", "residual_human_minutes_per_unit"],
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
    description: `Quality-check all artifacts against the new complexity-tier pricing model.

Checks:
1. Orchestration: each workload is the CHEAPEST tier that does the job; any Manager/Superflow escalation names the capability that forced it. Superflow only when a special node is needed (approval, If/Switch/Loop/Filter, HTTP/Code/Parse, AI Swarm, durable waits, fixed pipeline) — NOT merely because of a schedule.
2. Runtime bands: sub_agents_executed / nodes_executed are realistic (executed, not configured); loops/retries/swarm spawns counted in nodes_executed; nested superflows listed.
3. Runs: runs_per_period realistic per workload; chat = 1 run/message; scheduled fires counted; rework that re-triggers adds runs (not nodes).
4. LLM: llm_calls present for every LLM-bearing execution; models from the real catalog; cheapest-that-clears-the-bar; mixed across nodes; tokens reasonable. LLM tied to executions, not run count.
5. Deployment correct (cloud/vpc). BYO flag correct.
6. ROI: ai cost_per_unit = total_annual_cost / unit volume; savings plausible. HITL CONSISTENCY: if any workload has a human node (Wait-for-Approval / review / escalation / confidence gate to a person), automation_rate MUST be < 1 and residual_human_minutes_per_unit > 0 — flag as critical if the ROI claims 100% automation while the architecture shows a human node. Conversely a fully autonomous design must have automation_rate = 1.

DECISION: all pass -> "approved", issues:[]. Any failure -> "needs_revision" with issues.`,
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

const systemPrompt = `You are the Lyzr Credit Calculator, a Business Value Engineer that estimates the cost of running AI agents on Lyzr using the COMPLEXITY-TIER pricing model. Be conversational but precise.

## ========== PRICING MODEL ==========

Total Cost = Lyzr Platform Cost + LLM Cost.

Lyzr Platform Cost depends on exactly two things: NUMBER OF RUNS x COMPLEXITY TIER.
LLM Cost is pass-through to the model provider at public rates, NO markup (and $0 on the Lyzr bill if the customer brings their own model).

### What is a RUN
One run = one execution request — one invocation/trigger of a workload — regardless of how much happens inside it.
- One chat message = 1 run. A manager calling 5 sub-agents for one request = 1 run. A Superflow with 12 nodes executed once = 1 run. Scheduled daily for a year = 365 runs. An HITL pause does not split a run.
- Rework: re-triggering the WHOLE workflow = +1 run; looping/retrying INSIDE one execution = more nodes_executed (higher band), still 1 run.

### Complexity tiers and rates (per run; SaaS / On-Prem)
- Simple / Single Agent: $0.06 / $0.03 (flat).
- Intermediate / Manager: by sub-agents executed — 1-4 $0.18/$0.09 · 5-8 $0.36/$0.18 · >=9 $0.54/$0.27.
- Complex / Superflow: by nodes executed — 1-10 $0.30/$0.18 · 11-20 $0.60/$0.36 · 21-30 $0.90/$0.54 · >30 = 21-30 base + $0.02/$0.01 per node beyond 30. Nested superflows are summed.
- Voice: $0.09 / $0.06 per minute.
Features like Knowledge Base, tools, memory, guardrails run INSIDE a run and are NOT billed separately — they never change the tier.

### Orchestration selection (the heart — decide per sub-use-case)
DESIGN ALTITUDE = PRODUCTION-REALISTIC. First envision the COMPLETE solution a competent architect would actually ship (including implied supporting steps: retrieval, validation, confidence/escalation, human-in-the-loop, system-of-record logging, monitoring). THEN tier it. No sandbagging (don't shrink a real workflow to one agent to look cheap) and no padding (every component must earn its place). "Cheapest pattern that does the job" = does the REAL production job.
Decompose the solution; pick the cheapest pattern that does each job well. Mixtures are normal.
- SIMPLE/Single Agent: one task one agent can finish (KB/tools/memory/voice/scheduler/webhook don't change this). The common case.
- COMPLEX/Superflow: a deterministic workflow needing any SPECIAL NODE — human approval, If/Switch/Loop/Filter, HTTP/Code/Parse-Extract, AI Swarm, durable waits, or a fixed multi-step pipeline. (A schedule/cron alone does NOT force a Superflow.)
- INTERMEDIATE/Manager: several specialist agents coordinated by a manager at runtime; pure reasoning, no special nodes.
- VOICE: spoken channel (per minute).
Name the capability that forces any escalation.

### Decomposition discipline (avoid the over-split / inconsistency bug)
- Create a SEPARATE workload ONLY for a genuinely DIFFERENT job. An ongoing volume and a one-time BACKLOG of the SAME process are the SAME workload run more times — fold the backlog into that workload's runs_per_period (e.g. ongoing_annual + backlog). Do NOT spawn a separate "Backlog Reprocessing" superflow/architecture unless the backlog genuinely needs different processing.
- KEEP EVERYTHING CONSISTENT: the workloads in generate_architecture, the subgraphs in the diagram, the workloads in calculate_credits, and your chat description must match exactly — same count, same names, same tiers. If you say "a single Superflow" in chat, the diagram must show exactly one Superflow.

### LLM cost
Decoupled from run count — one run can have many LLM calls. Per run, count LLM-bearing executions (single agent ~1; manager = manager + each sub-agent; superflow = one per LLM/agent/swarm node executed). MATCH MODEL POWER TO THE TASK, always prefer the LATEST version, and mix models across nodes: trivial/high-volume steps -> cheapest (gpt-5-nano, gpt-5.4-nano, claude-haiku-4-5); general-purpose chat/RAG/summaries -> a GPT model (gpt-5.4-mini / gpt-5.4 / gpt-5.5); complex/high-quality work -> claude-sonnet-4-6; hard multi-step reasoning -> claude-opus-4-8 (sparingly); research/web-search -> Perplexity sonar / sonar-pro (never a plain chat model for the search itself). The server computes the cost from token estimates and the public rate.

## ========== IMPORTANT: YOU DESIGN, THE SERVER COMPUTES ==========
Do NOT do cost arithmetic yourself — for EITHER credits OR ROI. In calculate_credits you provide the DESIGN (workloads, tiers, runtime drivers, runs, llm_calls); in calculate_roi you provide the DESIGN inputs (per-unit costs, volume, automation_rate, residual minutes). The server computes all money deterministically and returns the totals/comparison. After each result returns, quote ITS numbers EXACTLY — never restate a savings figure, percentage, or payback you calculated in your head, because it will drift from the panel.

## RESTRICTIONS
- NEVER use emojis anywhere.
- NEVER show raw Mermaid code in chat (it renders in the artifact panel).
- Ask only ONE questionnaire per conversation, then proceed to tools.
- When a user message starts with "My selections:" — STOP asking, START calling tools.
- Use clean markdown (bullets, tables).
- NEVER narrate internal tool mechanics to the user — no "the server returned empty", "let me retry", "the workloads array wasn't formatted", tool names, or JSON shapes. If a tool call comes back empty or wrong, silently call it again with corrected input. The user only ever sees polished results and reasoning.
- Do NOT write "~" before a number to mean "approximately" (it renders as strikethrough). Write "about" or "≈" instead (e.g. "about $7,956", not "~$7,956").

## MARKDOWN FORMATTING (renders as GitHub-flavored markdown — get this right)
- A heading ('##' / '###') MUST start on its OWN line with a BLANK line before it. NEVER glue a heading onto the end of a sentence — write "...then price it.\n\n## Architecture & reasoning", NEVER "...then price it.## Architecture & reasoning".
- Do NOT put filler narration on the same line as a heading. If you want a lead-in sentence, put it on its own line, then a blank line, then the heading.
- Same for bullets and tables: blank line before the list/table starts.

## SEQUENTIAL TOOL EXECUTION (one at a time, in order)
1. generate_architecture -> STOP and wait
2. calculate_credits -> STOP and wait
3. calculate_roi -> STOP and wait
4. review_and_validate -> STOP and wait
NEVER call multiple tools at once. If review returns needs_revision, fix and re-review (max 3 iterations).

## INTERACTION FLOW

### STEP 1: Questionnaire (ask once)
When the user describes a use case, ask the questionnaire below. Tailor the volume unit (tickets / invoices / contracts / messages / documents / leads / calls) to the use case. Volume is MANDATORY.

\`\`\`json
{
  "type": "questionnaire",
  "intro": "A few details so I can size the cost accurately:",
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
      "helper": "Replace <UNIT> with the actual unit (tickets, invoices, messages, etc.)"
    },
    {
      "id": "backlog_volume",
      "question": "Total BACKLOG to process one-time (enter 0 if ongoing only)",
      "type": "number",
      "placeholder": "50000",
      "unit": "<UNIT> total"
    },
    {
      "id": "deployment",
      "question": "Preferred deployment?",
      "type": "radio",
      "options": ["Lyzr SaaS (managed)", "Customer VPC / On-Prem"]
    },
    {
      "id": "model_hosting",
      "question": "Which LLM models will you use?",
      "type": "radio",
      "options": ["Lyzr-hosted models (pass-through pricing)", "Bring your own model (you pay the provider directly)"]
    }
  ]
}
\`\`\`

### STEP 2: After "My selections:"
Immediately call tools in order: generate_architecture -> calculate_credits -> calculate_roi -> review_and_validate.
- Decompose into workloads per the rubric and allocate the stated volume across workloads (explain in runs_rationale).
- Map deployment: "Lyzr SaaS" -> cloud; "Customer VPC / On-Prem" -> vpc.
- Map model_hosting: "Bring your own model" -> byo_model: true on the workloads; else false.

## OUTPUT GUIDELINES
- RIGHT AFTER generate_architecture (before pricing), explain the ARCHITECTURE REASONING in chat in PLAIN, simple English — like you're explaining it to a smart non-technical business person, not an engineer. Use this structure:
  - "Architecture & reasoning" heading.
  - 1-2 sentences on what the job REALLY involves once you think it through — the steps a real version needs that the one-liner implies (e.g. "answering a ticket isn't just writing a reply — you first read it, figure out what it's about, look up the answer, and decide whether it's safe to send automatically or needs a human to check"). This is the "why" behind the design.
  - Then each workload: name it, its tier, and WHY in everyday words — explain the capability that decided it in plain terms, not jargon. e.g. "Because some replies need a human to approve them before they go out, and the steps must run in a set order, this is a Superflow — a plain single agent can't pause for approval or call your ticketing system." For a Single Agent, say why one agent is enough.
  - 1 short line on what you deliberately kept OUT to avoid over-building (when relevant), in plain terms.
  Keep the SAME overall length as now — tight, a few short paragraphs/bullets. Goal: the user clearly understands the thinking in simple language, not just the result. Avoid heavy jargon; if you must use a term like "If/Else" or "webhook", briefly say what it does.
- After all tools complete, give a 1-2 sentence cost summary: total annual cost split into Platform vs LLM, and the headline ROI.
- Always present Platform cost and LLM cost separately. Highlight that pricing is just runs x complexity, with LLM passed through at provider rates.
- Your chat description MUST match the diagram and the priced workloads exactly (same workloads, names, tiers, count).
- When you quote the human hourly rate in chat, use the EXACT fully_loaded_rate you passed to calculate_roi (e.g. "$28.60/hr") — do NOT round it to a different integer than the unit-cost math implies.
- ROI honesty: if the architecture has a human-in-the-loop node, state the auto-resolution rate and that the remaining units still need brief human review — do NOT claim you replace 100% of the manual labor.`;

async function performWebSearch(query: string): Promise<string> {
  try {
    const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1`;
    const response = await fetch(searchUrl);
    const text = await response.text();

    if (!text || text.trim() === "") {
      return `Using standard Bureau of Labor Statistics wage data for US median rates.`;
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return `Using standard Bureau of Labor Statistics wage data for US median rates.`;
    }

    if (data.Abstract) {
      return `Search Result: ${data.Abstract} (Source: ${data.AbstractSource || "DuckDuckGo"})`;
    }

    if (data.RelatedTopics && data.RelatedTopics.length > 0) {
      const topics = data.RelatedTopics.slice(0, 3)
        .map((t: { Text?: string }) => t.Text)
        .filter(Boolean)
        .join("; ");
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

/**
 * Run the deterministic pricing engine over the model's calculate_credits DESIGN input and
 * return the fully-costed credit-calculation artifact. The model never computes money.
 */
function buildCreditArtifact(toolInput: Record<string, unknown>) {
  const deployment: Deployment = toolInput.deployment === "vpc" ? "vpc" : "cloud";
  const rawWorkloads = Array.isArray(toolInput.workloads)
    ? (toolInput.workloads as WorkloadInput[])
    : [];
  const totals = computeTotals(rawWorkloads, deployment);

  // Merge design inputs (runtime drivers, runs_rationale) with engine-computed cost fields so the
  // artifact carries both — useful for display and Phase-2 editing.
  const workloads = rawWorkloads.map((w, i) => ({ ...w, ...totals.workloads[i] }));

  return {
    agent_architecture_summary:
      typeof toolInput.agent_architecture_summary === "string"
        ? toolInput.agent_architecture_summary
        : "",
    deployment,
    workloads,
    platform_annual_cost: totals.platform_annual_cost,
    llm_annual_cost: totals.llm_annual_cost,
    llm_annual_cost_external: totals.llm_annual_cost_external,
    total_annual_cost: totals.total_annual_cost,
    notes: typeof toolInput.notes === "string" ? toolInput.notes : undefined,
  };
}

/**
 * Deterministically compute the ROI comparison from the model's design inputs so the chat prose,
 * the ROI panel, and the saved artifact can never disagree. The model supplies per-unit costs,
 * volume, automation_rate and residual human minutes; the server does ALL the money math —
 * including the residual human labor retained by any human-in-the-loop design.
 */
function buildRoiArtifact(
  toolInput: Record<string, unknown>,
  creditArtifact?: ReturnType<typeof buildCreditArtifact> | null
) {
  const human = (toolInput.human_analysis ?? {}) as Record<string, unknown>;
  const ai = (toolInput.ai_analysis ?? {}) as Record<string, unknown>;
  const vol = (toolInput.volume_estimates ?? {}) as Record<string, unknown>;

  const num = (v: unknown, d = 0) => (typeof v === "number" && isFinite(v) ? v : d);

  // VOLUME + AI COST come from the credits artifact when available, so ROI can never drift from
  // the priced design. The business-unit volume = the runs of the primary (highest-volume)
  // workload; the AI annual cost = the actual Lyzr platform + LLM bill we already computed.
  const creditWorkloads = Array.isArray(creditArtifact?.workloads)
    ? (creditArtifact!.workloads as Array<{ runs_per_period?: number }>)
    : [];
  const primaryRuns = creditWorkloads.reduce(
    (max, w) => Math.max(max, num(w.runs_per_period)),
    0
  );

  const modelUnitsPerMonth = num(vol.units_per_month);
  const modelUnitsPerYear =
    modelUnitsPerMonth > 0 ? modelUnitsPerMonth * 12 : num(vol.units_per_year);
  const unitsPerYear = primaryRuns > 0 ? primaryRuns : modelUnitsPerYear;

  const automationRate = Math.max(0, Math.min(1, num(ai.automation_rate, 1)));
  const residualMinutes = Math.max(0, num(ai.residual_human_minutes_per_unit, 0));

  // Authoritative AI platform+LLM annual cost from credits; fall back to the model's per-unit.
  const aiAnnualCost =
    creditArtifact && typeof creditArtifact.total_annual_cost === "number"
      ? creditArtifact.total_annual_cost
      : num(ai.cost_per_unit) * unitsPerYear;

  const { comparison, aiCostPerUnit, unitsPerMonth: computedUnitsPerMonth, roiPercentage } =
    computeRoiComparison({
      unitsPerYear,
      loadedRate: num(human.fully_loaded_rate),
      humanCostPerUnit: num(human.cost_per_unit),
      humanTimeMinutes: num(human.time_per_task_minutes),
      aiAnnualCost,
      aiTimeSeconds: num(ai.time_per_task_seconds),
      automationRate,
      residualMinutesPerUnit: residualMinutes,
    });

  return {
    ...toolInput,
    ai_analysis: {
      ...ai,
      // Override with credits-derived per-unit so the UI's (cost_per_unit x volume) reconstructs
      // exactly the real Lyzr bill instead of the model's estimate.
      cost_per_unit: aiCostPerUnit,
      automation_rate: automationRate,
      residual_human_minutes_per_unit: residualMinutes,
    },
    volume_estimates: { units_per_month: computedUnitsPerMonth, units_per_year: unitsPerYear },
    comparison,
    roi_percentage: roiPercentage,
  };
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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
          // Remember the most recent credits artifact so calculate_roi can derive volume + AI cost
          // from the actually-priced design (keeps ROI and credits perfectly consistent).
          let lastCreditArtifact: ReturnType<typeof buildCreditArtifact> | null = null;

          while (iteration < MAX_ITERATIONS) {
            iteration++;

            let accumulatedText = "";
            let toolUseBlock: Anthropic.ToolUseBlock | null = null;
            let currentToolInput = "";
            let isProcessingTool = false;

            const response = anthropic.messages.stream({
              model: "claude-opus-4-7",
              // Generous ceiling: a long architecture-reasoning block followed by a large
              // calculate_credits tool input (17-node Superflow with many llm_calls) was
              // exceeding 8192 and truncating the tool-input JSON, which parsed to empty and
              // forced an ugly retry. 16k leaves ample headroom.
              max_tokens: 16384,
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
                    sendEvent("tool_start", { tool: event.content_block.name });
                    toolUseBlock = {
                      type: "tool_use",
                      id: event.content_block.id,
                      name: event.content_block.name,
                      input: {},
                    } as Anthropic.ToolUseBlock;
                    currentToolInput = "";
                  }
                }
              } else if (event.type === "content_block_stop") {
                if (toolUseBlock && currentToolInput && isProcessingTool) {
                  try {
                    toolUseBlock.input = JSON.parse(currentToolInput);
                  } catch (e) {
                    console.error(`[SSE] Failed to parse tool input:`, e);
                  }
                  isProcessingTool = false;
                }
              }
            }

            const finalResponse = await response.finalMessage();

            if (toolUseBlock && toolUseBlock.input && Object.keys(toolUseBlock.input).length > 0) {
              const toolInput = toolUseBlock.input as Record<string, unknown>;
              const hasValidInput = Object.values(toolInput).some(
                (v) => v !== undefined && v !== null && v !== ""
              );

              if (hasValidInput) {
                let toolResult: string;

                if (toolUseBlock.name === "web_search") {
                  const query = toolInput.query as string;
                  toolResult = await performWebSearch(query);
                  sendEvent("tool_result", { tool: toolUseBlock.name, data: { result: toolResult } });
                } else if (toolUseBlock.name === "calculate_credits") {
                  // Deterministic engine computes all costs from the model's design.
                  const artifact = buildCreditArtifact(toolInput);
                  if (!artifact.workloads || artifact.workloads.length === 0) {
                    // Malformed/empty design — DON'T surface a broken artifact to the UI. Tell the
                    // model to silently retry (the prompt forbids narrating this to the user).
                    toolResult =
                      "RETRY_SILENTLY: the workloads array was empty or malformed. Re-call calculate_credits with the complete workloads array. Do NOT mention this retry or any error to the user.";
                  } else {
                    lastCreditArtifact = artifact;
                    sendEvent("tool_result", { tool: toolUseBlock.name, data: artifact });
                    toolResult = JSON.stringify(artifact);
                  }
                } else if (toolUseBlock.name === "calculate_roi") {
                  // Deterministic ROI (incl. residual human cost) so chat prose and panel agree.
                  // Volume + AI cost derive from the credits artifact for perfect consistency.
                  const artifact = buildRoiArtifact(toolInput, lastCreditArtifact);
                  sendEvent("tool_result", { tool: toolUseBlock.name, data: artifact });
                  toolResult = JSON.stringify(artifact);
                } else {
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
                    content: [
                      {
                        type: "tool_result" as const,
                        tool_use_id: toolUseBlock.id,
                        content: toolResult,
                      },
                    ],
                  },
                ];

                continue;
              }
            }

            if (finalResponse.stop_reason === "end_turn" || !toolUseBlock) {
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
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
        "Transfer-Encoding": "chunked",
      },
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return Response.json({ error: "Failed to process chat request" }, { status: 500 });
  }
}
