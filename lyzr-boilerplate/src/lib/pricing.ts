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
// APC (Agent Processing Credit) platform pricing
// ---------------------------------------------------------------------------
// 1 APC = 1 token (input + output + reasoning + tool/context — everything a model call consumes).
// Platform cost is metered on APCs; only the rate changes by deployment. LLM cost is SEPARATE
// (pass-through / BYO), computed further below.

/** Platform rate in USD per 1,000,000 APCs (the per-million-token framing the market uses). */
export const APC_RATE_PER_M: Record<Deployment, number> = { cloud: 20, vpc: 5 }; // SaaS $20/M · VPC $5/M

/** Platform rate in USD per single APC (token). */
export const apcRatePerToken = (dep: Deployment): number => APC_RATE_PER_M[dep] / 1_000_000;

/** A standard capacity plan — the annual price buys an annual APC (token) capacity. */
export interface PlanTier {
  name: string;
  price: number; // annual USD
  capacityApc: number; // annual APC (token) capacity
  note?: string;
}

/** VPC plans. Studio Enterprise is the default; Lite/Scale are exceptions for smaller deals. */
export const VPC_TIERS: PlanTier[] = [
  { name: "Studio Lite", price: 50_000, capacityApc: 10e9, note: "Entry point · limited features" },
  { name: "Studio Scale", price: 125_000, capacityApc: 25e9, note: "Specific cases only" },
  { name: "Studio Enterprise", price: 250_000, capacityApc: 50e9, note: "Default way to begin" },
  { name: "Studio Enterprise (100B)", price: 500_000, capacityApc: 100e9, note: "Large enterprise" },
];

/** SaaS (Lyzr-hosted) plans. */
export const SAAS_TIERS: PlanTier[] = [
  { name: "Standard", price: 100_000, capacityApc: 5e9, note: "Default SaaS entry point" },
  { name: "Standard (10B)", price: 200_000, capacityApc: 10e9, note: "For larger estimates" },
];

/** Strategic (Fortune-50 scale, usage-heavy): Unlimited Credits, leadership sign-off. */
export const STRATEGIC_MIN_PRICE = 500_000;

export function tiersFor(dep: Deployment): PlanTier[] {
  return dep === "vpc" ? VPC_TIERS : SAAS_TIERS;
}

/** Per-run APC reference profiles from the APC guide — used to sanity-check estimates, not to price. */
export const APC_PROFILES = {
  single: { p50: 15_000, p95: 50_000 }, // single agent (typical / heavy)
  multi: { p50: 100_000, p95: 300_000 }, // manager / superflow orchestration
};

// ---------------------------------------------------------------------------
// Rounding helpers
// ---------------------------------------------------------------------------

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const round6 = (n: number) => Math.round((n + Number.EPSILON) * 1e6) / 1e6;

// ---------------------------------------------------------------------------
// APC per run + tier recommendation
// ---------------------------------------------------------------------------

/** The design inputs that describe how a workload runs (only complexity matters for APC labeling). */
export interface RuntimeProfile {
  complexity: Complexity;
}

/** Which reference profile a workload maps to — single vs multi-agent orchestration. */
function profileKind(c: Complexity): "single" | "multi" {
  return c === "intermediate" || c === "complex" ? "multi" : "single";
}

/** A short plain-language label placing the run's token usage against the reference profiles. */
export function apcProfileLabel(c: Complexity, apcPerRun: number): string {
  const p = APC_PROFILES[profileKind(c)];
  const kind = profileKind(c) === "multi" ? "multi-agent" : "single-agent";
  if (apcPerRun <= p.p50 * 1.34) return `typical ${kind} size`;
  if (apcPerRun <= p.p95 * 1.2) return `heavy ${kind} size`;
  return `very heavy ${kind} size`;
}

export interface TierRecommendation {
  deployment: Deployment;
  tier: PlanTier | null; // smallest standard tier whose capacity covers annual APC; null if strategic
  strategic: boolean; // annual APC exceeds the largest standard tier -> route to leadership
  capacity_used_pct: number; // annual APC / tier capacity * 100 (0 if strategic)
  annual_apc: number;
}

