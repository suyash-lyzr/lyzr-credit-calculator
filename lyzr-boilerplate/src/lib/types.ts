export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
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

export interface AgentNode {
  id: string;
  name: string;
  type: 'input' | 'agent' | 'tool' | 'output' | 'decision';
  description?: string;
}

export interface AgentConnection {
  from: string;
  to: string;
  label?: string;
}

export interface ArchitectureData {
  nodes: AgentNode[];
  connections: AgentConnection[];
  mermaidCode: string;
}

export interface CreditLineItem {
  id: string;
  component: string;
  description: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
}

export interface CreditCalculation {
  lineItems: CreditLineItem[];
  subtotal: number;
  monthlyEstimate: number;
  yearlyEstimate: number;
}

export interface ROIMetric {
  id: string;
  label: string;
  humanValue: number;
  automatedValue: number;
  unit: string;
  savings: number;
  savingsPercentage: number;
}

export interface ROICalculation {
  metrics: ROIMetric[];
  totalMonthlySavings: number;
  totalYearlySavings: number;
  paybackPeriodMonths: number;
  roiPercentage: number;
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
