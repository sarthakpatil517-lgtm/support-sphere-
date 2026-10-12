import type { Ticket, TicketDetail, TicketFeedback, TicketSummary } from '../types';
import type { PriorityRecord, PriorityWeights } from '../types/priorityScore';
import type { EscalationSettings, RoutingAuditEntry, RoutingRecommendation, RoutingTicketRecord, SupportTeam } from '../types/intelligentRouting';
import type { AuditLogEntry, AuthSessionResponse, User, UserDetailResponse, UserListResponse, UserRole } from '../types/auth';
import type {
  AgentPerformanceMetric,
  AnalyticsFilterState,
  AnalyticsOverviewResponse,
  CategoryBreakdownItem,
  CsatAnalyticsResponse,
  ResponseTimeAnalyticsResponse,
  SentimentPerformanceItem,
  SlaCommandCenterTicket,
  SlaComplianceResponse,
  SlaPolicyConfig,
  TicketTrendItem,
} from '../types/analytics';

const API_BASE = '/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('auth_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(`${API_BASE}${path}`, {
    credentials: 'include',
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type') || '';
  const payload = contentType.includes('application/json') ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.message || 'Request failed';
    throw new Error(message);
  }

  return payload as T;
}

// ==========================================
// AUTHENTICATION & SESSION
// ==========================================

export async function register(payload: { name: string; email: string; password: string }): Promise<AuthSessionResponse> {
  const res = await request<AuthSessionResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token) localStorage.setItem('auth_token', res.token);
  return res;
}

export async function login(payload: { email: string; password: string }): Promise<AuthSessionResponse> {
  const res = await request<AuthSessionResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.token) localStorage.setItem('auth_token', res.token);
  return res;
}

export async function logout(): Promise<{ ok: boolean }> {
  try {
    await request<{ ok: boolean }>('/auth/logout', { method: 'POST' });
  } finally {
    localStorage.removeItem('auth_token');
  }
  return { ok: true };
}

export async function getAuthSession(): Promise<{ user: User } | null> {
  try {
    return await request<{ user: User }>('/auth/session');
  } catch {
    return null;
  }
}

export async function updateProfile(payload: { name?: string; email?: string }): Promise<{ user: User }> {
  return request<{ user: User }>('/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function demoSwitchRole(role: 'admin' | 'senior' | 'agent' | 'customer'): Promise<AuthSessionResponse> {
  const res = await request<AuthSessionResponse>('/auth/demo-switch', {
    method: 'POST',
    body: JSON.stringify({ role }),
  });
  if (res.token) localStorage.setItem('auth_token', res.token);
  return res;
}

// ==========================================
// USER & ROLE MANAGEMENT (ADMIN)
// ==========================================

export async function getUsers(params?: {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}): Promise<UserListResponse> {
  const search = new URLSearchParams();
  if (params?.search) search.set('search', params.search);
  if (params?.role) search.set('role', params.role);
  if (params?.status) search.set('status', params.status);
  if (params?.page) search.set('page', String(params.page));
  if (params?.limit) search.set('limit', String(params.limit));

  const query = search.toString();
  return request<UserListResponse>(`/users${query ? `?${query}` : ''}`);
}

export async function getUserDetail(id: string): Promise<UserDetailResponse> {
  return request<UserDetailResponse>(`/users/${id}`);
}

export async function createUser(payload: {
  name: string;
  email: string;
  role: UserRole;
  team?: string;
  password: string;
}): Promise<User> {
  return request<User>('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function updateUser(id: string, payload: Partial<User>): Promise<User> {
  return request<User>(`/users/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function updateUserRole(id: string, role: UserRole): Promise<User> {
  return request<User>(`/users/${id}/role`, {
    method: 'PATCH',
    body: JSON.stringify({ role }),
  });
}

export async function updateUserStatus(id: string, active: boolean): Promise<User> {
  return request<User>(`/users/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ active }),
  });
}