/** Recommend the smallest standard plan whose capacity covers the year's APCs (else: strategic). */
export function recommendTier(annualApc: number, dep: Deployment): TierRecommendation {
  const tiers = tiersFor(dep);
  const top = tiers[tiers.length - 1];
  const strategic = annualApc > top.capacityApc;
  const tier = strategic ? null : tiers.find((t) => annualApc <= t.capacityApc) ?? top;
  return {
    deployment: dep,
    tier,
    strategic,
    capacity_used_pct: tier ? round2((annualApc / tier.capacityApc) * 100) : 0,
    annual_apc: annualApc,
  };
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
  "gpt-5-2": { provider: "OpenAI", input: 1.25, output: 10 }, // estimate (gpt-5 family; not a public SKU)
  "gpt-5-4": { provider: "OpenAI", input: 2.5, output: 15 }, // official (developers.openai.com)
  "gpt-5-4-mini": { provider: "OpenAI", input: 0.75, output: 4.5 }, // official
  "gpt-5-4-nano": { provider: "OpenAI", input: 0.2, output: 1.25 }, // official
  "gpt-5-4-pro": { provider: "OpenAI", input: 30, output: 180 }, // official (pro reasoning)
  "gpt-5-5": { provider: "OpenAI", input: 5.0, output: 30 }, // official
  "gpt-5-5-pro": { provider: "OpenAI", input: 30, output: 180 }, // official (pro reasoning)
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
  "claude-opus-4-6": { provider: "Anthropic", input: 5.0, output: 25 }, // official (platform.claude.com)
  "claude-opus-4-7": { provider: "Anthropic", input: 5.0, output: 25 }, // official
  "claude-opus-4-8": { provider: "Anthropic", input: 5.0, output: 25 }, // official (latest Opus)
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
  apc_per_run: number; // Σ(input + output) tokens across all model calls in one run
  annual_apc: number; // apc_per_run × runs_per_period
  apc_profile_label: string; // e.g. "single-agent · ~P50" (sanity vs reference profiles)
  runs_per_period: number;
  platform_cost: number; // annual_apc × APC rate for the deployment
  llm_cost_per_run: number; // sum of llm_calls cost for one run
  llm_cost: number; // annual LLM cost on the Lyzr bill (0 when BYO)
  llm_cost_external: number; // annual LLM cost paid to provider regardless of BYO (for display)
  byo_model: boolean;
  total_cost: number; // platform + llm_cost
  llm_calls: Array<LlmCallInput & { cost_per_call: number }>;
}

/** Σ(input + output) tokens across all model calls in ONE run = the APCs that run consumes. */
export function apcPerRun(w: Pick<WorkloadInput, "llm_calls">): number {
  return (w.llm_calls ?? []).reduce(
    (s, c) => s + Math.max(0, c.input_tokens || 0) + Math.max(0, c.output_tokens || 0),
    0
  );
}

