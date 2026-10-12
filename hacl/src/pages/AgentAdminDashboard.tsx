import { FormEvent, useEffect, useMemo, useState } from 'react';
import { realtime, useRealtimeStatus } from '../lib/realtime';
import '../styles/agent-admin-dashboard.css';

type DashboardUser = {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'Support Agent' | 'Senior Support Staff' | 'Customer';
  active: boolean;
  team: string;
  createdAt: string;
  lastLoginAt: string | null;
};

type DashboardTicket = {
  id: string;
  subject: string;
  description: string;
  category: string;
  status: string;
  customer_name?: string;
  customer_email?: string;
  assigned_agent: string | null;
  assigned_team?: string | null;
  assigned_user_id?: string;
  created_at: string;
  updated_at: string;
  demo_data?: boolean;
  dashboardUrgency?: string;
  dashboardPriority?: number;
  triage?: {
    sentiment?: string;
    frustrationScore?: number;
    urgency?: string;
    customerTier?: string;
    customerValueScore?: number;
    priorityScore?: number;
    priorityCategory?: string;
    routingLevel?: string;
    assignedTeam?: string;
    assignedAgent?: string;
    escalationReasons?: string[];
    isEscalatedToSenior?: boolean;
    isKbDeflected?: boolean;
    kbSolution?: string;
    slaResponseTime?: string;
  };
  notes?: Array<{ id: string; note: string; actorName: string; createdAt: string }>;
  drafts?: Array<{ id: string; body: string; actorName: string; createdAt: string }>;
  history?: Array<{ id: string; event_type: string; note: string; created_at: string }>;
};

type Team = {
  id?: string;
  name: string;
  categories: string[];
  skills: string[];
  capacity: number;
  active: boolean;
};

type RoutingRule = {
  id: string;
  name: string;
  condition: 'category' | 'urgency' | 'priority' | 'skill' | 'fallback';
  match: string;
  destination: string;
  enabled: boolean;
};

type DashboardRequest = {
  id: string;
  ticketId: string;
  requestType: 'Escalation' | 'Reassignment';
  reason: string;
  actorName: string;
  state: string;
  createdAt: string;
};

type Summary = {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  unassigned: number;
  assigned: number;
  agents: number;
};

type DashboardConfig = {
  teams: Team[];
  routingRules: RoutingRule[];
  escalationSettings: {
    criticalUrgency: boolean;
    highPriorityThreshold: number;
    securityHandling: string;
    repeatedContactsThreshold: number;
    unassignedMinutes: number;
    escalationDestination: string;
  };
};

const ticketStatuses = ['Open', 'In Progress', 'Awaiting Customer', 'Resolved', 'Closed'];
const categories = ['Billing and Payments', 'Refunds and Cancellations', 'Technical Support', 'Delivery and Shipping', 'Account Access', 'Product Issues', 'General Inquiry', 'Other'];
const emptySummary: Summary = { total: 0, open: 0, inProgress: 0, resolved: 0, unassigned: 0, assigned: 0, agents: 0 };
const emptyConfig: DashboardConfig = {
  teams: [],
  routingRules: [],
  escalationSettings: {
    criticalUrgency: true,
    highPriorityThreshold: 75,
    securityHandling: 'Security and Critical Incidents',
    repeatedContactsThreshold: 3,
    unassignedMinutes: 30,
    escalationDestination: 'Support Lead',
  },
};

async function dashboardRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const response = await fetch(`/api/dashboard${path}`, {
    ...init,
    credentials: 'include',
    headers,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || `Request failed (${response.status}).`);
  return result as T;
}

