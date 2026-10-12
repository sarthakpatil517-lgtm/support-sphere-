import type { SentimentSummaryStats } from '../../types/sentiment';

interface SentimentSummaryProps {
  summary: SentimentSummaryStats;
}

export function SentimentSummary({ summary }: SentimentSummaryProps) {
  const cards = [
    { label: 'Positive Messages', value: summary.positive, tone: 'positive' },
    { label: 'Neutral Messages', value: summary.neutral, tone: 'neutral' },
    { label: 'Negative Messages', value: summary.negative, tone: 'negative' },
    { label: 'Frustrated Messages', value: summary.frustrated, tone: 'frustrated' },
    { label: 'Total Messages', value: summary.total, tone: 'total' },
  ];

  return (
    <div className="summary-grid sentiment-summary-grid">
      {cards.map((card) => (
        <article key={card.label} className={`summary-card sentiment-summary-card ${card.tone}`}>
          <span>{card.label}</span>
          <strong>{card.value}</strong>
        </article>
      ))}
    </div>
  );
}