/** Compute the full cost breakdown for one workload (platform = APCs × rate). */
export function computeWorkload(w: WorkloadInput, dep: Deployment): WorkloadCost {
  const apc_per_run = apcPerRun(w);
  const annual_apc = apc_per_run * Math.max(0, w.runs_per_period);
  const platform_cost = round2(annual_apc * apcRatePerToken(dep));

  const calls = (w.llm_calls ?? []).map((c) => ({ ...c, cost_per_call: llmCallCost(c) }));
  const llm_cost_per_run = round6(calls.reduce((s, c) => s + c.cost_per_call, 0));
  const llm_cost_external = round2(llm_cost_per_run * w.runs_per_period);
  const byo = !!w.byo_model;
  const llm_cost = byo ? 0 : llm_cost_external;

  return {
    name: w.name,
    complexity: w.complexity,
    reasoning: w.reasoning,
    apc_per_run,
    annual_apc,
    apc_profile_label: apcProfileLabel(w.complexity, apc_per_run),
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
  total_annual_apc: number; // Σ annual APCs across workloads
  apc_rate_per_m: number; // $/1M APC for this deployment
  platform_annual_cost: number; // = total_annual_apc × rate
  llm_annual_cost: number; // on the Lyzr bill (excludes BYO)
  llm_annual_cost_external: number; // paid to providers (includes BYO)
  total_annual_cost: number;
  recommended_tier: TierRecommendation; // smallest plan that fits, or strategic flag
}

// ---------------------------------------------------------------------------
// ROI comparison (shared by api/chat and client-side live edits)
// ---------------------------------------------------------------------------

export interface RoiComparisonInput {
  unitsPerYear: number;
  loadedRate: number; // fully-loaded human $/hr
  humanCostPerUnit: number; // human $ per business unit
  humanTimeMinutes: number; // human minutes per unit (manual)
  aiPlatformAnnualCost: number; // Lyzr platform spend (runs x complexity) for the year
  aiLlmAnnualCost: number; // LLM spend the customer pays the provider (incl. BYO pass-through)
  aiLlmIsPassThrough: boolean; // true = LLM is paid directly to the provider (BYO), $0 on Lyzr bill
  aiTimeSeconds: number; // AI processing seconds per unit
  automationRate: number; // 0-1 fraction fully hands-off
  residualMinutesPerUnit: number; // human minutes retained per unit (amortized across all)
}

export interface RoiComparison {
  human_monthly_cost: number;
  ai_monthly_cost: number;
  monthly_savings: number;
  human_yearly_cost: number;
  ai_yearly_cost: number; // all-in: platform + LLM + retained human
  ai_platform_yearly_cost: number; // Lyzr platform only
  ai_llm_yearly_cost: number; // LLM paid to provider (pass-through if BYO)
  ai_llm_is_passthrough: boolean; // true = LLM billed directly by provider, not on the Lyzr bill
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
  const aiPlatformYearly = Math.max(0, i.aiPlatformAnnualCost);
  const aiLlmYearly = Math.max(0, i.aiLlmAnnualCost);
  // All-in AI tooling cost = Lyzr platform + the LLM the customer pays the provider. Even when the
  // LLM is BYO ($0 on the Lyzr bill), it's a real cost of the AI solution, so honest savings count
  // it. The residual human review (if any) is added on top.
  const aiToolingYearly = aiPlatformYearly + aiLlmYearly;
  const residualHumanYearly = (i.loadedRate / 60) * residualMinutes * units;
  const aiYearly = aiToolingYearly + residualHumanYearly;

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
      // Round money to 2 decimals so quoted figures never show float noise (140833.33333…).
      human_monthly_cost: round2(humanYearly / 12),
      ai_monthly_cost: round2(aiYearly / 12),
      monthly_savings: round2(yearlySavings / 12),
      human_yearly_cost: round2(humanYearly),
      ai_yearly_cost: round2(aiYearly),
      ai_platform_yearly_cost: round2(aiPlatformYearly),
      ai_llm_yearly_cost: round2(aiLlmYearly),
      ai_llm_is_passthrough: !!i.aiLlmIsPassThrough,
      residual_human_yearly_cost: round2(residualHumanYearly),
      automation_rate: automationRate,
      yearly_savings: round2(yearlySavings),
      savings_percentage: Math.round(savingsPct * 10) / 10,
      time_savings_percentage: Math.round(timeSavingsPct * 10) / 10,
      payback_period_days: Math.round(paybackDays),
    },
    aiCostPerUnit: units > 0 ? round6(aiToolingYearly / units) : 0,
    unitsPerMonth: units / 12,
    roiPercentage: Math.round(roiPct),
  };
}

/** Compute costs for all workloads and roll up the totals (platform metered on APCs). */
export function computeTotals(workloads: WorkloadInput[], dep: Deployment): CostTotals {
  const computed = workloads.map((w) => computeWorkload(w, dep));
  const total_annual_apc = computed.reduce((s, w) => s + w.annual_apc, 0);
  const platform_annual_cost = round2(computed.reduce((s, w) => s + w.platform_cost, 0));
  const llm_annual_cost = round2(computed.reduce((s, w) => s + w.llm_cost, 0));
  const llm_annual_cost_external = round2(computed.reduce((s, w) => s + w.llm_cost_external, 0));
  return {
    deployment: dep,
    workloads: computed,
    total_annual_apc,
    apc_rate_per_m: APC_RATE_PER_M[dep],
    platform_annual_cost,
    llm_annual_cost,
    llm_annual_cost_external,
    total_annual_cost: round2(platform_annual_cost + llm_annual_cost),
    recommended_tier: recommendTier(total_annual_apc, dep),
  };
}
