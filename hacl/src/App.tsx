import { useEffect, useMemo, useState } from 'react';
import {
  addReply,
  createTicket,
  demoSwitchRole,
  getAuthSession,
  getMeta,
  getTicket,
  getTicketSummary,
  getTickets,
  submitTicketFeedback,
} from './lib/api';
import { PredictiveTriageSimulator } from './pages/PredictiveTriageSimulator';
import { KnowledgeBasePage } from './pages/KnowledgeBasePage';
import { CustomerValueAnalysisPage } from './pages/CustomerValueAnalysis';
import { PriorityScorePage } from './pages/PriorityScore';
import { IntelligentRoutingPage } from './pages/IntelligentRouting';
import { SentimentAnalysisPage } from './pages/SentimentAnalysis';
import { UrgencyPredictionPage } from './pages/UrgencyPrediction';
import { AgentAdminDashboardPage } from './pages/AgentAdminDashboard';
import { UserRoleManagement } from './pages/UserRoleManagement';
import { AnalyticsSlaPage } from './pages/AnalyticsSlaPage';
import { LandingPage } from './pages/LandingPage';
import { UserNavHeader } from './components/auth/UserNavHeader';
import { AuthModal } from './components/auth/AuthModal';
import { realtime } from './lib/realtime';
import { matchKnowledgeBase } from './services/knowledgeBase';
import { runPredictiveTriage } from './services/triagePipeline';
import type { Ticket, TicketDetail } from './types';
import type { User } from './types/auth';
import './styles.css';
import './styles/customer-value-analysis.css';
import './styles/priority-score.css';
import './styles/intelligent-routing.css';
import './styles/sentiment-analysis.css';
import './styles/urgency-prediction.css';
import './styles/predictive-triage.css';
import './styles/user-and-sla.css';
import './styles/customer-operations.css';

const defaultForm = {
  subject: '',
  category: '',
  description: '',
  referenceNumber: '',
  customerTier: 'Silver',
};

const statusOptions: string[] = ['Open', 'In Progress', 'Awaiting Customer', 'Resolved', 'Closed'];

const formatDate = (value: string) => {
  const date = new Date(value);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
};

const statusClass = (status: string) => {
  switch (status) {
    case 'Open':
      return 'status-open';
    case 'In Progress':
      return 'status-progress';
    case 'Awaiting Customer':
      return 'status-awaiting';
    case 'Resolved':
      return 'status-resolved';
    default:
      return 'status-closed';
  }
};

interface TicketManagementAppProps {
  currentUser?: User | null;
  selectedId?: string;
}

