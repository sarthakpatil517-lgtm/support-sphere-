import { useState, useEffect } from 'react';
import { runPredictiveTriage, type PredictiveTriageResult, type CustomerTriageInput } from '../services/triagePipeline';
import { createTicket } from '../lib/api';
import type { AccountTier, AccountStatus } from '../types/customerValue';
import '../styles/predictive-triage.css';

interface PresetScenario {
  id: string;
  name: string;
  icon: string;
  badge: string;
  subject: string;
  description: string;
  customer: CustomerTriageInput;
  highlight: string;
}

const PRESET_SCENARIOS: PresetScenario[] = [
  {
    id: 'frustrated-client',
    name: 'Highly Frustrated Customer',
    icon: '😡',
    badge: 'Senior Escalation',
    subject: '4th time payment failed! Nobody is helping me!',
    description: 'This is the fourth time my payment failed and nobody has resolved it! I am extremely frustrated and fed up with your terrible support. Completely unacceptable, cancel my account if you cannot fix this immediately!',
    customer: {
      customerId: 'CUST-8801',
      customerName: 'Marcus Vance',
      accountTier: 'Standard',
      tenureMonths: 10,
      lifetimeValue: 850,
      accountStatus: 'At Risk',
      totalTickets: 5,
      repeatContacts: 4,
    },
    highlight: 'Frustration score >= 70 triggers immediate fast-track escalation to Senior Support Specialist for de-escalation.',
  },
  {
    id: 'vip-client',
    name: 'High-Value Enterprise VIP',
    icon: '💎',
    badge: 'VIP Escalation',
    subject: 'Enterprise SLA & Q4 Billing Reconciliation Inquiry',
    description: 'Hello team, as a platinum enterprise account partner, could you please schedule our quarterly technical review for dedicated capacity allocations and review the invoice adjustments for Q4?',
    customer: {
      customerId: 'CUST-VIP-009',
      customerName: 'Nexus Global Tech (Enterprise)',
      accountTier: 'Platinum',
      tenureMonths: 42,
      lifetimeValue: 145000,
      accountStatus: 'Active',
      totalTickets: 4,
      repeatContacts: 0,
    },
    highlight: 'Customer Value score >= 75 (Platinum Tier) automatically routes to Senior Staff & Executive Escalations.',
  },
  {
    id: 'security-incident',
    name: 'Critical Security Breach',
    icon: '🚨',
    badge: 'Incident Safeguard',
    subject: 'Unauthorized login detected from unknown IP',
    description: 'Someone accessed my account without authorization and changed my security settings! My credentials are compromised and suspicious transactions are showing. Please freeze access immediately!',
    customer: {
      customerId: 'CUST-3341',
      customerName: 'Sarah Jenkins',
      accountTier: 'Gold',
      tenureMonths: 18,
      lifetimeValue: 3400,
      accountStatus: 'Active',
      totalTickets: 2,
      repeatContacts: 0,
    },
    highlight: 'Critical Urgency Safeguard bypasses standard queues, forcing immediate review by Security Incident Lead.',
  },
  {
    id: 'routine-kb',
    name: 'Routine Inquiry (Auto-Deflected)',
    icon: '⚡',
    badge: 'Auto KB (< 1s)',
    subject: 'How do I reset my password?',
    description: 'Hi support team, could you please tell me how do I reset my password and restore access to my account? I forgot my credentials.',
    customer: {
      customerId: 'CUST-1049',
      customerName: 'Emily Taylor',
      accountTier: 'Standard',
      tenureMonths: 2,
      lifetimeValue: 150,
      accountStatus: 'Active',
      totalTickets: 1,
      repeatContacts: 0,
    },
    highlight: 'Routine question matches Knowledge Base KB-101 with 95% confidence, providing instant self-service resolution without queue wait.',
  },
  {
    id: 'standard-tech',
    name: 'Standard Technical Issue',
    icon: '🛠️',
    badge: 'Tier-1 Routing',
    subject: 'Application error when exporting monthly reports',
    description: 'Whenever I click on Export CSV from the analytics reports dashboard, the application freezes and throws an unexpected error code 502.',
    customer: {
      customerId: 'CUST-5512',
      customerName: 'David Chen',
      accountTier: 'Silver',
      tenureMonths: 14,
      lifetimeValue: 1800,
      accountStatus: 'Active',
      totalTickets: 3,
      repeatContacts: 1,
    },
    highlight: 'Standard priority ticket routed dynamically to Technical Support team based on skill fit and capacity availability.',
  },
];

