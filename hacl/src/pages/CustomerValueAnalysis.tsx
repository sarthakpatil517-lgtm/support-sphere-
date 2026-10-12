import { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_CUSTOMER_VALUE_WEIGHTS,
  calculateCustomerValueScore,
  getCustomerValueWeights,
  getRepeatContactSummary,
  loadCustomerValueHistory,
  saveCustomerValueRecord,
  setCustomerValueWeights,
  validateCustomerValueInput,
} from '../services/customerValueAnalysis';
import type { CustomerValueAnalysisResult, CustomerValueFormState, CustomerValueRecord, CustomerValueWeights } from '../types/customerValue';

const defaultFormState: CustomerValueFormState = {
  customerId: '',
  customerName: '',
  accountTier: 'Standard',
  tenureMonths: '12',
  totalTickets: '2',
  repeatContacts: '0',
  lifetimeValue: '',
  accountStatus: 'Active',
  resolvedTickets: '',
};

const sampleCustomerData: Array<{ label: string; data: CustomerValueFormState }> = [
  {
    label: 'Sample data: Gold customer',
    data: {
      customerId: 'CUST-1001',
      customerName: 'Alicia Thompson',
      accountTier: 'Gold',
      tenureMonths: '42',
      totalTickets: '7',
      repeatContacts: '1',
      lifetimeValue: '122000',
      accountStatus: 'Active',
      resolvedTickets: '5',
    },
  },
  {
    label: 'Sample data: Platinum account',
    data: {
      customerId: 'CUST-2044',
      customerName: 'Marcus Lee',
      accountTier: 'Platinum',
      tenureMonths: '72',
      totalTickets: '10',
      repeatContacts: '2',
      lifetimeValue: '260000',
      accountStatus: 'Active',
      resolvedTickets: '9',
    },
  },
  {
    label: 'Sample data: New customer',
    data: {
      customerId: 'CUST-4007',
      customerName: 'Priya Nair',
      accountTier: 'Standard',
      tenureMonths: '5',
      totalTickets: '1',
      repeatContacts: '0',
      lifetimeValue: '',
      accountStatus: 'Active',
      resolvedTickets: '',
    },
  },
];