function TicketManagementApp({ currentUser, selectedId }: TicketManagementAppProps) {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [summary, setSummary] = useState({ total: 0, open: 0, inProgress: 0, resolved: 0 });
  const [selectedTicketId, setSelectedTicketId] = useState(selectedId || '');
  const [selectedTicket, setSelectedTicket] = useState<TicketDetail | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('updated');
  const [showForm, setShowForm] = useState(false);
  const [formState, setFormState] = useState(defaultForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState('');

  // CSAT Rating state
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState('');

  const loadMeta = async () => {
    const meta = await getMeta();
    setCategoryOptions(meta.categories || []);
  };

  const loadSummary = async () => {
    const nextSummary = await getTicketSummary();
    setSummary(nextSummary);
  };

  const loadTickets = async () => {
    const nextTickets = await getTickets({
      status: statusFilter || undefined,
      category: categoryFilter || undefined,
      search: searchTerm || undefined,
      sort: sortBy,
    });

    setTickets(nextTickets);

    if (!selectedTicketId && nextTickets.length > 0) {
      setSelectedTicketId(nextTickets[0].id);
    }

    if (selectedTicketId && !nextTickets.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId(nextTickets[0]?.id || '');
    }
  };

  const loadTicket = async (ticketId: string) => {
    if (!ticketId) {
      setSelectedTicket(null);
      return;
    }

    const nextTicket = await getTicket(ticketId);
    setSelectedTicket(nextTicket);
  };

  useEffect(() => {
    loadMeta().catch((error) => console.error(error));
  }, []);

  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsubscribe = realtime.subscribe((event) => {
      if (
        event.type.startsWith('ticket:') ||
        event.type.startsWith('sla:') ||
        event.type.startsWith('user:')
      ) {
        loadSummary().catch((error) => console.error(error));
        loadTickets().catch((error) => console.error(error));
        if (selectedTicketId) {
          loadTicket(selectedTicketId).catch((error) => console.error(error));
        }
      }
    });
    return unsubscribe;
  }, [selectedTicketId]);

  useEffect(() => {
    loadSummary().catch((error) => console.error(error));
    loadTickets().catch((error) => console.error(error));
  }, [statusFilter, categoryFilter, searchTerm, sortBy, currentUser]);

  useEffect(() => {
    if (selectedId) setSelectedTicketId(selectedId);
  }, [selectedId]);

  useEffect(() => {
    if (!tickets.length) {
      setSelectedTicketId('');
      setSelectedTicket(null);
      return;
    }

    if (!selectedTicketId || !tickets.some((ticket) => ticket.id === selectedTicketId)) {
      setSelectedTicketId(tickets[0].id);
    }
  }, [tickets, selectedTicketId]);

  useEffect(() => {
    if (selectedTicketId) {
      loadTicket(selectedTicketId).catch((error) => console.error(error));
    }
  }, [selectedTicketId]);

  const renderDetailCountdown = (deadlineIso?: string, completedAt?: string | null) => {
    if (completedAt) {
      return (
        <span className="countdown-timer ok" style={{ fontSize: '0.74rem', marginTop: '4px' }}>
          ✓ Logged ({formatDate(completedAt)})
        </span>
      );
    }
    if (!deadlineIso) return null;
    const targetMs = new Date(deadlineIso).getTime();
    if (isNaN(targetMs)) return null;
    const diffSec = Math.floor((targetMs - currentTime) / 1000);

    if (diffSec <= 0) {
      const overdueSec = Math.abs(diffSec);
      const overdueHours = Math.floor(overdueSec / 3600);
      const overdueMins = Math.floor((overdueSec % 3600) / 60);
      const overdueSecs = overdueSec % 60;
      return (
        <span className="countdown-timer breached" style={{ fontSize: '0.74rem', marginTop: '4px' }}>
          🚨 Overdue by {overdueHours > 0 ? `${overdueHours}h ` : ''}{overdueMins}m {overdueSecs}s
        </span>
      );
    }

    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    const isWarning = diffSec <= 1800;
    return (
      <span className={`countdown-timer ${isWarning ? 'warning' : 'ok'}`} style={{ fontSize: '0.74rem', marginTop: '4px' }}>
        ⏳ {hours > 0 ? `${hours}h ` : ''}{mins}m {secs}s left
      </span>
    );
  };

  const cards = useMemo(
    () => [
      { key: 'total', label: 'Total Tickets', value: summary.total, icon: '🎫' },
      { key: 'open', label: 'Open Tickets', value: summary.open, icon: '📬' },
      { key: 'progress', label: 'In Progress', value: summary.inProgress, icon: '⚡' },
      { key: 'resolved', label: 'Resolved Tickets', value: summary.resolved, icon: '✅' },
    ],
    [summary]
  );

  const kbSuggestion = useMemo(() => {
    if (!formState.description || formState.description.length < 10) return null;
    return matchKnowledgeBase(formState.subject, formState.description, formState.category);
  }, [formState.subject, formState.description, formState.category]);

  const handleCreateTicket = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const subject = formState.subject.trim();
    const category = formState.category.trim();
    const description = formState.description.trim();
    const referenceNumber = formState.referenceNumber.trim();

    const nextErrors: Record<string, string> = {};

    if (!subject) {
      nextErrors.subject = 'Subject is required.';
    } else if (subject.length < 3) {
      nextErrors.subject = 'Subject must be at least 3 characters.';
    }

    if (!category) {
      nextErrors.category = 'Please select an issue category.';
    }

    if (!description) {
      nextErrors.description = 'Description is required.';
    } else if (description.length < 10) {
      nextErrors.description = 'Description must be at least 10 characters.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setFormErrors(nextErrors);
      return;
    }

    try {
      setIsCreating(true);
      const triageResult = await runPredictiveTriage(
        subject,
        description,
        {
          accountTier: (formState.customerTier as any) || 'Silver',
          customerName: currentUser?.name || 'Jane Cooper',
          repeatContacts: 0,
        }
      );

      const createdTicket = await createTicket({
        subject,
        description,
        category,
        referenceNumber: referenceNumber || undefined,
        triage: {
          sentiment: triageResult.sentimentAnalysis.sentiment,
          frustrationScore: triageResult.sentimentAnalysis.frustrationScore,
          urgency: triageResult.urgencyPrediction.urgency,
          customerTier: formState.customerTier || 'Silver',
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

      setFormErrors({});
      setFormState(defaultForm);
      setShowForm(false);
      setSelectedTicketId(createdTicket.id);
      await loadSummary();
      await loadTickets();
      await loadTicket(createdTicket.id);
    } catch (error) {
      setFormErrors({
        form: error instanceof Error ? error.message : 'Ticket creation failed.',
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleReplySubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTicketId) return;

    const trimmedReply = replyText.trim();
    if (!trimmedReply) {
      setReplyError('Reply message cannot be empty.');
      return;
    }

    try {
      setIsReplying(true);
      setReplyError('');
      await addReply(selectedTicketId, trimmedReply);
      setReplyText('');
      await loadTicket(selectedTicketId);
      await loadSummary();
      await loadTickets();
    } catch (error) {
      setReplyError(error instanceof Error ? error.message : 'Failed to send reply.');
    } finally {
      setIsReplying(false);
    }
  };

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicketId) return;
    setIsSubmittingFeedback(true);
    setFeedbackSuccess('');
    try {
      await submitTicketFeedback(selectedTicketId, feedbackRating, feedbackComment);
      setFeedbackSuccess('Thank you for rating our support service!');
      await loadTicket(selectedTicketId);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to submit rating');
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const getSlaClass = (status?: string) => {
    switch (status) {
      case 'Breached': return 'breached';
      case 'At Risk': return 'at-risk';
      case 'Approaching': return 'approaching';
      case 'Met': return 'met';
      default: return 'within-sla';
    }
  };

  return (
    <div className="ticket-app">
      <header className="hero-header">
        <div className="hero-header-info">
          <span className="eyebrow" style={{ color: '#6366f1', fontWeight: 700, fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            Enterprise Ticket Management
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
            <h1 style={{ margin: 0 }}>Customer Support Operations</h1>
          </div>
          <p className="hero-copy">
            Scoped ticket queue tracking, automated AI triage, SLA response deadlines, and customer satisfaction feedback.
          </p>
        </div>

        <button className="primary-button" onClick={() => setShowForm(true)}>
          + Submit Support Ticket
        </button>
      </header>

      <section className="summary-cards">
        {cards.map((card) => (
          <div key={card.label} className={`summary-card-modern ${card.key}`}>
            <div className="summary-card-left">
              <span className="summary-card-label">{card.label}</span>
              <span className="summary-card-num">{card.value}</span>
            </div>
            <div className="summary-card-icon">{card.icon}</div>
          </div>
        ))}
      </section>

      <section className="filter-panel-modern">
        <div className="search-input-wrap">
          <span className="search-input-icon">🔍</span>
          <input
            id="search-input"
            className="search-input-field"
            type="text"
            placeholder="Search by ID, subject, customer..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="filter-selects-group">
          <select
            id="status-filter"
            className="filter-select-pill"
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value)}
          >
            <option value="">All Statuses</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>

          <select
            id="category-filter"
            className="filter-select-pill"
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
          >
            <option value="">All Categories</option>
            {categoryOptions.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            id="sort-filter"
            className="filter-select-pill"
            value={sortBy}
            onChange={(event) => setSortBy(event.target.value)}
          >
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
          </select>
        </div>
      </section>

      <main className="content-layout-modern">
        <section className="ticket-list-panel-modern">
          <div className="ticket-list-header">
            <h2 className="ticket-list-title">Active Queue</h2>
            <span className="ticket-count-badge">{tickets.length} Tickets</span>
          </div>

          {tickets.length ? (
            <ul className="ticket-cards-scroll">
              {tickets.map((ticket) => {
                const isSelected = ticket.id === selectedTicketId;
                return (
                  <li
                    key={ticket.id}
                    className={`ticket-card-modern ${isSelected ? 'selected' : ''}`}
                    onClick={() => setSelectedTicketId(ticket.id)}
                  >
                    <div className="ticket-card-top">
                      <span className="ticket-code-tag">{ticket.id}</span>
                      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {ticket.current_risk_status ? (
                          <span className={`sla-badge ${getSlaClass(ticket.current_risk_status)}`}>
                            {ticket.current_risk_status}
                          </span>
                        ) : null}
                        <span className={`status-pill ${statusClass(ticket.status)}`}>
                          {ticket.status}
                        </span>
                      </div>
                    </div>

                    <h3 className="ticket-card-subject">{ticket.subject}</h3>
                    <p className="ticket-card-category">{ticket.category}</p>

                    <div className="ticket-card-footer">
                      <span className="ticket-customer-tag">👤 {ticket.customer_name || 'Customer'}</span>
                      <span>{ticket.assigned_agent || 'Unassigned'}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                      <span>Updated {formatDate(ticket.updated_at)}</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="empty-state">
              <p>No tickets found matching the selected filter options.</p>
            </div>
          )}
        </section>

        <section className="ticket-detail-panel-modern">
          {!selectedTicket ? (
            <div className="empty-state" style={{ padding: '60px 20px' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📋</div>
              <h3 style={{ color: '#0f172a', fontWeight: 800 }}>No Ticket Selected</h3>
              <p style={{ color: '#64748b' }}>Select a ticket from the left panel to review its details, SLA deadlines, and conversation thread.</p>
            </div>
          ) : (
            <>
              <div className="ticket-detail-header-block">
                <div className="ticket-detail-badges-row">
                  <span className="ticket-code-tag" style={{ fontSize: '0.86rem', padding: '4px 10px' }}>
                    {selectedTicket.id}
                  </span>
                  <span className={`status-pill ${statusClass(selectedTicket.status)}`}>
                    {selectedTicket.status}
                  </span>
                  {selectedTicket.current_risk_status ? (
                    <span className={`sla-badge ${getSlaClass(selectedTicket.current_risk_status)}`}>
                      SLA: {selectedTicket.current_risk_status}
                    </span>
                  ) : null}
                </div>
                <h2 className="ticket-detail-subject">{selectedTicket.subject}</h2>
              </div>

              {/* SLA Target & Risk Breakdown */}
              <div className="detail-sla-card">
                <div className="detail-sla-title">⏱️ SLA Targets &amp; Timeline Status</div>
                <div className="detail-sla-grid">
                  <div className="detail-sla-col">
                    <span className="detail-sla-label">FIRST RESPONSE SLA:</span>
                    <div style={{ fontWeight: 700, marginTop: '2px' }}>
                      <span className={`sla-badge ${getSlaClass(selectedTicket.response_sla_status)}`}>
                        {selectedTicket.response_sla_status || 'Within SLA'}
                      </span>
                    </div>
                    {renderDetailCountdown(selectedTicket.response_deadline, selectedTicket.first_response_at)}
                    {selectedTicket.response_deadline ? (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                        Target: {formatDate(selectedTicket.response_deadline)}
                      </div>
                    ) : null}
                  </div>

                  <div className="detail-sla-col">
                    <span className="detail-sla-label">RESOLUTION SLA:</span>
                    <div style={{ fontWeight: 700, marginTop: '2px' }}>
                      <span className={`sla-badge ${getSlaClass(selectedTicket.resolution_sla_status)}`}>
                        {selectedTicket.resolution_sla_status || 'Within SLA'}
                      </span>
                    </div>
                    {renderDetailCountdown(selectedTicket.resolution_deadline, selectedTicket.resolved_at)}
                    {selectedTicket.resolution_deadline ? (
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
                        Target: {formatDate(selectedTicket.resolution_deadline)}
                      </div>
                    ) : null}
                  </div>

                  <div className="detail-sla-col">
                    <span className="detail-sla-label">PRIORITY &amp; URGENCY:</span>
                    <div style={{ fontWeight: 700, marginTop: '2px', color: '#0f172a' }}>
                      {selectedTicket.dashboardUrgency || 'Medium'} ({selectedTicket.dashboardPriority ?? 50}/100)
                    </div>
                    <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '3px' }}>
                      Policy: {selectedTicket.sla_policy || 'Standard'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Customer Satisfaction (CSAT) Feedback Section */}
              {selectedTicket.status === 'Resolved' || selectedTicket.status === 'Closed' ? (
                <div className="detail-card" style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '14px', marginBottom: '16px' }}>
                  <h3 style={{ color: '#92400e', margin: '0 0 8px', fontSize: '0.95rem', fontWeight: 800 }}>
                    ⭐ Customer Satisfaction Feedback (CSAT)
                  </h3>

                  {selectedTicket.feedback ? (
                    <div>
                      <div style={{ color: '#d97706', fontSize: '1.25rem', fontWeight: 800 }}>
                        {'★'.repeat(selectedTicket.feedback.rating)}{'☆'.repeat(5 - selectedTicket.feedback.rating)} ({selectedTicket.feedback.rating} / 5 stars)
                      </div>
                      {selectedTicket.feedback.comment ? (
                        <p style={{ fontStyle: 'italic', margin: '6px 0 0', color: '#78350f', fontSize: '0.88rem' }}>
                          "{selectedTicket.feedback.comment}"
                        </p>
                      ) : null}
                      <div style={{ fontSize: '0.74rem', color: '#b45309', marginTop: '4px' }}>
                        Submitted on {formatDate(selectedTicket.feedback.createdAt)}
                      </div>
                    </div>
                  ) : (
                    <form onSubmit={handleFeedbackSubmit}>
                      <p style={{ margin: '0 0 8px', fontSize: '0.84rem', color: '#92400e' }}>
                        How satisfied are you with the resolution of this issue?
                      </p>
                      <div className="star-rating-box">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            className={`star-btn ${feedbackRating >= star ? 'active' : ''}`}
                            onClick={() => setFeedbackRating(star)}
                            title={`${star} Star${star > 1 ? 's' : ''}`}
                          >
                            ★
                          </button>
                        ))}
                        <span style={{ fontSize: '0.86rem', fontWeight: 700, color: '#b45309', marginLeft: '8px' }}>
                          {feedbackRating} / 5 Stars
                        </span>
                      </div>
                      <input
                        type="text"
                        placeholder="Optional comment about your experience..."
                        className="filter-input"
                        style={{ width: '100%', marginBottom: '8px', background: '#ffffff', border: '1px solid #fcd34d', borderRadius: '8px', padding: '8px 12px' }}
                        value={feedbackComment}
                        onChange={(e) => setFeedbackComment(e.target.value)}
                      />
                      <button type="submit" className="primary-button" disabled={isSubmittingFeedback} style={{ background: '#d97706', padding: '8px 16px', fontSize: '0.86rem' }}>
                        {isSubmittingFeedback ? 'Submitting...' : 'Submit Satisfaction Rating'}
                      </button>
                      {feedbackSuccess ? (
                        <span style={{ marginLeft: '10px', color: '#15803d', fontWeight: 600, fontSize: '0.84rem' }}>
                          {feedbackSuccess}
                        </span>
                      ) : null}
                    </form>
                  )}
                </div>
              ) : null}

              {/* Meta Grid */}
              <div className="detail-meta-grid">
                <div className="detail-meta-box">
                  <div className="detail-meta-row">
                    <span>Customer</span>
                    <strong>👤 {selectedTicket.customer_name || 'Customer'}</strong>
                  </div>
                  <div className="detail-meta-row">
                    <span>Category</span>
                    <strong>{selectedTicket.category}</strong>
                  </div>
                  <div className="detail-meta-row">
                    <span>Assigned Agent</span>
                    <strong>{selectedTicket.assigned_agent || 'Unassigned'}</strong>
                  </div>
                  <div className="detail-meta-row">
                    <span>Reference No.</span>
                    <strong>{selectedTicket.reference_number || 'None'}</strong>
                  </div>
                </div>

                <div className="detail-meta-box">
                  <div className="detail-meta-row">
                    <span>Date Created</span>
                    <strong>{formatDate(selectedTicket.created_at)}</strong>
                  </div>
                  <div className="detail-meta-row">
                    <span>Last Updated</span>
                    <strong>{formatDate(selectedTicket.updated_at)}</strong>
                  </div>
                  <div className="detail-meta-row">
                    <span>Routing Level</span>
                    <strong>{selectedTicket.routing_level || 'Tier 1'}</strong>
                  </div>
                  <div className="detail-meta-row">
                    <span>Customer Tier</span>
                    <strong>{selectedTicket.customer_tier || 'Silver'}</strong>
                  </div>
                </div>
              </div>

              {/* Description Box */}
              <div className="detail-desc-box">
                <h4>Issue Description</h4>
                <p>{selectedTicket.description}</p>
              </div>

              {/* Conversation Section */}
              <div className="conversation-card">
                <div className="conversation-card-header">
                  💬 Conversation History ({selectedTicket.messages.length})
                </div>
                <div className="conversation-messages-list">
                  {selectedTicket.messages.length ? (
                    selectedTicket.messages.map((message) => {
                      const isStaff = message.sender_role === 'agent' || message.sender_role === 'senior' || message.sender_role === 'admin';
                      return (
                        <div key={message.id} className={`chat-bubble ${isStaff ? 'agent' : 'customer'}`}>
                          <div className="chat-bubble-header">
                            <span>
                              {isStaff ? '🛡️ Support Specialist' : '👤 Customer'} ({message.sender_name || (isStaff ? 'Agent' : 'Customer')})
                            </span>
                            <span>{formatDate(message.created_at)}</span>
                          </div>
                          <p>{message.message}</p>
                        </div>
                      );
                    })
                  ) : (
                    <p style={{ color: '#94a3b8', fontSize: '0.88rem', fontStyle: 'italic', margin: 0 }}>
                      No messages posted in this thread yet.
                    </p>
                  )}
                </div>

                <form className="reply-input-box" onSubmit={handleReplySubmit}>
                  <label htmlFor="reply-message" style={{ fontSize: '0.84rem', fontWeight: 700, color: '#334155' }}>
                    Post a Response
                  </label>
                  <textarea
                    id="reply-message"
                    className="reply-textarea"
                    value={replyText}
                    onChange={(event) => setReplyText(event.target.value)}
                    rows={3}
                    placeholder="Type an official reply or status update..."
                  />
                  {replyError ? <p className="form-error" style={{ margin: 0 }}>{replyError}</p> : null}
                  <div className="reply-actions-row">
                    <span style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      Responses update the ticket conversation and audit history immediately.
                    </span>
                    <button type="submit" className="primary-button" disabled={isReplying}>
                      {isReplying ? 'Sending...' : 'Send Reply ✈️'}
                    </button>
                  </div>
                </form>
              </div>

              {/* Activity Timeline */}
              <div className="timeline-section" style={{ borderTop: '1px solid #f1f5f9', paddingTop: '20px' }}>
                <h3 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: '14px' }}>
                  🕒 Audit &amp; Event Activity
                </h3>
                <ul className="timeline">
                  {selectedTicket.history.map((event) => (
                    <li key={event.id}>
                      <div className="timeline-dot" />
                      <div>
                        <strong>{event.event_type}</strong>
                        <p>{event.note}</p>
                        <small>{formatDate(event.created_at)}</small>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </section>
      </main>

      {showForm ? (
        <div className="modal-backdrop" onClick={() => setShowForm(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>Create New Ticket</h3>
              <button className="close-button" onClick={() => setShowForm(false)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTicket} className="ticket-form">
              <div className="field-group">
                <label htmlFor="subject">Ticket Subject</label>
                <input
                  id="subject"
                  value={formState.subject}
                  maxLength={120}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      subject: event.target.value,
                    }))
                  }
                />
                {formErrors.subject ? <p className="form-error">{formErrors.subject}</p> : null}
              </div>

              <div className="field-group">
                <label htmlFor="category">Issue Category</label>
                <select
                  id="category"
                  value={formState.category}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      category: event.target.value,
                    }))
                  }
                >
                  <option value="">Select a category</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
                {formErrors.category ? <p className="form-error">{formErrors.category}</p> : null}
              </div>

              <div className="field-group">
                <label htmlFor="referenceNumber">Order or reference number (optional)</label>
                <input
                  id="referenceNumber"
                  value={formState.referenceNumber}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      referenceNumber: event.target.value,
                    }))
                  }
                  placeholder="e.g. ORD-10234"
                />
              </div>

              <div className="field-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  value={formState.description}
                  rows={5}
                  maxLength={2000}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                />
                {formErrors.description ? <p className="form-error">{formErrors.description}</p> : null}
              </div>

              <div className="field-group">
                <label htmlFor="customerTier">Customer Account Tier (for automated triage &amp; escalation)</label>
                <select
                  id="customerTier"
                  value={formState.customerTier}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      customerTier: event.target.value,
                    }))
                  }
                >
                  <option value="Standard">Standard Tier</option>
                  <option value="Silver">Silver Tier</option>
                  <option value="Gold">Gold Tier</option>
                  <option value="Platinum">Platinum (Enterprise VIP - Auto Fast-Track)</option>
                </select>
              </div>

              {kbSuggestion ? (
                <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '0.85rem', marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <strong style={{ color: '#166534', fontSize: '0.85rem' }}>💡 Instant Knowledge Base Match Found!</strong>
                    <span style={{ fontSize: '0.72rem', background: '#dcfce7', color: '#15803d', padding: '0.15rem 0.4rem', borderRadius: '4px', fontWeight: 600 }}>Zero queue wait</span>
                  </div>
                  <p style={{ margin: '0.25rem 0 0.4rem 0', fontSize: '0.82rem', color: '#374151' }}>
                    <strong>{kbSuggestion.article.title}</strong>: {kbSuggestion.article.summary}
                  </p>
                  <details style={{ fontSize: '0.8rem', color: '#0284c7' }}>
                    <summary style={{ cursor: 'pointer', fontWeight: 600 }}>View instant solution now</summary>
                    <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', background: '#ffffff', padding: '0.6rem', borderRadius: '4px', marginTop: '0.35rem', border: '1px solid #e5e7eb', color: '#1f2937' }}>
                      {kbSuggestion.article.solution}
                    </pre>
                  </details>
                </div>
              ) : null}

              {formErrors.form ? <p className="form-error">{formErrors.form}</p> : null}

              <div className="modal-actions">
                <button type="button" className="secondary-button" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-button" disabled={isCreating}>
                  {isCreating ? 'Evaluating Triage...' : 'Submit Support Ticket'}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

