import type { IssueCategory, IssueClassificationResult } from '../types/issueAnalysis';

const CATEGORY_KEYWORDS: Record<IssueCategory, string[]> = {
  'Billing and Payments': ['payment', 'charged', 'checkout', 'invoice', 'billing', 'card', 'refund', 'paid', 'payment failed', 'deducted', 'charged twice', 'transaction', 'order created'],
  'Refunds and Cancellations': ['refund', 'cancel', 'cancellation', 'return', 'reimburse', 'money back', 'cancel request', 'subscription cancel'],
  'Technical Support': ['crash', 'error', 'bug', 'not working', 'application', 'app', 'login issue', 'broken', 'loading', 'stuck', 'fails', 'slow', 'glitch'],
  'Delivery and Shipping': ['delivery', 'ship', 'shipping', 'package', 'arrived', 'late', 'tracking', 'order delay', 'not arrived', 'missing parcel'],
  'Account Access': ['account', 'login', 'password', 'reset', 'access', 'locked', 'username', 'sign in', "can't sign in", 'email access'],
  'Product Issues': ['product', 'defect', 'damaged', 'quality', 'broken item', 'faulty', 'wrong item', 'missing parts'],
  'Security Issues': ['security', 'hacked', 'unauthorized', 'suspicious login', 'someone accessed', 'account takeover', 'fraud', 'compromised'],
  'General Inquiry': ['how do i', 'where is', 'what is', 'can you', 'please tell me', 'update profile', 'profile', 'question', 'information'],
  Other: [],
};

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function scoreCategory(text: string, category: IssueCategory): number {
  const keywords = CATEGORY_KEYWORDS[category];
  if (!keywords.length) return 0;

  return keywords.reduce((score, keyword) => {
    if (keyword.includes(' ')) {
      return score + (text.includes(keyword) ? 2 : 0);
    }
    return score + (text.split(keyword).length > 1 ? 1 : 0);
  }, 0);
}

export function classifyIssue(subject: string, message: string): IssueClassificationResult {
  const combined = normalize(`${subject} ${message}`);

  if (!combined) {
    throw new Error('Customer message is required before analysis.');
  }

  const categories = Object.keys(CATEGORY_KEYWORDS) as IssueCategory[];
  const scores = categories.map((category) => ({ category, score: scoreCategory(combined, category) }));
  const best = scores.sort((a, b) => b.score - a.score)[0];

  const topScore = best?.score ?? 0;
  const secondScore = scores.filter((entry) => entry.category !== best.category).sort((a, b) => b.score - a.score)[0]?.score ?? 0;
  const confidence = Math.min(0.96, Math.max(0.52, 0.54 + topScore * 0.12 - Math.max(0, secondScore - topScore) * 0.04));

  const category: IssueCategory = topScore > 0 ? best.category : 'Other';
  const explanation = category === 'Other'
    ? 'The message does not match the primary support categories strongly enough, so it was treated as a general issue for review.'
    : `The message contains cues related to ${category.toLowerCase()} such as ${CATEGORY_KEYWORDS[category].slice(0, 3).join(', ')}.`;

  return {
    category,
    confidence: Number(confidence.toFixed(2)),
    explanation,
    modelName: 'Local rule-based issue classifier',
    analyzedAt: new Date().toISOString(),
  };
}
