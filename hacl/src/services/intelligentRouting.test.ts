import { describe, expect, it } from 'vitest';
import { DEFAULT_ESCALATION_SETTINGS, recommendRouting, validateRoutingTicket } from './intelligentRouting';
import type { RoutingTicketInput, SupportTeam } from '../types/intelligentRouting';

const teams: SupportTeam[] = [
  { id: 'billing', name: 'Billing and Payments', categories: ['Billing', 'Payments'], skills: ['refund', 'payment'], capacity: 10, openTickets: 4, availability: 'Available', escalationContact: 'Billing Lead', active: true, isSample: true },
  { id: 'billing-alt', name: 'Billing Overflow', categories: ['Billing'], skills: ['refund'], capacity: 5, openTickets: 2, availability: 'Available', escalationContact: '', active: true, isSample: true },
  { id: 'security', name: 'Security and Critical Incidents', categories: ['Security'], skills: ['security', 'account access'], capacity: 8, openTickets: 7, availability: 'Busy', escalationContact: 'Security Lead', active: true, isSample: true },
];

const ticket: RoutingTicketInput = {
  ticketId: 'ROUTE-1', subject: 'Refund status', description: 'Refund has not arrived.',
  category: 'Billing', urgency: 'Medium', priorityScore: 50, requiredSkills: ['refund'],
  frustrationScore: null, unresolvedContacts: null, currentTeam: '',
  unassignedMinutes: null,
};

describe('intelligent routing', () => {
  it('matches category and required skills and offers alternatives', () => {
    const recommendation = recommendRouting(ticket, teams);
    expect(recommendation.selectedTeam?.team.name).toBe('Billing and Payments');
    expect(recommendation.alternatives).toHaveLength(1);
    expect(recommendation.selectedTeam?.matchedSkills).toEqual(['refund']);
  });

  it('excludes teams without required skills', () => {
    const recommendation = recommendRouting({ ...ticket, requiredSkills: ['legal'] }, teams);
    expect(recommendation.selectedTeam).toBeNull();
    expect(recommendation.status).toBe('Awaiting Manual Review');
  });

  it('excludes unavailable and full teams from recommendations', () => {
    const busyTeam = { ...teams[0], availability: 'Unavailable' as const };
    const recommendation = recommendRouting(ticket, [busyTeam]);
    expect(recommendation.selectedTeam).toBeNull();
    const fullTeam = { ...teams[0], openTickets: 10 };
    expect(recommendRouting(ticket, [fullTeam]).selectedTeam).toBeNull();
  });

  it('ranks available teams above otherwise equivalent busy teams', () => {
    const available = { ...teams[0], id: 'available', availability: 'Available' as const, openTickets: 2 };
    const busy = { ...teams[1], id: 'busy', categories: ['Billing'] as const, skills: ['refund'], availability: 'Busy' as const, openTickets: 2 };
    const recommendation = recommendRouting(ticket, [busy, available]);
    expect(recommendation.selectedTeam?.team.id).toBe('available');
    expect(recommendation.alternatives[0].team.id).toBe('busy');
  });

  it('keeps critical incidents escalated even when the available team is busy', () => {
    const recommendation = recommendRouting({ ...ticket, urgency: 'Critical', category: 'Security', requiredSkills: ['security'], priorityScore: 1 }, teams);
    expect(recommendation.criticalWarning).toBe(true);
    expect(recommendation.escalationReasons.some((reason) => reason.includes('Critical urgency'))).toBe(true);
    expect(recommendation.selectedTeam?.team.name).toBe('Security and Critical Incidents');
  });

  it('requires manual review for security when the designated team is absent', () => {
    const recommendation = recommendRouting({ ...ticket, category: 'Security' }, teams.filter((team) => team.id !== 'security'));
    expect(recommendation.manualReviewRequired).toBe(true);
    expect(recommendation.status).toBe('Awaiting Manual Review');
  });

  it('requires manual review for security if its configured destination has no remaining capacity', () => {
    const fullSecurity = { ...teams[2], openTickets: 8 };
    const recommendation = recommendRouting({ ...ticket, category: 'Security' }, [fullSecurity]);
    expect(recommendation.selectedTeam).toBeNull();
    expect(recommendation.manualReviewRequired).toBe(true);
  });

  it('does not route security cases elsewhere when the designated team is unavailable', () => {
    const unavailableSecurity = { ...teams[2], availability: 'Unavailable' as const };
    const alternate: SupportTeam = { ...teams[0], categories: ['Security'], skills: ['security'], name: 'General Overflow' };
    const recommendation = recommendRouting({ ...ticket, category: 'Security', requiredSkills: ['security'] }, [unavailableSecurity, alternate]);
    expect(recommendation.selectedTeam).toBeNull();
    expect(recommendation.manualReviewRequired).toBe(true);
    expect(recommendation.escalationDestination).toBe('Security and Critical Incidents');
  });

  it('returns no eligible team when there is no category match', () => {
    const recommendation = recommendRouting({ ...ticket, category: 'Delivery' }, teams);
    expect(recommendation.selectedTeam).toBeNull();
    expect(recommendation.explanation).toContain('No eligible team found');
  });

  it('triggers threshold-based escalation for score and repeated unresolved contacts', () => {
    const recommendation = recommendRouting({ ...ticket, priorityScore: 80, unresolvedContacts: 3 }, teams, DEFAULT_ESCALATION_SETTINGS);
    expect(recommendation.escalationReasons).toHaveLength(2);
    expect(recommendation.status).toBe('Escalation Recommended');
  });

  it('recommends escalation after a configured unassigned duration', () => {
    const recommendation = recommendRouting({ ...ticket, unassignedMinutes: 45 }, teams, { ...DEFAULT_ESCALATION_SETTINGS, unassignedEscalationMinutes: 30 });
    expect(recommendation.escalationReasons.some((reason) => reason.includes('remained unassigned'))).toBe(true);
    expect(recommendation.status).toBe('Escalation Recommended');
  });

  it('rejects missing and invalid ticket inputs', () => {
    const errors = validateRoutingTicket({
      ticketId: '', subject: '', description: '', category: 'Other', urgency: 'Low',
      priorityScore: '101', requiredSkills: '', frustrationScore: '-1', unresolvedContacts: '1.5', currentTeam: '',
    });
    expect(errors.ticketId).toBeDefined();
    expect(errors.priorityScore).toBeDefined();
    expect(errors.frustrationScore).toBeDefined();
    expect(errors.unresolvedContacts).toBeDefined();
  });
});
