import type { HistoryEntry } from '../../types/sentiment';
import { FrustrationScore } from './FrustrationScore';

interface SentimentResultProps {
  result: HistoryEntry | null;
}

function getToneClass(sentiment: string) {
  const value = sentiment.toLowerCase();

  if (value === 'positive') return 'sentiment-positive';
  if (value === 'neutral') return 'sentiment-neutral';
  if (value === 'negative') return 'sentiment-negative';
  return 'sentiment-frustrated';
}

const attentionMessages: Record<string, string> = {
  Positive: 'No evident dissatisfaction detected.',
  Neutral: 'Standard support handling.',
  Negative: 'Review customer dissatisfaction.',
  Frustrated: 'Consider prompt human review.',
};

export function SentimentResult({ result }: SentimentResultProps) {
  if (!result) {
    return (
      <div className="sentiment-panel empty-result">
        <p>No analysis has been run yet. Enter a customer message and click “Analyze Sentiment”.</p>
      </div>
    );
  }

  const confidenceLabel = result.confidence !== null ? `${Math.round(result.confidence * 100)}%` : 'Not available';

  return (
    <div className="sentiment-panel result-panel">
      <div className="result-header">
        <div>
          <p className="eyebrow sentiment-eyebrow">Predicted sentiment</p>
          <h2 className={`sentiment-badge ${getToneClass(result.sentiment)}`}>{result.sentiment}</h2>
        </div>
        <span className="analysis-time">{new Date(result.analyzedAt).toLocaleString()}</span>
      </div>

      <div className="result-block">
        <FrustrationScore score={result.frustrationScore} />
      </div>

      <div className="detail-row">
        <span>Model Confidence</span>
        <strong>{confidenceLabel}</strong>
      </div>

      <div className="detail-row">
        <span>Analysis Method</span>
        <strong>{result.modelName}</strong>
      </div>

      <div className="detail-row">
        <span>Suggested Attention</span>
        <strong>{attentionMessages[result.sentiment]}</strong>
      </div>

      <div className="explanation-box">
        <h3>Analysis explanation</h3>
        <p>{result.explanation}</p>
      </div>
    </div>
  );
}