export async function deleteUser(id: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/users/${id}`, { method: 'DELETE' });
}

export async function getAdminAuditLogs(search?: string, limit?: number): Promise<AuditLogEntry[]> {
  const params = new URLSearchParams();
  if (search) params.set('search', search);
  if (limit) params.set('limit', String(limit));
  const query = params.toString();
  return request<AuditLogEntry[]>(`/admin/audit-logs${query ? `?${query}` : ''}`);
}

// ==========================================
// TICKET CORE & CUSTOMER FEEDBACK
// ==========================================

export async function getTicketSummary(): Promise<TicketSummary> {
  return request<TicketSummary>('/tickets/summary');
}

export async function getTickets(params?: {
  status?: string;
  category?: string;
  search?: string;
  sort?: string;
}): Promise<Ticket[]> {
  const search = new URLSearchParams();

  if (params?.status) search.set('status', params.status);
  if (params?.category) search.set('category', params.category);
  if (params?.search) search.set('search', params.search);
  if (params?.sort) search.set('sort', params.sort);

  const query = search.toString();
  return request<Ticket[]>(`/tickets${query ? `?${query}` : ''}`);
}

export async function getTicket(ticketId: string): Promise<TicketDetail> {
  return request<TicketDetail>(`/tickets/${ticketId}`);
}

export async function createTicket(payload: {
  subject: string;
  description: string;
  category: string;
  referenceNumber?: string;
  triage?: any;
}): Promise<Ticket> {
  return request<Ticket>('/tickets', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function addReply(ticketId: string, message: string): Promise<{ ok: boolean }> {
  return request<{ ok: boolean }>(`/tickets/${ticketId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ message }),
  });
}

export async function submitTicketFeedback(
  ticketId: string,
  rating: number,
  comment?: string
): Promise<TicketFeedback> {
  return request<TicketFeedback>(`/tickets/${ticketId}/feedback`, {
    method: 'POST',
    body: JSON.stringify({ rating, comment }),
  });
}

export async function overrideTicketPriority(
  ticketId: string,
  newPriority: number,
  newUrgency?: string,
  reason?: string
): Promise<Ticket> {
  return request<Ticket>(`/tickets/${ticketId}/override-priority`, {
    method: 'POST',
    body: JSON.stringify({ newPriority, newUrgency, reason }),
  });
}

export async function getMeta(): Promise<{ categories: string[]; statuses: string[] }> {
  return request<{ categories: string[]; statuses: string[] }>('/meta');
}

export async function getTicketCategories(): Promise<string[]> {
  const meta = await getMeta();
  return meta.categories || [];
}

// ==========================================
// MODULE 10: ANALYTICS & SLA MONITORING
// ==========================================

function buildAnalyticsQuery(filters?: AnalyticsFilterState): string {
  if (!filters) return '';
  const search = new URLSearchParams();
  if (filters.timeRange) search.set('timeRange', filters.timeRange);
  if (filters.from) search.set('from', filters.from);
  if (filters.to) search.set('to', filters.to);
  if (filters.priority) search.set('priority', filters.priority);
  if (filters.status) search.set('status', filters.status);
  if (filters.category) search.set('category', filters.category);
  if (filters.agentId) search.set('agentId', filters.agentId);
  const q = search.toString();
  return q ? `?${q}` : '';
}

export async function getAnalyticsOverview(filters?: AnalyticsFilterState): Promise<AnalyticsOverviewResponse> {
  return request<AnalyticsOverviewResponse>(`/analytics/overview${buildAnalyticsQuery(filters)}`);
}

export async function getTicketTrends(filters?: AnalyticsFilterState): Promise<TicketTrendItem[]> {
  return request<TicketTrendItem[]>(`/analytics/ticket-trends${buildAnalyticsQuery(filters)}`);
}

export async function getResponseTimeAnalytics(filters?: AnalyticsFilterState): Promise<ResponseTimeAnalyticsResponse> {
  return request<ResponseTimeAnalyticsResponse>(`/analytics/response-times${buildAnalyticsQuery(filters)}`);
}

