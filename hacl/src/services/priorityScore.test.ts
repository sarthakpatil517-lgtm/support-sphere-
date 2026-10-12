import { describe, expect, it } from 'vitest';
import {
  DEFAULT_PRIORITY_WEIGHTS,
  URGENCY_SCORE_MAP,
  calculatePriority,
  classifyPriority,
  validatePriorityInput,
  validatePriorityWeights,
} from './priorityScore';

const input = {
  ticketId: 'T-1',
  subject: 'Illustrative ticket',
  urgencyLevel: 'High' as const,
  urgencyScore: '90',
  frustrationScore: '80',
  customerValueScore: '70',
  supportHistoryScore: '100',
  notes: '',
};

describe('priority score calculation', () => {
  it('calculates the example weighted score as 85', () => {
    const result = calculatePriority(input, DEFAULT_PRIORITY_WEIGHTS, true);
    expect(result.score).toBe(85);
    expect(result.category).toBe('High Priority');
    expect(result.factors.map((factor) => factor.contribution)).toEqual([36, 20, 14, 15]);
    expect(result.isSample).toBe(true);
  });

  it('rounds the final score to two decimal places', () => {
    const result = calculatePriority({ ...input, urgencyScore: '37.123', frustrationScore: '51.456', customerValueScore: '67.891', supportHistoryScore: '23.456' });
    expect(result.score).toBe(44.81);
  });

  it('classifies each threshold edge', () => {
    expect(classifyPriority(0)).toBe('Low Priority');
    expect(classifyPriority(44.99)).toBe('Low Priority');
    expect(classifyPriority(45)).toBe('Medium Priority');
    expect(classifyPriority(74.99)).toBe('Medium Priority');
    expect(classifyPriority(75)).toBe('High Priority');
    expect(classifyPriority(100)).toBe('High Priority');
  });

  it('accepts boundary factor inputs 0 and 100', () => {
    const minimum = calculatePriority({ ...input, urgencyScore: '0', frustrationScore: '0', customerValueScore: '0', supportHistoryScore: '0' });
    const maximum = calculatePriority({ ...input, urgencyScore: '100', frustrationScore: '100', customerValueScore: '100', supportHistoryScore: '100' });
    expect(minimum.score).toBe(0);
    expect(maximum.score).toBe(100);
  });

  it('rejects missing, invalid, and out-of-range inputs', () => {
    expect(validatePriorityInput({ ...input, ticketId: '', frustrationScore: '', supportHistoryScore: '101' }).valid).toBe(false);
    expect(() => calculatePriority({ ...input, customerValueScore: '-1' })).toThrow(/between 0 and 100/);
  });

  it('requires weights to total exactly 100 percent', () => {
    expect(validatePriorityWeights(DEFAULT_PRIORITY_WEIGHTS)).toBeNull();
    expect(validatePriorityWeights({ ...DEFAULT_PRIORITY_WEIGHTS, urgency: 39 })).toContain('total exactly 100%');
    expect(() => calculatePriority(input, { ...DEFAULT_PRIORITY_WEIGHTS, urgency: 39 })).toThrow(/total exactly 100%/);
  });

  it('flags critical urgency for immediate attention even with a low weighted score', () => {
    const result = calculatePriority({ ...input, urgencyLevel: 'Critical', urgencyScore: '0', frustrationScore: '0', customerValueScore: '0', supportHistoryScore: '0' });
    expect(result.score).toBe(0);
    expect(result.category).toBe('Low Priority');
    expect(result.criticalFlag).toBe(true);
    expect(result.attentionLevel).toContain('Immediate review required');
  });

  it('maps selected urgency to the documented defaults', () => {
    expect(URGENCY_SCORE_MAP).toEqual({ Low: 20, Medium: 45, High: 75, Critical: 100 });
  });
});
