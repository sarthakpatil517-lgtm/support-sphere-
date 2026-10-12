import { describe, expect, it } from 'vitest';
import {
  DEFAULT_CUSTOMER_VALUE_WEIGHTS,
  calculateCustomerValueScore,
  classifyCustomerValueScore,
  normalizeWeights,
  validateCustomerValueInput,
} from './customerValueAnalysis';

describe('customer value scoring', () => {
  it('calculates a score for a strong customer profile', () => {
    const result = calculateCustomerValueScore({
      customerId: 'CUST-2044',
      customerName: 'Marcus Lee',
      accountTier: 'Platinum',
      tenureMonths: 72,
      totalTickets: 10,
      repeatContacts: 2,
      lifetimeValue: 260000,
      accountStatus: 'Active',
      resolvedTickets: 9,
    });

    expect(result.score).toBeGreaterThan(70);
    expect(result.category).toBe('Very High Value');
    expect(result.missingFields).toEqual([]);
  });

  it('handles missing values transparently', () => {
    const result = calculateCustomerValueScore({
      customerId: 'CUST-4007',
      customerName: 'Priya Nair',
      accountTier: 'Standard',
      tenureMonths: 5,
      totalTickets: 1,
      repeatContacts: 0,
      lifetimeValue: '',
      accountStatus: 'Active',
      resolvedTickets: '',
    });

    expect(result.missingFields).toContain('Lifetime value');
    expect(result.score).toBeLessThan(50);
  });

  it('throws validation errors for invalid values', () => {
    expect(() =>
      calculateCustomerValueScore({
        customerId: '',
        customerName: 'Bad user',
        accountTier: 'Standard',
        tenureMonths: -1,
        totalTickets: 1,
        repeatContacts: 0,
        lifetimeValue: '',
        accountStatus: 'Active',
      })
    ).toThrow(/Customer ID is required|Tenure in months/);
  });

  it('assigns the correct category boundaries', () => {
    expect(classifyCustomerValueScore(0)).toBe('Low Value');
    expect(classifyCustomerValueScore(24)).toBe('Low Value');
    expect(classifyCustomerValueScore(25)).toBe('Moderate Value');
    expect(classifyCustomerValueScore(49)).toBe('Moderate Value');
    expect(classifyCustomerValueScore(50)).toBe('High Value');
    expect(classifyCustomerValueScore(74)).toBe('High Value');
    expect(classifyCustomerValueScore(75)).toBe('Very High Value');
    expect(classifyCustomerValueScore(100)).toBe('Very High Value');
  });

  it('normalizes weights so total weight stays at 100%', () => {
    const normalized = normalizeWeights({ tier: 50, tenure: 10, lifetimeValue: 10, accountStatusAndHistory: 10 });
    expect(Object.values(normalized).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it('keeps repeat contacts separate from the score', () => {
    const result = calculateCustomerValueScore({
      customerId: 'CUST-1001',
      customerName: 'Alicia Thompson',
      accountTier: 'Gold',
      tenureMonths: 42,
      totalTickets: 7,
      repeatContacts: 3,
      lifetimeValue: 122000,
      accountStatus: 'Active',
      resolvedTickets: 5,
    });

    expect(result.repeatContactSummary).toContain('Moderate repeat-contact history');
    expect(result.score).toBeGreaterThan(0);
  });

  it('uses default weights when no custom weights are supplied', () => {
    expect(DEFAULT_CUSTOMER_VALUE_WEIGHTS.tier).toBe(35);
    expect(Object.values(DEFAULT_CUSTOMER_VALUE_WEIGHTS).reduce((sum, value) => sum + value, 0)).toBe(100);
  });

  it('validates complete input structure', () => {
    const result = validateCustomerValueInput({
      customerId: 'CUST-01',
      customerName: 'Jane Doe',
      accountTier: 'Silver',
      tenureMonths: '18',
      totalTickets: '4',
      repeatContacts: '1',
      lifetimeValue: '70300',
      accountStatus: 'At Risk',
      resolvedTickets: '2',
    });

    expect(result.valid).toBe(true);
    expect(result.errors).toEqual({});
  });
});
