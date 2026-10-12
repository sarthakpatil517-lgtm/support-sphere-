import type {
  AccountStatus,
  AccountTier,
  CustomerValueAnalysisResult,
  CustomerValueCategory,
  CustomerValueFormState,
  CustomerValueInput,
  CustomerValueWeights,
} from '../types/customerValue';

export const DEFAULT_CUSTOMER_VALUE_WEIGHTS: CustomerValueWeights = {
  tier: 35,
  tenure: 20,
  lifetimeValue: 25,
  accountStatusAndHistory: 20,
};

const TIER_NORMALIZATION: Record<AccountTier, number> = {
  Standard: 32,
  Silver: 55,
  Gold: 78,
  Platinum: 100,
};

const STATUS_NORMALIZATION: Record<AccountStatus, number> = {
  Active: 100,
  'At Risk': 55,
  Paused: 38,
  Cancelled: 10,
  Inactive: 22,
};

const STORAGE_KEY = 'customer-value-analyses';

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function asNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function normalizeWeights(rawWeights: Partial<CustomerValueWeights>): CustomerValueWeights {
  const weights = { ...DEFAULT_CUSTOMER_VALUE_WEIGHTS, ...rawWeights };
  const entries = Object.values(weights) as number[];
  const total = entries.reduce((sum, entry) => sum + (Number.isFinite(entry) ? entry : 0), 0);

  if (!total || total === 100) {
    return { ...DEFAULT_CUSTOMER_VALUE_WEIGHTS, ...weights };
  }

  const scaled = {
    tier: (weights.tier / total) * 100,
    tenure: (weights.tenure / total) * 100,
    lifetimeValue: (weights.lifetimeValue / total) * 100,
    accountStatusAndHistory: (weights.accountStatusAndHistory / total) * 100,
  };

  const rounded = {
    tier: Number(scaled.tier.toFixed(2)),
    tenure: Number(scaled.tenure.toFixed(2)),
    lifetimeValue: Number(scaled.lifetimeValue.toFixed(2)),
    accountStatusAndHistory: Number(scaled.accountStatusAndHistory.toFixed(2)),
  };

  const sumRounded = Object.values(rounded).reduce((acc, value) => acc + value, 0);
  const difference = Number((100 - sumRounded).toFixed(2));
  rounded.accountStatusAndHistory = Number((rounded.accountStatusAndHistory + difference).toFixed(2));

  return {
    tier: Number(rounded.tier.toFixed(2)),
    tenure: Number(rounded.tenure.toFixed(2)),
    lifetimeValue: Number(rounded.lifetimeValue.toFixed(2)),
    accountStatusAndHistory: Number(rounded.accountStatusAndHistory.toFixed(2)),
  };
}

export function getCustomerValueWeights(): CustomerValueWeights {
  if (typeof window === 'undefined') {
    return { ...DEFAULT_CUSTOMER_VALUE_WEIGHTS };
  }

  const raw = window.localStorage.getItem('customer-value-weights');
  if (!raw) {
    return { ...DEFAULT_CUSTOMER_VALUE_WEIGHTS };
  }

  try {
    const parsed = JSON.parse(raw) as Partial<CustomerValueWeights>;
    return normalizeWeights(parsed);
  } catch (error) {
    return { ...DEFAULT_CUSTOMER_VALUE_WEIGHTS };
  }
}

export function setCustomerValueWeights(weights: Partial<CustomerValueWeights>) {
  if (typeof window === 'undefined') {
    return;
  }

  const normalized = normalizeWeights(weights);
  window.localStorage.setItem('customer-value-weights', JSON.stringify(normalized));
  return normalized;
}

export function classifyCustomerValueScore(score: number): CustomerValueCategory {
  if (score <= 24) {
    return 'Low Value';
  }
  if (score <= 49) {
    return 'Moderate Value';
  }
  if (score <= 74) {
    return 'High Value';
  }
  return 'Very High Value';
}

