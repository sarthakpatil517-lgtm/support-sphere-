export type SentimentLabel = 'Positive' | 'Neutral' | 'Negative' | 'Frustrated';

export interface SentimentAnalysisResult {
  sentiment: SentimentLabel;
  frustrationScore: number;
  confidence: number | null;
  explanation: string;
  analyzedAt: string;
  modelName: string;
}

export interface HistoryEntry extends SentimentAnalysisResult {
  id: string;
  message: string;
}

export interface SentimentSummaryStats {
  positive: number;
  neutral: number;
  negative: number;
  frustrated: number;
  total: number;
}