function formatMoney(value: number | null): string {
  if (value === null || value === undefined) {
    return 'Not provided';
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

export function CustomerValueAnalysisPage() {
  const [formState, setFormState] = useState<CustomerValueFormState>(defaultFormState);
  const [weights, setWeights] = useState<CustomerValueWeights>(DEFAULT_CUSTOMER_VALUE_WEIGHTS);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<CustomerValueAnalysisResult | null>(null);
  const [history, setHistory] = useState<CustomerValueRecord[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const nextWeights = getCustomerValueWeights();
    setWeights(nextWeights);
    setHistory(loadCustomerValueHistory());
  }, []);

  useEffect(() => {
    const selected = history.find((entry) => entry.id === selectedId) ?? null;
    if (!selected && history[0]) {
      setSelectedId(history[0].id);
    }
  }, [history, selectedId]);

  const selectedRecord = useMemo(
    () => history.find((entry) => entry.id === selectedId) ?? history[0] ?? null,
    [history, selectedId]
  );

  const updateField = <K extends keyof CustomerValueFormState>(field: K, value: CustomerValueFormState[K]) => {
    setFormState((current) => ({ ...current, [field]: value }));
  };

  const updateWeight = (key: keyof CustomerValueWeights, value: number) => {
    const nextWeightSet = { ...weights, [key]: Number.isFinite(value) ? value : 0 };
    const normalized = setCustomerValueWeights(nextWeightSet) || nextWeightSet;
    setWeights(normalized);
  };

  const handleAnalyze = () => {
    const validation = validateCustomerValueInput(formState);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setErrors({});
    setIsAnalyzing(true);

    try {
      const computed = calculateCustomerValueScore(formState, weights);
      const record = { id: `${computed.customerId}-${Date.now()}`, ...computed };
      const saved = saveCustomerValueRecord(record);
      setHistory(saved);
      setSelectedId(record.id);
      setResult(computed);
    } catch (error) {
      setErrors({ form: error instanceof Error ? error.message : 'The customer value score could not be calculated.' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearForm = () => {
    setFormState(defaultFormState);
    setErrors({});
  };

  const handleResetWeights = () => {
    setWeights(DEFAULT_CUSTOMER_VALUE_WEIGHTS);
    setCustomerValueWeights(DEFAULT_CUSTOMER_VALUE_WEIGHTS);
  };

  const handleClearHistory = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.removeItem('customer-value-analyses');
    }
    setHistory([]);
    setSelectedId(null);
  };

  const currentValue = result?.score ?? selectedRecord?.score ?? 0;
  const currentCategory = result?.category ?? selectedRecord?.category ?? 'Low Value';

  return (
    <section className="customer-value-page">
      <header className="customer-value-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Customer Value Analysis</p>
            <h1 style={{ margin: 0 }}>Measure customer value using account profile, history, and relationship signals.</h1>
          </div>
        </div>
      </header>

      <div className="customer-value-layout">
        <div className="customer-value-main-panel">
          <div className="customer-value-panel">
            <div className="panel-header-row">
              <div>
                <p className="eyebrow">Customer input</p>
                <h2>Assess account value</h2>
              </div>
            </div>

            <div className="customer-value-form-grid">
              <label>
                <span>Customer ID</span>
                <input value={formState.customerId} onChange={(event) => updateField('customerId', event.target.value)} />
                {errors.customerId ? <small>{errors.customerId}</small> : null}
              </label>

              <label>
                <span>Customer name</span>
                <input value={formState.customerName} onChange={(event) => updateField('customerName', event.target.value)} />
                {errors.customerName ? <small>{errors.customerName}</small> : null}
              </label>

              <label>
                <span>Account tier</span>
                <select value={formState.accountTier} onChange={(event) => updateField('accountTier', event.target.value as CustomerValueFormState['accountTier'])}>
                  <option value="Standard">Standard</option>
                  <option value="Silver">Silver</option>
                  <option value="Gold">Gold</option>
                  <option value="Platinum">Platinum</option>
                </select>
                {errors.accountTier ? <small>{errors.accountTier}</small> : null}
              </label>

              <label>
                <span>Tenure in months</span>
                <input type="number" min="0" value={formState.tenureMonths} onChange={(event) => updateField('tenureMonths', event.target.value)} />
                {errors.tenureMonths ? <small>{errors.tenureMonths}</small> : null}
              </label>

              <label>
                <span>Total previous support tickets</span>
                <input type="number" min="0" value={formState.totalTickets} onChange={(event) => updateField('totalTickets', event.target.value)} />
                {errors.totalTickets ? <small>{errors.totalTickets}</small> : null}
              </label>

              <label>
                <span>Repeat contacts for same issue</span>
                <input type="number" min="0" value={formState.repeatContacts} onChange={(event) => updateField('repeatContacts', event.target.value)} />
                {errors.repeatContacts ? <small>{errors.repeatContacts}</small> : null}
              </label>

              <label>
                <span>Customer lifetime value (optional)</span>
                <input type="number" min="0" value={formState.lifetimeValue} onChange={(event) => updateField('lifetimeValue', event.target.value)} placeholder="Optional" />
                {errors.lifetimeValue ? <small>{errors.lifetimeValue}</small> : null}
              </label>

              <label>
                <span>Subscription or account status</span>
                <select value={formState.accountStatus} onChange={(event) => updateField('accountStatus', event.target.value as CustomerValueFormState['accountStatus'])}>
                  <option value="Active">Active</option>
                  <option value="At Risk">At Risk</option>
                  <option value="Paused">Paused</option>
                  <option value="Cancelled">Cancelled</option>
                  <option value="Inactive">Inactive</option>
                </select>
                {errors.accountStatus ? <small>{errors.accountStatus}</small> : null}
              </label>

              <label>
                <span>Previous resolved tickets (optional)</span>
                <input type="number" min="0" value={formState.resolvedTickets} onChange={(event) => updateField('resolvedTickets', event.target.value)} placeholder="Optional" />
                {errors.resolvedTickets ? <small>{errors.resolvedTickets}</small> : null}
              </label>
            </div>

            <div className="button-row">
              <button type="button" className="secondary-button" onClick={handleClearForm}>Clear form</button>
              <button type="button" className="primary-button" onClick={handleAnalyze} disabled={isAnalyzing}>{isAnalyzing ? 'Analyzing...' : 'Analyze Customer'}</button>
            </div>

            {errors.form ? <p className="form-error">{errors.form}</p> : null}

            <div className="sample-data-box">
              <p className="sample-data-label">Sample data</p>
              <div className="sample-data-buttons">
                {sampleCustomerData.map((sample) => (
                  <button key={sample.label} type="button" className="secondary-button sample-button" onClick={() => setFormState(sample.data)}>
                    {sample.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="customer-value-panel">
            <div className="panel-header-row">
              <div>
                <p className="eyebrow">Scoring controls</p>
                <h2>Configurable weights</h2>
              </div>
              <button type="button" className="secondary-button" onClick={handleResetWeights}>Reset weights</button>
            </div>

            <div className="weight-grid">
              {Object.entries(weights).map(([key, value]) => (
                <label key={key} className="weight-field">
                  <span>
                    {key === 'tier' && 'Account tier'}
                    {key === 'tenure' && 'Customer tenure'}
                    {key === 'lifetimeValue' && 'Lifetime value'}
                    {key === 'accountStatusAndHistory' && 'Account status and history'}
                  </span>
                  <div className="weight-input-row">
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={value}
                      onChange={(event) => updateWeight(key as keyof CustomerValueWeights, Number(event.target.value))}
                    />
                    <strong>%</strong>
                  </div>
                </label>
              ))}
            </div>

            <div className="weight-total">
              <span>Total weight</span>
              <strong>{Object.values(weights).reduce((total, value) => total + Number(value || 0), 0)}%</strong>
            </div>
          </div>

          <div className="customer-value-panel">
            <div className="panel-header-row">
              <div>
                <p className="eyebrow">Session activity</p>
                <h2>Recent analyses</h2>
              </div>
              <button type="button" className="secondary-button" onClick={handleClearHistory} disabled={!history.length}>Clear history</button>
            </div>

            {!history.length ? (
              <div className="empty-state">No customer value analyses saved in this browser yet.</div>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Customer</th>
                      <th>Score</th>
                      <th>Category</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry.id} className={selectedId === entry.id ? 'selected-row' : ''} onClick={() => setSelectedId(entry.id)}>
                        <td>{entry.customerName}</td>
                        <td>{entry.score.toFixed(1)}</td>
                        <td><span className="category-badge">{entry.category}</span></td>
                        <td>{new Date(entry.analyzedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <aside className="customer-value-side-panel">
          <div className="customer-value-panel result-card">
            <div className="score-header">
              <div>
                <p className="eyebrow">Estimated score</p>
                <h2>{currentValue.toFixed(1)}</h2>
              </div>
              <span className="category-badge large-badge">{currentCategory}</span>
            </div>

            <div className="score-meta">
              <div>
                <span>Customer</span>
                <strong>{result?.customerName ?? selectedRecord?.customerName ?? 'No analysis yet'}</strong>
              </div>
              <div>
                <span>Customer ID</span>
                <strong>{result?.customerId ?? selectedRecord?.customerId ?? '—'}</strong>
              </div>
            </div>

            <div className="metric-box">
              <span>Repeat-contact history</span>
              <strong>{((result ?? selectedRecord)?.repeatContactSummary ?? getRepeatContactSummary(Number(formState.repeatContacts || 0)))}</strong>
            </div>

            <div className="factor-breakdown">
              <h3>Factor-by-factor breakdown</h3>
              {(result ?? selectedRecord)?.normalizedFactors?.map((factor) => (
                <div key={factor.label} className="factor-item">
                  <div className="factor-label-row">
                    <span>{factor.label}</span>
                    <strong>{factor.contribution.toFixed(1)} pts</strong>
                  </div>
                  <div className="progress-bar">
                    <span style={{ width: `${factor.normalized}%` }} />
                  </div>
                  <small>{factor.missing ? 'Missing input; excluded from the score.' : `${factor.normalized.toFixed(0)} / 100 normalized`}</small>
                </div>
              )) ?? (
                <div className="empty-state small-empty">No analysis selected yet. Run the score to view breakdown details.</div>
              )}
            </div>

            <div className="explain-box">
              <h3>Explanation</h3>
              <p>{(result ?? selectedRecord)?.explanation ?? 'The score calculation will appear here once a customer record is analyzed.'}</p>
            </div>

            <div className="explain-box note-box">
              <h3>Estimate note</h3>
              <p>{(result ?? selectedRecord)?.estimateNote ?? 'The score is an estimate based on the configured customer value rules and should be reviewed with support context.'}</p>
            </div>
          </div>

          <div className="customer-value-panel summary-card-box">
            <div className="panel-header-row compact-row">
              <div>
                <p className="eyebrow">Account summary</p>
                <h2>Customer profile</h2>
              </div>
            </div>

            <div className="summary-list">
              <div><span>Tier</span><strong>{formState.accountTier}</strong></div>
              <div><span>Account status</span><strong>{formState.accountStatus}</strong></div>
              <div><span>Tenure</span><strong>{formState.tenureMonths ? `${formState.tenureMonths} months` : 'Not provided'}</strong></div>
              <div><span>Previous tickets</span><strong>{formState.totalTickets ? formState.totalTickets : '0'}</strong></div>
              <div><span>Repeat contacts</span><strong>{formState.repeatContacts ? formState.repeatContacts : '0'}</strong></div>
              <div><span>Lifetime value</span><strong>{formatMoney(Number(formState.lifetimeValue || 0) || null)}</strong></div>
              <div><span>Resolved tickets</span><strong>{formState.resolvedTickets ? formState.resolvedTickets : '0'}</strong></div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
