import { useMemo, useState } from 'react';
import { AnalysisHistory } from '../components/sentiment/AnalysisHistory';
import { MessageInput } from '../components/sentiment/MessageInput';
import { SentimentResult } from '../components/sentiment/SentimentResult';
import { SentimentSummary } from '../components/sentiment/SentimentSummary';
import { analyzeSentiment } from '../services/sentimentAnalysis';
import type { HistoryEntry, SentimentSummaryStats } from '../types/sentiment';

const exampleMessages = [
  { label: 'Positive', text: 'Thank you for resolving my issue so quickly. I really appreciate your excellent support.' },
  { label: 'Neutral', text: 'Could you please tell me how to update my delivery address?' },
  { label: 'Negative', text: 'My order arrived late, and I am disappointed with the service.' },
  {
    label: 'Frustrated',
    text: 'This is the fourth time I have contacted support. Nobody has resolved my issue, and I am extremely frustrated.',
  },
];

const initialSummary: SentimentSummaryStats = {
  positive: 0,
  neutral: 0,
  negative: 0,
  frustrated: 0,
  total: 0,
};

export function SentimentAnalysisPage() {
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisHistory, setAnalysisHistory] = useState<HistoryEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedResult = useMemo(
    () => analysisHistory.find((entry) => entry.id === selectedId) ?? null,
    [analysisHistory, selectedId]
  );

  const summary = useMemo(() => {
    const nextSummary = { ...initialSummary };

    analysisHistory.forEach((entry) => {
      switch (entry.sentiment) {
        case 'Positive':
          nextSummary.positive += 1;
          break;
        case 'Neutral':
          nextSummary.neutral += 1;
          break;
        case 'Negative':
          nextSummary.negative += 1;
          break;
        case 'Frustrated':
          nextSummary.frustrated += 1;
          break;
        default:
          break;
      }
    });

    nextSummary.total = analysisHistory.length;
    return nextSummary;
  }, [analysisHistory]);

  const handleAnalyze = async () => {
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError('Please enter a customer message before analyzing.');
      return;
    }

    setError('');
    setIsAnalyzing(true);

    try {
      const result = await analyzeSentiment(trimmedMessage);
      const entry: HistoryEntry = {
        ...result,
        id: `analysis-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        message: trimmedMessage,
      };

      setAnalysisHistory((current) => [entry, ...current]);
      setSelectedId(entry.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'The analysis request failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearMessage = () => {
    setMessage('');
    setError('');
  };

  const handleClearHistory = () => {
    setAnalysisHistory([]);
    setSelectedId(null);
  };

  return (
    <section className="sentiment-analysis-page">
      <header className="sentiment-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>AI Sentiment Analysis</p>
            <h1 style={{ margin: 0 }}>Understand customer emotions. Identify frustration. Improve customer support.</h1>
          </div>
        </div>
      </header>

      <div className="sentiment-layout">
        <div className="sentiment-main-column">
          <MessageInput
            value={message}
            isAnalyzing={isAnalyzing}
            error={error}
            onChange={setMessage}
            onAnalyze={handleAnalyze}
            onClear={handleClearMessage}
            examples={exampleMessages}
          />

          <SentimentSummary summary={summary} />

          <AnalysisHistory
            entries={analysisHistory}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onClearHistory={handleClearHistory}
          />
        </div>

        <aside className="sentiment-side-column">
          <SentimentResult result={selectedResult} />
        </aside>
      </div>
    </section>
  );
}
