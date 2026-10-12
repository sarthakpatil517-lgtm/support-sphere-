import type {
  EscalationSettings,
  RoutingCategory,
  RoutingRecommendation,
  RoutingTicketForm,
  RoutingTicketInput,
  RoutingUrgency,
  SupportTeam,
  TeamMatch,
} from '../types/intelligentRouting';
import { ROUTING_CATEGORIES } from '../types/intelligentRouting';

export const DEFAULT_ESCALATION_SETTINGS: EscalationSettings = {
  highPriorityThreshold: 75,
  repeatContactThreshold: 3,
  unassignedEscalationMinutes: 30,
  securityDestination: 'Security and Critical Incidents',
  defaultEscalationDestination: 'Support Lead',
};

const CATEGORY_ALIASES: Record<string, RoutingCategory> = {
  'billing and payments': 'Billing',
  'billing & payments': 'Billing',
  'refunds and cancellations': 'Refunds',
  'account access': 'Account Access',
  'general inquiry': 'General',
  'product issues': 'Product Issues',
  'delivery and shipping': 'Delivery',
};

export function canonicalCategory(category: string): RoutingCategory {
  return CATEGORY_ALIASES[category.toLowerCase()] ?? (category as RoutingCategory);
}

export function validateRoutingTicket(form: RoutingTicketForm): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.ticketId.trim()) errors.ticketId = 'Ticket ID is required.';
  if (!form.subject.trim()) errors.subject = 'Ticket subject is required.';
  if (!form.description.trim()) errors.description = 'Ticket description is required.';
  if (!ROUTING_CATEGORIES.includes(form.category) || !['Low', 'Medium', 'High', 'Critical'].includes(form.urgency)) {
    errors.category = 'Choose a valid ticket category and urgency.';
  }
  if (!form.priorityScore.trim() || !Number.isFinite(Number(form.priorityScore)) || Number(form.priorityScore) < 0 || Number(form.priorityScore) > 100) {
    errors.priorityScore = 'Priority score must be between 0 and 100.';
  }
  if (form.frustrationScore !== '' && (!Number.isFinite(Number(form.frustrationScore)) || Number(form.frustrationScore) < 0 || Number(form.frustrationScore) > 100)) {
    errors.frustrationScore = 'Frustration score must be between 0 and 100, or left blank.';
  }
  if (form.unresolvedContacts !== '' && (!Number.isInteger(Number(form.unresolvedContacts)) || Number(form.unresolvedContacts) < 0)) {
    errors.unresolvedContacts = 'Unresolved-contact count must be a non-negative whole number, or left blank.';
  }
  return errors;
}

export function parseRoutingTicket(form: RoutingTicketForm): RoutingTicketInput {
  const errors = validateRoutingTicket(form);
  if (Object.keys(errors).length) throw new Error(Object.values(errors).join(' '));
  return {
    ticketId: form.ticketId.trim(),
    subject: form.subject.trim(),
    description: form.description.trim(),
    category: form.category,
    urgency: form.urgency,
    priorityScore: Number(form.priorityScore),
    requiredSkills: form.requiredSkills.split(',').map((skill) => skill.trim().toLowerCase()).filter(Boolean),
    frustrationScore: form.frustrationScore === '' ? null : Number(form.frustrationScore),
    unresolvedContacts: form.unresolvedContacts === '' ? null : Number(form.unresolvedContacts),
    currentTeam: form.currentTeam.trim(),
    unassignedMinutes: null,
  };
}

function categoryMatches(ticketCategory: RoutingCategory, teamCategories: RoutingCategory[]) {
  const canonical = canonicalCategory(ticketCategory);
  return teamCategories.some((category) => canonicalCategory(category) === canonical);
}

