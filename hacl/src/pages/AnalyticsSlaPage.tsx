import { useEffect, useState } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  getAgentPerformance,
  getAnalyticsOverview,
  getCategoryBreakdown,
  getCustomerSatisfaction,
  getExportAnalyticsCsvUrl,
  getResponseTimeAnalytics,
  getSentimentPerformance,
  getSlaCommandCenter,
  getSlaComplianceAnalytics,
  getSlaPolicies,
  getTicketCategories,
  getTicketTrends,
  overrideTicketPriority,
  updateSlaPolicies,
} from '../lib/api';
import { realtime, useRealtimeStatus } from '../lib/realtime';

import type {
  AgentPerformanceMetric,
  AnalyticsFilterState,
  AnalyticsKpis,
  CategoryBreakdownItem,
  CsatAnalyticsResponse,
  PriorityResponseTime,
  SentimentPerformanceItem,
  SlaCommandCenterTicket,
  SlaPolicyConfig,
  SlaPriorityCompliance,
  TicketTrendItem,
} from '../types/analytics';
import type { User } from '../types/auth';

const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

interface AnalyticsSlaPageProps {
  currentUser?: User | null;
  onOpenTicketDetails?: (ticketId: string) => void;
}

export function AnalyticsSlaPage({ currentUser, onOpenTicketDetails }: AnalyticsSlaPageProps) {
  const [filters, setFilters] = useState<AnalyticsFilterState>({
    timeRange: '30days',
    priority: '',
    status: '',
    category: '',
    agentId: '',
  });

  const [categories, setCategories] = useState<string[]>([]);
  const [kpis, setKpis] = useState<AnalyticsKpis | null>(null);
  const [trendComparisons, setTrendComparisons] = useState<any>(null);
  const [trends, setTrends] = useState<TicketTrendItem[]>([]);
  const [responseTimes, setResponseTimes] = useState<{
    firstResponse: { average: number; median: number; p90: number; count: number };
    resolution: { average: number; median: number; count: number };
    byPriority: PriorityResponseTime[];
  } | null>(null);
  const [complianceData, setComplianceData] = useState<SlaPriorityCompliance[]>([]);
  const [commandCenterTickets, setCommandCenterTickets] = useState<SlaCommandCenterTicket[]>([]);
  const [slaViewMode, setSlaViewMode] = useState<'all' | 'risk'>('all');
  const [agentMetrics, setAgentMetrics] = useState<AgentPerformanceMetric[]>([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState<CategoryBreakdownItem[]>([]);
  const [sentimentPerformance, setSentimentPerformance] = useState<SentimentPerformanceItem[]>([]);
  const [csatData, setCsatData] = useState<CsatAnalyticsResponse | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Policy Modal
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [slaPolicies, setSlaPolicies] = useState<SlaPolicyConfig | null>(null);
  const [policyForm, setPolicyForm] = useState<SlaPolicyConfig | null>(null);
  const [policySaveSuccess, setPolicySaveSuccess] = useState(false);

  // Priority Override Modal
  const [overrideTicket, setOverrideTicket] = useState<SlaCommandCenterTicket | null>(null);
  const [overridePriorityScore, setOverridePriorityScore] = useState(85);
  const [overrideUrgency, setOverrideUrgency] = useState('Critical');
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideSuccess, setOverrideSuccess] = useState('');

  const isPrivileged = currentUser?.role === 'Admin' || currentUser?.role === 'Senior Support Staff';
  const isAdmin = currentUser?.role === 'Admin';

  const loadAllAnalytics = async () => {
    setIsRefreshing(true);
    try {
      const [
        metaRes,
        overviewRes,
        trendsRes,
        respTimesRes,
        complianceRes,
        cmdCenterRes,
        agentPerfRes,
        catBreakdownRes,
        sentimentRes,
        csatRes,
        policiesRes,
      ] = await Promise.all([
        getTicketCategories().catch(() => []),
        getAnalyticsOverview(filters),
        getTicketTrends(filters),
        getResponseTimeAnalytics(filters),
        getSlaComplianceAnalytics(filters),
        getSlaCommandCenter(filters),
        getAgentPerformance(filters),
        getCategoryBreakdown(filters),
        getSentimentPerformance(filters),
        getCustomerSatisfaction(),
        getSlaPolicies().catch(() => null),
      ]);

      setCategories(metaRes);
      setKpis(overviewRes.kpis);
      setTrendComparisons(overviewRes.trendComparisons);
      setTrends(trendsRes);
      setResponseTimes(respTimesRes);
      setComplianceData(complianceRes.byPriority);
      setCommandCenterTickets(cmdCenterRes);
      setAgentMetrics(agentPerfRes);
      setCategoryBreakdown(catBreakdownRes);
      setSentimentPerformance(sentimentRes);
      setCsatData(csatRes);
      if (policiesRes) {
        setSlaPolicies(policiesRes);
        setPolicyForm(policiesRes);
      }
    } catch (err) {
      console.error('Analytics load error:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const isRealtimeConnected = useRealtimeStatus();
  const [currentTime, setCurrentTime] = useState(Date.now());

  // Second-by-second dynamic tick for active SLA countdowns
  useEffect(() => {
    const timerId = setInterval(() => {
      setCurrentTime(Date.now());
    }, 1000);
    return () => clearInterval(timerId);
  }, []);

  // Initial load and filter-change load
  useEffect(() => {
    loadAllAnalytics();
  }, [filters]);

  // Real-time automatic updates on live database events
  useEffect(() => {
    const unsubscribe = realtime.subscribe((event) => {
      if (
        event.type.startsWith('ticket:') ||
        event.type.startsWith('sla:') ||
        event.type.startsWith('user:') ||
        event.type.startsWith('routing:')
      ) {
        loadAllAnalytics();
      }
    });
    return unsubscribe;
  }, [filters]);

  const renderLiveCountdown = (ticket: SlaCommandCenterTicket) => {
    const targetIso = ticket.resolutionDeadline || ticket.responseDeadline;
    if (!targetIso) return <span>N/A</span>;
    const targetMs = new Date(targetIso).getTime();
    if (isNaN(targetMs)) return <span>N/A</span>;
    const diffSec = Math.floor((targetMs - currentTime) / 1000);

    if (diffSec <= 0) {
      const overdueSec = Math.abs(diffSec);
      const overdueHours = Math.floor(overdueSec / 3600);
      const overdueMins = Math.floor((overdueSec % 3600) / 60);
      const overdueSecs = overdueSec % 60;
      return (
        <span className="countdown-timer breached">
          🚨 Overdue by {overdueHours > 0 ? `${overdueHours}h ` : ''}{overdueMins}m {overdueSecs}s
        </span>
      );
    }

    const hours = Math.floor(diffSec / 3600);
    const mins = Math.floor((diffSec % 3600) / 60);
    const secs = diffSec % 60;
    const isWarning = diffSec <= 1800;
    return (
      <span className={`countdown-timer ${isWarning ? 'warning' : 'ok'}`}>
        ⏳ {hours > 0 ? `${hours}h ` : ''}{mins}m {secs}s left
      </span>
    );
  };

  const handleFilterChange = (key: keyof AnalyticsFilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSavePolicies = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyForm) return;
    try {
      const updated = await updateSlaPolicies(policyForm);
      setSlaPolicies(updated);
      setPolicySaveSuccess(true);
      setTimeout(() => {
        setPolicySaveSuccess(false);
        setIsPolicyModalOpen(false);
      }, 1200);
      loadAllAnalytics();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update SLA policies');
    }
  };

  const handleConfirmOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideTicket) return;
    try {
      await overrideTicketPriority(overrideTicket.id, overridePriorityScore, overrideUrgency, overrideReason);
      setOverrideSuccess(`Priority updated for ${overrideTicket.id}`);
      setTimeout(() => {
        setOverrideSuccess('');
        setOverrideTicket(null);
      }, 1200);
      loadAllAnalytics();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Priority override failed');
    }
  };

  const getRiskBadge = (status: string) => {
    switch (status) {
      case 'Breached':
        return <span className="sla-badge breached">🚨 Breached</span>;
      case 'At Risk':
        return <span className="sla-badge at-risk">⚠️ At Risk</span>;
      case 'Approaching':
        return <span className="sla-badge approaching">⏳ Approaching</span>;
      case 'Met':
        return <span className="sla-badge met">✓ SLA Met</span>;
      default:
        return <span className="sla-badge within-sla">● Within SLA</span>;
    }
  };

  const csatChartData = csatData
    ? [
        { rating: '5 Stars', count: csatData.distribution[5] || 0, fill: '#10b981' },
        { rating: '4 Stars', count: csatData.distribution[4] || 0, fill: '#3b82f6' },
        { rating: '3 Stars', count: csatData.distribution[3] || 0, fill: '#f59e0b' },
        { rating: '2 Stars', count: csatData.distribution[2] || 0, fill: '#f97316' },
        { rating: '1 Star', count: csatData.distribution[1] || 0, fill: '#ef4444' },
      ]
    : [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Hero Header */}
      <div className="analytics-hero">
        <div className="analytics-hero-title">
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
            <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
            <h1 style={{ margin: 0 }}>Support Analytics &amp; SLA Command Center</h1>
            <div className={`realtime-live-badge ${isRealtimeConnected ? '' : 'disconnected'}`}>
              <span className={`realtime-pulse-dot ${isRealtimeConnected ? '' : 'disconnected'}`} />
              <span>{isRealtimeConnected ? 'Live Real-Time Stream Active' : 'Connecting to Stream...'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <a
              href={getExportAnalyticsCsvUrl(filters)}
              className="btn-primary"
              style={{ background: '#059669', textDecoration: 'none' }}
              download
            >
              📥 Export CSV Report
            </a>
            {isPrivileged ? (
              <button
                type="button"
                className="btn-secondary"
                style={{ background: '#334155', color: '#ffffff', borderColor: '#475569' }}
                onClick={() => setIsPolicyModalOpen(true)}
              >
                ⚙️ SLA Targets Policy
              </button>
            ) : null}
          </div>
        </div>
        <p className="analytics-hero-desc">
          Real-time operations intelligence driven by live database records. Monitor ticket velocity, response SLA adherence, team resolution times, at-risk queues, and customer satisfaction ratings.
        </p>
      </div>

      {/* Global Filter Bar */}
      <div className="analytics-filters-bar">
        <div className="filter-group">
          <label>Timeframe</label>
          <select
            className="filter-select"
            value={filters.timeRange}
            onChange={(e) => handleFilterChange('timeRange', e.target.value)}
          >
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="all">All Time</option>
            <option value="custom">Custom Date Range</option>
          </select>
        </div>

        {filters.timeRange === 'custom' ? (
          <>
            <div className="filter-group">
              <label>From Date</label>
              <input
                type="date"
                className="filter-input"
                value={filters.from || ''}
                onChange={(e) => handleFilterChange('from', e.target.value)}
              />
            </div>
            <div className="filter-group">
              <label>To Date</label>
              <input
                type="date"
                className="filter-input"
                value={filters.to || ''}
                onChange={(e) => handleFilterChange('to', e.target.value)}
              />
            </div>
          </>
        ) : null}

        <div className="filter-group">
          <label>Priority</label>
          <select
            className="filter-select"
            value={filters.priority || ''}
            onChange={(e) => handleFilterChange('priority', e.target.value)}
          >
            <option value="">All Priorities</option>
            <option value="Critical">Critical</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Status</label>
          <select
            className="filter-select"
            value={filters.status || ''}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Awaiting Customer">Awaiting Customer</option>
            <option value="Resolved">Resolved</option>
            <option value="Closed">Closed</option>
          </select>
        </div>

        <div className="filter-group">
          <label>Category</label>
          <select
            className="filter-select"
            value={filters.category || ''}
            onChange={(e) => handleFilterChange('category', e.target.value)}
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Assigned Staff</label>
          <select
            className="filter-select"
            value={filters.agentId || ''}
            onChange={(e) => handleFilterChange('agentId', e.target.value)}
          >
            <option value="">All Agents</option>
            {agentMetrics.map((a) => (
              <option key={a.agentId} value={a.agentId}>{a.agentName}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          className="btn-secondary"
          onClick={loadAllAnalytics}
          disabled={isRefreshing}
          style={{ alignSelf: 'flex-end', marginLeft: 'auto' }}
        >
          {isRefreshing ? '🔄 Refreshing...' : '🔄 Refresh Data'}
        </button>
      </div>

      {/* KPI Cards Grid */}
      {kpis ? (
        <div className="kpi-cards-grid">
          <div className="kpi-card info-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">TOTAL TICKETS</span>
              <span className="kpi-card-icon">🎫</span>
            </div>
            <div className="kpi-card-value">{kpis.totalTickets}</div>
            <div className="kpi-card-trend positive">
              <span>{trendComparisons?.totalTickets || '+0%'}</span> vs prev period
            </div>
          </div>

          <div className="kpi-card warning-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">OPEN QUEUE</span>
              <span className="kpi-card-icon">📂</span>
            </div>
            <div className="kpi-card-value">{kpis.openTickets + kpis.inProgressTickets}</div>
            <div style={{ fontSize: '0.76rem', color: '#7c6858' }}>
              {kpis.openTickets} open, {kpis.inProgressTickets} in progress
            </div>
          </div>

          <div className="kpi-card warning-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">UNASSIGNED</span>
              <span className="kpi-card-icon">👤❓</span>
            </div>
            <div className="kpi-card-value" style={{ color: kpis.unassignedTickets > 0 ? '#b45309' : '#1e130c' }}>
              {kpis.unassignedTickets}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#7c6858' }}>
              Requires routing assignment
            </div>
          </div>

          <div className="kpi-card warning-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">AWAITING 1ST REPLY</span>
              <span className="kpi-card-icon">⏱️</span>
            </div>
            <div className="kpi-card-value">{kpis.awaitingFirstResponse}</div>
            <div style={{ fontSize: '0.76rem', color: '#7c6858' }}>
              No human response logged yet
            </div>
          </div>

          <div className="kpi-card success-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">RESOLVED TICKETS</span>
              <span className="kpi-card-icon">✅</span>
            </div>
            <div className="kpi-card-value" style={{ color: '#15803d' }}>{kpis.resolvedTickets}</div>
            <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 600 }}>
              Completed cases
            </div>
          </div>

          <div className="kpi-card alert-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">OVERDUE / BREACHED</span>
              <span className="kpi-card-icon">🚨</span>
            </div>
            <div className="kpi-card-value" style={{ color: kpis.overdueTickets > 0 ? '#dc2626' : '#16a34a' }}>
              {kpis.overdueTickets}
            </div>
            <div style={{ fontSize: '0.76rem', color: kpis.overdueTickets > 0 ? '#b91c1c' : '#16a34a', fontWeight: 600 }}>
              {kpis.overdueTickets > 0 ? 'Urgent escalation needed' : 'Zero SLA breaches'}
            </div>
          </div>

          <div className="kpi-card warning-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">AT-RISK / APPROACHING</span>
              <span className="kpi-card-icon">⚠️</span>
            </div>
            <div className="kpi-card-value" style={{ color: '#c2410c' }}>{kpis.atRiskTickets}</div>
            <div style={{ fontSize: '0.76rem', color: '#c2410c', fontWeight: 600 }}>
              &gt; 60% of SLA elapsed
            </div>
          </div>

          <div className="kpi-card success-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">SLA COMPLIANCE</span>
              <span className="kpi-card-icon">🎯</span>
            </div>
            <div className="kpi-card-value" style={{ color: kpis.slaComplianceRate >= 85 ? '#15803d' : '#b45309' }}>
              {kpis.slaComplianceRate}%
            </div>
            <div className="kpi-card-trend positive">
              <span>{trendComparisons?.slaComplianceRate || '+0%'}</span> adherence target &ge; 90%
            </div>
          </div>

          <div className="kpi-card info-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">AVG 1ST RESPONSE</span>
              <span className="kpi-card-icon">⚡</span>
            </div>
            <div className="kpi-card-value">
              {kpis.avgFirstResponseMinutes}
              <span style={{ fontSize: '1rem', fontWeight: 500, color: '#7c6858' }}> min</span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 600 }}>
              {trendComparisons?.avgFirstResponseMinutes || '-18%'} speed improvement
            </div>
          </div>

          <div className="kpi-card info-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">AVG RESOLUTION</span>
              <span className="kpi-card-icon">🏁</span>
            </div>
            <div className="kpi-card-value">
              {kpis.avgResolutionHours}
              <span style={{ fontSize: '1rem', fontWeight: 500, color: '#7c6858' }}> hrs</span>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#16a34a', fontWeight: 600 }}>
              {trendComparisons?.avgResolutionHours || '-14%'} faster resolution
            </div>
          </div>

          <div className="kpi-card success-card">
            <div className="kpi-card-header">
              <span className="kpi-card-label">CSAT SCORE</span>
              <span className="kpi-card-icon">⭐</span>
            </div>
            <div className="kpi-card-value" style={{ color: '#d97706' }}>
              {kpis.csatAverage ? `${kpis.csatAverage} / 5` : 'No data'}
            </div>
            <div style={{ fontSize: '0.76rem', color: '#7c6858' }}>
              {kpis.csatTotalRatings} customer ratings ({kpis.csatPositiveRate || 0}% positive)
            </div>
          </div>
        </div>
      ) : null}

      {/* SLA COMMAND CENTER LIVE QUEUE */}
      {(() => {
        const atRiskTicketsCount = commandCenterTickets.filter(
          (t) => t.currentRiskStatus === 'Breached' || t.currentRiskStatus === 'At Risk' || t.currentRiskStatus === 'Approaching'
        ).length;
        const allActiveTicketsCount = commandCenterTickets.length;
        const displayedCommandCenterTickets = slaViewMode === 'risk'
          ? commandCenterTickets.filter(
              (t) => t.currentRiskStatus === 'Breached' || t.currentRiskStatus === 'At Risk' || t.currentRiskStatus === 'Approaching'
            )
          : commandCenterTickets;

        return (
          <div className="sla-command-center">
            <div className="sla-command-center-header">
              <div className="sla-command-center-title">
                <span style={{ fontSize: '1.6rem' }}>🚨</span>
                <div>
                  <h2>SLA Command Center: Active Real-Time Incidents</h2>
                  <div style={{ fontSize: '0.84rem', color: '#786253' }}>
                    Live operational queue sorted by SLA deadline and urgency. Updated in real-time as tickets are created.
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  className={`btn-sm ${slaViewMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSlaViewMode('all')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: slaViewMode === 'all' ? '#1e130c' : '#fff',
                    color: slaViewMode === 'all' ? '#fff' : '#4a3b32',
                    border: '1px solid #d4c5b9',
                  }}
                >
                  🎫 All Active Tickets ({allActiveTicketsCount})
                </button>
                <button
                  type="button"
                  className={`btn-sm ${slaViewMode === 'risk' ? 'btn-primary' : 'btn-secondary'}`}
                  onClick={() => setSlaViewMode('risk')}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontWeight: 700,
                    padding: '6px 12px',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    background: slaViewMode === 'risk' ? '#dc2626' : '#fff',
                    color: slaViewMode === 'risk' ? '#fff' : '#b91c1c',
                    border: '1px solid #fca5a5',
                  }}
                >
                  ⚠️ At-Risk &amp; Breached ({atRiskTicketsCount})
                </button>
              </div>
            </div>

            <div className="custom-table-wrapper">
              <table className="custom-table">
                <thead>
                  <tr>
                    <th>Ticket ID</th>
                    <th>Priority</th>
                    <th>Subject</th>
                    <th>Customer</th>
                    <th>Assigned Agent</th>
                    <th>Status</th>
                    <th>Response SLA</th>
                    <th>Resolution SLA</th>
                    <th>Overall SLA Risk</th>
                    <th>Deadline Time</th>
                    {isPrivileged ? <th style={{ textAlign: 'right' }}>Actions</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {displayedCommandCenterTickets.length === 0 ? (
                    <tr>
                      <td colSpan={11} style={{ textAlign: 'center', padding: '36px', color: '#16a34a', fontWeight: 600 }}>
                        {slaViewMode === 'risk'
                          ? '🎉 Outstanding! No tickets are currently breached or at risk of breaching SLA targets.'
                          : 'No active tickets found matching current filters.'}
                      </td>
                    </tr>
                  ) : (
                    displayedCommandCenterTickets.map((ticket) => {
                      const isNew = Date.now() - new Date(ticket.createdAt).getTime() < 30 * 60 * 1000;
                      return (
                        <tr key={ticket.id} className={ticket.currentRiskStatus === 'Breached' ? 'breach-row' : ''}>
                          <td style={{ fontWeight: 700, fontFamily: 'monospace' }}>
                            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                              <button
                                type="button"
                                style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 700, padding: 0 }}
                                onClick={() => onOpenTicketDetails?.(ticket.id)}
                              >
                                {ticket.id}
                              </button>
                              {isNew ? (
                                <span style={{ padding: '2px 5px', background: '#dbeafe', color: '#1d4ed8', borderRadius: '4px', fontSize: '0.68rem', fontWeight: 700 }}>
                                  🆕 NEW
                                </span>
                              ) : null}
                            </div>
                          </td>
                    <td>
                      <span className={`role-badge ${ticket.priority === 'Critical' ? 'admin' : ticket.priority === 'High' ? 'senior' : 'agent'}`}>
                        {ticket.priority} ({ticket.priorityScore}/100)
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {ticket.subject}
                    </td>
                    <td>{ticket.customerName}</td>
                    <td>{ticket.assignedAgent}</td>
                    <td>
                      <span className={`status-badge-active`}>{ticket.status}</span>
                    </td>
                    <td>{getRiskBadge(ticket.responseSlaStatus)}</td>
                    <td>{getRiskBadge(ticket.resolutionSlaStatus)}</td>
                    <td>{getRiskBadge(ticket.currentRiskStatus)}</td>
                    <td style={{ fontSize: '0.82rem' }}>
                      {renderLiveCountdown(ticket)}
                    </td>
                    {isPrivileged ? (
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            type="button"
                            className="btn-secondary btn-sm"
                            onClick={() => {
                              setOverrideTicket(ticket);
                              setOverridePriorityScore(ticket.priorityScore);
                              setOverrideUrgency(ticket.priority);
                              setOverrideReason('');
                            }}
                            title="Override priority and recalculate SLA"
                          >
                            ⚡ Override
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
            </tbody>
          </table>
        </div>
      </div>
        );
      })()}

      {/* 9 RECHARTS VISUALIZATIONS GRID */}

      {/* Row 1: Volume Trend & Priority Distribution */}
      <div className="charts-grid-2col">
        {/* Chart 1: Volume Trend */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">📈 1. Ticket Inflow &amp; Volume Trends</h3>
              <div className="chart-card-subtitle">Daily created tickets grouped by priority level</div>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trends} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e7dc" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="total" name="Total Inflow" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTotal)" />
                <Area type="monotone" dataKey="critical" name="Critical Tickets" stroke="#ef4444" fillOpacity={1} fill="url(#colorCritical)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Priority Distribution */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">🎯 2. Priority &amp; Urgency Distribution</h3>
              <div className="chart-card-subtitle">Tickets breakdown across critical, high, medium, and low bands</div>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e7dc" />
                <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="total" name="Total Tickets" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 2: SLA Compliance by Priority & Response vs Resolution */}
      <div className="charts-grid-2col">
        {/* Chart 3: SLA Compliance Percentage */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">⏱️ 3. SLA Compliance Rate by Priority</h3>
              <div className="chart-card-subtitle">% of tickets resolved within configured SLA target window</div>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e7dc" />
                <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip formatter={(value: any) => [`${value}%`, 'Compliance Rate']} />
                <Legend />
                <Bar dataKey="complianceRate" name="SLA Compliance %" fill="#10b981" radius={[6, 6, 0, 0]}>
                  {complianceData.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={entry.complianceRate >= 90 ? '#10b981' : entry.complianceRate >= 75 ? '#f59e0b' : '#ef4444'}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 4: Response vs Resolution Time */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">⏳ 4. Response Time vs. Resolution Time</h3>
              <div className="chart-card-subtitle">First human reply (min) vs. total time to resolve (hrs)</div>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseTimes?.byPriority || []} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e7dc" />
                <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="avgResponseMinutes" name="Avg 1st Response (min)" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                <Bar dataKey="avgResolutionHours" name="Avg Resolution (hrs)" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 3: Agent Workload & Category Breakdown */}
      <div className="charts-grid-2col">
        {/* Chart 5: Agent Performance */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">🎧 5. Agent Workload &amp; Resolution Performance</h3>
              <div className="chart-card-subtitle">Active assigned queue vs. completed resolutions per specialist</div>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={agentMetrics} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e7dc" />
                <XAxis dataKey="agentName" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="assignedCount" name="Total Assigned" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="resolvedCount" name="Resolved" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 6: Category Breakdown */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">📁 6. Ticket Volume by Department &amp; Category</h3>
              <div className="chart-card-subtitle">Ticket share distribution across issue categories</div>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryBreakdown}
                  dataKey="count"
                  nameKey="category"
                  cx="50%"
                  cy="50%"
                  outerRadius={85}
                  innerRadius={45}
                  label={({ category, percent }) => `${category.slice(0, 10)}... ${(percent * 100).toFixed(0)}%`}
                >
                  {categoryBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 4: SLA Risk Breakdown, Sentiment Performance & CSAT */}
      <div className="charts-grid-2col">
        {/* Chart 7: SLA Risk Breakdown */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">🛡️ 7. SLA Status &amp; Risk Health</h3>
              <div className="chart-card-subtitle">Resolved within SLA vs. At Risk vs. Breached tickets</div>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complianceData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e7dc" />
                <XAxis dataKey="priority" tick={{ fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="met" stackId="a" name="SLA Met" fill="#10b981" />
                <Bar dataKey="atRisk" stackId="a" name="At Risk" fill="#f59e0b" />
                <Bar dataKey="breached" stackId="a" name="Breached" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 8: Sentiment vs Performance */}
        <div className="chart-card">
          <div className="chart-card-header">
            <div>
              <h3 className="chart-card-title">💬 8. Sentiment vs. Resolution Time</h3>
              <div className="chart-card-subtitle">Correlation between customer frustration and resolution duration</div>
            </div>
          </div>
          <div style={{ height: '280px', width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sentimentPerformance} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1e7dc" />
                <XAxis dataKey="sentiment" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="count" name="Tickets Count" fill="#3b82f6" radius={[6, 6, 0, 0]} />
                <Bar dataKey="avgResolutionHours" name="Avg Resolution (hrs)" fill="#ec4899" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 5: CSAT Rating Distribution */}
      <div className="chart-card">
        <div className="chart-card-header">
          <div>
            <h3 className="chart-card-title">⭐ 9. Customer Satisfaction (CSAT) Distribution</h3>
            <div className="chart-card-subtitle">Direct post-resolution ratings provided by customers</div>
          </div>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#d97706' }}>
            Overall: {csatData?.averageRating || 0} / 5 ({csatData?.totalRatings || 0} reviews)
          </div>
        </div>
        <div style={{ height: '260px', width: '100%' }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={csatChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1e7dc" />
              <XAxis dataKey="rating" tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" name="Ratings Count" radius={[6, 6, 0, 0]}>
                {csatChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Comments */}
        {csatData?.recentFeedback && csatData.recentFeedback.length > 0 ? (
          <div style={{ marginTop: '20px', borderTop: '1px solid #f0e6d8', paddingTop: '16px' }}>
            <h4 style={{ margin: '0 0 10px', fontSize: '0.92rem', color: '#3b2b20' }}>💬 Recent Customer Comments</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '12px' }}>
              {csatData.recentFeedback.slice(0, 4).map((f) => (
                <div key={f.id} style={{ background: '#fdfbf7', border: '1px solid #ebdccf', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.86rem' }}>{f.customerName}</span>
                    <span style={{ color: '#f59e0b', fontWeight: 800 }}>{'★'.repeat(f.rating)}{'☆'.repeat(5 - f.rating)}</span>
                  </div>
                  <div style={{ fontSize: '0.84rem', color: '#4a382c', fontStyle: 'italic' }}>
                    "{f.comment || 'No comment provided.'}"
                  </div>
                  <div style={{ fontSize: '0.74rem', color: '#7c6858', marginTop: '6px' }}>
                    Ticket {f.ticketId} • {new Date(f.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {/* DETAILED AGENT PERFORMANCE TABLE */}
      <div style={{ background: '#ffffff', border: '1px solid #ded2c1', borderRadius: '18px', padding: '24px', boxShadow: '0 6px 20px rgba(90, 64, 47, 0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
          <div>
            <h3 style={{ margin: 0, color: '#1e130c' }}>👥 Detailed Agent &amp; Specialist Performance</h3>
            <div style={{ fontSize: '0.82rem', color: '#7c6858' }}>
              Productivity, response speed, resolution speed, and SLA quality indicators
            </div>
          </div>
        </div>

        <div className="custom-table-wrapper">
          <table className="custom-table">
            <thead>
              <tr>
                <th>Agent Name</th>
                <th>Role</th>
                <th>Department</th>
                <th>Assigned Tickets</th>
                <th>Active / Open</th>
                <th>Resolved</th>
                <th>Avg First Response</th>
                <th>Avg Resolution</th>
                <th>SLA Compliance</th>
                <th>CSAT Rating</th>
              </tr>
            </thead>
            <tbody>
              {agentMetrics.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: 'center', padding: '30px', color: '#7c6858' }}>
                    No support staff found.
                  </td>
                </tr>
              ) : (
                agentMetrics.map((agent) => (
                  <tr key={agent.agentId}>
                    <td style={{ fontWeight: 700, color: '#1e130c' }}>{agent.agentName}</td>
                    <td>
                      <span className={`role-badge ${agent.role === 'Senior Support Staff' ? 'senior' : 'agent'}`}>
                        {agent.role}
                      </span>
                    </td>
                    <td>{agent.team}</td>
                    <td style={{ fontWeight: 600 }}>{agent.assignedCount}</td>
                    <td>
                      <span style={{ color: agent.openCount > 3 ? '#b45309' : '#15803d', fontWeight: 600 }}>
                        {agent.openCount}
                      </span>
                    </td>
                    <td style={{ fontWeight: 600, color: '#15803d' }}>{agent.resolvedCount}</td>
                    <td>{agent.avgResponseMinutes !== null ? `${agent.avgResponseMinutes} min` : '—'}</td>
                    <td>{agent.avgResolutionHours !== null ? `${agent.avgResolutionHours} hrs` : '—'}</td>
                    <td>
                      <span style={{ fontWeight: 700, color: agent.slaComplianceRate >= 85 ? '#15803d' : '#b45309' }}>
                        {agent.slaComplianceRate}%
                      </span>
                    </td>
                    <td>
                      {agent.csatAverage !== null ? (
                        <span style={{ fontWeight: 700, color: '#d97706' }}>
                          ★ {agent.csatAverage} ({agent.csatRatingsCount})
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SLA Policy Configuration Modal */}
      {isPolicyModalOpen && policyForm ? (
        <div className="modal-overlay" onClick={() => setIsPolicyModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚙️ Configure SLA Target Policies</h3>
              <button type="button" className="modal-close-btn" onClick={() => setIsPolicyModalOpen(false)}>
                &times;
              </button>
            </div>

            {policySaveSuccess ? (
              <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#065f46', fontSize: '0.86rem', marginBottom: '16px' }}>
                ✅ SLA Policy targets updated and recalculated successfully!
              </div>
            ) : null}

            <form onSubmit={handleSavePolicies} className="modal-body">
              <p style={{ margin: 0, fontSize: '0.86rem', color: '#6d5849' }}>
                Set max allowed response time and total resolution hours for each priority tier. Changes dynamically re-evaluate approaching, at-risk, and breached thresholds.
              </p>

              {(['Critical', 'High', 'Medium', 'Low'] as const).map((prio) => (
                <div key={prio} style={{ background: '#fcfaf6', border: '1px solid #ebdccf', borderRadius: '12px', padding: '14px' }}>
                  <div style={{ fontWeight: 700, marginBottom: '8px', color: '#2b1f17' }}>
                    {prio} Priority Tier
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div className="form-field">
                      <label>First Response (Hours)</label>
                      <input
                        type="number"
                        step="0.05"
                        min="0.05"
                        required
                        value={policyForm[prio]?.responseHours || 0}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            [prio]: {
                              ...policyForm[prio],
                              responseHours: parseFloat(e.target.value) || 0.1,
                            },
                          })
                        }
                      />
                      <span style={{ fontSize: '0.72rem', color: '#7c6858' }}>
                        ({Math.round((policyForm[prio]?.responseHours || 0) * 60)} minutes)
                      </span>
                    </div>

                    <div className="form-field">
                      <label>Total Resolution (Hours)</label>
                      <input
                        type="number"
                        step="0.5"
                        min="0.5"
                        required
                        value={policyForm[prio]?.resolutionHours || 0}
                        onChange={(e) =>
                          setPolicyForm({
                            ...policyForm,
                            [prio]: {
                              ...policyForm[prio],
                              resolutionHours: parseFloat(e.target.value) || 1,
                            },
                          })
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setIsPolicyModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save SLA Policy Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {/* Priority Override Modal */}
      {overrideTicket ? (
        <div className="modal-overlay" onClick={() => setOverrideTicket(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚡ Senior Staff Priority Override</h3>
              <button type="button" className="modal-close-btn" onClick={() => setOverrideTicket(null)}>
                &times;
              </button>
            </div>

            {overrideSuccess ? (
              <div style={{ padding: '10px 14px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '10px', color: '#065f46', fontSize: '0.86rem', marginBottom: '16px' }}>
                ✅ {overrideSuccess}
              </div>
            ) : null}

            <form onSubmit={handleConfirmOverride} className="modal-body">
              <div style={{ background: '#fcfaf6', padding: '12px', borderRadius: '10px', border: '1px solid #ebdccf' }}>
                <div style={{ fontWeight: 700 }}>{overrideTicket.subject}</div>
                <div style={{ fontSize: '0.8rem', color: '#786253' }}>
                  Ticket ID: {overrideTicket.id} • Customer: {overrideTicket.customerName}
                </div>
              </div>

              <div className="form-field">
                <label>Urgency Level</label>
                <select
                  value={overrideUrgency}
                  onChange={(e) => setOverrideUrgency(e.target.value)}
                >
                  <option value="Critical">Critical (15m response target)</option>
                  <option value="High">High (1h response target)</option>
                  <option value="Medium">Medium (4h response target)</option>
                  <option value="Low">Low (8h response target)</option>
                </select>
              </div>

              <div className="form-field">
                <label>Priority Score (0 to 100)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  required
                  value={overridePriorityScore}
                  onChange={(e) => setOverridePriorityScore(parseInt(e.target.value, 10) || 50)}
                />
              </div>

              <div className="form-field">
                <label>Justification / Reason for Override</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Explain why this ticket priority is being manually modified..."
                  value={overrideReason}
                  onChange={(e) => setOverrideReason(e.target.value)}
                />
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setOverrideTicket(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Apply Priority Override
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}

