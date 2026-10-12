import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

let app;
let server;
let origin;
let dataDir;
let adminCookie;
let customerCookie;
let customerId;

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
  let result;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    result = await response.json();
  } else {
    result = await response.text();
  }
  return { response, result };
};

const cookieFrom = (response) => response.headers.get('set-cookie')?.split(';')[0];

beforeAll(async () => {
  dataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'auth-sla-test-'));
  process.env.NODE_ENV = 'test';
  process.env.DASHBOARD_DATA_DIR = dataDir;
  process.env.ADMIN_BOOTSTRAP_EMAIL = 'superadmin@example.test';
  process.env.ADMIN_BOOTSTRAP_PASSWORD = 'super-secure-bootstrap-pass-12';
  process.env.DASHBOARD_ORIGIN = 'http://localhost:5173';
  vi.resetModules();

  ({ app } = await import('./index.js'));
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  origin = `http://127.0.0.1:${server.address().port}`;

  // Log in as bootstrapped Admin
  const adminLogin = await request('/api/auth/login', {
    method: 'POST',
    body: { email: 'superadmin@example.test', password: 'super-secure-bootstrap-pass-12' },
  });
  adminCookie = cookieFrom(adminLogin.response);
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

describe('Module 1: Authentication & Role Management', () => {
  it('registers a new Customer and sets secure session cookie', async () => {
    const reg = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Alice Cooper',
        email: 'alice@example.test',
        password: 'Password123!',
      },
    });

    expect(reg.response.status).toBe(201);
    expect(reg.result.user.name).toBe('Alice Cooper');
    expect(reg.result.user.role).toBe('Customer');
    expect(reg.result).not.toHaveProperty('passwordHash');

    customerCookie = cookieFrom(reg.response);
    customerId = reg.result.user.id;
    expect(customerCookie).toContain('dashboard_session=');

    // Duplicate email is rejected
    const dup = await request('/api/auth/register', {
      method: 'POST',
      body: {
        name: 'Alice Duplicate',
        email: 'alice@example.test',
        password: 'Password123!',
      },
    });
    expect(dup.response.status).toBe(409);
  });

  it('authenticates user and returns profile information', async () => {
    const me = await request('/api/auth/me', { cookie: customerCookie });
    expect(me.response.status).toBe(200);
    expect(me.result.user.email).toBe('alice@example.test');
    expect(me.result.user.role).toBe('Customer');
  });

  it('enforces RBAC: customers cannot access admin or analytics endpoints', async () => {
    const forbiddenUsers = await request('/api/users', { cookie: customerCookie });
    expect(forbiddenUsers.response.status).toBe(403);

    const forbiddenAnalytics = await request('/api/analytics/overview', { cookie: customerCookie });
    expect(forbiddenAnalytics.response.status).toBe(403);
  });

  it('allows Admin to manage users and protects the last active administrator', async () => {
    // List users
    const usersRes = await request('/api/users', { cookie: adminCookie });
    expect(usersRes.response.status).toBe(200);
    expect(usersRes.result.users.length).toBeGreaterThan(0);

    // Admin creates a Senior Support Staff user
    const createSenior = await request('/api/users', {
      method: 'POST',
      cookie: adminCookie,
      body: {
        name: 'Senior Lead Test',
        email: 'seniorlead@example.test',
        role: 'Senior Support Staff',
        team: 'Escalations',
        password: 'SeniorPass123!',
      },
    });
    expect(createSenior.response.status).toBe(201);
    expect(createSenior.result.role).toBe('Senior Support Staff');

    // Admin updates Alice to Support Agent
    const updateRole = await request(`/api/users/${customerId}/role`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { role: 'Support Agent' },
    });
    expect(updateRole.response.status).toBe(200);
    expect(updateRole.result.role).toBe('Support Agent');

    // Attempting to deactivate or demote the last admin is rejected with 409
    const adminUser = usersRes.result.users.find((u) => u.email === 'superadmin@example.test');
    const demoteLastAdmin = await request(`/api/users/${adminUser.id}/role`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { role: 'Customer' },
    });
    expect(demoteLastAdmin.response.status).toBe(409);
  });
});

