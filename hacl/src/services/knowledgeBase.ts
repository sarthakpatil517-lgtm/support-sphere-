export interface KnowledgeBaseArticle {
  id: string;
  title: string;
  category: string;
  summary: string;
  solution: string;
  keywords: string[];
  actionLink?: string;
  actionText?: string;
  isRoutine: boolean;
  viewCount: number;
  helpfulCount: number;
}

export interface KnowledgeBaseMatch {
  article: KnowledgeBaseArticle;
  score: number;
  confidence: number;
  matchedKeywords: string[];
  isRoutineSolvable: boolean;
  explanation: string;
}

export const KNOWLEDGE_BASE_ARTICLES: KnowledgeBaseArticle[] = [
  {
    id: 'KB-101',
    title: 'How to Reset Your Account Password and Restore Login Access',
    category: 'Account Access',
    summary: 'Step-by-step guide to resetting your forgotten or locked account password.',
    solution: `To regain access to your account immediately:
1. Go to the Sign In page and click 'Forgot Password'.
2. Enter the email address registered with your account.
3. Check your inbox for a secure verification link (valid for 30 minutes). If not received, please check your spam folder.
4. Follow the link to choose a strong password of at least 8 characters including uppercase letters, numbers, and symbols.
5. If your account was locked due to multiple attempts, it will automatically unlock upon successful password verification.`,
    keywords: ['password', 'reset', 'login', 'access', 'forgot password', 'credentials', 'sign in', "can't log in", 'locked account', 'username'],
    actionText: 'Open Password Reset Tool',
    actionLink: '#reset-password',
    isRoutine: true,
    viewCount: 1420,
    helpfulCount: 1290,
  },
  {
    id: 'KB-102',
    title: 'Refund Policy, Processing Timelines, and Status Tracking',
    category: 'Refunds and Cancellations',
    summary: 'Understand refund eligibility, standard turnaround times, and bank credit windows.',
    solution: `Refund guidelines and expected timelines:
1. Cancellation Refunds: Automatically initiated within 24 hours of order cancellation.
2. Returned Item Refunds: Processed within 2 business days after inspection at our fulfillment center.
3. Bank Processing Window: Depending on your financial institution, funds appear on your statement in 3 to 7 business days for credit/debit cards, or instantly for digital store credits.
4. Live Status: You can track your active refund status by visiting Account > Orders > Transaction History.`,
    keywords: ['refund', 'cancellation', 'cancel order', 'money back', 'reimbursement', 'refund status', 'timeline', 'pending refund', 'not credited'],
    actionText: 'View Order Refund Status',
    actionLink: '#refund-status',
    isRoutine: true,
    viewCount: 2310,
    helpfulCount: 2150,
  },
  {
    id: 'KB-103',
    title: 'Live Package Tracking and Handling Delivery Delays',
    category: 'Delivery and Shipping',
    summary: 'How to locate your courier tracking number and what to do if your package is delayed.',
    solution: `Tracking and delivery delay assistance:
1. Real-time Tracking: Click the tracking link sent in your shipping confirmation email, or check under Account > Orders.
2. Carrier Transit Updates: In-transit statuses update every 12 to 24 hours as the package passes regional hubs.
3. Delayed Shipments: If your package is overdue by more than 48 hours past the estimated delivery date, our automated replacement or refund safeguard is automatically unlocked.
4. Address Corrections: You may modify delivery instructions directly with the designated courier portal before out-for-delivery status.`,
    keywords: ['delivery', 'shipping', 'tracking', 'package', 'courier', 'late delivery', 'where is my order', 'delayed', 'shipment', 'transit', 'arrived'],
    actionText: 'Track Active Shipment',
    actionLink: '#track-shipment',
    isRoutine: true,
    viewCount: 3105,
    helpfulCount: 2890,
  },
  {
    id: 'KB-104',
    title: 'Troubleshooting Payment Failures, Double Charges, and Checkout Errors',
    category: 'Billing and Payments',
    summary: 'Resolve payment gateway declines, authorization holds, and card verification errors.',
    solution: `Common payment resolutions:
1. Payment Deducted but Order Not Confirmed: If your bank deducted the amount but no order ID was issued, it is usually a temporary bank authorization hold. It automatically reverses in 24–48 hours.
2. Card Declined: Ensure international or online transactions are enabled on your card, and that the CVV and billing zip code match your card statement.
3. Alternative Options: We support digital wallets (Apple Pay, Google Pay, PayPal) and direct bank transfers for instant checkout without card processing drops.
4. Double Charge: Duplicate authorizations are routinely released by banks within 3 business days without manual intervention.`,
    keywords: ['payment', 'payment failed', 'charged twice', 'deducted', 'checkout error', 'card declined', 'transaction', 'gateway error', 'billing error'],
    actionText: 'Retry Checkout or Update Payment',
    actionLink: '#payment-methods',
    isRoutine: true,
    viewCount: 1850,
    helpfulCount: 1670,
  },
  {
    id: 'KB-105',
    title: 'Managing Subscriptions, Billing Invoices, and Payment Methods',
    category: 'Billing and Payments',
    summary: 'How to view tax invoices, switch billing cycles, or cancel auto-renewals.',
    solution: `Subscription and invoice self-service:
1. Download Official Tax Invoices: Navigate to Account Settings > Billing > Invoices to download PDF receipts with GST/tax breakdown.
2. Update Payment Card: Under Payment Methods, add a new card and mark it as primary before removing older cards.
3. Modify Plan or Cancel: You can pause or cancel your subscription at any time under Subscription Details. Your benefits continue until the end of the paid billing period.`,
    keywords: ['subscription', 'invoice', 'receipt', 'tax invoice', 'billing', 'cancel subscription', 'renew', 'update card', 'plan change'],
    actionText: 'Manage Subscription & Invoices',
    actionLink: '#subscription-billing',
    isRoutine: true,
    viewCount: 980,
    helpfulCount: 915,
  },
  {
    id: 'KB-106',
    title: 'Product Warranty Claims, Damaged Package Replacements, and Returns',
    category: 'Product Issues',
    summary: 'Hassle-free return policy, warranty coverage verification, and instant replacement requests.',
    solution: `Product replacement and warranty steps:
1. 30-Day Hassle-Free Returns: If an item does not meet your expectations, initiate a return label under Orders > Return Item.
2. Damaged on Arrival: Take a quick photo of the damaged package/item and submit an instant replacement request within 7 days of delivery. A replacement item ships before the return item is sent back.
3. 1-Year Manufacturer Warranty: Covers hardware and manufacturing defects. Register your product serial number in the warranty portal for expedited coverage.`,
    keywords: ['damaged', 'warranty', 'replacement', 'broken', 'defective', 'return item', 'product quality', 'faulty item', 'cracked'],
    actionText: 'Initiate Instant Replacement',
    actionLink: '#warranty-return',
    isRoutine: true,
    viewCount: 1240,
    helpfulCount: 1150,
  },
  {
    id: 'KB-107',
    title: 'Updating Profile Information, Email Address, and Notification Settings',
    category: 'General Inquiry',
    summary: 'Easily update your registered email, contact phone, or marketing preferences.',
    solution: `Profile and preferences management:
1. Change Registered Email: Go to Profile Settings > Account Security > Email Address. A verification link will be sent to both your old and new email addresses for security.
2. Update Shipping Addresses: Manage multiple home and office addresses in the Address Book for one-click checkout.
3. Notification Controls: Customize SMS alerts, push notifications, and weekly newsletters under Notification Preferences.`,
    keywords: ['profile', 'change email', 'update profile', 'change address', 'phone number', 'notification', 'preferences', 'settings', 'how do i', 'how to'],
    actionText: 'Go to Profile Settings',
    actionLink: '#profile-settings',
    isRoutine: true,
    viewCount: 850,
    helpfulCount: 810,
  },
  {
    id: 'KB-108',
    title: 'Security Guidance: Identifying Suspicious Activity and Securing Your Account',
    category: 'Security',
    summary: 'Steps to protect your account if you suspect unauthorized access or security anomalies.',
    solution: `Account security guidelines:
1. Terminate Active Sessions: Immediately go to Account Settings > Security and click 'Log Out All Other Devices'.
2. Change Password: Change your password immediately to a unique, high-entropy phrase.
3. Enable Two-Factor Authentication (2FA): Add an authenticator app (Google Authenticator / Authy) for two-step sign-in protection.
4. Note: If funds were transferred or unauthorized purchases were made, our Security and Critical Incidents team will review the ticket with priority escalation.`,
    keywords: ['security', 'unauthorized', 'hacked', 'suspicious login', 'compromised', '2fa', 'two-factor', 'account takeover'],
    actionText: 'Review Security Settings',
    actionLink: '#security-center',
    isRoutine: false,
    viewCount: 760,
    helpfulCount: 710,
  },
];