export function getRepeatContactSummary(repeatContacts: number): string {
  if (repeatContacts <= 0) {
    return 'No repeat contacts recorded. This does not increase customer value automatically.';
  }
  if (repeatContacts <= 2) {
    return 'Low repeat-contact history. Support needs are moderate and should be reviewed separately from value.';
  }
  if (repeatContacts <= 4) {
    return 'Moderate repeat-contact history. This signals recurring support needs and should be treated as a relationship metric, not a value signal.';
  }
  return 'High repeat-contact history. This indicates repeated support interactions and should be reviewed independently from customer value scoring.';
}

export function validateCustomerValueInput(input: Partial<CustomerValueFormState>) {
  const errors: Record<string, string> = {};
  const cleaned: Partial<CustomerValueInput> = {};

  const customerId = (input.customerId || '').trim();
  const customerName = (input.customerName || '').trim();
  const accountTier = (input.accountTier || '').trim();
  const accountStatus = (input.accountStatus || '').trim();

  if (!customerId) {
    errors.customerId = 'Customer ID is required.';
  } else {
    cleaned.customerId = customerId;
  }

  if (!customerName) {
    errors.customerName = 'Customer name is required.';
  } else {
    cleaned.customerName = customerName;
  }

  if (!accountTier || !['Standard', 'Silver', 'Gold', 'Platinum'].includes(accountTier)) {
    errors.accountTier = 'Choose a valid account tier.';
  } else {
    cleaned.accountTier = accountTier as AccountTier;
  }

  const tenure = asNumber(input.tenureMonths);
  if (tenure === null || tenure < 0) {
    errors.tenureMonths = 'Tenure in months must be a valid number greater than or equal to 0.';
  } else {
    cleaned.tenureMonths = tenure;
  }

  const tickets = asNumber(input.totalTickets);
  if (tickets === null || tickets < 0) {
    errors.totalTickets = 'Previous support tickets must be a valid number greater than or equal to 0.';
  } else {
    cleaned.totalTickets = tickets;
  }

  const repeatContacts = asNumber(input.repeatContacts);
  if (repeatContacts === null || repeatContacts < 0) {
    errors.repeatContacts = 'Repeat contacts must be a valid number greater than or equal to 0.';
  } else {
    cleaned.repeatContacts = repeatContacts;
  }

  const lifetimeValue = asNumber(input.lifetimeValue);
  if (input.lifetimeValue !== undefined && input.lifetimeValue !== '' && input.lifetimeValue !== null && lifetimeValue === null) {
    errors.lifetimeValue = 'Lifetime value must be a valid number or left blank.';
  } else {
    cleaned.lifetimeValue = lifetimeValue;
  }

  if (!accountStatus || !['Active', 'At Risk', 'Paused', 'Cancelled', 'Inactive'].includes(accountStatus)) {
    errors.accountStatus = 'Choose a valid account status.';
  } else {
    cleaned.accountStatus = accountStatus as AccountStatus;
  }

  const resolvedTickets = asNumber(input.resolvedTickets);
  if (input.resolvedTickets !== undefined && input.resolvedTickets !== '' && input.resolvedTickets !== null && resolvedTickets === null) {
    errors.resolvedTickets = 'Resolved tickets must be a valid number or left blank.';
  } else {
    cleaned.resolvedTickets = resolvedTickets;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    cleaned: cleaned as Partial<CustomerValueInput>,
  };
}

