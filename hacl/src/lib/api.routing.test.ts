import { afterEach, describe, expect, it, vi } from 'vitest';
import { persistRoutingOperation } from './api';
import type { RoutingAuditEntry, RoutingTicketRecord } from '../types/intelligentRouting';

const record: RoutingTicketRecord = {
  ticket: {
    ticketId: 'ROUTE-API-01',
    subject: 'Account access question',
    description: 'Cannot sign in after reset.',
    category: 'Account Access',
    urgency: 'High',
    priorityScore: 80,
    requiredSkills: ['login'],
    frustrationScore: null,
    unresolvedContacts: null,
    currentTeam: '',
    unassignedMinutes: null,
  },
  recommendation: null,
  assignedTeam: 'Account and Access Support',
  status: 'Assigned',
  escalationReasons: [],
  isSample: false,
  updatedAt: '2026-10-11T00:00:00.000Z',
  createdAt: '2026-10-11T00:00:00.000Z',
};

const auditEntry: RoutingAuditEntry = {
  id: 'audit-1',
  ticketId: 'ROUTE-API-01',
  action: 'Manual Override',
  previousTeam: 'General Customer Support',
  newTeam: 'Account and Access Support',
  status: 'Assigned',
  reason: 'Operator selected an alternate team.',
  timestamp: '2026-10-11T00:00:00.000Z',
  isSample: false,
};

describe('routing operation persistence API', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('persists confirmed assignment data and manual override audit details', async () => {
    const responseData = { record, audit: [auditEntry] };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify(responseData), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await persistRoutingOperation({ record, auditEntry });
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];

    expect(url).toBe('/api/routing/operation');
    expect(options.method).toBe('POST');
    expect(JSON.parse(String(options.body)).auditEntry.action).toBe('Manual Override');
    expect(result.record.status).toBe('Assigned');
    expect(result.audit[0].previousTeam).toBe('General Customer Support');
    expect(result.audit[0].newTeam).toBe('Account and Access Support');
  });

  it('surfaces a failed database/API operation instead of returning success-shaped data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: 'Database write failed.' }), { status: 500, headers: { 'Content-Type': 'application/json' } })));

    await expect(persistRoutingOperation({ record, auditEntry })).rejects.toThrow('Database write failed.');
  });

  it('records escalation status as a distinct persisted operation', async () => {
    const escalationRecord = { ...record, assignedTeam: '', status: 'Escalated' as const, escalationReasons: ['Critical urgency requires immediate escalation review.'] };
    const escalationAudit = { ...auditEntry, action: 'Escalation' as const, previousTeam: '', newTeam: '', status: 'Escalated' as const, reason: 'Critical urgency requires immediate review.' };
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ record: escalationRecord, audit: [escalationAudit] }), { status: 201, headers: { 'Content-Type': 'application/json' } }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await persistRoutingOperation({ record: escalationRecord, auditEntry: escalationAudit });
    expect(result.record.status).toBe('Escalated');
    expect(result.audit[0].action).toBe('Escalation');
  });
});
