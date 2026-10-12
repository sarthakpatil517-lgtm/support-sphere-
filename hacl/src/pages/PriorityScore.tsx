import { useEffect, useMemo, useState } from 'react';
import {
  clearPriorityCalculations,
  getPriorityCalculations,
  getPriorityWeights,
  savePriorityCalculation as persistPriorityCalculation,
  savePriorityWeights as persistPriorityWeights,
} from '../lib/api';
import {
  DEFAULT_PRIORITY_WEIGHTS,
  URGENCY_SCORE_MAP,
  calculatePriority,
  validatePriorityInput,
  validatePriorityWeights,
} from '../services/priorityScore';
import type { PriorityCalculation, PriorityFormState, PriorityRecord, PriorityWeights, UrgencyLevel } from '../types/priorityScore';

const initialForm: PriorityFormState = {
  ticketId: '',
  subject: '',
  urgencyLevel: 'Low',
  urgencyScore: String(URGENCY_SCORE_MAP.Low),
  frustrationScore: '',
  customerValueScore: '',
  supportHistoryScore: '',
  notes: '',
};

const samples: Array<{ label: string; form: PriorityFormState }> = [
  {
    label: 'Sample: Critical security incident',
    form: { ticketId: 'SAMPLE-SEC-01', subject: 'Unknown access to customer account', urgencyLevel: 'Critical', urgencyScore: '100', frustrationScore: '20', customerValueScore: '10', supportHistoryScore: '15', notes: 'Illustrative sample only; critical flag requires immediate review.' },
  },
  {
    label: 'Sample: High impact ticket',
    form: { ticketId: 'SAMPLE-204', subject: 'Payment collected but order was not created', urgencyLevel: 'High', urgencyScore: '90', frustrationScore: '80', customerValueScore: '70', supportHistoryScore: '100', notes: 'Illustrative score example.' },
  },
  {
    label: 'Sample: Routine request',
    form: { ticketId: 'SAMPLE-318', subject: 'Question about updating profile details', urgencyLevel: 'Low', urgencyScore: '20', frustrationScore: '15', customerValueScore: '40', supportHistoryScore: '10', notes: '' },
  },
];

function scoreColor(category: PriorityCalculation['category']) {
  return category.toLowerCase().replace(' priority', '');
}

