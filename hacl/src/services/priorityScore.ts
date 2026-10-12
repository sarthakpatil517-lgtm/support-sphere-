import type {
  PriorityCalculation,
  PriorityFormState,
  PriorityInput,
  PriorityWeights,
  UrgencyLevel,
} from '../types/priorityScore';

export const DEFAULT_PRIORITY_WEIGHTS: PriorityWeights = {
  urgency: 40,
  frustration: 25,
  customerValue: 20,
  supportHistory: 15,
};

export const URGENCY_SCORE_MAP: Record<UrgencyLevel, number> = {
  Low: 20,
  Medium: 45,
  High: 75,
  Critical: 100,
};

export function validatePriorityWeights(weights: PriorityWeights): string | null {
  const values = Object.values(weights);
  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    return 'Each weight must be a number between 0 and 100.';
  }

  const total = values.reduce((sum, value) => sum + value, 0);
  if (Math.abs(total - 100) > 1e-8) {
    return `Weights must total exactly 100%. Current total: ${total.toFixed(2)}%.`;
  }
  return null;
}

export function validatePriorityInput(input: Partial<PriorityFormState>): {
  valid: boolean;
  errors: Record<string, string>;
  cleaned: Partial<PriorityInput>;
} {
  const errors: Record<string, string> = {};
  const cleaned: Partial<PriorityInput> = {};

  const ticketId = (input.ticketId || '').trim();
  const subject = (input.subject || '').trim();
  if (!ticketId) errors.ticketId = 'Ticket ID is required.';
  else cleaned.ticketId = ticketId;
  if (!subject) errors.subject = 'Ticket subject or issue description is required.';
  else cleaned.subject = subject;

  const urgencyLevel = input.urgencyLevel;
  if (!urgencyLevel || !Object.hasOwn(URGENCY_SCORE_MAP, urgencyLevel)) {
    errors.urgencyLevel = 'Choose a valid urgency level.';
  } else {
    cleaned.urgencyLevel = urgencyLevel;
  }

  const numberFields: Array<[keyof PriorityFormState, keyof PriorityInput, string]> = [
    ['urgencyScore', 'urgencyScore', 'Urgency score'],
    ['frustrationScore', 'frustrationScore', 'Customer frustration score'],
    ['customerValueScore', 'customerValueScore', 'Customer value score'],
    ['supportHistoryScore', 'supportHistoryScore', 'Support history score'],
  ];
  numberFields.forEach(([formKey, inputKey, label]) => {
    const raw = input[formKey];
    const value = raw === '' || raw === undefined ? Number.NaN : Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100) {
      errors[formKey] = `${label} is required and must be between 0 and 100.`;
    } else {
      Object.assign(cleaned, { [inputKey]: value });
    }
  });

  cleaned.notes = (input.notes || '').trim();

  return { valid: Object.keys(errors).length === 0, errors, cleaned };
}

export function classifyPriority(score: number): PriorityCalculation['category'] {
  if (score < 45) return 'Low Priority';
  if (score < 75) return 'Medium Priority';
  return 'High Priority';
}

export function calculatePriority(
  input: Partial<PriorityFormState>,
  weights: PriorityWeights = DEFAULT_PRIORITY_WEIGHTS,
  isSample = false
): PriorityCalculation {
  const validation = validatePriorityInput(input);
  if (!validation.valid) {
    throw new Error(Object.values(validation.errors).join(' '));
  }

  const weightError = validatePriorityWeights(weights);
  if (weightError) throw new Error(weightError);

  const clean = validation.cleaned as PriorityInput;
  const factors: PriorityCalculation['factors'] = [
    { key: 'urgency', label: 'Urgency', score: clean.urgencyScore, weight: weights.urgency, contribution: clean.urgencyScore * weights.urgency / 100 },
    { key: 'frustration', label: 'Customer frustration', score: clean.frustrationScore, weight: weights.frustration, contribution: clean.frustrationScore * weights.frustration / 100 },
    { key: 'customerValue', label: 'Customer value', score: clean.customerValueScore, weight: weights.customerValue, contribution: clean.customerValueScore * weights.customerValue / 100 },
    { key: 'supportHistory', label: 'Support history', score: clean.supportHistoryScore, weight: weights.supportHistory, contribution: clean.supportHistoryScore * weights.supportHistory / 100 },
  ];
  const score = Number(factors.reduce((sum, factor) => sum + factor.contribution, 0).toFixed(2));
  const criticalFlag = clean.urgencyLevel === 'Critical';
  const attentionLevel = criticalFlag
    ? 'Immediate review required regardless of weighted score.'
    : score >= 75
      ? 'High attention: prioritize prompt review.'
      : score >= 45
        ? 'Medium attention: review in the normal priority queue.'
        : 'Low attention: handle through the standard queue.';

  const influential = [...factors].sort((a, b) => b.contribution - a.contribution).slice(0, 2);
  const explanation = `${influential[0].label} (${influential[0].contribution.toFixed(2)} points) and ${influential[1].label} (${influential[1].contribution.toFixed(2)} points) contribute most to this result. The score is the sum of each 0–100 factor multiplied by its configured weight.`;

  return {
    ...clean,
    weights: { ...weights },
    factors,
    score,
    category: classifyPriority(score),
    criticalFlag,
    attentionLevel,
    explanation,
    analyzedAt: new Date().toISOString(),
    isSample,
  };
}
