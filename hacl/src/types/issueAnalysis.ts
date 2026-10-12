export type IssueCategory =
  | 'Billing and Payments'
  | 'Refunds and Cancellations'
  | 'Technical Support'
  | 'Delivery and Shipping'
  | 'Account Access'
  | 'Product Issues'
  | 'Security Issues'
  | 'General Inquiry'
  | 'Other';

export type UrgencyLevel = 'Low' | 'Medium' | 'High' | 'Critical';

export interface IssueClassificationResult {
  category: IssueCategory;
  confidence: number | null;
  explanation: string;
  modelName: string;
  analyzedAt: string;
}

export interface UrgencyPredictionResult {
  urgency: UrgencyLevel;
  confidence: number | null;
  explanation: string;
  criticalFlag: boolean;
  recommendedAction: string;
  modelName: string;
  analyzedAt: string;
}

export interface IssueAnalysisRecord {
  id: string;
  subject: string;
  message: string;
  category: IssueCategory;
  categoryConfidence: number | null;
  categoryExplanation: string;
  urgency: UrgencyLevel;
  urgencyConfidence: number | null;
  urgencyExplanation: string;
  criticalFlag: boolean;
  recommendedAction: string;
  analyzedAt: string;
}

export interface IssueSummaryStats {
  total: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
}
