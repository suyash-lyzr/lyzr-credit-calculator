/**
 * Deterministic pricing engine for the Lyzr Credit Calculator (new complexity-tier model).
 *
 * The LLM decides the DESIGN (decomposition into workloads, tier per workload, runtime drivers,
 * volumes, model + token estimates). This module computes the MONEY — band lookups, price-per-run,
 * the >30-node increment, nested-superflow summing, and LLM pass-through cost. Pure + shared so the
 * same functions run server-side (api/chat) and client-side (live edits in Phase 2).
 *
 * Source of truth: context/PRICING-METHODOLOGY.md, context/llm-models.md.
 */

export type Deployment = "cloud" | "vpc"; // cloud = SaaS (managed); vpc = Customer VPC / On-Prem
export type Complexity = "simple" | "intermediate" | "complex" | "voice";

export const DEPLOYMENT_LABEL: Record<Deployment, string> = {
  cloud: "SaaS",
  vpc: "Customer VPC / On-Prem",
};

// ---------------------------------------------------------------------------
// Platform rate card (USD per run, by deployment)
// ---------------------------------------------------------------------------

/** Simple / Single Agent — flat per run. */
export const SIMPLE_RATE: Record<Deployment, number> = { cloud: 0.06, vpc: 0.03 };

export interface Band {
  min: number;
  max: number; // inclusive; Infinity for the top band
  cloud: number;
  vpc: number;
  label: string;
}

/** Intermediate / Manager — banded by sub-agents executed at runtime. */
export const MANAGER_BANDS: Band[] = [
  { min: 1, max: 4, cloud: 0.18, vpc: 0.09, label: "1–4 sub-agents" },
  { min: 5, max: 8, cloud: 0.36, vpc: 0.18, label: "5–8 sub-agents" },
  { min: 9, max: Infinity, cloud: 0.54, vpc: 0.27, label: "≥9 sub-agents" },
];

/** Complex / Superflow — banded by nodes executed at runtime (first 30). */
export const SUPERFLOW_BANDS: Band[] = [
  { min: 1, max: 10, cloud: 0.3, vpc: 0.18, label: "1–10 nodes" },
  { min: 11, max: 20, cloud: 0.6, vpc: 0.36, label: "11–20 nodes" },
  { min: 21, max: 30, cloud: 0.9, vpc: 0.54, label: "21–30 nodes" },
];
/** Beyond 30 nodes: 21–30 base price + per-node increment for each node over 30. */
export const SUPERFLOW_BASE_OVER_30: Record<Deployment, number> = { cloud: 0.9, vpc: 0.54 };
export const SUPERFLOW_PER_NODE_OVER_30: Record<Deployment, number> = { cloud: 0.02, vpc: 0.01 };

/** Voice — per minute. */
export const VOICE_RATE_PER_MIN: Record<Deployment, number> = { cloud: 0.09, vpc: 0.06 };

// ---------------------------------------------------------------------------
// Rounding helpers
// ---------------------------------------------------------------------------

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const round6 = (n: number) => Math.round((n + Number.EPSILON) * 1e6) / 1e6;

// ---------------------------------------------------------------------------
// Platform price-per-run
// ---------------------------------------------------------------------------

function findBand(bands: Band[], n: number): Band {
  const v = Math.max(1, Math.floor(n));
  return bands.find((b) => v >= b.min && v <= b.max) ?? bands[bands.length - 1];
}

function nodeBandLabel(nodes: number): string {
  if (nodes <= 30) return findBand(SUPERFLOW_BANDS, nodes).label;
  return `>30 nodes (${nodes - 30} over)`;
}

/** Price of one Superflow execution given the nodes executed in that single flow (no nesting). */
export function superflowNodePrice(nodes: number, dep: Deployment): number {
  const n = Math.max(0, Math.floor(nodes));
  if (n === 0) return 0;
  if (n <= 30) return findBand(SUPERFLOW_BANDS, n)[dep];
  return round2(SUPERFLOW_BASE_OVER_30[dep] + (n - 30) * SUPERFLOW_PER_NODE_OVER_30[dep]);
}

