import { useEffect, useMemo, useState } from 'react';
import {
  clearRoutingHistory,
  getRoutingData,
  persistRoutingOperation,
  saveRoutingSettings,
  saveRoutingTeams,
} from '../lib/api';
import {
  DEFAULT_ESCALATION_SETTINGS,
  recommendRouting,
  parseRoutingTicket,
  validateRoutingTicket,
} from '../services/intelligentRouting';
import type {
  EscalationSettings,
  RoutingAuditEntry,
  RoutingCategory,
  RoutingRecommendation,
  RoutingStatus,
  RoutingTicketForm,
  RoutingTicketRecord,
  SupportTeam,
} from '../types/intelligentRouting';
import { ROUTING_CATEGORIES } from '../types/intelligentRouting';

const initialForm: RoutingTicketForm = {
  ticketId: '', subject: '', description: '', category: 'Other', urgency: 'Low',
  priorityScore: '', requiredSkills: '', frustrationScore: '', unresolvedContacts: '', currentTeam: '',
};

const defaultTeams: SupportTeam[] = [
  { id: 'sample-billing', name: 'Billing and Payments', categories: ['Billing', 'Payments'], skills: ['payment', 'billing', 'refund'], capacity: 12, openTickets: 5, availability: 'Available', escalationContact: 'Billing Lead', active: true, isSample: true },
  { id: 'sample-technical', name: 'Technical Support', categories: ['Technical Support'], skills: ['troubleshooting', 'application', 'account access'], capacity: 16, openTickets: 9, availability: 'Available', escalationContact: 'Technical Lead', active: true, isSample: true },
  { id: 'sample-account', name: 'Account and Access Support', categories: ['Account Access'], skills: ['account access', 'login', 'identity verification'], capacity: 10, openTickets: 6, availability: 'Available', escalationContact: 'Account Lead', active: true, isSample: true },
  { id: 'sample-delivery', name: 'Delivery and Logistics', categories: ['Delivery'], skills: ['shipping', 'tracking', 'logistics'], capacity: 10, openTickets: 4, availability: 'Available', escalationContact: 'Logistics Lead', active: true, isSample: true },
  { id: 'sample-returns', name: 'Returns and Refunds', categories: ['Refunds'], skills: ['refund', 'returns', 'billing'], capacity: 9, openTickets: 5, availability: 'Available', escalationContact: 'Returns Lead', active: true, isSample: true },
  { id: 'sample-product', name: 'Product Support', categories: ['Product Issues'], skills: ['product troubleshooting', 'quality', 'warranty'], capacity: 10, openTickets: 6, availability: 'Busy', escalationContact: 'Product Lead', active: true, isSample: true },
  { id: 'sample-security', name: 'Security and Critical Incidents', categories: ['Security'], skills: ['security', 'account access', 'incident response'], capacity: 6, openTickets: 3, availability: 'Available', escalationContact: 'Security Lead', active: true, isSample: true },
  { id: 'sample-general', name: 'General Customer Support', categories: ['General', 'Other'], skills: ['customer support', 'general inquiries'], capacity: 20, openTickets: 8, availability: 'Available', escalationContact: 'Support Lead', active: true, isSample: true },
];

const demoTickets: Array<{ label: string; form: RoutingTicketForm }> = [
  { label: 'Sample: payment issue', form: { ...initialForm, ticketId: 'SAMPLE-ROUTE-101', subject: 'Payment processed but order missing', description: 'Payment was taken but the order confirmation was not created.', category: 'Payments', urgency: 'High', priorityScore: '82', requiredSkills: 'payment, billing', frustrationScore: '76', unresolvedContacts: '1' } },
  { label: 'Sample: critical security', form: { ...initialForm, ticketId: 'SAMPLE-ROUTE-102', subject: 'Unknown login to account', description: 'I see a login I do not recognize and cannot secure my account.', category: 'Security', urgency: 'Critical', priorityScore: '58', requiredSkills: 'security, account access', frustrationScore: '', unresolvedContacts: '0' } },
  { label: 'Sample: delivery delay', form: { ...initialForm, ticketId: 'SAMPLE-ROUTE-103', subject: 'Package delivery is overdue', description: 'The tracking page has not updated and the package is late.', category: 'Delivery', urgency: 'Medium', priorityScore: '48', requiredSkills: 'tracking, shipping', frustrationScore: '42', unresolvedContacts: '' } },
];

