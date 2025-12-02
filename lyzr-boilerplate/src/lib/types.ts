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

export interface ConnectionAnalysis {
  knowledge_bases: number;
  data_connectors: number;
  tools: number;
  total_connections: number;
}

export interface AgentInfo {
  name: string;
  role: string;
  description?: string;
}

export interface WorkflowStep {
  step: number;
  name: string;
  detail: string;
}

export interface ArchitectureData {
  title: string;
  summary: string;
  complexity_profile: "LOW" | "MEDIUM" | "HIGH";
  architecture_pattern: "Single Agent" | "Manager-Subagent" | "Hybrid";
  connection_analysis: ConnectionAnalysis;
  workflow_type: "Sequential" | "One-Shot Aggregation" | "Human-in-the-Loop";
  agents: AgentInfo[];
  steps: WorkflowStep[];
  mermaidCode: string;
}

export interface CostItem {
  count: number;
  unit_cost: number;
  total: number;
}

export interface ModelCosts {
  model: string;
  input_tokens: number;
  output_tokens: number;
  raw_cost: number;
  handling_markup: number;
  total: number;
}

export interface FixedCosts {
  agents: CostItem;
  knowledge_bases: CostItem;
  responsible_ai: CostItem;
  tools: CostItem;
  subtotal: number;
}

export interface VariableCostsPerRun {
  agent_runs: CostItem;
  kb_retrievals: CostItem;
  api_calls: CostItem;
  tool_executions: CostItem;
  rai_checks: CostItem;
  memory: CostItem;
  session: CostItem;
  model_costs: ModelCosts;
  subtotal: number;
}

export interface VolumeEstimates {
  tasks_per_day: number;
  tasks_per_month: number;
  tasks_per_year: number;
}

export interface TotalCosts {
  setup_cost: number;
  monthly_variable: number;
  yearly_variable: number;
  first_year_total: number;
}

export interface CreditCalculation {
  architecture_summary: string;
  complexity_profile: "LOW" | "MEDIUM" | "HIGH";
  fixed_costs: FixedCosts;
  variable_costs_per_run: VariableCostsPerRun;
  cost_per_run: number;
  overhead_percentage: number;
  cost_per_run_with_overhead: number;
  volume_estimates: VolumeEstimates;
  total_costs: TotalCosts;
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
