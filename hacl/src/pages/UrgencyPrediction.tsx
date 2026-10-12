import { useMemo, useState } from 'react';
import type { IssueAnalysisRecord, IssueSummaryStats } from '../types/issueAnalysis';
import { classifyIssue } from '../services/issueClassification';
import { predictUrgency } from '../services/urgencyPrediction';

const sampleIssues = [
  {
    label: 'Billing',
    subject: 'Payment failed',
    message: 'My payment was deducted, but my order was not created.',
  },
  {
    label: 'Technical Support',
    subject: 'Application not working',
    message: 'The application keeps crashing whenever I try to open it.',
  },
  {
    label: 'Delivery',
    subject: 'Delayed order',
    message: 'My order has not arrived, and the delivery date has already passed.',
  },
  {
    label: 'Security',
    subject: 'Suspicious account activity',
    message: 'I noticed an unknown login and believe someone may have accessed my account.',
  },
  {
    label: 'General Inquiry',
    subject: 'Update profile',
    message: 'How can I change the name displayed on my profile?',
  },
];

const initialSummary: IssueSummaryStats = {
  total: 0,
  low: 0,
  medium: 0,
  high: 0,
  critical: 0,
};

export function UrgencyPredictionPage() {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [history, setHistory] = useState<IssueAnalysisRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedResult = useMemo(
    () => history.find((entry) => entry.id === selectedId) ?? null,
    [history, selectedId]
  );

  const summary = useMemo(() => {
    const nextSummary = { ...initialSummary };
    history.forEach((entry) => {
      switch (entry.urgency) {
        case 'Low':
          nextSummary.low += 1;
          break;
        case 'Medium':
          nextSummary.medium += 1;
          break;
        case 'High':
          nextSummary.high += 1;
          break;
        case 'Critical':
          nextSummary.critical += 1;
          break;
        default:
          break;
      }
      nextSummary.total += 1;
    });
    return nextSummary;
  }, [history]);

  const handleAnalyze = async () => {
    const trimmedSubject = subject.trim();
    const trimmedMessage = message.trim();

    if (!trimmedMessage) {
      setError('Please enter a customer issue description before analyzing.');
      return;
    }

    setError('');
    setIsAnalyzing(true);

    try {
      const classification = classifyIssue(trimmedSubject, trimmedMessage);
      const urgency = predictUrgency(trimmedSubject, trimmedMessage);
      const record: IssueAnalysisRecord = {
        id: `issue-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        subject: trimmedSubject || 'No subject provided',
        message: trimmedMessage,
        category: classification.category,
        categoryConfidence: classification.confidence,
        categoryExplanation: classification.explanation,
        urgency: urgency.urgency,
        urgencyConfidence: urgency.confidence,
        urgencyExplanation: urgency.explanation,
        criticalFlag: urgency.criticalFlag,
        recommendedAction: urgency.recommendedAction,
        analyzedAt: new Date().toISOString(),
      };

      setHistory((current) => [record, ...current]);
      setSelectedId(record.id);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : 'Issue analysis failed. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClear = () => {
    setSubject('');
    setMessage('');
    setError('');
  };

  const handleClearHistory = () => {
    setHistory([]);
    setSelectedId(null);
  };

  return (
    <section className="urgency-page">
      <header className="urgency-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Urgency Prediction &amp; Issue Classification</p>
            <h1 style={{ margin: 0 }}>Understand customer issues. Predict urgency. Identify the right type of support.</h1>
          </div>
        </div>
      </header>

      <div className="urgency-layout">
        <div className="urgency-main-column">
          <div className="sentiment-panel urgency-panel">
            <div className="panel-header-row">
              <div>
                <p className="eyebrow sentiment-eyebrow">Customer issue</p>
                <h2>Issue Analysis</h2>
              </div>
            </div>

            <div className="field-stack">
              <label className="field-label" htmlFor="issue-subject">Subject</label>
              <input
                id="issue-subject"
                value={subject}
                onChange={(event) => setSubject(event.target.value)}
                placeholder="Optional subject line"
                maxLength={120}
              />

              <label className="field-label" htmlFor="issue-message">Customer Message</label>
              <textarea
                id="issue-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                rows={7}
                maxLength={4000}
                placeholder="Describe the issue, impact, and any recent changes..."
              />
            </div>

            <div className="input-toolbar">
              <span className="char-counter">{message.length}/4000</span>
              <div className="button-row">
                <button type="button" className="secondary-button" onClick={handleClear} disabled={!subject && !message}>
                  Clear
                </button>
                <button type="button" className="primary-button" onClick={handleAnalyze} disabled={isAnalyzing || !message.trim()}>
                  {isAnalyzing ? 'Analyzing...' : 'Analyze Issue'}
                </button>
              </div>
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <div className="example-row">
              {sampleIssues.map((example) => (
                <button
                  type="button"
                  key={example.label}
                  className="example-button"
                  onClick={() => {
                    setSubject(example.subject);
                    setMessage(example.message);
                  }}
                >
                  {example.label}
                </button>
              ))}
            </div>
          </div>

          <div className="summary-grid urgency-summary-grid">
            <article className="summary-card sentiment-summary-card total">
              <span>Total Messages</span>
              <strong>{summary.total}</strong>
            </article>
            <article className="summary-card sentiment-summary-card neutral">
              <span>Low</span>
              <strong>{summary.low}</strong>
            </article>
            <article className="summary-card sentiment-summary-card positive">
              <span>Medium</span>
              <strong>{summary.medium}</strong>
            </article>
            <article className="summary-card sentiment-summary-card negative">
              <span>High</span>
              <strong>{summary.high}</strong>
            </article>
            <article className="summary-card sentiment-summary-card frustrated">
              <span>Critical</span>
              <strong>{summary.critical}</strong>
            </article>
          </div>

          <div className="sentiment-panel history-panel">
            <div className="panel-header-row history-toolbar">
              <div>
                <p className="eyebrow sentiment-eyebrow">Session activity</p>
                <h2>Recent Analysis History</h2>
              </div>
              <button type="button" className="secondary-button" onClick={handleClearHistory} disabled={!history.length}>
                Clear history
              </button>
            </div>

            {!history.length ? (
              <div className="empty-history">
                <p>No issue analyses have been run in this session yet.</p>
              </div>
            ) : (
              <div className="table-wrap history-table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Subject</th>
                      <th>Category</th>
                      <th>Urgency</th>
                      <th>Confidence</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr
                        key={entry.id}
                        className={selectedId === entry.id ? 'selected-row sentiment-selected-row' : ''}
                        onClick={() => setSelectedId(entry.id)}
                      >
                        <td>{entry.subject}</td>
                        <td>{entry.category}</td>
                        <td>
                          <span className={`mini-badge urgency-${entry.urgency.toLowerCase()}`}>{entry.urgency}</span>
                        </td>
                        <td>{entry.urgencyConfidence !== null ? `${Math.round(entry.urgencyConfidence * 100)}%` : 'Not available'}</td>
                        <td>{new Date(entry.analyzedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="urgency-side-column">
          {!selectedResult ? (
            <div className="sentiment-panel empty-result">
              <p>No analysis selected yet. Run a prediction to inspect the issue category and urgency.</p>
            </div>
          ) : (
            <div className="sentiment-panel result-panel">
              <div className="result-header">
                <div>
                  <p className="eyebrow sentiment-eyebrow">Issue classification</p>
                  <h2 className="sentiment-badge sentiment-neutral">{selectedResult.category}</h2>
                </div>
                <span className="analysis-time">{new Date(selectedResult.analyzedAt).toLocaleString()}</span>
              </div>

              <div className="detail-row">
                <span>Confidence</span>
                <strong>{selectedResult.categoryConfidence !== null ? `${Math.round(selectedResult.categoryConfidence * 100)}%` : 'Not available'}</strong>
              </div>

              <div className="detail-row">
                <span>Method</span>
                <strong>Local rule-based issue classifier</strong>
              </div>

              <div className="explanation-box">
                <h3>Classification explanation</h3>
                <p>{selectedResult.categoryExplanation}</p>
              </div>

              <div className="result-divider" />

              <div className="result-header urgency-result-header">
                <div>
                  <p className="eyebrow sentiment-eyebrow">Urgency prediction</p>
                  <h2 className={`sentiment-badge urgency-${selectedResult.urgency.toLowerCase()}`}>{selectedResult.urgency}</h2>
                </div>
                {selectedResult.criticalFlag ? <span className="critical-pill">Critical review</span> : null}
              </div>

              <div className="detail-row">
                <span>Confidence</span>
                <strong>{selectedResult.urgencyConfidence !== null ? `${Math.round(selectedResult.urgencyConfidence * 100)}%` : 'Not available'}</strong>
              </div>

              <div className="detail-row">
                <span>Recommended action</span>
                <strong>{selectedResult.recommendedAction}</strong>
              </div>

              <div className="explanation-box">
                <h3>Urgency explanation</h3>
                <p>{selectedResult.urgencyExplanation}</p>
              </div>
            </div>
          )}
        </aside>
      </div>
    </section>
  );
}
