import { analyzeSentiment } from './sentimentAnalysis';
import { predictUrgency } from './urgencyPrediction';
import { classifyIssue } from './issueClassification';
import { calculateCustomerValueScore } from './customerValueAnalysis';
import { calculatePriority } from './priorityScore';
import { matchKnowledgeBase } from './knowledgeBase';
import { recommendRouting } from './intelligentRouting';
import type { SupportTeam } from '../types/intelligentRouting';
import type { SentimentAnalysisResult } from '../types/sentiment';
import type { UrgencyPredictionResult, IssueClassificationResult } from '../types/issueAnalysis';
import type { CustomerValueAnalysisResult, AccountTier, AccountStatus } from '../types/customerValue';
import type { PriorityCalculation } from '../types/priorityScore';
import type { KnowledgeBaseMatch } from './knowledgeBase';

export interface CustomerTriageInput {
  customerId?: string;
  customerName?: string;
  accountTier?: AccountTier;
  tenureMonths?: number;
  lifetimeValue?: number;
  accountStatus?: AccountStatus;
  totalTickets?: number;
  repeatContacts?: number;
}

export interface PredictiveTriageResult {
  ticketId: string;
  subject: string;
  description: string;
  timestamp: string;

  // Individual Analysis Modules
  sentimentAnalysis: SentimentAnalysisResult;
  urgencyPrediction: UrgencyPredictionResult;
  issueClassification: IssueClassificationResult;
  customerValueAnalysis: CustomerValueAnalysisResult;
  priorityCalculation: PriorityCalculation;
  knowledgeBaseMatch: KnowledgeBaseMatch | null;

  // Triage Router Outcomes
  triageOutcome: {
    routingLevel: 'Automated Knowledge Base' | 'Tier-1 Support Team' | 'Senior Staff Escalation';
    assignedTeam: string;
    assignedRole: string;
    isEscalatedToSenior: boolean;
    isKbDeflected: boolean;
    escalationReasons: string[];
    slaResponseTime: string;
    recommendedAction: string;
    confidenceScore: number;
    triageSummary: string;
  };
}

const DEFAULT_SUPPORT_TEAMS: SupportTeam[] = [
  { id: 'team-billing', name: 'Billing and Payments', categories: ['Billing', 'Payments'], skills: ['payment', 'billing', 'refund'], capacity: 12, openTickets: 5, availability: 'Available', escalationContact: 'Billing Lead', active: true, isSample: false },
  { id: 'team-technical', name: 'Technical Support', categories: ['Technical Support'], skills: ['troubleshooting', 'application', 'account access'], capacity: 16, openTickets: 9, availability: 'Available', escalationContact: 'Technical Lead', active: true, isSample: false },
  { id: 'team-account', name: 'Account and Access Support', categories: ['Account Access'], skills: ['account access', 'login', 'identity verification'], capacity: 10, openTickets: 6, availability: 'Available', escalationContact: 'Account Lead', active: true, isSample: false },
  { id: 'team-delivery', name: 'Delivery and Logistics', categories: ['Delivery'], skills: ['shipping', 'tracking', 'logistics'], capacity: 10, openTickets: 4, availability: 'Available', escalationContact: 'Logistics Lead', active: true, isSample: false },
  { id: 'team-returns', name: 'Returns and Refunds', categories: ['Refunds'], skills: ['refund', 'returns', 'billing'], capacity: 9, openTickets: 5, availability: 'Available', escalationContact: 'Returns Lead', active: true, isSample: false },
  { id: 'team-product', name: 'Product Support', categories: ['Product Issues'], skills: ['product troubleshooting', 'quality', 'warranty'], capacity: 10, openTickets: 6, availability: 'Available', escalationContact: 'Product Lead', active: true, isSample: false },
  { id: 'team-security', name: 'Security and Critical Incidents', categories: ['Security'], skills: ['security', 'account access', 'incident response'], capacity: 6, openTickets: 2, availability: 'Available', escalationContact: 'Security Lead', active: true, isSample: false },
  { id: 'team-general', name: 'General Customer Support', categories: ['General', 'Other'], skills: ['customer support', 'general inquiries'], capacity: 20, openTickets: 8, availability: 'Available', escalationContact: 'Support Lead', active: true, isSample: false },
  { id: 'team-senior', name: 'Senior Staff & Executive Escalations', categories: ['Billing', 'Payments', 'Refunds', 'Technical Support', 'Delivery', 'Account Access', 'Product Issues', 'Security', 'General', 'Other'], skills: ['escalation', 'vip support', 'de-escalation', 'critical resolution'], capacity: 8, openTickets: 2, availability: 'Available', escalationContact: 'Director of Customer Care', active: true, isSample: false },
];