const dateText = (value: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

interface AgentAdminDashboardProps {
  currentUser?: DashboardUser | any | null;
  onOpenTicketDetails?: (ticketId: string) => void;
}

export function AgentAdminDashboardPage({ currentUser }: AgentAdminDashboardProps = {}) {
  const [user, setUser] = useState<DashboardUser | null>(currentUser || null);
  const [overviewSort, setOverviewSort] = useState<'priority' | 'newest'>('newest');
  const [authStatus, setAuthStatus] = useState<{ adminConfigured: boolean; bootstrapRequired: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<'overview' | 'tickets' | 'people' | 'settings' | 'activity'>('overview');
  const [tickets, setTickets] = useState<DashboardTicket[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [selectedTicket, setSelectedTicket] = useState<DashboardTicket | null>(null);
  const [users, setUsers] = useState<DashboardUser[]>([]);
  const [requests, setRequests] = useState<DashboardRequest[]>([]);
  const [summary, setSummary] = useState<Summary>(emptySummary);
  const [config, setConfig] = useState<DashboardConfig>(emptyConfig);
  const [activity, setActivity] = useState<Array<{ id: string; action: string; actorName: string; targetId: string; details: string; timestamp: string }>>([]);
  const [filters, setFilters] = useState({ search: '', status: '', category: '', urgency: '', minPriority: '', agentId: '', from: '', to: '' });
  const [login, setLogin] = useState({ email: '', password: '' });
  const [note, setNote] = useState('');
  const [draft, setDraft] = useState('');
  const [requestForm, setRequestForm] = useState({ requestType: 'Escalation', reason: '' });
  const [assignAgent, setAssignAgent] = useState('');
  const [newUser, setNewUser] = useState({ name: '', email: '', role: 'Support Agent', team: '', password: '' });
  const [newTeam, setNewTeam] = useState({ name: '', categories: '', skills: '', capacity: '10' });
  const [newRule, setNewRule] = useState({ name: '', condition: 'category', match: '', destination: '' });

  const isAdmin = user?.role === 'Admin';
  const agents = useMemo(() => users.filter((entry) => entry.role === 'Support Agent' && entry.active), [users]);
  const sortedOverviewTickets = useMemo(() => {
    const list = [...tickets];
    if (overviewSort === 'newest') {
      return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    return list.sort((a, b) =>
      (b.dashboardUrgency === 'Critical' ? 1 : 0) - (a.dashboardUrgency === 'Critical' ? 1 : 0) ||
      ((b.dashboardPriority ?? b.triage?.priorityScore ?? -1) - (a.dashboardPriority ?? a.triage?.priorityScore ?? -1)) ||
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [tickets, overviewSort]);

  const loadDashboard = async (activeUser: DashboardUser, selectedTicketId = selectedId) => {
    const overview = await dashboardRequest<{
      tickets: DashboardTicket[];
      users: DashboardUser[];
      summary: Summary;
      requests: DashboardRequest[];
      config: DashboardConfig;
    }>('/overview');
    setTickets(overview.tickets);
    setUsers(overview.users);
    setSummary(overview.summary);
    setRequests(overview.requests);
    setConfig({ ...emptyConfig, ...overview.config });
    if (activeUser.role === 'Admin') {
      const activityResult = await dashboardRequest<{ audit: typeof activity }>('/activity');
      setActivity(activityResult.audit);
    }
    const nextSelectedId = overview.tickets.some((ticket) => ticket.id === selectedTicketId)
      ? selectedTicketId
      : overview.tickets[0]?.id || '';
    setSelectedId(nextSelectedId);
    if (nextSelectedId) {
      setSelectedTicket(await dashboardRequest<DashboardTicket>(`/tickets/${encodeURIComponent(nextSelectedId)}`));
    } else {
      setSelectedTicket(null);
    }
  };

  useEffect(() => {
    let active = true;
    Promise.all([
      dashboardRequest<{ user: DashboardUser }>('/auth/session').catch(() => null),
      dashboardRequest<{ adminConfigured: boolean; bootstrapRequired: boolean }>('/auth/status'),
    ]).then(async ([session, status]) => {
      if (!active) return;
      setAuthStatus(status);
      if (session?.user) {
        setUser(session.user);
        await loadDashboard(session.user);
      }
    }).catch((reason: unknown) => {
      if (active) setError(reason instanceof Error ? reason.message : 'Could not connect to the dashboard service.');
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (currentUser) {
      setUser(currentUser as DashboardUser);
      loadDashboard(currentUser as DashboardUser).catch(console.error);
    }
  }, [currentUser]);

  const isRealtimeConnected = useRealtimeStatus();

  useEffect(() => {
    if (!user) return;
    const unsubscribe = realtime.subscribe((event) => {
      if (
        event.type.startsWith('ticket:') ||
        event.type.startsWith('sla:') ||
        event.type.startsWith('routing:') ||
        event.type.startsWith('user:')
      ) {
        loadDashboard(user, selectedId).catch(console.error);
      }
    });
    return unsubscribe;
  }, [user, selectedId]);

  const refresh = async (ticketId = selectedId) => {
    if (!user) return;
    await loadDashboard(user, ticketId);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await dashboardRequest<{ user: DashboardUser }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(login),
      });
      setUser(result.user);
      setLogin({ email: '', password: '' });
      setNotice(`Signed in as ${result.user.role}.`);
      await loadDashboard(result.user, '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign in failed.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await dashboardRequest('/auth/logout', { method: 'POST' });
      setUser(null);
      setSelectedTicket(null);
      setTickets([]);
      setNotice('You have signed out.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Sign out failed.');
    } finally {
      setBusy(false);
    }
  };

  const selectTicket = async (ticketId: string) => {
    setSelectedId(ticketId);
    setError('');
    try {
      setSelectedTicket(await dashboardRequest<DashboardTicket>(`/tickets/${encodeURIComponent(ticketId)}`));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not open this ticket.');
    }
  };

  const refreshTickets = async (nextFilters = filters) => {
    const params = new URLSearchParams(Object.entries(nextFilters).filter(([, value]) => Boolean(value)));
    try {
      const next = await dashboardRequest<DashboardTicket[]>(`/tickets?${params.toString()}`);
      setTickets(next);
      const retained = next.some((ticket) => ticket.id === selectedId) ? selectedId : next[0]?.id || '';
      setSelectedId(retained);
      setSelectedTicket(retained ? await dashboardRequest<DashboardTicket>(`/tickets/${encodeURIComponent(retained)}`) : null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not filter tickets.');
    }
  };

  const changeStatus = async (status: string) => {
    if (!selectedTicket) return;
    setBusy(true);
    try {
      await dashboardRequest(`/tickets/${encodeURIComponent(selectedTicket.id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) });
      setNotice('Ticket status updated.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update ticket status.');
    } finally { setBusy(false); }
  };

  const submitTicketText = async (event: FormEvent<HTMLFormElement>, kind: 'notes' | 'drafts') => {
    event.preventDefault();
    if (!selectedTicket) return;
    const value = kind === 'notes' ? note : draft;
    setBusy(true);
    try {
      await dashboardRequest(`/tickets/${encodeURIComponent(selectedTicket.id)}/${kind}`, {
        method: 'POST',
        body: JSON.stringify(kind === 'notes' ? { note: value } : { body: value }),
      });
      if (kind === 'notes') setNote(''); else setDraft('');
      setNotice(kind === 'notes' ? 'Internal note saved.' : 'Response saved as a draft; it was not sent to the customer.');
      await selectTicket(selectedTicket.id);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save this content.');
    } finally { setBusy(false); }
  };

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTicket) return;
    try {
      setBusy(true);
      await dashboardRequest(`/tickets/${encodeURIComponent(selectedTicket.id)}/requests`, {
        method: 'POST',
        body: JSON.stringify(requestForm),
      });
      setRequestForm({ ...requestForm, reason: '' });
      setNotice(`${requestForm.requestType} request submitted for review. No external alert was sent.`);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not submit the request.');
    } finally { setBusy(false); }
  };

  const assignTicket = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedTicket || !assignAgent) return;
    try {
      setBusy(true);
      await dashboardRequest(`/tickets/${encodeURIComponent(selectedTicket.id)}/assign`, { method: 'POST', body: JSON.stringify({ agentId: assignAgent }) });
      setAssignAgent('');
      setNotice('Ticket assignment saved.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not assign this ticket.');
    } finally { setBusy(false); }
  };

  const createUser = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setBusy(true);
      await dashboardRequest('/users', { method: 'POST', body: JSON.stringify(newUser) });
      setNewUser({ name: '', email: '', role: 'Support Agent', team: '', password: '' });
      setNotice('Dashboard user created.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create this user.');
    } finally { setBusy(false); }
  };

  const saveUser = async (id: string, changes: Partial<DashboardUser>) => {
    try {
      setBusy(true);
      await dashboardRequest(`/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(changes) });
      setNotice('User settings updated.');
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update this user.');
    } finally { setBusy(false); }
  };

  const saveTeam = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updated = [...config.teams, {
      id: `team-${Date.now()}`,
      name: newTeam.name.trim(),
      categories: newTeam.categories.split(',').map((item) => item.trim()).filter(Boolean),
      skills: newTeam.skills.split(',').map((item) => item.trim()).filter(Boolean),
      capacity: Number(newTeam.capacity),
      active: true,
    }];
    try {
      setBusy(true);
      const result = await dashboardRequest<{ teams: Team[] }>('/config/teams', { method: 'PUT', body: JSON.stringify({ teams: updated }) });
      setConfig((current) => ({ ...current, teams: result.teams }));
      setNewTeam({ name: '', categories: '', skills: '', capacity: '10' });
      setNotice('Team settings saved. Capacity values are administrator-maintained, not live presence.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save team settings.');
    } finally { setBusy(false); }
  };

  const toggleTeam = async (team: Team) => {
    const updated = config.teams.map((entry) => entry.name === team.name ? { ...entry, active: !entry.active } : entry);
    try {
      setBusy(true);
      const result = await dashboardRequest<{ teams: Team[] }>('/config/teams', { method: 'PUT', body: JSON.stringify({ teams: updated }) });
      setConfig((current) => ({ ...current, teams: result.teams }));
      setNotice('Team availability configuration updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update team.');
    } finally { setBusy(false); }
  };

  const addRoutingRule = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const updated = [...config.routingRules, {
      id: `rule-${Date.now()}`,
      name: newRule.name.trim(),
      condition: newRule.condition as RoutingRule['condition'],
      match: newRule.match.trim(),
      destination: newRule.destination.trim(),
      enabled: true,
    }];
    try {
      setBusy(true);
      const result = await dashboardRequest<{ rules: RoutingRule[] }>('/config/routing-rules', { method: 'PUT', body: JSON.stringify({ rules: updated }) });
      setConfig((current) => ({ ...current, routingRules: result.rules }));
      setNewRule({ name: '', condition: 'category', match: '', destination: '' });
      setNotice('Routing rules saved. Existing routing recommendations in Module 7 are not automatically changed.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save routing rules.');
    } finally { setBusy(false); }
  };

  const toggleRule = async (rule: RoutingRule) => {
    const updated = config.routingRules.map((entry) => entry.id === rule.id ? { ...entry, enabled: !entry.enabled } : entry);
    try {
      setBusy(true);
      const result = await dashboardRequest<{ rules: RoutingRule[] }>('/config/routing-rules', { method: 'PUT', body: JSON.stringify({ rules: updated }) });
      setConfig((current) => ({ ...current, routingRules: result.rules }));
      setNotice('Routing rule state updated.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update routing rule.');
    } finally { setBusy(false); }
  };

  const saveEscalation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setBusy(true);
      const result = await dashboardRequest<{ settings: DashboardConfig['escalationSettings'] }>('/config/escalation', {
        method: 'PUT',
        body: JSON.stringify(config.escalationSettings),
      });
      setConfig((current) => ({ ...current, escalationSettings: result.settings }));
      setNotice('Escalation policy saved. This configures recommendations; it does not send alerts.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not save escalation settings.');
    } finally { setBusy(false); }
  };

  const decideRequest = async (item: DashboardRequest, decision: 'Approved' | 'Declined') => {
    try {
      setBusy(true);
      await dashboardRequest(`/requests/${encodeURIComponent(item.id)}`, { method: 'PATCH', body: JSON.stringify({ decision }) });
      setNotice(decision === 'Approved' && item.requestType === 'Reassignment'
        ? 'Request approved. An administrator must still assign the ticket to a selected agent.'
        : `Request ${decision.toLowerCase()}. No external notification was sent.`);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not update request.');
    } finally { setBusy(false); }
  };

  if (loading) return <section className="dashboard-loading" aria-live="polite">Loading secure dashboard...</section>;

  if (!user) return (
    <section className="agent-dashboard">
      <div className="dashboard-login-card">
        <p className="eyebrow">Module 9 · Secure workspace</p>
        <h1>Agent &amp; Admin Dashboard</h1>
        <p className="dashboard-intro">Sign in with an administrator-created account. Dashboard access is enforced by the server.</p>
        {error ? <p className="dashboard-alert error" role="alert">{error}</p> : null}
        {authStatus?.bootstrapRequired ? (
          <div className="dashboard-alert warning">
            No administrator is configured. Set <code>ADMIN_BOOTSTRAP_EMAIL</code> and <code>ADMIN_BOOTSTRAP_PASSWORD</code> in the server environment, then restart it.
          </div>
        ) : (
          <form onSubmit={handleLogin} className="dashboard-form">
            <label>Email<input type="email" autoComplete="username" required value={login.email} onChange={(event) => setLogin({ ...login, email: event.target.value })} /></label>
            <label>Password<input type="password" autoComplete="current-password" required value={login.password} onChange={(event) => setLogin({ ...login, password: event.target.value })} /></label>
            <button className="dashboard-primary" disabled={busy}>{busy ? 'Signing in...' : 'Sign in securely'}</button>
          </form>
        )}
        <p className="dashboard-footnote">Passwords are stored as salted scrypt hashes. Sessions use expiring, HttpOnly, SameSite cookies. No demo credentials are provided.</p>
      </div>
    </section>
  );

  return (
    <section className="agent-dashboard">
      <header className="dashboard-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <p className="eyebrow" style={{ margin: 0 }}>Module 9 · {isAdmin ? 'Administrator console' : 'Support agent workspace'}</p>
            <div className={`realtime-live-badge ${isRealtimeConnected ? '' : 'disconnected'}`} style={{ padding: '3px 10px', fontSize: '0.74rem' }}>
              <span className={`realtime-pulse-dot ${isRealtimeConnected ? '' : 'disconnected'}`} style={{ width: '7px', height: '7px' }} />
              <span>{isRealtimeConnected ? 'Live Stream' : 'Offline'}</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
            <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
            <h1 style={{ margin: 0 }}>Agent &amp; Admin Dashboard</h1>
          </div>
          <p className="dashboard-intro">Welcome, {user.name}. {isAdmin ? 'Manage queues, access, and operational rules.' : `Your queue is limited to tickets assigned to your account${user.team ? ` · ${user.team}` : ''}.`}</p>
        </div>
        <button className="dashboard-secondary" disabled={busy} onClick={handleLogout}>Sign out</button>
      </header>
      {notice ? <p className="dashboard-alert success" role="status">{notice}</p> : null}
      {error ? <p className="dashboard-alert error" role="alert">{error}<button onClick={() => setError('')} aria-label="Dismiss error">×</button></p> : null}
      <nav className="dashboard-tabs" aria-label="Dashboard sections">
        {(['overview', 'tickets', ...(isAdmin ? ['people', 'settings', 'activity'] : [])] as const).map((key) => (
          <button key={key} className={tab === key ? 'selected' : ''} onClick={() => setTab(key)}>
            {{ overview: 'Overview', tickets: 'Tickets', people: 'People & teams', settings: 'Routing & escalation', activity: 'Activity & requests' }[key]}
          </button>
        ))}
      </nav>

      {tab === 'overview' ? (
        <>
          <div className="dashboard-stat-grid">
            {(isAdmin ? [
              ['All tickets', summary.total], ['Open', summary.open], ['Unassigned', summary.unassigned], ['Active agents', summary.agents],
            ] : [
              ['My tickets', summary.total], ['Open', summary.open], ['In progress', summary.inProgress], ['Resolved', summary.resolved],
            ]).map(([label, value]) => <article key={label} className="dashboard-stat"><span>{label}</span><strong>{value}</strong></article>)}
          </div>
          <div className="dashboard-columns">
            <article className="dashboard-card">
              <div className="dashboard-card-heading">
                <div>
                  <p className="eyebrow">Queue snapshot</p>
                  <h2>{isAdmin ? 'Ticket monitoring' : 'My assigned queue'}</h2>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ display: 'inline-flex', border: '1px solid #d4c5b9', borderRadius: '6px', overflow: 'hidden' }}>
                    <button
                      type="button"
                      style={{
                        padding: '4px 9px',
                        fontSize: '0.74rem',
                        fontWeight: overviewSort === 'newest' ? 700 : 500,
                        background: overviewSort === 'newest' ? '#1e130c' : '#fdfbf7',
                        color: overviewSort === 'newest' ? '#fff' : '#5c483a',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                      onClick={() => setOverviewSort('newest')}
                    >
                      🆕 Newest First
                    </button>
                    <button
                      type="button"
                      style={{
                        padding: '4px 9px',
                        fontSize: '0.74rem',
                        fontWeight: overviewSort === 'priority' ? 700 : 500,
                        background: overviewSort === 'priority' ? '#1e130c' : '#fdfbf7',
                        color: overviewSort === 'priority' ? '#fff' : '#5c483a',
                        border: 'none',
                        borderLeft: '1px solid #d4c5b9',
                        cursor: 'pointer'
                      }}
                      onClick={() => setOverviewSort('priority')}
                    >
                      ⚡ Priority
                    </button>
                  </div>
                  <button className="dashboard-text-button" onClick={() => setTab('tickets')}>
                    Open full queue ({tickets.length})
                  </button>
                </div>
              </div>
              {tickets.length ? (
                <TicketTable tickets={sortedOverviewTickets.slice(0, 20)} selectedId={selectedId} onSelect={selectTicket} />
              ) : (
                <p className="dashboard-empty">
                  {isAdmin ? 'No tickets are currently available.' : 'No tickets are assigned to your account yet. Ask an administrator to assign your first ticket.'}
                </p>
              )}
              {tickets.some((ticket) => ticket.demo_data) ? <p className="dashboard-footnote">Demo records are explicitly labeled and are not live customer accounts.</p> : null}
            </article>
            {isAdmin ? (
              <article className="dashboard-card">
                <div className="dashboard-card-heading"><div><p className="eyebrow">Review queue</p><h2>Agent requests</h2></div><span className="dashboard-count">{requests.filter((item) => item.state === 'Requested').length}</span></div>
                <RequestList requests={requests.slice(0, 5)} onDecision={decideRequest} busy={busy} />
              </article>
            ) : (
              <article className="dashboard-card"><p className="eyebrow">Working safely</p><h2>Response drafts stay drafts</h2><p className="dashboard-body">You can save internal notes and customer-response drafts. This dashboard does not send customer messages or external escalation alerts.</p><p className="dashboard-footnote">Urgent or security incidents must be handled under your organization's operational policy, regardless of customer value.</p></article>
            )}
          </div>
          {isAdmin ? <TeamWorkload teams={config.teams} tickets={tickets} users={users} /> : null}
        </>
      ) : null}

      {tab === 'tickets' ? (
        <div className="dashboard-card">
          <div className="dashboard-card-heading"><div><p className="eyebrow">Queue</p><h2>{isAdmin ? 'All support tickets' : 'My assigned tickets'}</h2></div><span className="dashboard-count">{tickets.length}</span></div>
          <form className="dashboard-filters" onSubmit={(event) => { event.preventDefault(); void refreshTickets(); }}>
            <input aria-label="Search tickets" placeholder="Search ID or subject" value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} />
            <select aria-label="Filter status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">Any status</option>{ticketStatuses.map((status) => <option key={status}>{status}</option>)}</select>
            <select aria-label="Filter category" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">Any category</option>{categories.map((category) => <option key={category}>{category}</option>)}</select>
            <select aria-label="Filter urgency" value={filters.urgency} onChange={(event) => setFilters({ ...filters, urgency: event.target.value })}><option value="">Any urgency</option>{['Low', 'Medium', 'High', 'Critical'].map((value) => <option key={value}>{value}</option>)}</select>
            <input aria-label="Minimum priority" type="number" min="0" max="100" placeholder="Min priority" value={filters.minPriority} onChange={(event) => setFilters({ ...filters, minPriority: event.target.value })} />
            {isAdmin ? <select aria-label="Filter agent" value={filters.agentId} onChange={(event) => setFilters({ ...filters, agentId: event.target.value })}><option value="">Any assignee</option>{users.filter((entry) => entry.role === 'Support Agent').map((agent) => <option value={agent.id} key={agent.id}>{agent.name}</option>)}</select> : null}
            <input aria-label="Created from date" type="date" value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} />
            <input aria-label="Created through date" type="date" value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} />
            <button className="dashboard-primary">Apply filters</button>
            <button type="button" className="dashboard-secondary" onClick={() => { const empty = { search: '', status: '', category: '', urgency: '', minPriority: '', agentId: '', from: '', to: '' }; setFilters(empty); void refreshTickets(empty); }}>Clear</button>
          </form>
          {tickets.length ? <TicketTable tickets={tickets} selectedId={selectedId} onSelect={selectTicket} /> : <p className="dashboard-empty">No tickets match these filters.</p>}
          <TicketDetails
            ticket={selectedTicket}
            user={user}
            agents={agents}
            assignAgent={assignAgent}
            setAssignAgent={setAssignAgent}
            note={note}
            setNote={setNote}
            draft={draft}
            setDraft={setDraft}
            requestForm={requestForm}
            setRequestForm={setRequestForm}
            busy={busy}
            onStatus={changeStatus}
            onAssign={assignTicket}
            onText={submitTicketText}
            onRequest={submitRequest}
          />
        </div>
      ) : null}

      {tab === 'people' && isAdmin ? (
        <div className="dashboard-columns">
          <article className="dashboard-card">
            <p className="eyebrow">User access</p><h2>Create dashboard account</h2>
            <form className="dashboard-form compact-form" onSubmit={createUser}>
              <label>Full name<input required minLength={2} value={newUser.name} onChange={(event) => setNewUser({ ...newUser, name: event.target.value })} /></label>
              <label>Email<input required type="email" value={newUser.email} onChange={(event) => setNewUser({ ...newUser, email: event.target.value })} /></label>
              <label>Role<select value={newUser.role} onChange={(event) => setNewUser({ ...newUser, role: event.target.value })}><option>Support Agent</option><option>Admin</option></select></label>
              <label>Team<input value={newUser.team} onChange={(event) => setNewUser({ ...newUser, team: event.target.value })} placeholder="Optional team name" /></label>
              <label>Temporary password<input required type="password" minLength={12} autoComplete="new-password" value={newUser.password} onChange={(event) => setNewUser({ ...newUser, password: event.target.value })} /><small>At least 12 characters. Share securely; password reset workflow is not configured.</small></label>
              <button className="dashboard-primary" disabled={busy}>Create user</button>
            </form>
          </article>
          <article className="dashboard-card">
            <p className="eyebrow">Access directory</p><h2>Users ({users.length})</h2>
            {!users.length ? <p className="dashboard-empty">No dashboard users found.</p> : <div className="people-list">{users.map((entry) => <div className="people-row" key={entry.id}><div><strong>{entry.name}</strong><span>{entry.email}</span><small>{entry.role} · {entry.team || 'No team'} · {entry.active ? 'Active' : 'Inactive'}</small></div><div className="inline-controls"><select aria-label={`Role for ${entry.name}`} value={entry.role} disabled={busy} onChange={(event) => void saveUser(entry.id, { role: event.target.value as DashboardUser['role'] })}><option>Support Agent</option><option>Admin</option></select><button className="dashboard-secondary" disabled={busy} onClick={() => void saveUser(entry.id, { active: !entry.active })}>{entry.active ? 'Deactivate' : 'Activate'}</button></div></div>)}</div>}
            <p className="dashboard-footnote">The last active administrator cannot be deactivated or demoted. Password hashes are never shown.</p>
          </article>
          <article className="dashboard-card dashboard-span">
            <p className="eyebrow">Team setup</p><h2>Teams &amp; workload</h2>
            <p className="dashboard-body">Team membership and capacity are configured by administrators. Workload below is calculated from assigned open tickets; availability is not live presence.</p>
            <TeamWorkload teams={config.teams} tickets={tickets} users={users} />
            <form className="dashboard-form team-form" onSubmit={saveTeam}>
              <label>Team name<input required value={newTeam.name} onChange={(event) => setNewTeam({ ...newTeam, name: event.target.value })} /></label>
              <label>Categories (comma-separated)<input required value={newTeam.categories} onChange={(event) => setNewTeam({ ...newTeam, categories: event.target.value })} placeholder="Billing, Refunds" /></label>
              <label>Skills (comma-separated)<input value={newTeam.skills} onChange={(event) => setNewTeam({ ...newTeam, skills: event.target.value })} placeholder="billing, payment" /></label>
              <label>Capacity<input required type="number" min="1" step="1" value={newTeam.capacity} onChange={(event) => setNewTeam({ ...newTeam, capacity: event.target.value })} /></label>
              <button className="dashboard-primary" disabled={busy}>Add team</button>
            </form>
            <div className="people-list">{config.teams.map((team) => <div className="people-row" key={team.id || team.name}><div><strong>{team.name}</strong><span>{team.categories.join(', ')}</span><small>{team.skills.join(', ') || 'No skills specified'} · capacity {team.capacity} · {team.active ? 'Active' : 'Inactive'}</small></div><button className="dashboard-secondary" disabled={busy} onClick={() => void toggleTeam(team)}>{team.active ? 'Deactivate' : 'Activate'}</button></div>)}</div>
          </article>
        </div>
      ) : null}

      {tab === 'settings' && isAdmin ? (
        <div className="dashboard-columns">
          <article className="dashboard-card">
            <p className="eyebrow">Routing policy</p><h2>Configurable routing rules</h2>
            <p className="dashboard-body">These rules are stored as policy configuration for the dashboard. They do not replace or silently alter Module 7 routing recommendations.</p>
            <form className="dashboard-form compact-form" onSubmit={addRoutingRule}>
              <label>Rule name<input required value={newRule.name} onChange={(event) => setNewRule({ ...newRule, name: event.target.value })} /></label>
              <label>Condition<select value={newRule.condition} onChange={(event) => setNewRule({ ...newRule, condition: event.target.value })}>{['category', 'urgency', 'priority', 'skill', 'fallback'].map((condition) => <option key={condition}>{condition}</option>)}</select></label>
              <label>Match value<input value={newRule.match} onChange={(event) => setNewRule({ ...newRule, match: event.target.value })} /></label>
              <label>Destination team<input required value={newRule.destination} onChange={(event) => setNewRule({ ...newRule, destination: event.target.value })} /></label>
              <button className="dashboard-primary" disabled={busy}>Add rule</button>
            </form>
            {config.routingRules.length ? <div className="people-list">{config.routingRules.map((rule) => <div className="people-row" key={rule.id}><div><strong>{rule.name}</strong><span>{rule.condition}: {rule.match || 'any'} → {rule.destination}</span><small>{rule.enabled ? 'Enabled' : 'Disabled'}</small></div><button className="dashboard-secondary" disabled={busy} onClick={() => void toggleRule(rule)}>{rule.enabled ? 'Disable' : 'Enable'}</button></div>)}</div> : <p className="dashboard-empty">No custom routing rules configured.</p>}
          </article>
          <article className="dashboard-card">
            <p className="eyebrow">Escalation policy</p><h2>Thresholds &amp; destinations</h2>
            <form className="dashboard-form compact-form" onSubmit={saveEscalation}>
              <label className="dashboard-check"><input type="checkbox" checked={config.escalationSettings.criticalUrgency} onChange={(event) => setConfig({ ...config, escalationSettings: { ...config.escalationSettings, criticalUrgency: event.target.checked } })} /> Flag critical urgency for immediate review</label>
              <label>High-priority threshold<input type="number" min="0" max="100" required value={config.escalationSettings.highPriorityThreshold} onChange={(event) => setConfig({ ...config, escalationSettings: { ...config.escalationSettings, highPriorityThreshold: Number(event.target.value) } })} /></label>
              <label>Repeated unresolved contact threshold<input type="number" min="1" step="1" required value={config.escalationSettings.repeatedContactsThreshold} onChange={(event) => setConfig({ ...config, escalationSettings: { ...config.escalationSettings, repeatedContactsThreshold: Number(event.target.value) } })} /></label>
              <label>Unassigned ticket minutes<input type="number" min="1" step="1" required value={config.escalationSettings.unassignedMinutes} onChange={(event) => setConfig({ ...config, escalationSettings: { ...config.escalationSettings, unassignedMinutes: Number(event.target.value) } })} /></label>
              <label>Security handling destination<input required value={config.escalationSettings.securityHandling} onChange={(event) => setConfig({ ...config, escalationSettings: { ...config.escalationSettings, securityHandling: event.target.value } })} /></label>
              <label>Escalation destination<input required value={config.escalationSettings.escalationDestination} onChange={(event) => setConfig({ ...config, escalationSettings: { ...config.escalationSettings, escalationDestination: event.target.value } })} /></label>
              <button className="dashboard-primary" disabled={busy}>Save escalation settings</button>
            </form>
            <p className="dashboard-footnote">Saving rules records policy settings only. The app does not send emails, page responders, or deliver external alerts.</p>
          </article>
        </div>
      ) : null}

      {tab === 'activity' && isAdmin ? (
        <div className="dashboard-columns">
          <article className="dashboard-card"><p className="eyebrow">Audit</p><h2>Recent dashboard activity</h2>
            {activity.length ? <ul className="dashboard-activity">{activity.map((item) => <li key={item.id}><strong>{item.action}</strong><span>{item.actorName} · {item.targetId} · {dateText(item.timestamp)}</span>{item.details ? <small>{item.details}</small> : null}</li>)}</ul> : <p className="dashboard-empty">No dashboard activity yet.</p>}
          </article>
          <article className="dashboard-card"><p className="eyebrow">Agent workflow</p><h2>Escalation &amp; reassignment requests</h2><RequestList requests={requests} onDecision={decideRequest} busy={busy} /></article>
        </div>
      ) : null}
      <p className="dashboard-disclaimer">Decision support only. Ticket data and operational settings are stored in the local LowDB JSON file. No automated customer replies or external notifications are sent.</p>
    </section>
  );
}

