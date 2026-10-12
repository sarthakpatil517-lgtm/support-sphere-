export type TicketStatus = 'Open' | 'In Progress' | 'Awaiting Customer' | 'Resolved' | 'Closed';

export type TicketCategory =
  | 'Billing and Payments'
  | 'Refunds and Cancellations'
  | 'Technical Support'
  | 'Delivery and Shipping'
  | 'Account Access'
  | 'Product Issues'
  | 'General Inquiry'
  | 'Other';

export type SlaRiskStatus = 'Within SLA' | 'Approaching' | 'At Risk' | 'Breached' | 'Met';

export interface TicketFeedback {
  id: string;
  ticketId: string;
  customerId: string;
  customerName?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface TicketTriageData {
  sentiment?: 'Positive' | 'Neutral' | 'Negative' | 'Frustrated';
  frustrationScore?: number;
  urgency?: 'Low' | 'Medium' | 'High' | 'Critical';
  customerTier?: 'Standard' | 'Silver' | 'Gold' | 'Platinum';
  customerValueScore?: number;
  priorityScore?: number;
  priorityCategory?: 'Low Priority' | 'Medium Priority' | 'High Priority';
  routingLevel?: 'Automated Knowledge Base' | 'Tier-1 Support Team' | 'Senior Staff Escalation';
  assignedTeam?: string;
  assignedAgent?: string;
  escalationReasons?: string[];
  isEscalatedToSenior?: boolean;
  isKbDeflected?: boolean;
  kbSolution?: string;
  kbArticleId?: string;
  slaResponseTime?: string;
}

export interface Ticket {
  id: string;
  customer_id: string;
  customer_name?: string;
  subject: string;
  description: string;
  category: TicketCategory;
  status: TicketStatus;
  assigned_agent?: string | null;
  assigned_team?: string | null;
  assigned_user_id?: string | null;
  reference_number?: string | null;
  created_at: string;
  updated_at: string;
  resolution_notes?: string | null;
  triage?: TicketTriageData | null;
  dashboardUrgency?: string;
  dashboardPriority?: number;
  sla_policy?: string;
  sla_start_time?: string;
  response_deadline?: string;
  resolution_deadline?: string;
  first_response_at?: string | null;
  resolved_at?: string | null;
  response_sla_status?: SlaRiskStatus;
  resolution_sla_status?: SlaRiskStatus;
  current_risk_status?: SlaRiskStatus;
  feedback?: TicketFeedback | null;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_role: 'customer' | 'agent';
  sender_name?: string;
  message: string;
  created_at: string;
}

export interface TicketHistoryEvent {
  id: string;
  ticket_id: string;
  event_type: string;
  note: string;
  created_at: string;
  actor_id?: string;
  actor_name?: string;
}

export interface TicketDetail extends Ticket {
  messages: TicketMessage[];
  history: TicketHistoryEvent[];
  feedback?: TicketFeedback | null;
}

export interface TicketSummary {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
}