export async function runPredictiveTriage(
  subject: string,
  description: string,
  customerInput?: CustomerTriageInput,
  ticketIdPrefix = 'TK'
): Promise<PredictiveTriageResult> {
  const cleanSubject = subject.trim() || 'Customer Support Request';
  const cleanDescription = description.trim();
  const ticketId = `${ticketIdPrefix}-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  // 1. AI Sentiment & Frustration Analysis
  const sentimentAnalysis = await analyzeSentiment(cleanDescription || cleanSubject);

  // 2. Urgency Prediction
  const urgencyPrediction = predictUrgency(cleanSubject, cleanDescription);

  // 3. Issue Classification
  const issueClassification = classifyIssue(cleanSubject, cleanDescription);

  // 4. Customer Value Analysis
  const customerProfile = {
    customerId: customerInput?.customerId || 'CUST-DEMO',
    customerName: customerInput?.customerName || 'Demo Customer',
    accountTier: customerInput?.accountTier || 'Silver',
    tenureMonths: String(customerInput?.tenureMonths ?? 12),
    totalTickets: String(customerInput?.totalTickets ?? 3),
    repeatContacts: String(customerInput?.repeatContacts ?? 0),
    lifetimeValue: customerInput?.lifetimeValue !== undefined ? String(customerInput.lifetimeValue) : '2400',
    accountStatus: customerInput?.accountStatus || 'Active',
    resolvedTickets: String(customerInput?.totalTickets ? Math.max(0, (customerInput.totalTickets || 1) - 1) : 2),
  };
  const customerValueAnalysis = calculateCustomerValueScore(customerProfile);

  // 5. Dynamic Priority Score Calculation
  const priorityInput = {
    ticketId,
    subject: cleanSubject,
    urgencyLevel: urgencyPrediction.urgency,
    urgencyScore: urgencyPrediction.urgency === 'Critical' ? '100' : urgencyPrediction.urgency === 'High' ? '75' : urgencyPrediction.urgency === 'Medium' ? '45' : '20',
    frustrationScore: String(sentimentAnalysis.frustrationScore),
    customerValueScore: String(Math.round(customerValueAnalysis.score)),
    supportHistoryScore: String(Math.min(100, (Number(customerProfile.repeatContacts) * 25) + 15)),
    notes: `Issue category: ${issueClassification.category}`,
  };
  const priorityCalculation = calculatePriority(priorityInput);

  // 6. Knowledge Base Match Check
  const knowledgeBaseMatch = matchKnowledgeBase(
    `${cleanSubject} ${cleanDescription}`,
    issueClassification.category
  );

  // 7. Intelligent Triage & Routing Decision Logic
  const escalationReasons: string[] = [];

  // Senior Staff Escalation Conditions:
  // Rule 1: Highly Frustrated Customer (Frustration Score >= 70 or Sentiment == 'Frustrated')
  const isHighlyFrustrated = sentimentAnalysis.frustrationScore >= 70 || sentimentAnalysis.sentiment === 'Frustrated';
  if (isHighlyFrustrated) {
    escalationReasons.push(`Customer exhibits high frustration (${sentimentAnalysis.frustrationScore}/100) — requires empathetic senior de-escalation.`);
  }

  // Rule 2: High-Value / Platinum VIP Client
  const isHighValueClient = customerValueAnalysis.score >= 75 || customerProfile.accountTier === 'Platinum';
  if (isHighValueClient) {
    escalationReasons.push(`High-Value Account (${customerProfile.accountTier} Tier, Value Score: ${customerValueAnalysis.score}/100) — priority white-glove support.`);
  }

  // Rule 3: Critical Urgency Safeguard (Security Incident / System Disruption)
  const isCriticalUrgency = urgencyPrediction.criticalFlag || urgencyPrediction.urgency === 'Critical';
  if (isCriticalUrgency) {
    escalationReasons.push('Critical urgency or security impact detected — requires immediate incident intervention.');
  }

  // Rule 4: Priority Score Threshold >= 75
  if (priorityCalculation.score >= 75 && !escalationReasons.some((r) => r.includes('Priority score'))) {
    escalationReasons.push(`Priority score (${priorityCalculation.score}) exceeds high-priority threshold (75).`);
  }

  // Rule 5: Repeat contacts >= 3 (Unresolved loop)
  if (Number(customerProfile.repeatContacts) >= 3) {
    escalationReasons.push(`Customer has contacted support ${customerProfile.repeatContacts} times without complete resolution.`);
  }

  const isEscalatedToSenior = escalationReasons.length > 0;

  // Automated Knowledge Base Resolution Conditions:
  // Can be resolved by automated KB if it's a routine query, NOT highly frustrated, NOT critical urgency, and high match confidence
  const isKbDeflected = Boolean(
    knowledgeBaseMatch &&
    knowledgeBaseMatch.isRoutineSolvable &&
    !isHighlyFrustrated &&
    !isCriticalUrgency &&
    customerValueAnalysis.score < 85 // Allow automated KB for non-VIP routine questions unless VIP specifically requests human
  );

  // Determine Routing Level and Team
  let routingLevel: 'Automated Knowledge Base' | 'Tier-1 Support Team' | 'Senior Staff Escalation';
  let assignedTeam: string;
  let assignedRole: string;
  let slaResponseTime: string;
  let recommendedAction: string;

  if (isEscalatedToSenior) {
    routingLevel = 'Senior Staff Escalation';
    assignedTeam = isCriticalUrgency && issueClassification.category.includes('Security')
      ? 'Security and Critical Incidents'
      : 'Senior Staff & Executive Escalations';
    assignedRole = 'Senior Support Specialist / Tier-2 Lead';
    slaResponseTime = '< 15 minutes (Fast-Track SLA)';
    recommendedAction = `Escalate immediately to senior specialist. ${escalationReasons[0]}`;
  } else if (isKbDeflected && knowledgeBaseMatch) {
    routingLevel = 'Automated Knowledge Base';
    assignedTeam = 'Automated Self-Service Knowledge Base';
    assignedRole = 'Automated Support AI Agent';
    slaResponseTime = 'Instant (< 1 second)';
    recommendedAction = `Provide instant automated resolution: '${knowledgeBaseMatch.article.title}'. No waiting queue needed.`;
  } else {
    // Normal Tier-1 Specialized Team Routing
    routingLevel = 'Tier-1 Support Team';
    const routingTicketInput = {
      ticketId,
      subject: cleanSubject,
      description: cleanDescription,
      category: (issueClassification.category.includes('Billing') ? 'Billing' :
                 issueClassification.category.includes('Refund') ? 'Refunds' :
                 issueClassification.category.includes('Tech') ? 'Technical Support' :
                 issueClassification.category.includes('Delivery') ? 'Delivery' :
                 issueClassification.category.includes('Security') ? 'Security' :
                 issueClassification.category.includes('Account') ? 'Account Access' :
                 issueClassification.category.includes('Product') ? 'Product Issues' : 'General') as any,
      urgency: urgencyPrediction.urgency,
      priorityScore: priorityCalculation.score,
      requiredSkills: [issueClassification.category.toLowerCase().split(' ')[0]],
      frustrationScore: sentimentAnalysis.frustrationScore,
      unresolvedContacts: Number(customerProfile.repeatContacts),
      currentTeam: '',
      unassignedMinutes: null,
    };

    const routingResult = recommendRouting(routingTicketInput, DEFAULT_SUPPORT_TEAMS);
    assignedTeam = routingResult.selectedTeam ? routingResult.selectedTeam.team.name : 'General Customer Support';
    assignedRole = 'Support Agent';
    slaResponseTime = priorityCalculation.score >= 50 ? '< 2 hours' : '< 8 hours';
    recommendedAction = `Route to ${assignedTeam} based on category match and capacity balance.`;
  }

  const confidenceScore = Number(
    ((sentimentAnalysis.confidence + urgencyPrediction.confidence + issueClassification.confidence) / 3).toFixed(2)
  );

  const triageSummary = isEscalatedToSenior
    ? `🚨 Auto-Escalated to Senior Staff: ${escalationReasons.join(' ')}`
    : isKbDeflected
      ? `🤖 Routine Query Deflected: Handled instantly by Automated Knowledge Base (${knowledgeBaseMatch?.article.title}).`
      : `✅ Standard Triage: Prioritized at ${priorityCalculation.score}/100 and routed to ${assignedTeam}.`;

  return {
    ticketId,
    subject: cleanSubject,
    description: cleanDescription,
    timestamp: new Date().toISOString(),
    sentimentAnalysis,
    urgencyPrediction,
    issueClassification,
    customerValueAnalysis,
    priorityCalculation,
    knowledgeBaseMatch,
    triageOutcome: {
      routingLevel,
      assignedTeam,
      assignedRole,
      isEscalatedToSenior,
      isKbDeflected,
      escalationReasons,
      slaResponseTime,
      recommendedAction,
      confidenceScore,
      triageSummary,
    },
  };
}