export function recommendRouting(
  ticket: RoutingTicketInput,
  teams: SupportTeam[],
  settings: EscalationSettings = DEFAULT_ESCALATION_SETTINGS
): RoutingRecommendation {
  const activeTeams = teams.filter((team) => team.active);
  const categoryTeams = activeTeams.filter((team) => categoryMatches(ticket.category, team.categories));
  const skillTeams = categoryTeams.filter((team) =>
    ticket.requiredSkills.every((required) => team.skills.some((skill) => skill.toLowerCase() === required))
  );
  const eligible = skillTeams.filter((team) =>
    team.availability !== 'Unavailable' && team.openTickets < team.capacity
  );

  const alternatives: TeamMatch[] = eligible.map((team) => {
    const matchedSkills = ticket.requiredSkills.filter((required) => team.skills.some((skill) => skill.toLowerCase() === required));
    const utilization = team.capacity > 0 ? team.openTickets / team.capacity : 1;
    const score = Math.max(0, Math.round((1 - utilization) * 100) - (team.availability === 'Busy' ? 20 : 0));
    return {
      team,
      score,
      matchedSkills,
      explanation: `Category match: ${ticket.category}. Skills matched: ${matchedSkills.length ? matchedSkills.join(', ') : 'no additional skills required'}. ${team.availability} status${team.availability === 'Busy' ? ' (20-point ranking adjustment)' : ''}; workload is ${team.openTickets}/${team.capacity} open tickets (${Math.round(utilization * 100)}% capacity).`,
    };
  }).sort((a, b) => b.score - a.score || a.team.name.localeCompare(b.team.name));

  const escalationReasons: string[] = [];
  if (ticket.urgency === 'Critical') escalationReasons.push('Critical urgency requires immediate escalation review.');
  if (ticket.priorityScore >= settings.highPriorityThreshold) escalationReasons.push(`Priority score meets the high-priority threshold (${settings.highPriorityThreshold}).`);
  if (canonicalCategory(ticket.category) === 'Security') {
    const securityTeam = activeTeams.find((team) => team.name === settings.securityDestination && categoryMatches('Security', team.categories));
    escalationReasons.push(securityTeam ? `Security-related issue should be handled by ${securityTeam.name}.` : 'Security category has no configured designated team; immediate manual review is required.');
  }
  if (ticket.unresolvedContacts !== null && ticket.unresolvedContacts >= settings.repeatContactThreshold) {
    escalationReasons.push(`Unresolved-contact count meets the escalation threshold (${settings.repeatContactThreshold}).`);
  }
  if (!ticket.currentTeam && ticket.unassignedMinutes !== null && ticket.unassignedMinutes >= settings.unassignedEscalationMinutes) {
    escalationReasons.push(`Ticket has remained unassigned for ${ticket.unassignedMinutes} minutes, meeting the ${settings.unassignedEscalationMinutes}-minute escalation threshold.`);
  }
  const criticalWarning = ticket.urgency === 'Critical' || canonicalCategory(ticket.category) === 'Security';
  const escalationDestination = canonicalCategory(ticket.category) === 'Security'
    ? settings.securityDestination || 'Manual Review'
    : settings.defaultEscalationDestination || 'Manual Review';
  const securityTeam = activeTeams.find((team) => team.name === settings.securityDestination && categoryMatches('Security', team.categories));
  const securityTeamEligible = Boolean(
    securityTeam &&
    securityTeam.availability !== 'Unavailable' &&
    securityTeam.openTickets < securityTeam.capacity &&
    ticket.requiredSkills.every((required) => securityTeam.skills.some((skill) => skill.toLowerCase() === required))
  );
  const selectedTeam = canonicalCategory(ticket.category) === 'Security' && !securityTeamEligible
    ? null
    : canonicalCategory(ticket.category) === 'Security'
      ? alternatives.find((match) => match.team.id === securityTeam?.id) ?? null
      : alternatives[0] ?? null;
  if (canonicalCategory(ticket.category) === 'Security' && !securityTeamEligible && !escalationReasons.some((reason) => reason.includes('Security category'))) {
    escalationReasons.push('Security destination is unavailable, over capacity, or does not match required skills; immediate manual review is required.');
  }
  if (!selectedTeam && !escalationReasons.some((reason) => reason.startsWith('No eligible'))) {
    escalationReasons.push('No eligible category- and skill-matched team has availability and remaining capacity.');
  }
  const manualReviewRequired = !selectedTeam || (canonicalCategory(ticket.category) === 'Security' && !securityTeamEligible);
  const status = manualReviewRequired
    ? 'Awaiting Manual Review'
    : escalationReasons.length > 0
      ? 'Escalation Recommended'
      : selectedTeam
        ? 'Recommended'
        : 'Unassigned';
  const handling = ticket.urgency === 'Critical'
    ? 'Immediate review; do not defer based on workload or customer metrics.'
    : ticket.priorityScore >= settings.highPriorityThreshold
      ? 'High-priority handling recommended.'
      : 'Standard handling based on category, skill fit, availability, and workload.';

  const missingInputNote = [
    ticket.frustrationScore === null ? 'Frustration information was not provided and is not used to rank teams.' : 'Frustration is retained as context and does not change category/skill eligibility.',
    ticket.unresolvedContacts === null ? 'Unresolved-contact history was not provided, so its escalation rule could not be evaluated.' : '',
  ].filter(Boolean).join(' ');
  const explanation = selectedTeam
    ? `${selectedTeam.explanation} ${ticket.urgency === 'Critical' || ticket.priorityScore >= settings.highPriorityThreshold ? handling : 'Urgency and priority did not trigger an elevated handling rule.'} ${missingInputNote}`
    : `No eligible team found — manual assignment required. Category-matched teams: ${categoryTeams.length}; teams also matching required skills: ${skillTeams.length}; eligible after availability and capacity checks: ${eligible.length}. ${ticket.urgency === 'Critical' || canonicalCategory(ticket.category) === 'Security' ? 'Critical/security handling needs immediate manual review.' : ''} ${missingInputNote}`;

  return {
    ticket,
    selectedTeam,
    alternatives: selectedTeam ? alternatives.filter((match) => match.team.id !== selectedTeam.team.id) : alternatives,
    status,
    escalationReasons,
    escalationDestination,
    explanation,
    manualReviewRequired,
    criticalWarning,
    recommendedHandling: handling,
  };
}
