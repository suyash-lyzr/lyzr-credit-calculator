export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ArchitectureCounts {
  n_agents: number;
  n_kb: number;
  n_rai: number;
  n_tools: number;
}

export interface ScenarioVariables {
  b_mem: number;
  b_kb: number;
  b_rai: number;
  b_api: number;
}

export interface ArchitectureData {
  title: string;
  summary: string;
  complexity_profile: "LOW" | "MEDIUM" | "HIGH";
  architecture_pattern: "Single Agent" | "Orchestrator" | "Multi-Agent Chain";
  architecture_counts: ArchitectureCounts;
  scenario_variables: ScenarioVariables;
  mermaidCode: string;
}

export interface AgentRunStep {
  step_name: string;
  phase?: "discovery" | "validation" | "processing" | "review" | "delivery" | "monitoring";
  runs: number;
  iteration_multiplier?: number;
  effective_runs?: number;
  reasoning: string;
}

export interface PhaseBreakdownRow {
  phase: string;
  runs: number;
  pct_of_total: number;
  note?: string;
}

export interface LLMModelBreakdown {
  model_name: string;
  provider: string;
  runs_using_model: number;
  avg_input_tokens: number;
  avg_output_tokens: number;
  input_rate_per_1m: number;
  output_rate_per_1m: number;
  annual_cost: number;
}

export interface LlmStep {
  step_name: string;
  action: string;
  runs_per_unit: number;
  model_name: string;
  provider: string;
  model_rationale: string;
  input_tokens: number;
  output_tokens: number;
  input_rate_per_1m: number;
  output_rate_per_1m: number;
  cost_per_call: number;
  cost_per_unit: number;
  annual_calls: number;
  annual_cost: number;
}

export interface WorkloadRow {
  workload_name: string;
  runs_per_unit: number;
  volume: number;
  annual_runs: number;
  lyzr_cost: number;
  llm_cost: number;
  total_cost: number;
}

export interface CreditCalculation {
  agent_architecture_summary: string;

  deployment: "cloud" | "vpc";
  rate_per_run: number;

  workload_name: string;
  unit_volume: number;

  // --- New realistic volume model (all optional for back-compat) ---
  use_case_category?: string;
  funnel_multiplier?: number;
  funnel_rationale?: string;
  effective_unit_volume?: number;

  base_runs_per_unit?: number;
  effective_runs_per_unit?: number;

  steady_state_annual_runs?: number;
  continuous_ops_pct?: number;
  continuous_ops_runs?: number;
  onboarding_pct?: number;
  onboarding_runs?: number;
  edge_buffer_runs?: number;

  phase_breakdown?: PhaseBreakdownRow[];
  volume_breakdown_note?: string;

  // --- Existing fields ---
  runs_per_unit: number;
  runs_breakdown: AgentRunStep[];
  iteration_buffer_pct: number;
  total_annual_runs: number;

  lyzr_annual_cost: number;

  llm_steps?: LlmStep[];
  llm_buffer_pct?: number;
  llm_per_unit_cost?: number;
  llm_breakdown?: LLMModelBreakdown[];
  llm_annual_cost: number;
  llm_note?: string;

  total_annual_cost: number;

  rows?: WorkloadRow[];
  combined_lyzr_total?: number;
  combined_llm_total?: number;
  combined_total?: number;
  combined_note?: string;
}

export interface HumanAnalysis {
  mapped_role: string;
  base_hourly_wage: number;
  wage_source: string;
  fully_loaded_rate: number;
  time_per_task_minutes: number;
  cost_per_unit: number;
}

export interface AIAnalysis {
  cost_per_unit: number;
  time_per_task_seconds: number;
}

export interface ROIVolumeEstimates {
  units_per_month: number;
  units_per_year: number;
}

export interface ROIComparison {
  human_monthly_cost: number;
  ai_monthly_cost: number;
  monthly_savings: number;
  human_yearly_cost: number;
  ai_yearly_cost: number;
  yearly_savings: number;
  savings_percentage: number;
  time_savings_percentage: number;
  payback_period_days: number;
}

export interface ROICalculation {
  use_case: string;
  unit_name: string;
  human_analysis: HumanAnalysis;
  ai_analysis: AIAnalysis;
  volume_estimates: ROIVolumeEstimates;
  comparison: ROIComparison;
  roi_percentage: number;
}

export interface ValidationIssue {
  artifact: "architecture" | "credits" | "roi" | "cross_check";
  severity: "critical" | "warning";
  issue: string;
  expected: string;
}

export interface ReviewValidation {
  status: "approved" | "needs_revision";
  issues: ValidationIssue[];
  summary: string;
}

export interface ArtifactState {
  architecture: ArchitectureData | null;
  credits: CreditCalculation | null;
  roi: ROICalculation | null;
  review: ReviewValidation | null;
  isLoading: {
    architecture: boolean;
    credits: boolean;
    roi: boolean;
    review: boolean;
  };
}

export interface SavedTemplate {
  id: number;
  name: string;
  description: string | null;
  useCase: string;
  architecture: ArchitectureData;
  credits: CreditCalculation;
  roi: ROICalculation;
  chatHistory: ChatMessage[];
  createdAt: Date;
  updatedAt: Date;
}