export function PredictiveTriageSimulator() {
  const [selectedScenario, setSelectedScenario] = useState<string>('frustrated-client');
  const [subject, setSubject] = useState<string>(PRESET_SCENARIOS[0].subject);
  const [description, setDescription] = useState<string>(PRESET_SCENARIOS[0].description);
  const [customerName, setCustomerName] = useState<string>(PRESET_SCENARIOS[0].customer.customerName || '');
  const [accountTier, setAccountTier] = useState<AccountTier>(PRESET_SCENARIOS[0].customer.accountTier || 'Standard');
  const [tenureMonths, setTenureMonths] = useState<number>(PRESET_SCENARIOS[0].customer.tenureMonths || 12);
  const [lifetimeValue, setLifetimeValue] = useState<number>(PRESET_SCENARIOS[0].customer.lifetimeValue || 1000);
  const [accountStatus, setAccountStatus] = useState<AccountStatus>(PRESET_SCENARIOS[0].customer.accountStatus || 'Active');
  const [repeatContacts, setRepeatContacts] = useState<number>(PRESET_SCENARIOS[0].customer.repeatContacts || 0);

  const [triageResult, setTriageResult] = useState<PredictiveTriageResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [ticketCreationStatus, setTicketCreationStatus] = useState<string>('');

  const executeTriage = async () => {
    setIsAnalyzing(true);
    setTicketCreationStatus('');
    try {
      const result = await runPredictiveTriage(
        subject,
        description,
        {
          customerName,
          accountTier,
          tenureMonths,
          lifetimeValue,
          accountStatus,
          repeatContacts,
        }
      );
      setTriageResult(result);
    } catch (error) {
      console.error('Triage execution failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    executeTriage();
  }, []);

  const handleSelectScenario = (scenario: PresetScenario) => {
    setSelectedScenario(scenario.id);
    setSubject(scenario.subject);
    setDescription(scenario.description);
    setCustomerName(scenario.customer.customerName || '');
    setAccountTier(scenario.customer.accountTier || 'Standard');
    setTenureMonths(scenario.customer.tenureMonths || 12);
    setLifetimeValue(scenario.customer.lifetimeValue || 1000);
    setAccountStatus(scenario.customer.accountStatus || 'Active');
    setRepeatContacts(scenario.customer.repeatContacts || 0);

    // Auto-run analysis for the new scenario
    setIsAnalyzing(true);
    setTicketCreationStatus('');
    runPredictiveTriage(scenario.subject, scenario.description, scenario.customer)
      .then((res) => setTriageResult(res))
      .catch((err) => console.error(err))
      .finally(() => setIsAnalyzing(false));
  };

  const handleCreateLiveTicket = async () => {
    if (!triageResult) return;
    try {
      setTicketCreationStatus('Creating live ticket with triage data...');
      const created = await createTicket({
        subject: triageResult.subject,
        description: triageResult.description,
        category: triageResult.issueClassification.category,
        referenceNumber: `TR-${Date.now().toString().slice(-4)}`,
        triage: {
          sentiment: triageResult.sentimentAnalysis.sentiment,
          frustrationScore: triageResult.sentimentAnalysis.frustrationScore,
          urgency: triageResult.urgencyPrediction.urgency,
          customerTier: accountTier,
          customerValueScore: triageResult.customerValueAnalysis.score,
          priorityScore: triageResult.priorityCalculation.score,
          priorityCategory: triageResult.priorityCalculation.category,
          routingLevel: triageResult.triageOutcome.routingLevel,
          assignedTeam: triageResult.triageOutcome.assignedTeam,
          assignedAgent: triageResult.triageOutcome.assignedRole,
          escalationReasons: triageResult.triageOutcome.escalationReasons,
          isEscalatedToSenior: triageResult.triageOutcome.isEscalatedToSenior,
          isKbDeflected: triageResult.triageOutcome.isKbDeflected,
          kbSolution: triageResult.knowledgeBaseMatch?.article.solution,
          kbArticleId: triageResult.knowledgeBaseMatch?.article.id,
          slaResponseTime: triageResult.triageOutcome.slaResponseTime,
        },
      });
      setTicketCreationStatus(`✅ Success! Created Ticket ${created.id} (Status: ${created.status}) routed to ${triageResult.triageOutcome.assignedTeam}`);
    } catch (err) {
      setTicketCreationStatus(`❌ Failed to create ticket: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const outcome = triageResult?.triageOutcome;

  return (
    <div className="triage-container">
      <header className="triage-hero">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '8px', flexWrap: 'wrap' }}>
          <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
          <h1 style={{ margin: 0 }}>Predictive Customer Support Triage &amp; Sentiment Router</h1>
        </div>
        <p>
          Eliminate generic first-come, first-served queues. This centralized triage engine predicts customer sentiment, frustration, urgency, and lifetime value in real time—instantly calculating a priority score and routing each query to the exact right team: <strong>escalating highly frustrated or high-value clients to senior staff</strong>, while <strong>deflecting routine queries through an automated knowledge base</strong>.
        </p>
      </header>

      {/* Preset Scenarios Selector Bar */}
      <div className="preset-scenarios-bar">
        <span className="preset-label">Test Scenarios:</span>
        {PRESET_SCENARIOS.map((scenario) => (
          <button
            key={scenario.id}
            type="button"
            className={`scenario-pill ${selectedScenario === scenario.id ? 'active' : ''}`}
            onClick={() => handleSelectScenario(scenario)}
          >
            <span>{scenario.icon}</span>
            <span>{scenario.name}</span>
          </button>
        ))}
      </div>

      <div className="triage-grid">
        {/* Left Column: Query & Customer Profile Inputs */}
        <div className="triage-input-card">
          <h3>
            <span>📝</span> Incoming Query &amp; Customer Profile
          </h3>

          <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Ticket Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. 4th time payment failed..."
              style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1' }}
            />
          </div>

          <div className="form-field" style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569' }}>Customer Query / Message</label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter customer message..."
              style={{ padding: '0.6rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', resize: 'vertical' }}
            />
          </div>

          {/* Customer Metadata Factors */}
          <div className="customer-factors-box">
            <div className="form-field">
              <label>Customer Name / Co.</label>
              <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
            </div>

            <div className="form-field">
              <label>Account Tier</label>
              <select value={accountTier} onChange={(e) => setAccountTier(e.target.value as AccountTier)}>
                <option value="Standard">Standard</option>
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Platinum">Platinum (Enterprise VIP)</option>
              </select>
            </div>

            <div className="form-field">
              <label>Tenure (Months)</label>
              <input type="number" min="0" value={tenureMonths} onChange={(e) => setTenureMonths(Number(e.target.value))} />
            </div>

            <div className="form-field">
              <label>Lifetime Value ($)</label>
              <input type="number" min="0" value={lifetimeValue} onChange={(e) => setLifetimeValue(Number(e.target.value))} />
            </div>

            <div className="form-field">
              <label>Account Status</label>
              <select value={accountStatus} onChange={(e) => setAccountStatus(e.target.value as AccountStatus)}>
                <option value="Active">Active</option>
                <option value="At Risk">At Risk</option>
                <option value="Paused">Paused</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div className="form-field">
              <label>Unresolved Contacts</label>
              <input type="number" min="0" value={repeatContacts} onChange={(e) => setRepeatContacts(Number(e.target.value))} />
            </div>
          </div>

          <button
            type="button"
            className="triage-btn-primary"
            onClick={executeTriage}
            disabled={isAnalyzing}
          >
            {isAnalyzing ? 'Analyzing Query...' : '⚡ Run Real-Time Predictive Triage'}
          </button>
        </div>

        {/* Right Column: Live Triage Pipeline Results */}
        <div className="triage-results-column">
          {triageResult && outcome && (
            <>
              {/* Triage Decision Banner */}
              <div
                className={`outcome-banner ${
                  outcome.isEscalatedToSenior ? 'escalated' : outcome.isKbDeflected ? 'kb-deflected' : 'standard'
                }`}
              >
                <div className="banner-header">
                  <div className="banner-title">
                    {outcome.isEscalatedToSenior && '👑 ESCALATED TO SENIOR STAFF (PRIORITY QUEUE)'}
                    {outcome.isKbDeflected && '🤖 HANDLED BY AUTOMATED KNOWLEDGE BASE'}
                    {!outcome.isEscalatedToSenior && !outcome.isKbDeflected && '✅ STANDARD TIER-1 TEAM ROUTING'}
                  </div>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, padding: '0.2rem 0.6rem', borderRadius: '12px', background: 'rgba(0,0,0,0.08)' }}>
                    Target SLA: {outcome.slaResponseTime}
                  </span>
                </div>

                <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.9rem', fontWeight: 500 }}>
                  {outcome.recommendedAction}
                </p>

                {outcome.escalationReasons.length > 0 && (
                  <ul className="reasons-list">
                    {outcome.escalationReasons.map((reason, idx) => (
                      <li key={idx}><strong>Escalation Trigger:</strong> {reason}</li>
                    ))}
                  </ul>
                )}
              </div>

              {/* 4 Multi-Factor Pipeline Cards Grid */}
              <div className="pipeline-cards-grid">
                {/* 1. Sentiment & Frustration Meter */}
                <div className="pipeline-card">
                  <div className="pipeline-card-header">
                    <span>1. Sentiment &amp; Frustration</span>
                    <strong style={{ color: triageResult.sentimentAnalysis.sentiment === 'Frustrated' ? '#dc2626' : '#2563eb' }}>
                      {triageResult.sentimentAnalysis.sentiment}
                    </strong>
                  </div>
                  <div className="score-display-large" style={{ color: triageResult.sentimentAnalysis.frustrationScore >= 70 ? '#dc2626' : '#475569' }}>
                    {triageResult.sentimentAnalysis.frustrationScore}
                    <span>/ 100 Frustration</span>
                  </div>
                  <div className="meter-track">
                    <div
                      className="meter-bar frustration"
                      style={{ width: `${triageResult.sentimentAnalysis.frustrationScore}%` }}
                    />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                    Confidence: {(triageResult.sentimentAnalysis.confidence * 100).toFixed(0)}% • {triageResult.sentimentAnalysis.explanation.slice(0, 110)}...
                  </p>
                </div>

                {/* 2. Urgency & Issue Classification */}
                <div className="pipeline-card">
                  <div className="pipeline-card-header">
                    <span>2. Urgency &amp; Classification</span>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: triageResult.urgencyPrediction.urgency === 'Critical' ? '#fee2e2' : '#e0f2fe',
                        color: triageResult.urgencyPrediction.urgency === 'Critical' ? '#dc2626' : '#0369a1',
                      }}
                    >
                      {triageResult.urgencyPrediction.urgency} Urgency
                    </span>
                  </div>
                  <div style={{ fontSize: '1.05rem', fontWeight: 700, color: '#1e293b', marginTop: '0.2rem' }}>
                    {triageResult.issueClassification.category}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                    {triageResult.urgencyPrediction.criticalFlag ? '🚨 Critical Safeguard Active' : 'Normal Operational Queue'} • Confidence: {(triageResult.urgencyPrediction.confidence * 100).toFixed(0)}%
                  </p>
                </div>

                {/* 3. Customer Value Analysis */}
                <div className="pipeline-card">
                  <div className="pipeline-card-header">
                    <span>3. Customer Value</span>
                    <strong style={{ color: '#059669' }}>{accountTier} Tier</strong>
                  </div>
                  <div className="score-display-large" style={{ color: '#059669' }}>
                    {triageResult.customerValueAnalysis.score}
                    <span>/ 100 Value Score</span>
                  </div>
                  <div className="meter-track">
                    <div
                      className="meter-bar value"
                      style={{ width: `${triageResult.customerValueAnalysis.score}%` }}
                    />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: '#64748b', margin: 0 }}>
                    Category: {triageResult.customerValueAnalysis.category} • Tenure: {tenureMonths} mos • LTV: ${lifetimeValue}
                  </p>
                </div>

                {/* 4. Priority Score Breakdown */}
                <div className="pipeline-card">
                  <div className="pipeline-card-header">
                    <span>4. Dynamic Priority Score</span>
                    <span
                      style={{
                        padding: '0.15rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        backgroundColor: triageResult.priorityCalculation.score >= 75 ? '#fef3c7' : '#f1f5f9',
                        color: triageResult.priorityCalculation.score >= 75 ? '#b45309' : '#475569',
                      }}
                    >
                      {triageResult.priorityCalculation.category}
                    </span>
                  </div>
                  <div className="score-display-large" style={{ color: triageResult.priorityCalculation.score >= 75 ? '#b45309' : '#0284c7' }}>
                    {triageResult.priorityCalculation.score}
                    <span>/ 100 Priority</span>
                  </div>
                  <div className="meter-track">
                    <div
                      className="meter-bar priority"
                      style={{ width: `${triageResult.priorityCalculation.score}%` }}
                    />
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                    Formula: (Urg×40%) + (Frust×25%) + (Val×20%) + (Hist×15%)
                  </p>
                </div>
              </div>

              {/* Automated Knowledge Base Card (if matched) */}
              {triageResult.knowledgeBaseMatch && (
                <div className="kb-solution-preview">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <h4>💡 Automated Knowledge Base Solution: {triageResult.knowledgeBaseMatch.article.title}</h4>
                    <span style={{ fontSize: '0.75rem', color: '#059669', fontWeight: 600 }}>
                      Match Confidence: {(triageResult.knowledgeBaseMatch.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                  <pre>{triageResult.knowledgeBaseMatch.article.solution}</pre>
                </div>
              )}

              {/* Routing Destination & Ticket Conversion */}
              <div className="routing-decision-box" style={{ marginTop: '1.25rem' }}>
                <div className="route-info-grid">
                  <div className="route-info-item">
                    <span>Routing Level</span>
                    <strong>{outcome.routingLevel}</strong>
                  </div>
                  <div className="route-info-item">
                    <span>Target Team</span>
                    <strong>{outcome.assignedTeam}</strong>
                  </div>
                  <div className="route-info-item">
                    <span>Target Role</span>
                    <strong>{outcome.assignedRole}</strong>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f1f5f9' }}>
                  <button
                    type="button"
                    className="triage-btn-primary"
                    style={{ background: '#0f172a' }}
                    onClick={handleCreateLiveTicket}
                  >
                    📥 Save &amp; Create Live Ticket with this Triage
                  </button>
                  {ticketCreationStatus && (
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: ticketCreationStatus.startsWith('✅') ? '#16a34a' : '#0284c7' }}>
                      {ticketCreationStatus}
                    </span>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

