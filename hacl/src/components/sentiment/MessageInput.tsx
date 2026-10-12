interface ExampleItem {
  label: string;
  text: string;
}

interface MessageInputProps {
  value: string;
  isAnalyzing: boolean;
  error: string;
  onChange: (value: string) => void;
  onAnalyze: () => void;
  onClear: () => void;
  examples: ExampleItem[];
}

export function MessageInput({ value, isAnalyzing, error, onChange, onAnalyze, onClear, examples }: MessageInputProps) {
  const remaining = 4000 - value.length;

  return (
    <div className="sentiment-panel">
      <div className="panel-header-row">
        <div>
          <p className="eyebrow sentiment-eyebrow">Customer message</p>
          <h2>AI Sentiment Analysis</h2>
        </div>
      </div>

      <label className="field-label" htmlFor="customer-message">
        Customer Message
      </label>
      <textarea
        id="customer-message"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Paste a latest customer support message or describe the issue in a few sentences..."
        rows={7}
        maxLength={4000}
      />

      <div className="input-toolbar">
        <span className="char-counter">{value.length}/4000</span>
        <div className="button-row">
          <button type="button" className="secondary-button" onClick={onClear} disabled={!value.trim()}>
            Clear
          </button>
          <button type="button" className="primary-button" onClick={onAnalyze} disabled={isAnalyzing || !value.trim()}>
            {isAnalyzing ? 'Analyzing...' : 'Analyze Sentiment'}
          </button>
        </div>
      </div>

      {error ? <p className="form-error">{error}</p> : null}

      <div className="example-row">
        {examples.map((example) => (
          <button type="button" key={example.label} className="example-button" onClick={() => onChange(example.text)}>
            {example.label}
          </button>
        ))}
      </div>

      <p className="helper-copy">
        {remaining >= 0
          ? `${remaining} characters remaining.`
          : 'Message exceeds the recommended length. Please shorten it for more accurate analysis.'}
      </p>
    </div>
  );
}
