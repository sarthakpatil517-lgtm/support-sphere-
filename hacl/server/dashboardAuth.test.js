import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let app;
let server;
let origin;
let dataDir;
let adminCookie;
let agentCookie;
let adminSetCookie;
let adminId;
let agentId;
let demoTicketId;
let isDashboardSessionValid;

const request = async (route, { method = 'GET', body, cookie, headers = {} } = {}) => {
  const response = await fetch(`${origin}${route}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      Origin: 'http://localhost:5173',
      ...(cookie ? { Cookie: cookie } : {}),
      ...headers,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const result = await response.json();
  return { response, result };
};

const cookieFrom = (response) => response.headers.get('set-cookie')?.split(';')[0];

beforeAll(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'dashboard-test-'));
  process.env.NODE_ENV = 'test';
  process.env.DASHBOARD_DATA_DIR = dataDir;
  process.env.ADMIN_BOOTSTRAP_EMAIL = 'module9-admin@example.test';
  process.env.ADMIN_BOOTSTRAP_PASSWORD = 'test-only-long-password';
  process.env.DASHBOARD_ORIGIN = 'http://localhost:5173';
  vi.resetModules();
  ({ app } = await import('./index.js'));
  ({ isDashboardSessionValid } = await import('./db.js'));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;

  const login = await request('/api/dashboard/auth/login', {
    method: 'POST',
    body: { email: 'module9-admin@example.test', password: 'test-only-long-password' },
  });
  adminCookie = cookieFrom(login.response);
  adminSetCookie = login.response.headers.get('set-cookie');
  adminId = login.result.user.id;
  const overview = await request('/api/dashboard/overview', { cookie: adminCookie });
  demoTicketId = overview.result.tickets[0].id;
  const created = await request('/api/dashboard/users', {
    method: 'POST',
    cookie: adminCookie,
    body: {
      name: 'Test Agent',
      email: 'module9-agent@example.test',
      role: 'Support Agent',
      password: 'agent-test-password-12',
    },
  });
  agentId = created.result.id;
});

afterAll(async () => {
  try {
    const { closeAllSseClients } = await import('./realtime.js');
    closeAllSseClients();
  } catch {}
  if (server) {
    server.closeAllConnections?.();
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
  if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
  delete process.env.DASHBOARD_DATA_DIR;
  delete process.env.ADMIN_BOOTSTRAP_EMAIL;
  delete process.env.ADMIN_BOOTSTRAP_PASSWORD;
  delete process.env.DASHBOARD_ORIGIN;
  delete process.env.NODE_ENV;
});

describe('Agent & Admin Dashboard API', () => {
  it('requires sign-in and rejects requests from an unapproved origin', async () => {
    const unauthorized = await request('/api/dashboard/overview');
    expect(unauthorized.response.status).toBe(401);

    const forbidden = await request('/api/dashboard/auth/status', {
      headers: { Origin: 'https://untrusted.example' },
    });
    expect(forbidden.response.status).toBe(403);
  });

  it('bootstraps and authenticates users without exposing password material', async () => {
    expect(adminCookie).toBeTruthy();
    expect(adminCookie).toContain('dashboard_session=');
    expect(adminSetCookie).toContain('HttpOnly');
    expect(adminSetCookie).toContain('SameSite=Strict');

    const users = await request('/api/dashboard/users', { cookie: adminCookie });
    const agent = users.result.find((user) => user.id === agentId);
    expect(agent).toMatchObject({ email: 'module9-agent@example.test', role: 'Support Agent' });
    expect(agent).not.toHaveProperty('passwordHash');
    expect(agent).not.toHaveProperty('passwordSalt');

    const login = await request('/api/dashboard/auth/login', {
      method: 'POST',
      body: { email: 'module9-agent@example.test', password: 'agent-test-password-12' },
    });
    agentCookie = cookieFrom(login.response);
    expect(login.response.status).toBe(200);
    expect(agentCookie).toContain('dashboard_session=');
  });

  it('scopes agents to assigned tickets and rejects admin-only changes', async () => {
    const beforeAssignment = await request('/api/dashboard/overview', { cookie: agentCookie });
    expect(beforeAssignment.result.tickets).toHaveLength(0);

    const assignment = await request(`/api/dashboard/tickets/${encodeURIComponent(demoTicketId)}/assign`, {
      method: 'POST',
      cookie: adminCookie,
      body: { agentId },
    });
    expect(assignment.response.status).toBe(200);
    expect(assignment.result.assigned_user_id).toBe(agentId);

    const agentOverview = await request('/api/dashboard/overview', { cookie: agentCookie });
    expect(agentOverview.result.tickets.map((ticket) => ticket.id)).toContain(demoTicketId);

    const denied = await request(`/api/dashboard/tickets/${encodeURIComponent(demoTicketId)}/assign`, {
      method: 'POST',
      cookie: agentCookie,
      body: { agentId },
    });
    expect(denied.response.status).toBe(403);

    const duplicate = await request(`/api/dashboard/tickets/${encodeURIComponent(demoTicketId)}/assign`, {
      method: 'POST',
      cookie: adminCookie,
      body: { agentId },
    });
    expect(duplicate.response.status).toBe(409);
  });

  it('prevents removing the final active administrator and duplicate email updates', async () => {
    const demote = await request(`/api/dashboard/users/${encodeURIComponent(adminId)}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { role: 'Support Agent' },
    });
    expect(demote.response.status).toBe(409);

    const duplicateEmail = await request(`/api/dashboard/users/${encodeURIComponent(adminId)}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { email: 'module9-agent@example.test' },
    });
    expect(duplicateEmail.response.status).toBe(409);
  });

  it('persists private notes, drafts, and request decisions without sending external messages', async () => {
    const note = await request(`/api/dashboard/tickets/${encodeURIComponent(demoTicketId)}/notes`, {
      method: 'POST',
      cookie: agentCookie,
      body: { note: 'Internal test note' },
    });
    expect(note.response.status).toBe(201);

    const draft = await request(`/api/dashboard/tickets/${encodeURIComponent(demoTicketId)}/drafts`, {
      method: 'POST',
      cookie: agentCookie,
      body: { body: 'Draft reply for test only' },
    });
    expect(draft.response.status).toBe(201);

    const requestRecord = await request(`/api/dashboard/tickets/${encodeURIComponent(demoTicketId)}/requests`, {
      method: 'POST',
      cookie: agentCookie,
      body: { requestType: 'Escalation', reason: 'Requires administrator review.' },
    });
    expect(requestRecord.response.status).toBe(201);

    const decision = await request(`/api/dashboard/requests/${encodeURIComponent(requestRecord.result.id)}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { decision: 'Approved' },
    });
    expect(decision.response.status).toBe(200);
    expect(decision.result.state).toBe('Approved');

    const duplicateDecision = await request(`/api/dashboard/requests/${encodeURIComponent(requestRecord.result.id)}`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { decision: 'Declined' },
    });
    expect(duplicateDecision.response.status).toBe(409);

    const details = await request(`/api/dashboard/tickets/${encodeURIComponent(demoTicketId)}`, { cookie: agentCookie });
    expect(details.result.notes[0].note).toBe('Internal test note');
    expect(details.result.drafts[0].body).toBe('Draft reply for test only');
    expect(details.result.history.some((entry) => entry.event_type === 'Ticket escalation confirmed')).toBe(true);
  });

  it('expires sessions at the deadline and supports revocation', async () => {
    expect(isDashboardSessionValid({ expiresAt: new Date(Date.now() + 1000).toISOString() })).toBe(true);
    expect(isDashboardSessionValid({ expiresAt: new Date(Date.now() - 1000).toISOString() })).toBe(false);
    expect(isDashboardSessionValid({ expiresAt: 'not-a-date' })).toBe(false);

    const logout = await request('/api/dashboard/auth/logout', {
      method: 'POST',
      cookie: agentCookie,
    });
    expect(logout.response.status).toBe(200);
    const revoked = await request('/api/dashboard/auth/session', { cookie: agentCookie });
    expect(revoked.response.status).toBe(401);
  });
});
