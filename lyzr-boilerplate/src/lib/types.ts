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

export interface CalculationDetails {
  vol_user_monthly: number;
  n_sessions_annual: number;
  n_runs_annual: number;
  cost_fixed: number;
  cost_model: number;
  cost_inference: number;
  session_cost_total: number;
  inference_cost_total: number;
  model_used: string;
}

export interface CreditCalculation {
  action_profile: string;
  complexity: string;
  unit_price: number;
  total_volume: number;
  total_annual_cost: number;
  calculation_details: CalculationDetails;
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

export interface ArtifactState {
  architecture: ArchitectureData | null;
  credits: CreditCalculation | null;
  roi: ROICalculation | null;
  isLoading: {
    architecture: boolean;
    credits: boolean;
    roi: boolean;
  };
}