export function PriorityScorePage() {
  const [form, setForm] = useState<PriorityFormState>(initialForm);
  const [weights, setWeights] = useState<PriorityWeights>(DEFAULT_PRIORITY_WEIGHTS);
  const [history, setHistory] = useState<PriorityRecord[]>([]);
  const [result, setResult] = useState<PriorityCalculation | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [storageError, setStorageError] = useState('');
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSampleInput, setIsSampleInput] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([getPriorityCalculations(), getPriorityWeights()])
      .then(([savedHistory, savedWeights]) => {
        if (!active) return;
        setHistory(savedHistory);
        setWeights(savedWeights);
      })
      .catch((error: unknown) => {
        if (active) setStorageError(error instanceof Error ? error.message : 'Unable to load saved priority data.');
      });
    return () => { active = false; };
  }, []);

  const selectedRecord = useMemo(
    () => history.find((record) => record.id === selectedId) ?? null,
    [history, selectedId]
  );
  const displayedResult = result ?? selectedRecord;
  const weightError = validatePriorityWeights(weights);

  const updateForm = <K extends keyof PriorityFormState>(key: K, value: PriorityFormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setIsSampleInput(false);
    setResult(null);
    setSelectedId(null);
  };

  const updateWeight = (key: keyof PriorityWeights, value: string) => {
    const nextWeights = { ...weights, [key]: value === '' ? Number.NaN : Number(value) };
    setWeights(nextWeights);
    setResult(null);
    setSelectedId(null);
    const validationMessage = validatePriorityWeights(nextWeights);
    if (!validationMessage) {
      persistPriorityWeights(nextWeights)
        .then(() => setStorageError(''))
        .catch((error: unknown) => setStorageError(error instanceof Error ? error.message : 'Unable to save priority weights.'));
    }
  };

  const calculate = async () => {
    const validation = validatePriorityInput(form);
    const nextErrors = validation.errors;
    const nextWeightError = validatePriorityWeights(weights);
    if (nextWeightError) nextErrors.weights = nextWeightError;
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsCalculating(true);
    try {
      const calculation = calculatePriority(form, weights, isSampleInput);
      const record: PriorityRecord = {
        ...calculation,
        id: `${calculation.ticketId}-${Date.now()}`,
      };
      const nextHistory = await persistPriorityCalculation(record);
      setHistory(nextHistory);
      setSelectedId(record.id);
      setResult(calculation);
      setStorageError('');
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Priority calculation could not be saved.');
    } finally {
      setIsCalculating(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setErrors({});
    setResult(null);
    setSelectedId(null);
    setIsSampleInput(false);
  };

  const resetWeights = async () => {
    setWeights({ ...DEFAULT_PRIORITY_WEIGHTS });
    setResult(null);
    setSelectedId(null);
    try {
      await persistPriorityWeights(DEFAULT_PRIORITY_WEIGHTS);
      setStorageError('');
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Unable to save default weights.');
    }
  };

  const clearHistory = async () => {
    try {
      await clearPriorityCalculations();
      setHistory([]);
      setSelectedId(null);
      setResult(null);
      setStorageError('');
    } catch (error) {
      setStorageError(error instanceof Error ? error.message : 'Unable to clear priority history.');
    }
  };

  const viewRecord = (record: PriorityRecord) => {
    setSelectedId(record.id);
    setResult(null);
    setIsSampleInput(record.isSample);
    setForm({
      ticketId: record.ticketId,
      subject: record.subject,
      urgencyLevel: record.urgencyLevel,
      urgencyScore: String(record.urgencyScore),
      frustrationScore: String(record.frustrationScore),
      customerValueScore: String(record.customerValueScore),
      supportHistoryScore: String(record.supportHistoryScore),
      notes: record.notes,
    });
  };

  const displayFactors = displayedResult?.factors ?? [];

  return (
    <section className="priority-page">
      <header className="priority-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Module 6 · Decision-support estimate</p>
            <h1 style={{ margin: 0 }}>Calculate support ticket priority with a clear, explainable score.</h1>
            <p className="priority-intro" style={{ margin: '4px 0 0' }}>This standalone calculator uses manually entered factor scores. It does not call or assume outputs from other modules.</p>
          </div>
        </div>
      </header>

      {storageError ? <div className="priority-error" role="alert">{storageError}</div> : null}

      <div className="priority-layout">
        <div className="priority-main">
          <section className="priority-card">
            <div className="priority-section-heading">
              <div><p className="eyebrow">Ticket inputs</p><h2>Ticket details and factor scores</h2></div>
            </div>
            <div className="priority-form-grid">
              <label>Ticket ID
                <input value={form.ticketId} onChange={(event) => updateForm('ticketId', event.target.value)} />
                {errors.ticketId ? <small>{errors.ticketId}</small> : null}
              </label>
              <label className="wide-field">Ticket subject or short issue description
                <input value={form.subject} onChange={(event) => updateForm('subject', event.target.value)} maxLength={200} />
                {errors.subject ? <small>{errors.subject}</small> : null}
              </label>
              <label>Urgency level
                <select
                  value={form.urgencyLevel}
                  onChange={(event) => {
                    const urgencyLevel = event.target.value as UrgencyLevel;
                    setForm((current) => ({ ...current, urgencyLevel, urgencyScore: String(URGENCY_SCORE_MAP[urgencyLevel]) }));
                    setIsSampleInput(false);
                    setResult(null);
                    setSelectedId(null);
                  }}
                >
                  {Object.keys(URGENCY_SCORE_MAP).map((level) => <option key={level} value={level}>{level}</option>)}
                </select>
                {errors.urgencyLevel ? <small>{errors.urgencyLevel}</small> : null}
              </label>
              <label>Urgency score (default from level; editable)
                <input type="number" min="0" max="100" value={form.urgencyScore} onChange={(event) => updateForm('urgencyScore', event.target.value)} />
                {errors.urgencyScore ? <small>{errors.urgencyScore}</small> : null}
              </label>
              <label>Customer frustration score (0–100)
                <input type="number" min="0" max="100" value={form.frustrationScore} onChange={(event) => updateForm('frustrationScore', event.target.value)} placeholder="Required" />
                {errors.frustrationScore ? <small>{errors.frustrationScore}</small> : null}
              </label>
              <label>Customer value score (0–100)
                <input type="number" min="0" max="100" value={form.customerValueScore} onChange={(event) => updateForm('customerValueScore', event.target.value)} placeholder="Required" />
                {errors.customerValueScore ? <small>{errors.customerValueScore}</small> : null}
              </label>
              <label>Support history score (0–100)
                <input type="number" min="0" max="100" value={form.supportHistoryScore} onChange={(event) => updateForm('supportHistoryScore', event.target.value)} placeholder="Required" />
                {errors.supportHistoryScore ? <small>{errors.supportHistoryScore}</small> : null}
              </label>
              <label className="wide-field">Optional notes
                <textarea rows={3} value={form.notes} onChange={(event) => updateForm('notes', event.target.value)} maxLength={1000} />
              </label>
            </div>
            {errors.weights ? <p className="priority-field-error">{errors.weights}</p> : null}
            <div className="priority-actions">
              <button type="button" className="secondary-button" onClick={resetForm}>Reset form</button>
              <button type="button" className="primary-button" disabled={isCalculating || Boolean(weightError)} onClick={() => void calculate()}>
                {isCalculating ? 'Calculating...' : 'Calculate Priority'}
              </button>
            </div>
            <div className="priority-samples">
              <p>Illustrative sample inputs only</p>
              <div>{samples.map((sample) => (
                <button type="button" className="secondary-button" key={sample.label} onClick={() => { setForm(sample.form); setErrors({}); setIsSampleInput(true); setResult(null); setSelectedId(null); }}>
                  {sample.label}
                </button>
              ))}</div>
            </div>
          </section>

          <section className="priority-card">
            <div className="priority-section-heading">
              <div><p className="eyebrow">Scoring configuration</p><h2>Weighted formula</h2></div>
              <button type="button" className="secondary-button" onClick={() => void resetWeights()}>Reset weights</button>
            </div>
            <p className="priority-formula">Priority Score = (Urgency × weight) + (Frustration × weight) + (Customer Value × weight) + (Support History × weight)</p>
            <div className="priority-weight-grid">
              {([
                ['urgency', 'Urgency'],
                ['frustration', 'Customer frustration'],
                ['customerValue', 'Customer value'],
                ['supportHistory', 'Support history'],
              ] as Array<[keyof PriorityWeights, string]>).map(([key, label]) => (
                <label key={key}>{label} weight
                  <div className="priority-weight-input"><input type="number" min="0" max="100" value={Number.isNaN(weights[key]) ? '' : weights[key]} onChange={(event) => updateWeight(key, event.target.value)} /><span>%</span></div>
                </label>
              ))}
            </div>
            <div className={`priority-weight-total ${weightError ? 'invalid' : ''}`}>
              <span>Total weight</span><strong>{Object.values(weights).reduce((sum, value) => sum + (Number.isFinite(value) ? value : 0), 0).toFixed(2)}%</strong>
            </div>
            {weightError ? <p className="priority-field-error">{weightError}</p> : <p className="priority-help">Weights must total exactly 100% before calculating. Defaults: 40 / 25 / 20 / 15.</p>}
          </section>

          <section className="priority-card">
            <div className="priority-section-heading">
              <div><p className="eyebrow">Project database</p><h2>Recent calculations</h2></div>
              <button type="button" className="secondary-button" onClick={() => void clearHistory()} disabled={!history.length}>Clear history</button>
            </div>
            {!history.length ? <p className="priority-empty">No priority calculations have been saved yet.</p> : (
              <div className="priority-table-wrap"><table>
                <thead><tr><th>Ticket</th><th>Score</th><th>Priority</th><th>Record</th><th>Calculated</th><th></th></tr></thead>
                <tbody>{history.map((record) => (
                  <tr key={record.id}>
                    <td><strong>{record.ticketId}</strong><small>{record.subject}</small></td>
                    <td>{record.score.toFixed(2)}</td>
                    <td><span className={`priority-badge ${scoreColor(record.category)}`}>{record.category}</span>{record.criticalFlag ? <span className="critical-inline">Critical</span> : null}</td>
                    <td>{record.isSample ? 'Sample' : 'Entered'}</td>
                    <td>{new Date(record.analyzedAt).toLocaleString()}</td>
                    <td><button type="button" className="priority-view-button" onClick={() => viewRecord(record)}>View details</button></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </section>
        </div>

        <aside className="priority-side">
          <section className="priority-card priority-result-card">
            {!displayedResult ? (
              <div className="priority-empty-result"><p className="eyebrow">Priority result</p><h2>Ready to calculate</h2><p>Enter all four factor scores to see a transparent priority breakdown.</p></div>
            ) : (
              <>
                <div className="priority-score-head">
                  <div><p className="eyebrow">Support ticket priority score</p><strong>{displayedResult.score.toFixed(2)}</strong></div>
                  <span className={`priority-badge large ${scoreColor(displayedResult.category)}`}>{displayedResult.category}</span>
                </div>
                {displayedResult.criticalFlag ? <div className="critical-warning" role="alert"><strong>Critical urgency — immediate review required.</strong><span>Critical handling is a separate safeguard and cannot be downgraded by the weighted score, customer value, or frustration inputs.</span></div> : null}
                <div className="priority-attention"><span>Recommended attention</span><strong>{displayedResult.attentionLevel}</strong></div>
                <div className="priority-factor-breakdown">
                  <h3>Factor contributions</h3>
                  {displayFactors.map((factor) => (
                    <div className="priority-factor" key={factor.key}>
                      <div className="priority-factor-heading"><span>{factor.label}</span><strong>{factor.contribution.toFixed(2)} pts</strong></div>
                      <div className="priority-progress"><span style={{ width: `${factor.score}%` }} /></div>
                      <small>Score {factor.score} × {factor.weight}% weight</small>
                    </div>
                  ))}
                </div>
                <div className="priority-explanation"><h3>Why this score?</h3><p>{displayedResult.explanation}</p></div>
                <p className="priority-estimate-note">A configurable decision-support estimate, not a guarantee of actual resolution time. {displayedResult.isSample ? 'This calculation uses illustrative sample inputs.' : ''}</p>
              </>
            )}
          </section>
          <section className="priority-card priority-method-card">
            <p className="eyebrow">Illustrative calculation</p>
            <h3>Example: 85 — High Priority</h3>
            <p>(0.40 × 90) + (0.25 × 80) + (0.20 × 70) + (0.15 × 100) = 85.00</p>
            <small>Example only; it is not a live or real ticket prediction.</small>
          </section>
          <section className="priority-card priority-method-card">
            <p className="eyebrow">Critical safeguard</p>
            <h3>Separate from score calculation</h3>
            <p>Critical urgency sets an immediate-review flag regardless of the ordinary weighted category. The numerical score remains explainable and unchanged.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