/** One possible runtime path through a Superflow + how often it's taken. */
export interface ExecutionPath {
  nodes_executed: number;
  probability: number; // relative weight; the engine normalizes these to sum to 1
}

export interface RuntimeProfile {
  complexity: Complexity;
  sub_agents_executed?: number; // intermediate
  nodes_executed?: number; // complex (primary flow) — used when execution_paths is absent
  // complex: when branches land in DIFFERENT node bands (e.g. a short auto path vs a long
  // human-review path), list each path so the engine blends the per-run price by probability
  // instead of forcing one averaged node count into a single band.
  execution_paths?: ExecutionPath[];
  nested_superflow_node_counts?: number[]; // complex (each nested superflow's own node count)
  voice_minutes_per_run?: number; // voice
}

export interface PricePerRun {
  price_per_run: number;
  band_label: string;
}

/** Resolve the platform price for ONE run of a workload, by tier + runtime band. */
export function pricePerRun(p: RuntimeProfile, dep: Deployment): PricePerRun {
  switch (p.complexity) {
    case "simple":
      return { price_per_run: SIMPLE_RATE[dep], band_label: "Single Agent (flat)" };

    case "intermediate": {
      const band = findBand(MANAGER_BANDS, p.sub_agents_executed ?? 1);
      return { price_per_run: band[dep], band_label: `Manager · ${band.label}` };
    }

    case "complex": {
      const nested = (p.nested_superflow_node_counts ?? []).filter((n) => n > 0);
      const nestedPrice = nested.reduce((s, nn) => s + superflowNodePrice(nn, dep), 0);
      const nestedLabel = nested.length
        ? ` + ${nested.length} nested superflow${nested.length > 1 ? "s" : ""}`
        : "";

      // Band-straddling: if the model supplied multiple execution paths, blend the per-run price
      // by probability so paths in different bands are priced correctly (not averaged into one).
      const paths = (p.execution_paths ?? []).filter(
        (ep) => ep.nodes_executed > 0 && ep.probability > 0
      );
      if (paths.length >= 2) {
        const totalProb = paths.reduce((s, ep) => s + ep.probability, 0) || 1;
        const blended = paths.reduce(
          (s, ep) => s + superflowNodePrice(ep.nodes_executed, dep) * (ep.probability / totalProb),
          0
        );
        const bandsHit = Array.from(
          new Set(
            [...paths]
              .sort((a, b) => a.nodes_executed - b.nodes_executed)
              .map((ep) => nodeBandLabel(ep.nodes_executed))
          )
        );
        // Only call it "blended" when the paths actually span DIFFERENT bands; if they all land in
        // one band the price is identical, so show that single band (clearer for the user).
        const label =
          bandsHit.length === 1
            ? `Superflow · ${bandsHit[0]}` + nestedLabel
            : `Superflow · blended ${paths.length} paths (${bandsHit.join(", ")})` + nestedLabel;
        return { price_per_run: round2(blended + nestedPrice), band_label: label };
      }

      const primary = Math.max(1, Math.floor(p.nodes_executed ?? 1));
      const total = superflowNodePrice(primary, dep) + nestedPrice;
      const label = `Superflow · ${nodeBandLabel(primary)}` + nestedLabel;
      return { price_per_run: round2(total), band_label: label };
    }

    case "voice": {
      const mins = Math.max(0, p.voice_minutes_per_run ?? 0);
      return {
        price_per_run: round2(mins * VOICE_RATE_PER_MIN[dep]),
        band_label: `Voice · ${mins} min/run @ $${VOICE_RATE_PER_MIN[dep].toFixed(2)}/min`,
      };
    }
  }
}