type RoutingData = { teams: SupportTeam[]; tickets: RoutingTicketRecord[]; audit: RoutingAuditEntry[]; settings: EscalationSettings };

export function IntelligentRoutingPage() {
  const [form, setForm] = useState(initialForm);
  const [teams, setTeams] = useState<SupportTeam[]>([]);
  const [tickets, setTickets] = useState<RoutingTicketRecord[]>([]);
  const [audit, setAudit] = useState<RoutingAuditEntry[]>([]);
  const [settings, setSettings] = useState(DEFAULT_ESCALATION_SETTINGS);
  const [recommendation, setRecommendation] = useState<RoutingRecommendation | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [busy, setBusy] = useState(false);
  const [teamDraft, setTeamDraft] = useState({ name: '', categories: [] as RoutingCategory[], skills: '', capacity: '10', openTickets: '0', availability: 'Available' as SupportTeam['availability'], escalationContact: '' });
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [filters, setFilters] = useState({ category: '', urgency: '', team: '', status: '', minPriority: '' });
  const [isSampleTicket, setIsSampleTicket] = useState(false);
  const [mode, setMode] = useState<'Recommendation' | 'Assignment'>('Recommendation');

  const refresh = async () => {
    const data: RoutingData = await getRoutingData();
    setTeams(data.teams);
    setTickets(data.tickets);
    setAudit(data.audit);
    setSettings(data.settings);
  };

  useEffect(() => {
    refresh().catch((caught: unknown) => setError(caught instanceof Error ? caught.message : 'Unable to load routing data.'));
  }, []);

  const filteredTickets = useMemo(() => tickets.filter(({ ticket, assignedTeam, status }) =>
    (!filters.category || ticket.category === filters.category) &&
    (!filters.urgency || ticket.urgency === filters.urgency) &&
    (!filters.team || assignedTeam === filters.team) &&
    (!filters.status || status === filters.status) &&
    (!filters.minPriority || ticket.priorityScore >= Number(filters.minPriority))
  ), [tickets, filters]);
  const currentAssignedTeam = recommendation
    ? tickets.find((entry) => entry.ticket.ticketId.toLowerCase() === recommendation.ticket.ticketId.toLowerCase())?.assignedTeam ?? ''
    : '';

  const handleRecommendation = async () => {
    const nextErrors = validateRoutingTicket(form);
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }
    setErrors({});
    setError('');
    setSuccess('');
    setBusy(true);
    try {
      const existing = tickets.find((entry) => entry.ticket.ticketId.toLowerCase() === form.ticketId.trim().toLowerCase());
      const useSampleData = isSampleTicket && demoTickets.some((sample) => JSON.stringify(sample.form) === JSON.stringify(form));
      const ticket = parseRoutingTicket(form);
      ticket.currentTeam = form.currentTeam.trim() || existing?.assignedTeam || '';
      ticket.unassignedMinutes = !ticket.currentTeam && existing
        ? Math.max(0, Math.floor((Date.now() - Date.parse(existing.createdAt || existing.updatedAt)) / 60000))
        : null;
      const nextRecommendation = recommendRouting(ticket, teams, settings);
      setIsSampleTicket(useSampleData);
      const now = new Date().toISOString();
      const recordStatus: RoutingStatus = existing?.assignedTeam ? 'Assigned' : nextRecommendation.status;
      const record: RoutingTicketRecord = {
        ticket,
        recommendation: nextRecommendation,
        assignedTeam: existing?.assignedTeam ?? '',
        status: recordStatus,
        escalationReasons: nextRecommendation.escalationReasons,
        isSample: useSampleData,
        updatedAt: now,
        createdAt: existing?.createdAt ?? now,
      };
      const auditEntry: RoutingAuditEntry = {
        id: `route-${Date.now()}`,
        ticketId: ticket.ticketId,
        action: 'Recommendation',
        previousTeam: existing?.assignedTeam ?? '',
        newTeam: nextRecommendation.selectedTeam?.team.name ?? '',
        status: recordStatus,
        reason: nextRecommendation.explanation,
        timestamp: new Date().toISOString(),
        isSample: useSampleData,
      };
      const saved = await persistRoutingOperation({ record, auditEntry });
      setRecommendation(nextRecommendation);
      setTickets((current) => [saved.record, ...current.filter((entry) => entry.ticket.ticketId.toLowerCase() !== ticket.ticketId.toLowerCase())]);
      setAudit(saved.audit);
      setSuccess(existing?.assignedTeam ? 'Updated recommendation saved. Existing assignment was not changed.' : 'Recommendation saved. No ticket assignment has been changed.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save routing recommendation.');
    } finally {
      setBusy(false);
    }
  };

  const persistStatusAction = async (action: 'Assignment' | 'Reassignment' | 'Escalation' | 'Manual Override', targetTeam = '') => {
    if (!recommendation) return;
    const ticket = recommendation.ticket;
    const existing = tickets.find((entry) => entry.ticket.ticketId.toLowerCase() === ticket.ticketId.toLowerCase());
    if (action === 'Assignment' || action === 'Reassignment' || (action === 'Manual Override' && targetTeam)) {
      if (!targetTeam || !window.confirm(`${action === 'Reassignment' ? 'Reassign' : 'Assign'} ${ticket.ticketId} to ${targetTeam}?`)) return;
    } else if (action === 'Escalation' && !window.confirm(`Record escalation for ${ticket.ticketId}? This records an internal escalation state only; no external alert will be sent.`)) {
      return;
    } else if (action === 'Manual Override' && !window.confirm(`Send ${ticket.ticketId} to manual review?`)) {
      return;
    }
    setBusy(true);
    setError('');
    setSuccess('');
    const status: RoutingStatus = action === 'Assignment' || action === 'Reassignment' || (action === 'Manual Override' && Boolean(targetTeam))
      ? 'Assigned'
      : action === 'Escalation'
        ? 'Escalated'
        : 'Awaiting Manual Review';
    const record: RoutingTicketRecord = {
      ticket,
      recommendation,
      assignedTeam: targetTeam || existing?.assignedTeam || '',
      status,
      escalationReasons: recommendation.escalationReasons,
      isSample: isSampleTicket || existing?.isSample || false,
      updatedAt: new Date().toISOString(),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    };
    const auditEntry: RoutingAuditEntry = {
      id: `route-${Date.now()}`,
      ticketId: ticket.ticketId,
      action,
      previousTeam: existing?.assignedTeam ?? ticket.currentTeam,
      newTeam: targetTeam || existing?.assignedTeam || '',
      status,
      reason: action === 'Escalation'
        ? `${recommendation.escalationReasons.join(' ') || 'Escalated for manual review by the operator.'} Suggested destination: ${recommendation.escalationDestination}.`
        : action === 'Manual Override'
          ? targetTeam
            ? `Operator manually selected ${targetTeam} instead of the top-ranked recommendation.`
            : 'Operator requested manual review instead of automated assignment.'
          : `${action} confirmed by operator after routing recommendation.`,
      timestamp: new Date().toISOString(),
      isSample: record.isSample,
    };
    try {
      const saved = await persistRoutingOperation({ record, auditEntry });
      setTickets((current) => [saved.record, ...current.filter((entry) => entry.ticket.ticketId.toLowerCase() !== ticket.ticketId.toLowerCase())]);
      setAudit(saved.audit);
      setSuccess(action === 'Escalation'
        ? 'Escalation status was recorded successfully. No external notification was sent.'
        : `${action} completed and saved successfully.`);
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : `Unable to complete ${action.toLowerCase()}.`);
    } finally {
      setBusy(false);
    }
  };

  const saveTeamDraft = async () => {
    if (!teamDraft.name.trim() || teamDraft.categories.length === 0 || !Number.isInteger(Number(teamDraft.capacity)) || Number(teamDraft.capacity) < 1 || !Number.isInteger(Number(teamDraft.openTickets)) || Number(teamDraft.openTickets) < 0) {
      setError('Team name, at least one category, and valid workload/capacity values are required.');
      return;
    }
    const team: SupportTeam = {
      id: editingTeamId ?? `team-${Date.now()}`,
      name: teamDraft.name.trim(),
      categories: teamDraft.categories,
      skills: teamDraft.skills.split(',').map((skill) => skill.trim()).filter(Boolean),
      capacity: Number(teamDraft.capacity),
      openTickets: Number(teamDraft.openTickets),
      availability: teamDraft.availability,
      escalationContact: teamDraft.escalationContact.trim(),
      active: true,
      isSample: false,
    };
    try {
      const next = editingTeamId ? teams.map((entry) => entry.id === editingTeamId ? { ...team, active: entry.active, isSample: entry.isSample } : entry) : [...teams, team];
      setTeams(await saveRoutingTeams(next));
      setTeamDraft({ name: '', categories: [], skills: '', capacity: '10', openTickets: '0', availability: 'Available', escalationContact: '' });
      setEditingTeamId(null);
      setSuccess('Team configuration saved.');
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save team configuration.');
    }
  };

  const editTeam = (team: SupportTeam) => {
    setEditingTeamId(team.id);
    setTeamDraft({
      name: team.name,
      categories: team.categories,
      skills: team.skills.join(', '),
      capacity: String(team.capacity),
      openTickets: String(team.openTickets),
      availability: team.availability,
      escalationContact: team.escalationContact,
    });
  };

  const toggleTeam = async (team: SupportTeam) => {
    try {
      setTeams(await saveRoutingTeams(teams.map((entry) => entry.id === team.id ? { ...entry, active: !entry.active } : entry)));
      setSuccess(`Team ${team.active ? 'deactivated' : 'activated'}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update team status.');
    }
  };

  const saveSettings = async () => {
    if (settings.highPriorityThreshold < 0 || settings.highPriorityThreshold > 100 || settings.repeatContactThreshold < 1 || settings.unassignedEscalationMinutes < 1) {
      setError('Priority threshold must be 0–100; repeat-contact and unassigned duration thresholds must be at least 1.');
      return;
    }
    try {
      setSettings(await saveRoutingSettings(settings));
      setSuccess('Escalation rules saved.');
      setError('');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to save escalation rules.');
    }
  };

  const startSample = (sample: typeof demoTickets[number]) => {
    setForm(sample.form);
    setRecommendation(null);
    setErrors({});
    setSuccess('');
    setIsSampleTicket(true);
  };

  const clearHistory = async () => {
    if (!window.confirm('Clear routing ticket and audit history? Team configuration will be preserved.')) return;
    try {
      await clearRoutingHistory();
      setTickets([]);
      setAudit([]);
      setRecommendation(null);
      setSuccess('Routing and audit history cleared.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to clear routing history.');
    }
  };

  return (
    <section className="routing-page">
      <header className="routing-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <img src="/logo.png" alt="SupportSphere AI" className="brand-logo-img" />
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Module 7 · Transparent rule-based routing</p>
            <h1 style={{ margin: 0 }}>Route support tickets to the best-fit team, with reviewable reasons.</h1>
            <p style={{ margin: '4px 0 0' }}>Recommendations use configured categories, skills, workload, and availability. Team workloads are example configuration until replaced with verified operational data.</p>
          </div>
        </div>
      </header>

      {error ? <div className="routing-alert error" role="alert">{error}</div> : null}
      {success ? <div className="routing-alert success" role="status">{success}</div> : null}

      <div className="routing-layout">
        <div className="routing-main">
          <section className="routing-card">
              <div className="routing-heading"><div><p className="eyebrow">New routing request</p><h2>Ticket details</h2></div><label className="routing-mode">Mode<select value={mode} onChange={(event) => setMode(event.target.value as typeof mode)}><option value="Recommendation">Recommendation Mode</option><option value="Assignment">Assignment Mode</option></select></label></div>
            <div className="routing-form">
              <label>Ticket ID<input value={form.ticketId} onChange={(event) => { setForm({ ...form, ticketId: event.target.value }); setIsSampleTicket(false); }} />{errors.ticketId && <small>{errors.ticketId}</small>}</label>
              <label>Ticket subject<input value={form.subject} onChange={(event) => { setForm({ ...form, subject: event.target.value }); setIsSampleTicket(false); }} />{errors.subject && <small>{errors.subject}</small>}</label>
              <label className="routing-wide">Ticket description<textarea rows={3} value={form.description} onChange={(event) => { setForm({ ...form, description: event.target.value }); setIsSampleTicket(false); }} />{errors.description && <small>{errors.description}</small>}</label>
              <label>Issue category<select value={form.category} onChange={(event) => setForm({ ...form, category: event.target.value as RoutingCategory })}>{ROUTING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label>
              <label>Urgency<select value={form.urgency} onChange={(event) => setForm({ ...form, urgency: event.target.value as RoutingTicketForm['urgency'] })}>{['Low', 'Medium', 'High', 'Critical'].map((value) => <option key={value}>{value}</option>)}</select></label>
              <label>Priority score (0–100)<input type="number" min="0" max="100" value={form.priorityScore} onChange={(event) => setForm({ ...form, priorityScore: event.target.value })} />{errors.priorityScore && <small>{errors.priorityScore}</small>}</label>
              <label>Required skills (comma-separated)<input value={form.requiredSkills} onChange={(event) => setForm({ ...form, requiredSkills: event.target.value })} placeholder="e.g. payment, refund" /></label>
              <label>Customer frustration (optional)<input type="number" min="0" max="100" value={form.frustrationScore} onChange={(event) => setForm({ ...form, frustrationScore: event.target.value })} />{errors.frustrationScore && <small>{errors.frustrationScore}</small>}</label>
              <label>Previous unresolved contacts (optional)<input type="number" min="0" step="1" value={form.unresolvedContacts} onChange={(event) => setForm({ ...form, unresolvedContacts: event.target.value })} />{errors.unresolvedContacts && <small>{errors.unresolvedContacts}</small>}</label>
              <label>Current assigned team (optional)<input value={form.currentTeam} onChange={(event) => setForm({ ...form, currentTeam: event.target.value })} /></label>
            </div>
            <div className="routing-actions"><button className="primary-button" type="button" disabled={busy} onClick={() => void handleRecommendation()}>{busy ? 'Saving...' : 'Recommend Team'}</button></div>
            <div className="routing-samples"><span>Sample tickets · illustrative inputs</span>{demoTickets.map((sample) => <button className="secondary-button" key={sample.label} type="button" onClick={() => startSample(sample)}>{sample.label}</button>)}</div>
          </section>

          {recommendation ? (
            <section className="routing-card">
              <div className="routing-heading"><div><p className="eyebrow">Routing recommendation</p><h2>{recommendation.selectedTeam?.team.name ?? 'Manual assignment required'}</h2></div><span className={`routing-status status-${recommendation.status.toLowerCase().replaceAll(' ', '-')}`}>{recommendation.status}</span></div>
              {recommendation.criticalWarning ? <div className="routing-critical" role="alert"><strong>{recommendation.ticket.urgency === 'Critical' ? 'Critical urgency — immediate review required.' : 'Security category — verify security handling immediately.'}</strong><span>Team workload must not downgrade critical or security handling.</span></div> : null}
              <p className="routing-explanation">{recommendation.explanation}</p>
              <p className="routing-handling"><strong>Handling:</strong> {recommendation.recommendedHandling}</p>
              {recommendation.escalationReasons.length ? <div className="routing-escalations"><h3>Escalation assessment</h3><p><strong>Suggested destination:</strong> {recommendation.escalationDestination}</p>{recommendation.escalationReasons.map((reason) => <p key={reason}>• {reason}</p>)}<small>Recommendation only; no external notification has been sent.</small></div> : null}
              {recommendation.alternatives.length ? <div className="routing-alternatives"><h3>Alternative eligible teams</h3>{recommendation.alternatives.map((match) => <p key={match.team.id}><strong>{match.team.name}</strong> — ranked lower by capacity/availability fit ({match.score}%); {match.explanation}{mode === 'Assignment' && recommendation.ticket.category !== 'Security' ? <button type="button" className="priority-view-button" onClick={() => void persistStatusAction('Manual Override', match.team.name)}>Select and assign (manual override)</button> : null}</p>)}</div> : null}
              {recommendation.selectedTeam ? <div className="routing-actions">
                {mode === 'Assignment' ? <button className="primary-button" type="button" disabled={busy || currentAssignedTeam === recommendation.selectedTeam.team.name} onClick={() => void persistStatusAction(currentAssignedTeam ? 'Reassignment' : 'Assignment', recommendation.selectedTeam?.team.name)}>{currentAssignedTeam === recommendation.selectedTeam.team.name ? 'Already assigned' : currentAssignedTeam ? 'Reassign Ticket' : 'Confirm Assignment'}</button> : null}
                {recommendation.escalationReasons.length ? <button className="secondary-button" type="button" disabled={busy} onClick={() => void persistStatusAction('Escalation')}>Escalate Ticket</button> : null}
              </div> : <div className="routing-actions"><button className="secondary-button" type="button" disabled={busy} onClick={() => void persistStatusAction('Manual Override')}>Request Manual Review</button><button className="secondary-button" type="button" disabled={busy} onClick={() => void persistStatusAction('Escalation')}>Record Escalation</button></div>}
            </section>
          ) : null}

          <section className="routing-card">
            <div className="routing-heading"><div><p className="eyebrow">Audit and activity</p><h2>Ticket routing history</h2></div><button type="button" className="secondary-button" onClick={() => void clearHistory()} disabled={!tickets.length && !audit.length}>Clear history</button></div>
            <div className="routing-filters">
              <select aria-label="Filter by category" value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All categories</option>{ROUTING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select>
              <select aria-label="Filter by urgency" value={filters.urgency} onChange={(event) => setFilters({ ...filters, urgency: event.target.value })}><option value="">All urgency</option>{['Low', 'Medium', 'High', 'Critical'].map((value) => <option key={value}>{value}</option>)}</select>
              <select aria-label="Filter by team" value={filters.team} onChange={(event) => setFilters({ ...filters, team: event.target.value })}><option value="">All teams</option>{teams.map((team) => <option key={team.id} value={team.name}>{team.name}</option>)}</select>
              <select aria-label="Filter by status" value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{['Unassigned', 'Recommended', 'Assigned', 'Escalation Recommended', 'Escalated', 'Awaiting Manual Review'].map((status) => <option key={status}>{status}</option>)}</select>
              <input aria-label="Minimum priority" type="number" min="0" max="100" placeholder="Min priority" value={filters.minPriority} onChange={(event) => setFilters({ ...filters, minPriority: event.target.value })} />
            </div>
            {!filteredTickets.length ? <p className="routing-empty">No routing records match these filters.</p> : <div className="routing-table-wrap"><table><thead><tr><th>Ticket</th><th>Category / urgency</th><th>Priority</th><th>Team</th><th>Status</th><th>Type</th></tr></thead><tbody>{filteredTickets.map((record) => <tr key={record.ticket.ticketId}><td><strong>{record.ticket.ticketId}</strong><small>{record.ticket.subject}</small></td><td>{record.ticket.category}<small>{record.ticket.urgency}</small></td><td>{record.ticket.priorityScore}</td><td>{record.assignedTeam || record.recommendation?.selectedTeam?.team.name || '—'}</td><td>{record.status}</td><td>{record.isSample ? 'Sample' : 'Entered'}</td></tr>)}</tbody></table></div>}
            <div className="routing-audit-grid"><div><h3>Assignment history</h3>{audit.filter((entry) => ['Assignment', 'Reassignment', 'Manual Override'].includes(entry.action)).slice(0, 6).map((entry) => <p key={entry.id}><strong>{entry.action}</strong> · {entry.ticketId} · {entry.previousTeam || 'Unassigned'} → {entry.newTeam || 'Manual review'}<small>{new Date(entry.timestamp).toLocaleString()} · {entry.isSample ? 'Sample' : 'Entered'}</small></p>)}{!audit.some((entry) => ['Assignment', 'Reassignment', 'Manual Override'].includes(entry.action)) && <p className="routing-empty">No assignment actions recorded.</p>}</div><div><h3>Escalation history</h3>{audit.filter((entry) => entry.action === 'Escalation').slice(0, 6).map((entry) => <p key={entry.id}><strong>{entry.status}</strong> · {entry.ticketId}<small>{entry.reason} · {new Date(entry.timestamp).toLocaleString()}</small></p>)}{!audit.some((entry) => entry.action === 'Escalation') && <p className="routing-empty">No escalation actions recorded.</p>}</div></div>
          </section>
        </div>

        <aside className="routing-side">
          <section className="routing-card">
            <div className="routing-heading"><div><p className="eyebrow">Team management</p><h2>Configured teams</h2></div><span className="routing-sample-flag">Workload values may be sample data</span></div>
            <div className="routing-team-list">{teams.map((team) => <article className="routing-team" key={team.id}><div className="routing-team-title"><strong>{team.name}</strong><span className={team.active ? 'team-active' : 'team-inactive'}>{team.active ? 'Active' : 'Inactive'}</span></div><p>{team.categories.join(', ')}</p><div className="routing-workload"><span>{team.openTickets}/{team.capacity} open tickets</span><span>{team.availability}</span></div><div className="routing-progress"><span style={{ width: `${Math.min(100, (team.openTickets / team.capacity) * 100)}%` }} /></div><small>{team.isSample ? 'Sample configuration' : 'Configured team'}{team.escalationContact ? ` · ${team.escalationContact}` : ''}</small><div className="routing-team-actions"><button type="button" className="priority-view-button" onClick={() => editTeam(team)}>Edit</button><button type="button" className="priority-view-button" onClick={() => void toggleTeam(team)}>{team.active ? 'Deactivate' : 'Activate'}</button></div></article>)}</div>
            <details className="routing-team-editor"><summary>{editingTeamId ? 'Edit team configuration' : 'Add a team'}</summary><div className="routing-team-form"><label>Team name<input value={teamDraft.name} onChange={(event) => setTeamDraft({ ...teamDraft, name: event.target.value })} /></label><label>Categories<select multiple value={teamDraft.categories} onChange={(event) => setTeamDraft({ ...teamDraft, categories: Array.from(event.target.selectedOptions, (option) => option.value as RoutingCategory) })}>{ROUTING_CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></label><small>Use Ctrl/Command to select multiple categories.</small><label>Skills, comma-separated<input value={teamDraft.skills} onChange={(event) => setTeamDraft({ ...teamDraft, skills: event.target.value })} /></label><label>Maximum workload<input type="number" min="1" value={teamDraft.capacity} onChange={(event) => setTeamDraft({ ...teamDraft, capacity: event.target.value })} /></label><label>Current open tickets<input type="number" min="0" value={teamDraft.openTickets} onChange={(event) => setTeamDraft({ ...teamDraft, openTickets: event.target.value })} /></label><label>Availability<select value={teamDraft.availability} onChange={(event) => setTeamDraft({ ...teamDraft, availability: event.target.value as SupportTeam['availability'] })}><option>Available</option><option>Busy</option><option>Unavailable</option></select></label><label>Escalation contact / role<input value={teamDraft.escalationContact} onChange={(event) => setTeamDraft({ ...teamDraft, escalationContact: event.target.value })} /></label><button type="button" className="primary-button" onClick={() => void saveTeamDraft()}>{editingTeamId ? 'Save team' : 'Add team'}</button>{editingTeamId ? <button type="button" className="secondary-button" onClick={() => { setEditingTeamId(null); setTeamDraft({ name: '', categories: [], skills: '', capacity: '10', openTickets: '0', availability: 'Available', escalationContact: '' }); }}>Cancel edit</button> : null}</div></details>
          </section>

          <section className="routing-card">
            <div className="routing-heading"><div><p className="eyebrow">Escalation settings</p><h2>Rule thresholds</h2></div></div>
            <label className="routing-setting">High priority threshold<input type="number" min="0" max="100" value={settings.highPriorityThreshold} onChange={(event) => setSettings({ ...settings, highPriorityThreshold: Number(event.target.value) })} /></label>
            <label className="routing-setting">Repeated unresolved contacts<input type="number" min="1" value={settings.repeatContactThreshold} onChange={(event) => setSettings({ ...settings, repeatContactThreshold: Number(event.target.value) })} /></label>
            <label className="routing-setting">Unassigned escalation duration (minutes)<input type="number" min="1" value={settings.unassignedEscalationMinutes} onChange={(event) => setSettings({ ...settings, unassignedEscalationMinutes: Number(event.target.value) })} /></label>
            <label className="routing-setting">Security destination<select value={settings.securityDestination} onChange={(event) => setSettings({ ...settings, securityDestination: event.target.value })}><option value="">Not configured</option>{teams.map((team) => <option key={team.id}>{team.name}</option>)}</select></label>
            <label className="routing-setting">Default escalation role<input value={settings.defaultEscalationDestination} onChange={(event) => setSettings({ ...settings, defaultEscalationDestination: event.target.value })} /></label>
            <button type="button" className="secondary-button" onClick={() => void saveSettings()}>Save escalation rules</button>
            <p className="routing-disclosure">Critical, threshold, security, repeated-contact, and no-eligible-team rules create internal recommendations. The Escalate action records a local escalation status only; there is no email or external alert integration.</p>
          </section>
        </aside>
      </div>
    </section>
  );
}
