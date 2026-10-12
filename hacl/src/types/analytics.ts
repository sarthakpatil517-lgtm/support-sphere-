import type { SlaRiskStatus, UserRole } from './auth';

export interface AnalyticsKpis {
  totalTickets: number;
  openTickets: number;
  inProgressTickets: number;
  unassignedTickets: number;
  awaitingFirstResponse: number;
  resolvedTickets: number;
  overdueTickets: number;
  atRiskTickets: number;
  slaComplianceRate: number;
  avgFirstResponseMinutes: number;
  avgResolutionHours: number;
  csatAverage: number | null;
  csatTotalRatings: number;
  csatPositiveRate: number | null;
}

export interface AnalyticsOverviewResponse {
  kpis: AnalyticsKpis;
  trendComparisons: {
    totalTickets: string;
    slaComplianceRate: string;
    avgFirstResponseMinutes: string;
    avgResolutionHours: string;
    csatAverage: string;
  };
}

export interface TicketTrendItem {
  date: string;
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  resolved: number;
}

export interface PriorityResponseTime {
  priority: string;
  ticketCount: number;
  avgResponseMinutes: number;
  avgResolutionHours: number;
}

export interface ResponseTimeAnalyticsResponse {
  firstResponse: {
    average: number;
    median: number;
    p90: number;
    count: number;
  };
  resolution: {
    average: number;
    median: number;
    count: number;
  };
  byPriority: PriorityResponseTime[];
}

export interface SlaPriorityCompliance {
  priority: string;
  total: number;
  resolved: number;
  met: number;
  breached: number;
  atRisk: number;
  complianceRate: number;
}

export interface SlaComplianceResponse {
  byPriority: SlaPriorityCompliance[];
}

export interface SlaCommandCenterTicket {
  id: string;
  subject: string;
  category: string;
  priority: string;
  priorityScore: number;
  customerName: string;
  assignedAgent: string;
  assignedUserId: string | null;
  status: string;
  responseSlaStatus: SlaRiskStatus;
  resolutionSlaStatus: SlaRiskStatus;
  currentRiskStatus: SlaRiskStatus;
  responseDeadline: string;
  resolutionDeadline: string;
  timeToResolDeadlineMinutes: number;
  timeToRespDeadlineMinutes: number;
  createdAt: string;
}

export interface AgentPerformanceMetric {
  agentId: string;
  agentName: string;
  team: string;
  role: UserRole;
  active: boolean;
  assignedCount: number;
  openCount: number;
  resolvedCount: number;
  avgResponseMinutes: number | null;
  avgResolutionHours: number | null;
  slaComplianceRate: number;
  csatAverage: number | null;
  csatRatingsCount: number;
}

export interface CategoryBreakdownItem {
  category: string;
  count: number;
  resolvedCount: number;
  slaComplianceRate: number;
}

export interface SentimentPerformanceItem {
  sentiment: string;
  count: number;
  resolvedCount: number;
  avgResolutionHours: number;
  slaComplianceRate: number;
}

export interface CsatAnalyticsResponse {
  totalRatings: number;
  averageRating: number;
  positiveRate: number;
  distribution: Record<number, number>;
  recentFeedback: Array<{
    id: string;
    ticketId: string;
    customerId: string;
    customerName: string;
    rating: number;
    comment: string;
    createdAt: string;
  }>;
}

export interface SlaTarget {
  responseHours: number;
  resolutionHours: number;
}

export type SlaPolicyConfig = Record<string, SlaTarget>;

export interface AnalyticsFilterState {
  timeRange: 'today' | '7days' | '30days' | 'all' | 'custom';
  from?: string;
  to?: string;
  priority?: string;
  status?: string;
  category?: string;
  agentId?: string;
}