export function calculateCustomerValueScore(
  input: Partial<CustomerValueFormState>,
  weights: Partial<CustomerValueWeights> = DEFAULT_CUSTOMER_VALUE_WEIGHTS
): CustomerValueAnalysisResult {
  const validation = validateCustomerValueInput(input);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors).join(' '));
  }

  const resolvedWeights = normalizeWeights(weights);
  const cleaned = validation.cleaned as CustomerValueInput;

  const tierNormalized = TIER_NORMALIZATION[cleaned.accountTier];
  const tenureNormalized = clamp((cleaned.tenureMonths / 60) * 100, 0, 100);
  const lifetimeValueNormalized = cleaned.lifetimeValue === null || cleaned.lifetimeValue === undefined
    ? null
    : clamp((cleaned.lifetimeValue / 150000) * 100, 0, 100);

  const statusNormalized = STATUS_NORMALIZATION[cleaned.accountStatus];
  const resolvedRatio = cleaned.totalTickets > 0 && cleaned.resolvedTickets !== null ? clamp((cleaned.resolvedTickets / cleaned.totalTickets) * 100, 0, 100) : 50;
  const accountHistoryScore = clamp((statusNormalized * 0.7) + (resolvedRatio * 0.3), 0, 100);

  const factorScores = [
    {
      label: 'Account tier',
      weight: resolvedWeights.tier,
      normalized: tierNormalized,
      contribution: (tierNormalized / 100) * resolvedWeights.tier,
      missing: false,
    },
    {
      label: 'Customer tenure',
      weight: resolvedWeights.tenure,
      normalized: tenureNormalized,
      contribution: (tenureNormalized / 100) * resolvedWeights.tenure,
      missing: false,
    },
    {
      label: 'Lifetime value',
      weight: resolvedWeights.lifetimeValue,
      normalized: lifetimeValueNormalized ?? 0,
      contribution: lifetimeValueNormalized === null ? 0 : (lifetimeValueNormalized / 100) * resolvedWeights.lifetimeValue,
      missing: lifetimeValueNormalized === null,
    },
    {
      label: 'Account status and relationship history',
      weight: resolvedWeights.accountStatusAndHistory,
      normalized: accountHistoryScore,
      contribution: (accountHistoryScore / 100) * resolvedWeights.accountStatusAndHistory,
      missing: false,
    },
  ];

  const score = clamp(
    factorScores.reduce((sum, factor) => sum + factor.contribution, 0),
    0,
    100
  );

  const missingFields = factorScores.filter((factor) => factor.missing).map((factor) => factor.label);
  const explanationParts = [
    `Account tier contributes ${(factorScores[0].contribution).toFixed(1)} points for ${cleaned.accountTier}.`,
    `Customer tenure contributes ${(factorScores[1].contribution).toFixed(1)} points based on ${cleaned.tenureMonths} months of tenure.`,
    `Lifetime value contributes ${(factorScores[2].contribution).toFixed(1)} points; ${lifetimeValueNormalized === null ? 'no lifetime value was supplied, so this factor was omitted rather than assumed.' : `the supplied value was normalized to ${lifetimeValueNormalized.toFixed(0)} / 100.`}`,
    `Account status and relationship history contribute ${(factorScores[3].contribution).toFixed(1)} points based on ${cleaned.accountStatus} and resolved support history.`,
  ];

  if (missingFields.length > 0) {
    explanationParts.push(`Missing field(s): ${missingFields.join(', ')}. These were left out of the final score instead of being auto-assumed as high-value data.`);
  }

  explanationParts.push('Repeat contacts are shown separately and are not used to raise the customer value score.');

  return {
    customerId: cleaned.customerId,
    customerName: cleaned.customerName,
    score: Number(score.toFixed(2)),
    category: classifyCustomerValueScore(score),
    explanation: explanationParts.join(' '),
    missingFields,
    repeatContactSummary: getRepeatContactSummary(cleaned.repeatContacts),
    normalizedFactors: factorScores,
    weights: resolvedWeights,
    analyzedAt: new Date().toISOString(),
    estimateNote: 'Estimated score based on the configured customer value rules; it is not a prediction of profitability or future behaviour.',
  };
}

export function loadCustomerValueHistory(): Array<{ id: string } & CustomerValueAnalysisResult> {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    return JSON.parse(raw) as Array<{ id: string } & CustomerValueAnalysisResult>;
  } catch (error) {
    return [];
  }
}

export function saveCustomerValueHistory(records: Array<{ id: string } & CustomerValueAnalysisResult>) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function saveCustomerValueRecord(record: { id: string } & CustomerValueAnalysisResult) {
  const existing = loadCustomerValueHistory();
  const next = existing.filter((entry) => entry.customerId !== record.customerId);
  next.unshift(record);
  saveCustomerValueHistory(next.slice(0, 20));
  return next;
}