export function searchKnowledgeBase(query: string): KnowledgeBaseArticle[] {
  const normalized = query.toLowerCase().trim();
  if (!normalized) return KNOWLEDGE_BASE_ARTICLES;

  const terms = normalized.split(/\s+/).filter((word) => word.length > 2);

  return KNOWLEDGE_BASE_ARTICLES.filter((article) => {
    const text = `${article.title} ${article.summary} ${article.solution} ${article.keywords.join(' ')}`.toLowerCase();
    return terms.some((term) => text.includes(term));
  });
}

export function matchKnowledgeBase(
  text: string,
  categoryHint?: string
): KnowledgeBaseMatch | null {
  const normalized = text.toLowerCase().trim();
  if (!normalized || normalized.length < 5) return null;

  let bestMatch: KnowledgeBaseArticle | null = null;
  let highestScore = 0;
  let matchedKeywordsForBest: string[] = [];

  for (const article of KNOWLEDGE_BASE_ARTICLES) {
    let score = 0;
    const matchedKeywords: string[] = [];

    // Category match boost
    if (categoryHint && article.category.toLowerCase().includes(categoryHint.toLowerCase())) {
      score += 25;
    }

    // Keyword matching
    for (const keyword of article.keywords) {
      if (normalized.includes(keyword.toLowerCase())) {
        score += keyword.includes(' ') ? 30 : 15;
        matchedKeywords.push(keyword);
      }
    }

    // Title phrase match
    const titleWords = article.title.toLowerCase().split(/\s+/).filter((word) => word.length > 3);
    for (const word of titleWords) {
      if (normalized.includes(word)) {
        score += 8;
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = article;
      matchedKeywordsForBest = matchedKeywords;
    }
  }

  if (!bestMatch || highestScore < 20) {
    return null;
  }

  // Calculate normalized confidence (0.45 to 0.98)
  const confidence = Math.min(0.98, Math.max(0.45, Number((0.45 + (highestScore / 100) * 0.5).toFixed(2))));
  const isRoutineSolvable = bestMatch.isRoutine && confidence >= 0.60;

  return {
    article: bestMatch,
    score: highestScore,
    confidence,
    matchedKeywords: matchedKeywordsForBest,
    isRoutineSolvable,
    explanation: isRoutineSolvable
      ? `This query closely matches standard routine procedures in '${bestMatch.title}' (${matchedKeywordsForBest.slice(0, 3).join(', ')}). An automated resolution can be provided immediately without queue waiting.`
      : `Matched reference article '${bestMatch.title}' with confidence ${(confidence * 100).toFixed(0)}%.`,
  };
}

export function getKnowledgeBaseStats() {
  const totalArticles = KNOWLEDGE_BASE_ARTICLES.length;
  const routineArticles = KNOWLEDGE_BASE_ARTICLES.filter((a) => a.isRoutine).length;
  const totalViews = KNOWLEDGE_BASE_ARTICLES.reduce((acc, a) => acc + a.viewCount, 0);
  const totalHelpful = KNOWLEDGE_BASE_ARTICLES.reduce((acc, a) => acc + a.helpfulCount, 0);
  const satisfactionRate = Math.round((totalHelpful / totalViews) * 100);

  return {
    totalArticles,
    routineArticles,
    totalViews,
    totalHelpful,
    satisfactionRate,
    averageDeflectionTimeSeconds: 1.2,
    routineDeflectionRate: '94.2%',
  };
}