// ---------------------------------------------------------------------------
// LLM model catalog + rates (USD per 1M tokens; verified June 2026 — see context/llm-models.md)
// ---------------------------------------------------------------------------

export interface ModelRate {
  provider: string;
  input: number; // $/1M input tokens
  output: number; // $/1M output tokens
}

/** Keyed by normalized model name (lowercase, non-alphanumerics → "-"). */
export const MODEL_RATES: Record<string, ModelRate> = {
  // OpenAI
  "gpt-4o": { provider: "OpenAI", input: 2.5, output: 10 },
  "gpt-4o-mini": { provider: "OpenAI", input: 0.15, output: 0.6 },
  "o4-mini": { provider: "OpenAI", input: 1.1, output: 4.4 },
  "gpt-4-1": { provider: "OpenAI", input: 2.0, output: 8.0 },
  o3: { provider: "OpenAI", input: 2.0, output: 8.0 },
  "gpt-5": { provider: "OpenAI", input: 1.25, output: 10 },
  "gpt-5-mini": { provider: "OpenAI", input: 0.25, output: 2.0 },
  "gpt-5-nano": { provider: "OpenAI", input: 0.05, output: 0.4 },
  "gpt-5-1": { provider: "OpenAI", input: 1.25, output: 10 },
  "gpt-5-2": { provider: "OpenAI", input: 1.25, output: 10 }, // estimate (gpt-5 family)
  "gpt-5-4": { provider: "OpenAI", input: 1.25, output: 10 }, // estimate (gpt-5 family)
  "gpt-5-4-mini": { provider: "OpenAI", input: 0.25, output: 2.0 },
  "gpt-5-4-nano": { provider: "OpenAI", input: 0.05, output: 0.4 }, // estimate (nano family)
  "gpt-5-5": { provider: "OpenAI", input: 1.5, output: 12 }, // estimate (newest flagship)
  // Amazon Bedrock
  "nova-micro": { provider: "Amazon Bedrock", input: 0.035, output: 0.14 },
  "nova-lite": { provider: "Amazon Bedrock", input: 0.06, output: 0.24 },
  "nova-pro": { provider: "Amazon Bedrock", input: 0.8, output: 3.2 },
  "claude-3-5-sonnet-v2": { provider: "Amazon Bedrock", input: 6.0, output: 30 },
  "claude-3-5-sonnet": { provider: "Amazon Bedrock", input: 6.0, output: 30 },
  "claude-3-5-haiku": { provider: "Amazon Bedrock", input: 0.8, output: 4.0 },
  "claude-3-haiku": { provider: "Amazon Bedrock", input: 0.25, output: 1.25 },
  "llama-3-3-70b-instruct": { provider: "Amazon Bedrock", input: 0.72, output: 0.72 },
  "llama-3-2-1b-instruct": { provider: "Amazon Bedrock", input: 0.1, output: 0.1 },
  "llama-3-2-3b-instruct": { provider: "Amazon Bedrock", input: 0.06, output: 0.06 }, // estimate
  "llama-3-2-11b-vision-instruct": { provider: "Amazon Bedrock", input: 0.16, output: 0.16 }, // estimate
  "llama-3-2-90b-vision-instruct": { provider: "Amazon Bedrock", input: 0.72, output: 0.72 }, // estimate
  "mistral-7b-instruct": { provider: "Amazon Bedrock", input: 0.15, output: 0.2 }, // estimate
  "mixtral-8x7b-instruct": { provider: "Amazon Bedrock", input: 0.45, output: 0.7 }, // estimate
  "mistral-large": { provider: "Amazon Bedrock", input: 2.0, output: 6.0 }, // estimate
  "mistral-small": { provider: "Amazon Bedrock", input: 0.2, output: 0.6 }, // estimate
  "claude-3-7-sonnet": { provider: "Amazon Bedrock", input: 3.0, output: 15 },
  "qwen-3-next-80b": { provider: "Amazon Bedrock", input: 0.5, output: 1.5 }, // estimate
  "qwen-3-32b": { provider: "Amazon Bedrock", input: 0.2, output: 0.6 }, // estimate
  "qwen-3-coder-30b": { provider: "Amazon Bedrock", input: 0.2, output: 0.6 }, // estimate
  "kimi-k2-thinking": { provider: "Amazon Bedrock", input: 0.6, output: 2.5 }, // estimate
  "kimi-2-5": { provider: "Amazon Bedrock", input: 0.6, output: 2.5 }, // estimate
  // Google
  "gemini-2-5-pro": { provider: "Google", input: 1.25, output: 10 },
  "gemini-2-5-flash": { provider: "Google", input: 0.3, output: 2.5 },
  "gemini-2-5-flash-lite": { provider: "Google", input: 0.1, output: 0.4 },
  "gemini-3-flash-preview": { provider: "Google", input: 0.5, output: 3.0 },
  "gemini-3-1-pro-preview": { provider: "Google", input: 2.0, output: 12 },
  "gemini-3-5-flash": { provider: "Google", input: 1.5, output: 9.0 },
  "gemini-3-1-flash-lite": { provider: "Google", input: 0.25, output: 1.5 },
  // Anthropic
  "claude-sonnet-4-0": { provider: "Anthropic", input: 3.0, output: 15 },
  "claude-opus-4-0": { provider: "Anthropic", input: 15, output: 75 },
  "claude-opus-4-1": { provider: "Anthropic", input: 15, output: 75 },
  "claude-sonnet-4-5": { provider: "Anthropic", input: 3.0, output: 15 },
  "claude-opus-4-5": { provider: "Anthropic", input: 5.0, output: 25 },
  "claude-sonnet-4-6": { provider: "Anthropic", input: 3.0, output: 15 },
  "claude-haiku-4-5": { provider: "Anthropic", input: 1.0, output: 5.0 },
  "claude-opus-4-6": { provider: "Anthropic", input: 5.0, output: 25 }, // estimate (Opus line)
  "claude-opus-4-7": { provider: "Anthropic", input: 5.0, output: 25 },
  "claude-opus-4-8": { provider: "Anthropic", input: 5.0, output: 25 }, // latest Opus; estimate (Opus line)
  // Perplexity
  sonar: { provider: "Perplexity", input: 1.0, output: 1.0 },
  "sonar-pro": { provider: "Perplexity", input: 3.0, output: 15 },
  "sonar-reasoning-pro": { provider: "Perplexity", input: 2.0, output: 8.0 },
  "sonar-deep-research": { provider: "Perplexity", input: 2.0, output: 8.0 },
  // Groq
  "llama-3-3-70b-versatile": { provider: "Groq", input: 0.59, output: 0.79 },
  "llama-3-1-8b-instant": { provider: "Groq", input: 0.05, output: 0.08 },
  "llama-4-scout-17b-16e-instruct": { provider: "Groq", input: 0.11, output: 0.34 },
  "gpt-oss-120b": { provider: "Groq", input: 0.15, output: 0.6 },
  "gpt-oss-20b": { provider: "Groq", input: 0.075, output: 0.3 },
  // xAI
  "grok-4-3": { provider: "xAI", input: 1.25, output: 2.5 },
  "grok-4-1-fast-reasoning": { provider: "xAI", input: 1.25, output: 2.5 },
  "grok-4-1-fast-non-reasoning": { provider: "xAI", input: 1.25, output: 2.5 },
};

