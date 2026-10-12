export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';
export type PriorityCategory = 'Low Priority' | 'Medium Priority' | 'High Priority';

export interface PriorityWeights {
  urgency: number;
  frustration: number;
  customerValue: number;
  supportHistory: number;
}

export interface PriorityFormState {
  ticketId: string;
  subject: string;
  urgencyLevel: UrgencyLevel;
  urgencyScore: string;
  frustrationScore: string;
  customerValueScore: string;
  supportHistoryScore: string;
  notes: string;
}

export interface PriorityInput {
  ticketId: string;
  subject: string;
  urgencyLevel: UrgencyLevel;
  urgencyScore: number;
  frustrationScore: number;
  customerValueScore: number;
  supportHistoryScore: number;
  notes: string;
}

export interface PriorityFactorResult {
  key: keyof PriorityWeights;
  label: string;
  score: number;
  weight: number;
  contribution: number;
}

export interface PriorityCalculation {
  ticketId: string;
  subject: string;
  urgencyLevel: UrgencyLevel;
  urgencyScore: number;
  frustrationScore: number;
  customerValueScore: number;
  supportHistoryScore: number;
  notes: string;
  weights: PriorityWeights;
  factors: PriorityFactorResult[];
  score: number;
  category: PriorityCategory;
  criticalFlag: boolean;
  attentionLevel: string;
  explanation: string;
  analyzedAt: string;
  isSample: boolean;
}

export interface PriorityRecord extends PriorityCalculation {
  id: string;
}