export async function getSlaComplianceAnalytics(filters?: AnalyticsFilterState): Promise<SlaComplianceResponse> {
  return request<SlaComplianceResponse>(`/analytics/sla-compliance${buildAnalyticsQuery(filters)}`);
}

export async function getSlaCommandCenter(filters?: AnalyticsFilterState): Promise<SlaCommandCenterTicket[]> {
  return request<SlaCommandCenterTicket[]>(`/analytics/sla-command-center${buildAnalyticsQuery(filters)}`);
}

export async function getAgentPerformance(filters?: AnalyticsFilterState): Promise<AgentPerformanceMetric[]> {
  return request<AgentPerformanceMetric[]>(`/analytics/agent-performance${buildAnalyticsQuery(filters)}`);
}

export async function getCategoryBreakdown(filters?: AnalyticsFilterState): Promise<CategoryBreakdownItem[]> {
  return request<CategoryBreakdownItem[]>(`/analytics/category-breakdown${buildAnalyticsQuery(filters)}`);
}

export async function getSentimentPerformance(filters?: AnalyticsFilterState): Promise<SentimentPerformanceItem[]> {
  return request<SentimentPerformanceItem[]>(`/analytics/sentiment-performance${buildAnalyticsQuery(filters)}`);
}

export async function getCustomerSatisfaction(): Promise<CsatAnalyticsResponse> {
  return request<CsatAnalyticsResponse>('/analytics/customer-satisfaction');
}

export async function getSlaPolicies(): Promise<SlaPolicyConfig> {
  return request<SlaPolicyConfig>('/analytics/sla-policy');
}

export async function updateSlaPolicies(policies: SlaPolicyConfig): Promise<SlaPolicyConfig> {
  return request<SlaPolicyConfig>('/analytics/sla-policy', {
    method: 'PUT',
    body: JSON.stringify(policies),
  });
}

export function getExportAnalyticsCsvUrl(filters?: AnalyticsFilterState): string {
  return `${API_BASE}/analytics/export/csv${buildAnalyticsQuery(filters)}`;
}

// ==========================================
// PRIORITY & ROUTING EXISTING METHODS
// ==========================================

export async function getPriorityCalculations(): Promise<PriorityRecord[]> {
  return request<PriorityRecord[]>('/priority-calculations');
}

export async function savePriorityCalculation(record: PriorityRecord): Promise<PriorityRecord[]> {
  return request<PriorityRecord[]>('/priority-calculations', {
    method: 'POST',
    body: JSON.stringify(record),
  });
}

export async function clearPriorityCalculations(): Promise<void> {
  await request<{ ok: boolean }>('/priority-calculations', { method: 'DELETE' });
}

export async function getPriorityWeights(): Promise<PriorityWeights> {
  return request<PriorityWeights>('/priority-weights');
}

export async function savePriorityWeights(weights: PriorityWeights): Promise<PriorityWeights> {
  return request<PriorityWeights>('/priority-weights', {
    method: 'PUT',
    body: JSON.stringify(weights),
  });
}

export async function getRoutingData(): Promise<{
  teams: SupportTeam[];
  tickets: RoutingTicketRecord[];
  audit: RoutingAuditEntry[];
  settings: EscalationSettings;
}> {
  return request('/routing');
}

export async function saveRoutingTeams(teams: SupportTeam[]): Promise<SupportTeam[]> {
  return request('/routing/teams', { method: 'PUT', body: JSON.stringify(teams) });
}

export async function saveRoutingSettings(settings: EscalationSettings): Promise<EscalationSettings> {
  return request('/routing/settings', { method: 'PUT', body: JSON.stringify(settings) });
}

export async function persistRoutingOperation(payload: {
  record: RoutingTicketRecord;
  auditEntry: RoutingAuditEntry;
}): Promise<{ record: RoutingTicketRecord; audit: RoutingAuditEntry[] }> {
  return request('/routing/operation', { method: 'POST', body: JSON.stringify(payload) });
}

export async function clearRoutingHistory(): Promise<void> {
  await request<{ ok: boolean }>('/routing', { method: 'DELETE' });
}