function normalizeModel(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface LlmCallInput {
  label?: string;
  node_type?: string;
  purpose?: string;
  model: string;
  provider?: string;
  model_rationale?: string;
  input_tokens: number;
  output_tokens: number;
  /** Optional explicit rates — used only as a fallback when the model isn't in MODEL_RATES. */
  input_rate_per_1m?: number;
  output_rate_per_1m?: number;
}

export interface ResolvedRate {
  provider: string;
  input: number;
  output: number;
  matched: boolean; // false = fell back to supplied/default rates
}

/** Look up a model's rate from the catalog; fall back to caller-supplied rates, else 0. */
export function resolveModelRate(call: LlmCallInput): ResolvedRate {
  const hit = MODEL_RATES[normalizeModel(call.model)];
  if (hit) return { ...hit, matched: true };
  return {
    provider: call.provider ?? "Unknown",
    input: call.input_rate_per_1m ?? 0,
    output: call.output_rate_per_1m ?? 0,
    matched: false,
  };
}

/** Cost of one LLM call in USD. */
export function llmCallCost(call: LlmCallInput): number {
  const r = resolveModelRate(call);
  return round6((call.input_tokens * r.input + call.output_tokens * r.output) / 1_000_000);
}

// ---------------------------------------------------------------------------
// Workload + totals
// ---------------------------------------------------------------------------

export interface WorkloadInput extends RuntimeProfile {
  name: string;
  reasoning?: string;
  runs_per_period: number; // annual runs for this workload
  llm_calls?: LlmCallInput[]; // LLM-bearing executions in ONE run of this workload
  byo_model?: boolean; // true = customer brings own model → $0 LLM on the Lyzr bill
}

export interface WorkloadCost {
  name: string;
  complexity: Complexity;
  reasoning?: string;
  band_label: string;
  price_per_run: number;
  runs_per_period: number;
  platform_cost: number;
  llm_cost_per_run: number; // sum of llm_calls cost for one run
  llm_cost: number; // annual LLM cost on the Lyzr bill (0 when BYO)
  llm_cost_external: number; // annual LLM cost paid to provider regardless of BYO (for display)
  byo_model: boolean;
  total_cost: number; // platform + llm_cost
  llm_calls: Array<LlmCallInput & { cost_per_call: number }>;
}

/** Compute the full cost breakdown for one workload. */
export function computeWorkload(w: WorkloadInput, dep: Deployment): WorkloadCost {
  const { price_per_run, band_label } = pricePerRun(w, dep);
  const platform_cost = round2(price_per_run * w.runs_per_period);

  const calls = (w.llm_calls ?? []).map((c) => ({ ...c, cost_per_call: llmCallCost(c) }));
  const llm_cost_per_run = round6(calls.reduce((s, c) => s + c.cost_per_call, 0));
  const llm_cost_external = round2(llm_cost_per_run * w.runs_per_period);
  const byo = !!w.byo_model;
  const llm_cost = byo ? 0 : llm_cost_external;

  return {
    name: w.name,
    complexity: w.complexity,
    reasoning: w.reasoning,
    band_label,
    price_per_run,
    runs_per_period: w.runs_per_period,
    platform_cost,
    llm_cost_per_run,
    llm_cost,
    llm_cost_external,
    byo_model: byo,
    total_cost: round2(platform_cost + llm_cost),
    llm_calls: calls,
  };
}

export interface CostTotals {
  deployment: Deployment;
  workloads: WorkloadCost[];
  platform_annual_cost: number;
  llm_annual_cost: number; // on the Lyzr bill (excludes BYO)
  llm_annual_cost_external: number; // paid to providers (includes BYO)
  total_annual_cost: number;
}

// ---------------------------------------------------------------------------
// ROI comparison (shared by api/chat and client-side live edits)
// ---------------------------------------------------------------------------

export interface RoiComparisonInput {
  unitsPerYear: number;
  loadedRate: number; // fully-loaded human $/hr
  humanCostPerUnit: number; // human $ per business unit
  humanTimeMinutes: number; // human minutes per unit (manual)
  aiAnnualCost: number; // real Lyzr bill (platform + LLM) for the year
  aiTimeSeconds: number; // AI processing seconds per unit
  automationRate: number; // 0-1 fraction fully hands-off
  residualMinutesPerUnit: number; // human minutes retained per unit (amortized across all)
}

export interface RoiComparison {
  human_monthly_cost: number;
  ai_monthly_cost: number;
  monthly_savings: number;
  human_yearly_cost: number;
  ai_yearly_cost: number;
  ai_platform_yearly_cost: number;
  residual_human_yearly_cost: number;
  automation_rate: number;
  yearly_savings: number;
  savings_percentage: number;
  time_savings_percentage: number;
  payback_period_days: number;
}

/** Deterministic ROI comparison from design inputs — single source of truth for server + client. */
export function computeRoiComparison(i: RoiComparisonInput): {
  comparison: RoiComparison;
  aiCostPerUnit: number;
  unitsPerMonth: number;
  roiPercentage: number;
} {
  const units = Math.max(0, i.unitsPerYear);
  const automationRate = Math.max(0, Math.min(1, i.automationRate));
  const residualMinutes = Math.max(0, i.residualMinutesPerUnit);

  const humanYearly = i.humanCostPerUnit * units;
  const aiPlatformYearly = Math.max(0, i.aiAnnualCost);
  const residualHumanYearly = (i.loadedRate / 60) * residualMinutes * units;
  const aiYearly = aiPlatformYearly + residualHumanYearly;

  const yearlySavings = humanYearly - aiYearly;
  const savingsPct = humanYearly > 0 ? (yearlySavings / humanYearly) * 100 : 0;
  const paybackDays = yearlySavings > 0 ? (aiYearly / yearlySavings) * 365 : 0;
  const roiPct = aiYearly > 0 ? (yearlySavings / aiYearly) * 100 : 0;

  // Time savings = reduction in HUMAN effort, to stay consistent with the (residual-aware) cost
  // savings. With a human-in-the-loop the binding time is the retained review minutes, NOT the
  // AI's compute latency — otherwise we'd claim a 95% time cut while a human still spends 12 min.
  // Fully autonomous (no residual): use AI latency as the throughput proxy.
  const aiLatencyMin = i.aiTimeSeconds / 60;
  const effectiveAfterMin = residualMinutes > 0 ? residualMinutes : aiLatencyMin;
  const timeSavingsPct =
    i.humanTimeMinutes > 0
      ? Math.max(0, (1 - effectiveAfterMin / i.humanTimeMinutes) * 100)
      : 0;

  return {
    comparison: {
      human_monthly_cost: humanYearly / 12,
      ai_monthly_cost: aiYearly / 12,
      monthly_savings: yearlySavings / 12,
      human_yearly_cost: humanYearly,
      ai_yearly_cost: aiYearly,
      ai_platform_yearly_cost: aiPlatformYearly,
      residual_human_yearly_cost: residualHumanYearly,
      automation_rate: automationRate,
      yearly_savings: yearlySavings,
      savings_percentage: Math.round(savingsPct * 10) / 10,
      time_savings_percentage: Math.round(timeSavingsPct * 10) / 10,
      payback_period_days: Math.round(paybackDays),
    },
    aiCostPerUnit: units > 0 ? round6(aiPlatformYearly / units) : 0,
    unitsPerMonth: units / 12,
    roiPercentage: Math.round(roiPct),
  };
}

/** Compute costs for all workloads and roll up the totals. */
export function computeTotals(workloads: WorkloadInput[], dep: Deployment): CostTotals {
  const computed = workloads.map((w) => computeWorkload(w, dep));
  const platform_annual_cost = round2(computed.reduce((s, w) => s + w.platform_cost, 0));
  const llm_annual_cost = round2(computed.reduce((s, w) => s + w.llm_cost, 0));
  const llm_annual_cost_external = round2(computed.reduce((s, w) => s + w.llm_cost_external, 0));
  return {
    deployment: dep,
    workloads: computed,
    platform_annual_cost,
    llm_annual_cost,
    llm_annual_cost_external,
    total_annual_cost: round2(platform_annual_cost + llm_annual_cost),
  };
}
