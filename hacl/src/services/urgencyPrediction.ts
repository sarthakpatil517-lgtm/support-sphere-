import type { UrgencyLevel, UrgencyPredictionResult } from '../types/issueAnalysis';

const URGENCY_RULES = {
  Critical: [
    'hacked', 'unauthorized access', 'unknown login', 'someone accessed my account', 'security breach', 'account takeover', 'compromised', 'fraudulent access', 'stolen password', 'security incident'
  ],
  High: [
    'payment deducted', 'payment failed', 'order not created', 'service outage', 'app is down', 'cannot access', 'billing issue', 'failed to process', 'refund denied', 'critical issue', 'urgent', 'cannot log in'
  ],
  Medium: [
    'delayed', 'later than expected', 'not updated', 'late delivery', 'order has not arrived', 'not working properly', 'still broken', 'missing update', 'technical issue'
  ],
  Low: [
    'how do i', 'change profile', 'update profile', 'what is', 'please tell me', 'can you', 'question', 'information', 'how to'
  ],
};

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

export function predictUrgency(subject: string, message: string): UrgencyPredictionResult {
  const combined = normalize(`${subject} ${message}`);

  if (!combined) {
    throw new Error('Customer message is required before analysis.');
  }

  const criticalMatches = URGENCY_RULES.Critical.reduce((score, phrase) => score + (combined.includes(phrase) ? 1 : 0), 0);
  const highMatches = URGENCY_RULES.High.reduce((score, phrase) => score + (combined.includes(phrase) ? 1 : 0), 0);
  const mediumMatches = URGENCY_RULES.Medium.reduce((score, phrase) => score + (combined.includes(phrase) ? 1 : 0), 0);
  const lowMatches = URGENCY_RULES.Low.reduce((score, phrase) => score + (combined.includes(phrase) ? 1 : 0), 0);

  let urgency: UrgencyLevel = 'Low';
  let criticalFlag = false;
  let score = lowMatches * 1 + mediumMatches * 2 + highMatches * 3 + criticalMatches * 4;

  if (criticalMatches > 0 || /unauthorized|hacked|security breach|account takeover|someone accessed/i.test(combined)) {
    urgency = 'Critical';
    criticalFlag = true;
    score += 20;
  } else if (highMatches > 0 || /payment deducted|not created|app is down|cannot access|service outage/i.test(combined)) {
    urgency = 'High';
    score += 12;
  } else if (mediumMatches > 0 || /late|not arrived|delay|broken|issue/i.test(combined)) {
    urgency = 'Medium';
    score += 6;
  } else {
    urgency = 'Low';
    score += 2;
  }

  const confidence = clamp(Number((0.5 + Math.min(score / 14, 0.48)).toFixed(2)), 0.52, 0.97);
  const recommendationMap: Record<UrgencyLevel, string> = {
    Low: 'Normal support handling or self-service guidance.',
    Medium: 'Regular support investigation within the usual response window.',
    High: 'Prompt investigation by the relevant support team.',
    Critical: 'Immediate review according to the configured critical-incident procedure.',
  };

  const explanationMap: Record<UrgencyLevel, string> = {
    Low: 'The message is mostly informational and does not indicate operational disruption or significant customer risk.',
    Medium: 'The message describes a service issue or delay that needs investigation but does not indicate immediate or severe impact.',
    High: 'The message suggests a significant operational or financial problem that likely requires prompt attention.',
    Critical: 'The message includes serious access, security, or high-impact indicators that warrant immediate review.',
  };

  return {
    urgency,
    confidence,
    explanation: explanationMap[urgency],
    criticalFlag,
    recommendedAction: recommendationMap[urgency],
    modelName: 'Local rule-based urgency baseline',
    analyzedAt: new Date().toISOString(),
  };
}
