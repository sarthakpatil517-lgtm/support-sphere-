export type AccountTier = 'Standard' | 'Silver' | 'Gold' | 'Platinum';
export type AccountStatus = 'Active' | 'At Risk' | 'Paused' | 'Cancelled' | 'Inactive';
export type CustomerValueCategory = 'Low Value' | 'Moderate Value' | 'High Value' | 'Very High Value';

export interface CustomerValueFormState {
  customerId: string;
  customerName: string;
  accountTier: AccountTier;
  tenureMonths: string;
  totalTickets: string;
  repeatContacts: string;
  lifetimeValue: string;
  accountStatus: AccountStatus;
  resolvedTickets: string;
}

export interface CustomerValueInput {
  customerId: string;
  customerName: string;
  accountTier: AccountTier;
  tenureMonths: number;
  totalTickets: number;
  repeatContacts: number;
  lifetimeValue: number | null;
  accountStatus: AccountStatus;
  resolvedTickets: number | null;
}

export interface CustomerValueWeights {
  tier: number;
  tenure: number;
  lifetimeValue: number;
  accountStatusAndHistory: number;
}

export interface FactorScore {
  label: string;
  weight: number;
  normalized: number;
  contribution: number;
  missing: boolean;
}

export interface CustomerValueAnalysisResult {
  customerId: string;
  customerName: string;
  score: number;
  category: CustomerValueCategory;
  explanation: string;
  missingFields: string[];
  repeatContactSummary: string;
  normalizedFactors: FactorScore[];
  weights: CustomerValueWeights;
  analyzedAt: string;
  estimateNote: string;
}

export interface CustomerValueRecord extends CustomerValueAnalysisResult {
  id: string;
}