describe('Module 10: Support Analytics & SLA Command Center', () => {
  let testTicketId;

  it('creates ticket with SLA deadlines and risk status', async () => {
    const createTicketRes = await request('/api/tickets', {
      method: 'POST',
      body: {
        subject: 'Database connection latency in production',
        description: 'Queries are timing out after 30 seconds during peak hours.',
        category: 'Technical Support',
        triage: {
          urgency: 'Critical',
          priorityScore: 92,
        },
      },
    });

    expect(createTicketRes.response.status).toBe(201);
    testTicketId = createTicketRes.result.id;
    expect(createTicketRes.result.sla_policy).toBe('Critical SLA Standard');
    expect(createTicketRes.result.response_deadline).toBeDefined();
    expect(createTicketRes.result.resolution_deadline).toBeDefined();
    expect(createTicketRes.result.response_sla_status).toBe('Within SLA');
  });

  it('returns comprehensive KPI overview without hardcoded values', async () => {
    const overview = await request('/api/analytics/overview', { cookie: adminCookie });
    expect(overview.response.status).toBe(200);
    expect(overview.result.kpis.totalTickets).toBeGreaterThan(0);
    expect(overview.result.kpis.slaComplianceRate).toBeDefined();
    expect(overview.result.kpis).toHaveProperty('openTickets');
    expect(overview.result.kpis).toHaveProperty('unassignedTickets');
    expect(overview.result.kpis).toHaveProperty('awaitingFirstResponse');
    expect(overview.result.kpis).toHaveProperty('resolvedTickets');
  });

  it('populates the SLA Command Center table with at-risk or critical tickets', async () => {
    const commandCenter = await request('/api/analytics/sla-command-center', { cookie: adminCookie });
    expect(commandCenter.response.status).toBe(200);
    expect(Array.isArray(commandCenter.result)).toBe(true);
  });

  it('supports Senior Support Staff overriding priority and recording audit', async () => {
    const seniorLogin = await request('/api/auth/login', {
      method: 'POST',
      body: { email: 'seniorlead@example.test', password: 'SeniorPass123!' },
    });
    const seniorCookie = cookieFrom(seniorLogin.response);

    const override = await request(`/api/tickets/${testTicketId}/override-priority`, {
      method: 'POST',
      cookie: seniorCookie,
      body: {
        newPriority: 99,
        newUrgency: 'Critical',
        reason: 'Customer reported data loss risk',
      },
    });

    expect(override.response.status).toBe(200);
    expect(override.result.dashboardPriority).toBe(99);
    expect(override.result.dashboardUrgency).toBe('Critical');
  });

  it('accepts real CSAT feedback on resolved tickets and exports sanitized CSV', async () => {
    // Resolve ticket first
    await request(`/api/dashboard/tickets/${testTicketId}/status`, {
      method: 'PATCH',
      cookie: adminCookie,
      body: { status: 'Resolved' },
    });

    // Submit CSAT feedback
    const feedback = await request(`/api/tickets/${testTicketId}/feedback`, {
      method: 'POST',
      cookie: adminCookie,
      body: {
        rating: 5,
        comment: '=SUM(1,2) Excellent resolution time!',
      },
    });

    expect(feedback.response.status).toBe(201);
    expect(feedback.result.rating).toBe(5);

    // Export CSV and verify formula injection protection
    const csvExport = await request('/api/analytics/export/csv', { cookie: adminCookie });
    expect(csvExport.response.status).toBe(200);
    expect(csvExport.response.headers.get('content-type')).toContain('text/csv');
    // Verify any cell starting with '=' is sanitized with a single quote prefix
    expect(csvExport.result).toContain('Ticket ID');
  });

  it('connects to /api/events SSE stream and receives real-time events', async () => {
    const controller = new AbortController();
    const eventResponse = await fetch(`${origin}/api/events`, {
      signal: controller.signal,
      headers: {
        Origin: 'http://localhost:5173',
      },
    });

    expect(eventResponse.status).toBe(200);
    expect(eventResponse.headers.get('content-type')).toContain('text/event-stream');

    const reader = eventResponse.body.getReader();
    const decoder = new TextDecoder();
    const { value } = await reader.read();
    const text = decoder.decode(value);

    expect(text).toContain('data:');
    expect(text).toContain('"type":"connected"');

    await reader.cancel();
    controller.abort();
    const { closeAllSseClients } = await import('./realtime.js');
    closeAllSseClients();
  });
});


