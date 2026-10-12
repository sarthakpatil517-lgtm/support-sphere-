import { describe, expect, it } from 'vitest';
import { runPredictiveTriage } from './triagePipeline';
import { matchKnowledgeBase, searchKnowledgeBase } from './knowledgeBase';

describe('Knowledge Base Service', () => {
  it('matches routine password reset queries with high confidence', () => {
    const match = matchKnowledgeBase('How do I reset my password and login?');
    expect(match).not.toBeNull();
    expect(match?.article.id).toBe('KB-101');
    expect(match?.isRoutineSolvable).toBe(true);
    expect(match?.matchedKeywords).toContain('password');
  });

  it('matches refund questions and provides structured solutions', () => {
    const match = matchKnowledgeBase('Where is my refund for cancelled order?');
    expect(match).not.toBeNull();
    expect(match?.article.id).toBe('KB-102');
    expect(match?.article.category).toBe('Refunds and Cancellations');
  });

  it('searches articles by keyword', () => {
    const results = searchKnowledgeBase('tracking');
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.id === 'KB-103')).toBe(true);
  });
});

describe('Predictive Triage Pipeline', () => {
  it('escalates highly frustrated customer to senior staff', async () => {
    const result = await runPredictiveTriage(
      'Payment failed again',
      'This is the fourth time my transaction failed! Nobody resolved it and I am extremely frustrated. Completely unacceptable!',
      { accountTier: 'Standard', tenureMonths: 6, totalTickets: 2, repeatContacts: 2 }
    );

    expect(result.sentimentAnalysis.sentiment).toBe('Frustrated');
    expect(result.sentimentAnalysis.frustrationScore).toBeGreaterThanOrEqual(70);
    expect(result.triageOutcome.isEscalatedToSenior).toBe(true);
    expect(result.triageOutcome.routingLevel).toBe('Senior Staff Escalation');
    expect(result.triageOutcome.assignedRole).toContain('Senior');
  });

  it('escalates high-value VIP customer to senior staff even with moderate issue', async () => {
    const result = await runPredictiveTriage(
      'Invoice question',
      'Could you please clarify invoice item 4 on my enterprise contract?',
      { accountTier: 'Platinum', tenureMonths: 48, lifetimeValue: 120000, totalTickets: 4, repeatContacts: 0 }
    );

    expect(result.customerValueAnalysis.score).toBeGreaterThanOrEqual(75);
    expect(result.triageOutcome.isEscalatedToSenior).toBe(true);
    expect(result.triageOutcome.escalationReasons.some((r) => r.includes('High-Value'))).toBe(true);
  });

  it('deflects routine inquiry to Automated Knowledge Base', async () => {
    const result = await runPredictiveTriage(
      'Password reset help',
      'How do I reset my password and restore login access to my account?',
      { accountTier: 'Standard', tenureMonths: 3, lifetimeValue: 200, totalTickets: 0, repeatContacts: 0 }
    );

    expect(result.triageOutcome.isKbDeflected).toBe(true);
    expect(result.triageOutcome.routingLevel).toBe('Automated Knowledge Base');
    expect(result.knowledgeBaseMatch?.article.id).toBe('KB-101');
  });

  it('safeguards critical security urgency to senior incident team', async () => {
    const result = await runPredictiveTriage(
      'Account hacked',
      'Someone accessed my account without authorization and unauthorized transactions were made! Security breach!',
      { accountTier: 'Silver', tenureMonths: 12, lifetimeValue: 1500, totalTickets: 1, repeatContacts: 0 }
    );

    expect(result.urgencyPrediction.urgency).toBe('Critical');
    expect(result.urgencyPrediction.criticalFlag).toBe(true);
    expect(result.triageOutcome.isEscalatedToSenior).toBe(true);
    expect(result.triageOutcome.assignedTeam).toContain('Security');
  });
});

