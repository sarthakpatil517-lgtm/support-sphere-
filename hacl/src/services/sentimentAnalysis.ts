import type { SentimentAnalysisResult, SentimentLabel } from '../types/sentiment';

const POSITIVE_WORDS = [
  'thanks', 'thank you', 'appreciate', 'excellent', 'great', 'happy', 'love', 'resolved', 'fast', 'quick',
  'helpful', 'satisfied', 'smooth', 'amazing', 'supportive', 'pleasant', 'wonderful', 'easy', 'awesome',
  'impressed', 'grateful', 'fixed', 'successful', 'positive'
];

const NEGATIVE_WORDS = [
  'late', 'disappointed', 'bad', 'poor', 'issue', 'problem', 'wrong', 'slow', 'failed', 'frustrating',
  'confusing', 'unacceptable', 'annoying', 'broken', 'unresolved', 'dissatisfied', 'displeased', 'terrible',
  'costly', 'unhelpful', 'not working', 'never', 'delay', 'missed', 'worse'
];

const STRONG_NEGATIVE_WORDS = [
  'extremely frustrated', 'angry', 'furious', 'awful', 'terrible', 'hopeless', 'horrible', 'ridiculous',
  'this is the fourth time', 'nobody has resolved', 'nobody resolved', 'still broken', 'not resolved',
  'absolutely fed up', 'fed up', 'completely unacceptable', 'extremely disappointed'
];

const FRUSTRATION_WORDS = [
  'frustrated', 'frustrating', 'fed up', 'angry', 'annoyed', 'upset', 'exasperated', 'furious', 'unresolved',
  'still', 'again', 'repeatedly', 'multiple times', 'fourth time', 'nobody', 'ignored', 'waiting', 'stuck'
];

const NEUTRAL_CUES = [
  'could you please', 'how to', 'what is', 'when will', 'where is', 'please tell me', 'can you', 'can i',
  'what should', 'is there', 'do you know', 'need some information', 'question'
];

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z']+/g) ?? []).filter((word) => word.length > 1);
}

function countMatches(text: string, terms: string[]): number {
  return terms.reduce((total, term) => total + (text.includes(term) ? 1 : 0), 0);
}

function collectSignals(text: string): {
  positiveCount: number;
  negativeCount: number;
  strongNegativeCount: number;
  frustrationCount: number;
  repeatedIssueCount: number;
  neutralCount: number;
  words: string[];
} {
  const words = tokenize(text);
  const positiveCount = countMatches(text, POSITIVE_WORDS);
  const negativeCount = countMatches(text, NEGATIVE_WORDS);
  const strongNegativeCount = countMatches(text, STRONG_NEGATIVE_WORDS);
  const frustrationCount = countMatches(text, FRUSTRATION_WORDS);
  const repeatedIssueCount = [
    /again/gi,
    /still/gi,
    /fourth time/gi,
    /multiple times/gi,
    /every time/gi,
    /repeatedly/gi,
    /not resolved/gi,
    /nobody.*resolved/gi,
    /still.*broken/gi,
  ].reduce((total, regex) => total + (regex.test(text) ? 1 : 0), 0);
  const neutralCount = countMatches(text, NEUTRAL_CUES);

  return { positiveCount, negativeCount, strongNegativeCount, frustrationCount, repeatedIssueCount, neutralCount, words };
}

function buildSentiment(text: string, signal: ReturnType<typeof collectSignals>): SentimentLabel {
  const positivity = signal.positiveCount;
  const negativity = signal.negativeCount + signal.strongNegativeCount * 2;
  const frustration = signal.frustrationCount + signal.repeatedIssueCount * 2;
  const hasQuestion = /\?/i.test(text);

  if (positivity > negativity && positivity >= 2 && frustration < 4) {
    return 'Positive';
  }

  if (hasQuestion && negativity <= 2 && positivity <= 2 && signal.neutralCount > 0) {
    return 'Neutral';
  }

  if (frustration >= 4 || signal.repeatedIssueCount >= 2 || signal.strongNegativeCount >= 1) {
    return 'Frustrated';
  }

  if (negativity > positivity || signal.negativeCount >= 2) {
    return 'Negative';
  }

  return 'Neutral';
}