type ViewMode =
  | 'landing'
  | 'analyticsSla'
  | 'userManagement'
  | 'tickets'
  | 'triageRouter'
  | 'knowledgeBase'
  | 'agentAdmin'
  | 'sentiment'
  | 'urgency'
  | 'customerValue'
  | 'priority'
  | 'routing';

function App() {
  const [currentView, setCurrentView] = useState<ViewMode>('landing');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [selectedTicketIdForDetails, setSelectedTicketIdForDetails] = useState('');

  useEffect(() => {
    getAuthSession()
      .then((res) => {
        if (res?.user) {
          setCurrentUser(res.user);
        } else {
          setCurrentUser(null);
          setCurrentView('landing');
        }
      })
      .catch(() => {
        setCurrentUser(null);
        setCurrentView('landing');
      });
  }, []);

  const handleOpenTicketFromAnalytics = (ticketId: string) => {
    setSelectedTicketIdForDetails(ticketId);
    setCurrentView('tickets');
  };

  if (!currentUser || currentView === 'landing') {
    return (
      <LandingPage
        currentUser={currentUser}
        onEnterWorkspace={(targetModule) => {
          if (!currentUser) return;
          const defaultModule = currentUser.role === 'Customer' ? 'tickets' : currentUser.role === 'Admin' ? 'analyticsSla' : 'agentAdmin';
          setCurrentView((targetModule as ViewMode) || defaultModule);
        }}
        onUserChange={(newUser) => {
          setCurrentUser(newUser);
          if (newUser) {
            const defaultModule = newUser.role === 'Customer' ? 'tickets' : newUser.role === 'Admin' ? 'analyticsSla' : 'agentAdmin';
            setCurrentView(defaultModule);
          } else {
            setCurrentView('landing');
          }
        }}
      />
    );
  }

  const isAdmin = currentUser.role === 'Admin';
  const isSenior = currentUser.role === 'Senior Support Staff';
  const isAgent = currentUser.role === 'Support Agent';
  const isStaff = isAdmin || isSenior || isAgent;

  return (
    <div className="app-shell">
      {/* Top Session & Multi-Role Navigation Bar */}
      <UserNavHeader
        user={currentUser}
        onUserChange={(newUser) => {
          setCurrentUser(newUser);
          if (!newUser) {
            setCurrentView('landing');
          }
        }}
        onOpenAuthModal={() => setIsAuthModalOpen(true)}
      />

      {/* Module Switcher Tabs (Role-Gated & Scoped) */}
      <div className="module-switcher">
        {isAdmin && (
          <button
            type="button"
            className={`secondary-button ${currentView === 'analyticsSla' ? 'active' : ''}`}
            onClick={() => setCurrentView('analyticsSla')}
            style={{ fontWeight: currentView === 'analyticsSla' ? 700 : 500, borderColor: currentView === 'analyticsSla' ? '#2563eb' : undefined }}
          >
            📊 Support Analytics &amp; SLA Command Center
          </button>
        )}

        {isAdmin && (
          <button
            type="button"
            className={`secondary-button ${currentView === 'userManagement' ? 'active' : ''}`}
            onClick={() => setCurrentView('userManagement')}
            style={{ fontWeight: currentView === 'userManagement' ? 700 : 500, borderColor: currentView === 'userManagement' ? '#4f46e5' : undefined }}
          >
            👥 User &amp; Role Management
          </button>
        )}

        {isSenior && !isAdmin && (
          <button
            type="button"
            className={`secondary-button ${currentView === 'analyticsSla' ? 'active' : ''}`}
            onClick={() => setCurrentView('analyticsSla')}
            style={{ fontWeight: currentView === 'analyticsSla' ? 700 : 500, borderColor: currentView === 'analyticsSla' ? '#2563eb' : undefined }}
          >
            📊 Team SLA &amp; Performance Analytics
          </button>
        )}

        {isStaff && (
          <button
            type="button"
            className={`secondary-button ${currentView === 'agentAdmin' ? 'active' : ''}`}
            onClick={() => setCurrentView('agentAdmin')}
            style={{ fontWeight: currentView === 'agentAdmin' ? 700 : 500 }}
          >
            🖥️ Agent &amp; Admin Dashboard
          </button>
        )}

        <button
          type="button"
          className={`secondary-button ${currentView === 'tickets' ? 'active' : ''}`}
          onClick={() => setCurrentView('tickets')}
          style={{ fontWeight: currentView === 'tickets' ? 700 : 500 }}
        >
          🎫 {isStaff ? 'Ticket Queue Operations' : 'My Support Tickets'}
        </button>

        <button
          type="button"
          className={`secondary-button ${currentView === 'knowledgeBase' ? 'active' : ''}`}
          onClick={() => setCurrentView('knowledgeBase')}
          style={{ fontWeight: currentView === 'knowledgeBase' ? 700 : 500 }}
        >
          🤖 Automated Knowledge Base
        </button>

        <button
          type="button"
          className={`secondary-button ${currentView === 'triageRouter' ? 'active' : ''}`}
          onClick={() => setCurrentView('triageRouter')}
          style={{ fontWeight: currentView === 'triageRouter' ? 700 : 500 }}
        >
          🎯 Predictive Triage Simulator
        </button>

        <button
          type="button"
          className={`secondary-button ${currentView === 'sentiment' ? 'active' : ''}`}
          onClick={() => setCurrentView('sentiment')}
          style={{ fontWeight: currentView === 'sentiment' ? 700 : 500 }}
        >
          💬 AI Sentiment Analysis
        </button>

        {isStaff && (
          <>
            <button
              type="button"
              className={`secondary-button ${currentView === 'urgency' ? 'active' : ''}`}
              onClick={() => setCurrentView('urgency')}
              style={{ fontWeight: currentView === 'urgency' ? 700 : 500 }}
            >
              ⚡ Urgency &amp; Classification
            </button>

            <button
              type="button"
              className={`secondary-button ${currentView === 'customerValue' ? 'active' : ''}`}
              onClick={() => setCurrentView('customerValue')}
              style={{ fontWeight: currentView === 'customerValue' ? 700 : 500 }}
            >
              💎 Customer Value Analysis
            </button>

            <button
              type="button"
              className={`secondary-button ${currentView === 'priority' ? 'active' : ''}`}
              onClick={() => setCurrentView('priority')}
              style={{ fontWeight: currentView === 'priority' ? 700 : 500 }}
            >
              📈 Priority Score Calculation
            </button>

            <button
              type="button"
              className={`secondary-button ${currentView === 'routing' ? 'active' : ''}`}
              onClick={() => setCurrentView('routing')}
              style={{ fontWeight: currentView === 'routing' ? 700 : 500 }}
            >
              🔀 Intelligent Ticket Routing
            </button>
          </>
        )}
      </div>

      {/* Render Active View */}
      {currentView === 'analyticsSla' ? (
        <AnalyticsSlaPage
          currentUser={currentUser}
          onOpenTicketDetails={handleOpenTicketFromAnalytics}
        />
      ) : currentView === 'userManagement' ? (
        <UserRoleManagement
          currentUser={currentUser}
          onSwitchToAdmin={() => demoSwitchRole('admin').then((r) => setCurrentUser(r.user))}
        />
      ) : currentView === 'triageRouter' ? (
        <PredictiveTriageSimulator />
      ) : currentView === 'knowledgeBase' ? (
        <KnowledgeBasePage />
      ) : currentView === 'sentiment' ? (
        <SentimentAnalysisPage />
      ) : currentView === 'urgency' ? (
        <UrgencyPredictionPage />
      ) : currentView === 'customerValue' ? (
        <CustomerValueAnalysisPage />
      ) : currentView === 'priority' ? (
        <PriorityScorePage />
      ) : currentView === 'routing' ? (
        <IntelligentRoutingPage />
      ) : currentView === 'agentAdmin' ? (
        <AgentAdminDashboardPage currentUser={currentUser} />
      ) : (
        <TicketManagementApp
          currentUser={currentUser}
          selectedId={selectedTicketIdForDetails}
        />
      )}

      {/* Auth & Registration Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(user) => setCurrentUser(user)}
      />
    </div>
  );
}

export default App;
