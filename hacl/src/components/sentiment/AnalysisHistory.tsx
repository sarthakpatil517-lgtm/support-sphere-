import type { HistoryEntry } from '../../types/sentiment';

interface AnalysisHistoryProps {
  entries: HistoryEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onClearHistory: () => void;
}

const previewText = (value: string) => (value.length > 80 ? `${value.slice(0, 80)}...` : value);

export function AnalysisHistory({ entries, selectedId, onSelect, onClearHistory }: AnalysisHistoryProps) {
  return (
    <div className="sentiment-panel history-panel">
      <div className="panel-header-row history-toolbar">
        <div>
          <p className="eyebrow sentiment-eyebrow">Session activity</p>
          <h2>Recent Analysis History</h2>
        </div>
        <button type="button" className="secondary-button" onClick={onClearHistory} disabled={!entries.length}>
          Clear history
        </button>
      </div>

      {!entries.length ? (
        <div className="empty-history">
          <p>No messages have been analyzed in this session yet.</p>
        </div>
      ) : (
        <div className="table-wrap history-table-wrap">
          <table>
            <thead>
              <tr>
                <th>Message</th>
                <th>Sentiment</th>
                <th>Frustration</th>
                <th>Confidence</th>
                <th>Time</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr
                  key={entry.id}
                  className={selectedId === entry.id ? 'selected-row sentiment-selected-row' : ''}
                  onClick={() => onSelect(entry.id)}
                >
                  <td>{previewText(entry.message)}</td>
                  <td>
                    <span className={`mini-badge ${entry.sentiment.toLowerCase()}`}>{entry.sentiment}</span>
                  </td>
                  <td>{entry.frustrationScore}/100</td>
                  <td>{entry.confidence !== null ? `${Math.round(entry.confidence * 100)}%` : 'Not available'}</td>
                  <td>{new Date(entry.analyzedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
