export const ROUTING_CATEGORIES = [
  'Billing', 'Payments', 'Refunds', 'Technical Support', 'Delivery',
  'Account Access', 'Product Issues', 'Security', 'General', 'Other',
] as const;

export type RoutingCategory = typeof ROUTING_CATEGORIES[number];
export type RoutingUrgency = 'Low' | 'Medium' | 'High' | 'Critical';
export type RoutingStatus = 'Unassigned' | 'Recommended' | 'Assigned' | 'Escalation Recommended' | 'Escalated' | 'Awaiting Manual Review';
export type AvailabilityStatus = 'Available' | 'Busy' | 'Unavailable';

export interface RoutingTicketInput {
  ticketId: string;
  subject: string;
  description: string;
  category: RoutingCategory;
  urgency: RoutingUrgency;
  priorityScore: number;
  requiredSkills: string[];
  frustrationScore: number | null;
  unresolvedContacts: number | null;
  currentTeam: string;
  unassignedMinutes: number | null;
}

export interface RoutingTicketForm {
  ticketId: string;
  subject: string;
  description: string;
  category: RoutingCategory;
  urgency: RoutingUrgency;
  priorityScore: string;
  requiredSkills: string;
  frustrationScore: string;
  unresolvedContacts: string;
  currentTeam: string;
}

export interface SupportTeam {
  id: string;
  name: string;
  categories: RoutingCategory[];
  skills: string[];
  capacity: number;
  openTickets: number;
  availability: AvailabilityStatus;
  escalationContact: string;
  active: boolean;
  isSample: boolean;
}

export interface TeamMatch {
  team: SupportTeam;
  score: number;
  matchedSkills: string[];
  explanation: string;
}

export interface RoutingRecommendation {
  ticket: RoutingTicketInput;
  selectedTeam: TeamMatch | null;
  alternatives: TeamMatch[];
  status: RoutingStatus;
  escalationReasons: string[];
  escalationDestination: string;
  explanation: string;
  manualReviewRequired: boolean;
  criticalWarning: boolean;
  recommendedHandling: string;
}

export interface RoutingAuditEntry {
  id: string;
  ticketId: string;
  action: 'Recommendation' | 'Assignment' | 'Reassignment' | 'Escalation' | 'Manual Override' | 'Status Change';
  previousTeam: string;
  newTeam: string;
  status: RoutingStatus;
  reason: string;
  timestamp: string;
  isSample: boolean;
}

export interface RoutingTicketRecord {
  ticket: RoutingTicketInput;
  recommendation: RoutingRecommendation | null;
  assignedTeam: string;
  status: RoutingStatus;
  escalationReasons: string[];
  isSample: boolean;
  updatedAt: string;
  createdAt: string;
}

export interface EscalationSettings {
  highPriorityThreshold: number;
  repeatContactThreshold: number;
  unassignedEscalationMinutes: number;
  securityDestination: string;
  defaultEscalationDestination: string;
}