function computeFrustrationScore(text: string, signal: ReturnType<typeof collectSignals>, sentiment: SentimentLabel): number {
  const base = signal.strongNegativeCount * 26 + signal.frustrationCount * 12 + signal.repeatedIssueCount * 18;
  const dissatisfaction = signal.negativeCount * 9;
  const escalation = /nobody|not resolved|still|again|fourth time|multiple times|extremely|completely/i.test(text) ? 18 : 0;
  const punctuation = /!/.test(text) ? 7 : 0;

  let score = clamp(base + dissatisfaction + escalation + punctuation, 0, 100);

  if (sentiment === 'Positive') {
    score = clamp(Math.round(score * 0.25), 0, 32);
  } else if (sentiment === 'Neutral') {
    score = clamp(Math.round(score * 0.45), 0, 52);
  } else if (sentiment === 'Negative') {
    score = clamp(Math.round(score * 0.7), 18, 78);
  }

  return score;
}

function computeConfidence(text: string, signal: ReturnType<typeof collectSignals>, sentiment: SentimentLabel): number {
  const lengthBonus = clamp(text.trim().length / 180, 0, 1);
  const clarity = Math.max(0.45, Math.min(0.96, 0.53 + (Math.abs(signal.positiveCount - signal.negativeCount) * 0.08) + (signal.frustrationCount * 0.05)));
  const sentimentPenalty = sentiment === 'Neutral' ? 0.08 : 0;

  return Number(clamp(clarity + lengthBonus - sentimentPenalty, 0.52, 0.96).toFixed(2));
}

function buildExplanation(text: string, signal: ReturnType<typeof collectSignals>, sentiment: SentimentLabel): string {
  const messages: string[] = [];

  if (sentiment === 'Positive' && signal.positiveCount > 0) {
    messages.push('positive support feedback');
  }

  if (sentiment !== 'Positive' && (signal.strongNegativeCount > 0 || signal.frustrationCount > 0)) {
    messages.push('strong dissatisfaction cues');
  }

  if (signal.repeatedIssueCount > 0) {
    messages.push('repeated complaint patterns');
  }

  if (sentiment !== 'Positive' && (signal.negativeCount > 0 || signal.strongNegativeCount > 0)) {
    messages.push('negative sentiment indicators');
  }

  if (messages.length === 0) {
    return 'The message is ambiguous or factual in tone, so the analyzer kept the classification neutral.';
  }

  const summary = messages.slice(0, 2).join(' and ');

  if (sentiment === 'Positive') {
    return `Positive support feedback and appreciative language were detected, with ${summary} contributing to the result.`;
  }

  if (sentiment === 'Neutral') {
    return `The message is mostly informational or balanced, with limited emotional intensity and ${summary} driving the classification.`;
  }

  if (sentiment === 'Frustrated') {
    return `Strong dissatisfaction and repeated unresolved complaints were detected, reflected by ${summary}.`;
  }

  return `The message shows clear dissatisfaction and negative service feedback, with ${summary} indicating a negative sentiment.`;
}

export async function analyzeSentiment(message: string): Promise<SentimentAnalysisResult> {
  const trimmedMessage = message.trim();

  if (!trimmedMessage) {
    throw new Error('Customer message is required before analysis.');
  }

  if (trimmedMessage.length > 4000) {
    throw new Error('Please keep the customer message under 4,000 characters.');
  }

  const signal = collectSignals(trimmedMessage);
  const sentiment = buildSentiment(trimmedMessage, signal);
  const frustrationScore = computeFrustrationScore(trimmedMessage, signal, sentiment);
  const confidence = computeConfidence(trimmedMessage, signal, sentiment);

  return {
    sentiment,
    frustrationScore,
    confidence,
    explanation: buildExplanation(trimmedMessage, signal, sentiment),
    analyzedAt: new Date().toISOString(),
    modelName: 'Local lexicon-based sentiment analyzer',
  };
}