function TicketTable({ tickets, selectedId, onSelect }: { tickets: DashboardTicket[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>
            <th>Ticket</th>
            <th>Category</th>
            <th>Priority &amp; Triage</th>
            <th>Status</th>
            <th>Assignee / Routing</th>
            <th>Updated</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {tickets.map((ticket) => (
            <tr key={ticket.id} className={ticket.id === selectedId ? 'active-row' : ''}>
              <td>
                <strong>{ticket.id}</strong>
                <span>{ticket.subject}</span>
                {ticket.customer_name ? (
                  <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                    👤 {ticket.customer_name}
                  </div>
                ) : null}
                {ticket.demo_data ? <em>Demo data</em> : null}
              </td>
              <td>{ticket.category}</td>
              <td>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                  <span
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      padding: '0.15rem 0.45rem',
                      borderRadius: '4px',
                      display: 'inline-block',
                      width: 'fit-content',
                      background: (ticket.dashboardPriority ?? ticket.triage?.priorityScore ?? 0) >= 75 ? '#fee2e2' : '#e0f2fe',
                      color: (ticket.dashboardPriority ?? ticket.triage?.priorityScore ?? 0) >= 75 ? '#b91c1c' : '#0369a1',
                    }}
                  >
                    Priority: {ticket.dashboardPriority ?? ticket.triage?.priorityScore ?? 35}/100
                  </span>
                  {ticket.triage?.isEscalatedToSenior && (
                    <span style={{ fontSize: '0.7rem', color: '#b91c1c', fontWeight: 600 }}>
                      👑 Senior Escalated
                    </span>
                  )}
                  {ticket.triage?.sentiment && (
                    <span style={{ fontSize: '0.7rem', color: ticket.triage.sentiment === 'Frustrated' ? '#dc2626' : '#64748b' }}>
                      {ticket.triage.sentiment} ({ticket.triage.frustrationScore ?? 0}/100)
                    </span>
                  )}
                </div>
              </td>
              <td>
                <span className="dashboard-status">{ticket.status}</span>
              </td>
              <td>
                <div>
                  <strong>{ticket.assigned_agent || (ticket.triage?.isEscalatedToSenior ? 'Senior Staff' : 'Unassigned')}</strong>
                  {ticket.assigned_team && <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{ticket.assigned_team}</div>}
                </div>
              </td>
              <td>{dateText(ticket.updated_at)}</td>
              <td>
                <button className="dashboard-text-button" onClick={() => onSelect(ticket.id)}>View</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function TicketDetails(props: {
  ticket: DashboardTicket | null;
  user: DashboardUser;
  agents: DashboardUser[];
  assignAgent: string;
  setAssignAgent: (value: string) => void;
  note: string;
  setNote: (value: string) => void;
  draft: string;
  setDraft: (value: string) => void;
  requestForm: { requestType: string; reason: string };
  setRequestForm: (value: { requestType: string; reason: string }) => void;
  busy: boolean;
  onStatus: (value: string) => void;
  onAssign: (event: FormEvent<HTMLFormElement>) => void;
  onText: (event: FormEvent<HTMLFormElement>, kind: 'notes' | 'drafts') => void;
  onRequest: (event: FormEvent<HTMLFormElement>) => void;
}) {
  const { ticket, user, agents, busy } = props;
  if (!ticket) return <div className="dashboard-empty ticket-detail-empty">Select a ticket to review details and take an authorized action.</div>;
  return (
    <section className="dashboard-ticket-detail">
      <div className="dashboard-card-heading"><div><p className="eyebrow">Selected ticket {ticket.demo_data ? '· Demo data' : ''}</p><h2>{ticket.subject}</h2></div><span className="dashboard-status">{ticket.status}</span></div>
      <p className="dashboard-detail-meta">
        {ticket.id} · {ticket.category} · Customer: <strong>{ticket.customer_name || 'Customer'}</strong> · Assigned to {ticket.assigned_agent || 'no agent'}
      </p>
      <p className="dashboard-ticket-description">{ticket.description}</p>

      {ticket.triage ? (
        <div style={{ background: '#f8fafc', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '1rem', margin: '1rem 0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <h4 style={{ margin: 0, fontSize: '0.95rem', color: '#1e293b' }}>
              🤖 Predictive AI Triage &amp; Routing Intelligence
            </h4>
            <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.2rem 0.5rem', borderRadius: '4px', background: ticket.triage.isEscalatedToSenior ? '#fee2e2' : ticket.triage.isKbDeflected ? '#dcfce7' : '#e0f2fe', color: ticket.triage.isEscalatedToSenior ? '#991b1b' : ticket.triage.isKbDeflected ? '#166534' : '#0369a1' }}>
              {ticket.triage.routingLevel || (ticket.triage.isEscalatedToSenior ? 'Senior Staff Escalation' : 'Standard')}
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.75rem', fontSize: '0.82rem', marginBottom: '0.5rem' }}>
            <div>
              <span style={{ color: '#64748b' }}>Priority Score:</span>
              <div style={{ fontWeight: 700, color: (ticket.triage.priorityScore ?? 0) >= 75 ? '#dc2626' : '#0284c7' }}>
                {ticket.triage.priorityScore ?? ticket.dashboardPriority ?? 35} / 100
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Sentiment:</span>
              <div style={{ fontWeight: 700, color: ticket.triage.frustrationScore && ticket.triage.frustrationScore >= 70 ? '#dc2626' : '#334155' }}>
                {ticket.triage.sentiment || 'Analyzed'} ({ticket.triage.frustrationScore ?? 20}/100)
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Urgency:</span>
              <div style={{ fontWeight: 700, color: ticket.triage.urgency === 'Critical' ? '#dc2626' : '#334155' }}>
                {ticket.triage.urgency || ticket.dashboardUrgency || 'Normal'}
              </div>
            </div>
            <div>
              <span style={{ color: '#64748b' }}>Customer Tier:</span>
              <div style={{ fontWeight: 700, color: '#059669' }}>
                {ticket.triage.customerTier || 'Silver'} ({ticket.triage.customerValueScore ?? 50}/100)
              </div>
            </div>
          </div>

          {ticket.triage.escalationReasons?.length ? (
            <div style={{ marginTop: '0.4rem', padding: '0.5rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '4px', fontSize: '0.78rem', color: '#991b1b' }}>
              <strong>Escalation Triggers:</strong>
              <ul style={{ margin: '0.2rem 0 0 1rem', padding: 0 }}>
                {ticket.triage.escalationReasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          ) : null}

          {ticket.triage.kbSolution ? (
            <div style={{ marginTop: '0.4rem', padding: '0.5rem', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '4px', fontSize: '0.78rem', color: '#166534' }}>
              <strong>Automated Knowledge Base Resolution:</strong>
              <pre style={{ margin: '0.2rem 0 0 0', whiteSpace: 'pre-wrap', fontFamily: 'inherit' }}>{ticket.triage.kbSolution}</pre>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="dashboard-inline-fields">
        <label>Status<select value={ticket.status} disabled={busy} onChange={(event) => props.onStatus(event.target.value)}>{ticketStatuses.map((status) => <option key={status}>{status}</option>)}</select></label>
        {user.role === 'Admin' ? <form className="dashboard-assign" onSubmit={props.onAssign}><label>Assign / reassign to<select required value={props.assignAgent} onChange={(event) => props.setAssignAgent(event.target.value)}><option value="">Choose agent</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}{agent.team ? ` · ${agent.team}` : ''}</option>)}</select></label><button className="dashboard-secondary" disabled={busy}>Save assignment</button></form> : null}
      </div>
      <div className="dashboard-ticket-columns">
        <article className="dashboard-subcard"><h3>Internal notes</h3>{ticket.notes?.length ? ticket.notes.map((entry) => <p className="dashboard-note" key={entry.id}><strong>{entry.actorName}</strong> · {dateText(entry.createdAt)}<br />{entry.note}</p>) : <p className="dashboard-empty">No internal notes.</p>}
          <form onSubmit={(event) => props.onText(event, 'notes')} className="dashboard-form"><label>Add private note<textarea required maxLength={4000} rows={3} value={props.note} onChange={(event) => props.setNote(event.target.value)} /></label><button className="dashboard-secondary" disabled={busy}>Save internal note</button></form>
        </article>
        <article className="dashboard-subcard"><h3>Response drafts</h3>{ticket.drafts?.length ? ticket.drafts.map((entry) => <p className="dashboard-note" key={entry.id}><strong>{entry.actorName}</strong> · {dateText(entry.createdAt)} · Draft<br />{entry.body}</p>) : <p className="dashboard-empty">No saved drafts.</p>}
          <form onSubmit={(event) => props.onText(event, 'drafts')} className="dashboard-form"><label>Draft customer response<textarea required maxLength={4000} rows={3} value={props.draft} onChange={(event) => props.setDraft(event.target.value)} /></label><small>Saving a draft does not send it to the customer.</small><button className="dashboard-secondary" disabled={busy}>Save draft only</button></form>
        </article>
      </div>
      <form onSubmit={props.onRequest} className="dashboard-request-form">
        <label>Request type<select value={props.requestForm.requestType} onChange={(event) => props.setRequestForm({ ...props.requestForm, requestType: event.target.value })}><option>Escalation</option><option>Reassignment</option></select></label>
        <label>Reason<textarea required maxLength={1000} rows={2} value={props.requestForm.reason} onChange={(event) => props.setRequestForm({ ...props.requestForm, reason: event.target.value })} placeholder="Explain why review is needed" /></label>
        <button className="dashboard-secondary" disabled={busy}>Submit request</button>
      </form>
      <div className="dashboard-history"><h3>Ticket activity &amp; audit</h3>{ticket.history?.length ? <ul>{ticket.history.slice(-8).reverse().map((item) => <li key={item.id}><strong>{item.event_type}</strong><span>{item.note} · {dateText(item.created_at)}</span></li>)}</ul> : <p className="dashboard-empty">No ticket history recorded.</p>}</div>
    </section>
  );
}

function TeamWorkload({ teams, tickets, users }: { teams: Team[]; tickets: DashboardTicket[]; users: DashboardUser[] }) {
  if (!teams.length) return <p className="dashboard-empty">No teams configured yet.</p>;
  return <div className="team-workload-grid">{teams.map((team) => {
    const members = users.filter((entry) => entry.active && entry.role === 'Support Agent' && entry.team === team.name);
    const memberIds = new Set(members.map((entry) => entry.id));
    const count = tickets.filter((ticket) => ticket.assigned_user_id && memberIds.has(ticket.assigned_user_id) && !['Resolved', 'Closed'].includes(ticket.status)).length;
    const percent = Math.min(100, Math.round(count / Math.max(1, team.capacity) * 100));
    return <div className="team-workload" key={team.id || team.name}><div><strong>{team.name}</strong><span>{members.length} active agents · {count}/{team.capacity} assigned open tickets · {team.active ? 'Configured active' : 'Inactive'}</span></div><div className="team-meter"><span style={{ width: `${percent}%` }} /></div></div>;
  })}</div>;
}

function RequestList({ requests, onDecision, busy }: { requests: DashboardRequest[]; onDecision: (item: DashboardRequest, decision: 'Approved' | 'Declined') => void; busy: boolean }) {
  if (!requests.length) return <p className="dashboard-empty">No escalation or reassignment requests.</p>;
  return <div className="request-list">{requests.map((item) => <div className="request-item" key={item.id}><div><strong>{item.requestType} · {item.ticketId}</strong><span>Requested by {item.actorName} · {item.state} · {dateText(item.createdAt)}</span><p>{item.reason}</p></div>{item.state === 'Requested' ? <div className="inline-controls"><button className="dashboard-secondary" disabled={busy} onClick={() => onDecision(item, 'Approved')}>Approve</button><button className="dashboard-secondary" disabled={busy} onClick={() => onDecision(item, 'Declined')}>Decline</button></div> : null}</div>)}</div>;
}
