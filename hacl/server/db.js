import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, randomUUID, scrypt as scryptCallback } from 'node:crypto';
import { promisify } from 'node:util';
import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';

const scrypt = promisify(scryptCallback);

const dbDir = process.env.DASHBOARD_DATA_DIR || path.join(process.cwd(), 'server', 'data');
fs.mkdirSync(dbDir, { recursive: true });

const dbFile = path.join(dbDir, 'tickets.json');

const defaultSlaPolicies = {
  Critical: { responseHours: 0.25, resolutionHours: 2 },
  High: { responseHours: 1, resolutionHours: 8 },
  Medium: { responseHours: 4, resolutionHours: 24 },
  Low: { responseHours: 8, resolutionHours: 48 },
};

const defaultData = {
  tickets: [],
  ticketMessages: [],
  ticketHistory: [],
  priorityCalculations: [],
  priorityWeights: {
    urgency: 40,
    frustration: 25,
    customerValue: 20,
    supportHistory: 15,
  },
  routingTeams: null,
  routingTickets: [],
  routingAudit: [],
  routingSettings: {
    highPriorityThreshold: 75,
    repeatContactThreshold: 3,
    unassignedEscalationMinutes: 30,
    securityDestination: 'Security and Critical Incidents',
    defaultEscalationDestination: 'Support Lead',
  },
  dashboardUsers: [],
  dashboardSessions: [],
  dashboardAudit: [],
  dashboardNotes: [],
  dashboardDrafts: [],
  dashboardRequests: [],
  dashboardRoutingRules: [],
  dashboardTeams: [],
  dashboardEscalationSettings: {
    criticalUrgency: true,
    highPriorityThreshold: 75,
    securityHandling: 'Security and Critical Incidents',
    repeatedContactsThreshold: 3,
    unassignedMinutes: 30,
    escalationDestination: 'Support Lead',
  },
  slaPolicies: defaultSlaPolicies,
  ticketFeedback: [],
};

const adapter = new JSONFile(dbFile);
const db = new Low(adapter, defaultData);
await db.read();

db.data ??= defaultData;
db.data.priorityCalculations ??= [];
db.data.priorityWeights ??= defaultData.priorityWeights;
db.data.routingTickets ??= [];
db.data.routingAudit ??= [];
db.data.routingSettings = { ...defaultData.routingSettings, ...(db.data.routingSettings || {}) };
db.data.dashboardUsers ??= [];
db.data.dashboardSessions ??= [];
db.data.dashboardAudit ??= [];
db.data.dashboardNotes ??= [];
db.data.dashboardDrafts ??= [];
db.data.dashboardRequests ??= [];
db.data.dashboardRoutingRules ??= [];
db.data.dashboardTeams ??= [];
db.data.dashboardEscalationSettings = { ...defaultData.dashboardEscalationSettings, ...(db.data.dashboardEscalationSettings || {}) };
db.data.slaPolicies = { ...defaultSlaPolicies, ...(db.data.slaPolicies || {}) };
db.data.ticketFeedback ??= [];

for (const demoTicketId of ['TK-100101-A1B', 'TK-100102-D3E', 'TK-100103-H7F']) {
  const demoTicket = db.data.tickets.find((ticket) => ticket.id === demoTicketId);
  if (demoTicket && demoTicket.demo_data === undefined) demoTicket.demo_data = true;
}

const sampleRoutingTeams = [
  { id: 'sample-billing', name: 'Billing and Payments', categories: ['Billing', 'Payments'], skills: ['payment', 'billing', 'refund'], capacity: 12, openTickets: 5, availability: 'Available', escalationContact: 'Billing Lead', active: true, isSample: true },
  { id: 'sample-technical', name: 'Technical Support', categories: ['Technical Support'], skills: ['troubleshooting', 'application', 'account access'], capacity: 16, openTickets: 9, availability: 'Available', escalationContact: 'Technical Lead', active: true, isSample: true },
  { id: 'sample-account', name: 'Account and Access Support', categories: ['Account Access'], skills: ['account access', 'login', 'identity verification'], capacity: 10, openTickets: 6, availability: 'Available', escalationContact: 'Account Lead', active: true, isSample: true },
  { id: 'sample-delivery', name: 'Delivery and Logistics', categories: ['Delivery'], skills: ['shipping', 'tracking', 'logistics'], capacity: 10, openTickets: 4, availability: 'Available', escalationContact: 'Logistics Lead', active: true, isSample: true },
  { id: 'sample-returns', name: 'Returns and Refunds', categories: ['Refunds'], skills: ['refund', 'returns', 'billing'], capacity: 9, openTickets: 5, availability: 'Available', escalationContact: 'Returns Lead', active: true, isSample: true },
  { id: 'sample-product', name: 'Product Support', categories: ['Product Issues'], skills: ['product troubleshooting', 'quality', 'warranty'], capacity: 10, openTickets: 6, availability: 'Busy', escalationContact: 'Product Lead', active: true, isSample: true },
  { id: 'sample-security', name: 'Security and Critical Incidents', categories: ['Security'], skills: ['security', 'account access', 'incident response'], capacity: 6, openTickets: 3, availability: 'Available', escalationContact: 'Security Lead', active: true, isSample: true },
  { id: 'sample-general', name: 'General Customer Support', categories: ['General', 'Other'], skills: ['customer support', 'general inquiries'], capacity: 20, openTickets: 8, availability: 'Available', escalationContact: 'Support Lead', active: true, isSample: true },
];
db.data.routingTeams ??= sampleRoutingTeams;

const ticketStatuses = ['Open', 'In Progress', 'Awaiting Customer', 'Resolved', 'Closed'];
const categoryOptions = [
  'Billing and Payments',
  'Refunds and Cancellations',
  'Technical Support',
  'Delivery and Shipping',
  'Account Access',
  'Product Issues',
  'General Inquiry',
  'Other',
];

const generateTicketId = () => `TK-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const generateMessageId = () => `MSG-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
const generateHistoryId = () => `EV-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;

// Dynamic SLA calculation engine
export const refreshTicketSlaStatuses = () => {
  const now = Date.now();
  const policies = db.data.slaPolicies || defaultSlaPolicies;

  for (const ticket of db.data.tickets) {
    const priority = ticket.dashboardUrgency || ticket.triage?.urgency || 'Medium';
    const policy = policies[priority] || policies.Medium || { responseHours: 4, resolutionHours: 24 };
    const createdTime = Date.parse(ticket.created_at) || now;

    if (!ticket.response_deadline) {
      ticket.response_deadline = new Date(createdTime + policy.responseHours * 3600 * 1000).toISOString();
    }
    if (!ticket.resolution_deadline) {
      ticket.resolution_deadline = new Date(createdTime + policy.resolutionHours * 3600 * 1000).toISOString();
    }
    if (!ticket.sla_policy) {
      ticket.sla_policy = `${priority} SLA Standard`;
    }
    if (!ticket.sla_start_time) {
      ticket.sla_start_time = ticket.created_at;
    }

    const respDeadlineMs = Date.parse(ticket.response_deadline);
    const resolDeadlineMs = Date.parse(ticket.resolution_deadline);

    // Response SLA
    if (ticket.first_response_at) {
      ticket.response_sla_status = Date.parse(ticket.first_response_at) <= respDeadlineMs ? 'Met' : 'Breached';
    } else {
      if (now > respDeadlineMs) {
        ticket.response_sla_status = 'Breached';
      } else {
        const respElapsed = now - createdTime;
        const respTotal = respDeadlineMs - createdTime;
        const ratio = respTotal > 0 ? respElapsed / respTotal : 1;
        if (ratio >= 0.8) {
          ticket.response_sla_status = 'At Risk';
        } else if (ratio >= 0.6) {
          ticket.response_sla_status = 'Approaching';
        } else {
          ticket.response_sla_status = 'Within SLA';
        }
      }
    }

    // Resolution SLA
    const isResolved = ticket.status === 'Resolved' || ticket.status === 'Closed';
    if (isResolved) {
      const resolvedAtMs = Date.parse(ticket.resolved_at || ticket.updated_at);
      ticket.resolution_sla_status = resolvedAtMs <= resolDeadlineMs ? 'Met' : 'Breached';
    } else {
      if (now > resolDeadlineMs) {
        ticket.resolution_sla_status = 'Breached';
      } else {
        const resolElapsed = now - createdTime;
        const resolTotal = resolDeadlineMs - createdTime;
        const ratio = resolTotal > 0 ? resolElapsed / resolTotal : 1;
        if (ratio >= 0.8) {
          ticket.resolution_sla_status = 'At Risk';
        } else if (ratio >= 0.6) {
          ticket.resolution_sla_status = 'Approaching';
        } else {
          ticket.resolution_sla_status = 'Within SLA';
        }
      }
    }

    // Worst-case evaluation for overall risk
    if (ticket.response_sla_status === 'Breached' || ticket.resolution_sla_status === 'Breached') {
      ticket.current_risk_status = 'Breached';
    } else if (ticket.response_sla_status === 'At Risk' || ticket.resolution_sla_status === 'At Risk') {
      ticket.current_risk_status = 'At Risk';
    } else if (ticket.response_sla_status === 'Approaching' || ticket.resolution_sla_status === 'Approaching') {
      ticket.current_risk_status = 'Approaching';
    } else if (isResolved && ticket.resolution_sla_status === 'Met') {
      ticket.current_risk_status = 'Met';
    } else {
      ticket.current_risk_status = 'Within SLA';
    }
  }
};

const ensureSeedData = () => {
  const now = new Date();
  const createdInitial = db.data.tickets.length === 0;

  if (createdInitial) {
    const tickets = [
      {
        id: 'TK-100101-A1B',
        customer_id: 'customer-demo',
        customer_name: 'Jane Cooper (Customer)',
        subject: 'Unable to access my account after password reset',
        description: 'I reset my password but the app still says my credentials are invalid. I can no longer access my orders or saved address details.',
        category: 'Account Access',
        status: 'Open',
        assigned_agent: 'Mila Brooks',
        assigned_user_id: 'user-agent-mila',
        reference_number: null,
        resolution_notes: null,
        dashboardUrgency: 'High',
        dashboardPriority: 78,
        first_response_at: new Date(now.getTime() - 1000 * 60 * 60 * 11).toISOString(),
        resolved_at: null,
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 12).toISOString(),
        updated_at: new Date(now.getTime() - 1000 * 60 * 60 * 7).toISOString(),
      },
      {
        id: 'TK-100102-D3E',
        customer_id: 'customer-demo',
        customer_name: 'Jane Cooper (Customer)',
        subject: 'Refund still pending for cancelled order',
        description: 'I cancelled my order last week, but the refund has not appeared in my payment account. I need an update on the refund timeline.',
        category: 'Refunds and Cancellations',
        status: 'In Progress',
        assigned_agent: 'Aiden Lee',
        assigned_user_id: 'user-agent-aiden',
        reference_number: 'ORD-44512',
        resolution_notes: null,
        dashboardUrgency: 'Medium',
        dashboardPriority: 55,
        first_response_at: new Date(now.getTime() - 1000 * 60 * 60 * 34).toISOString(),
        resolved_at: null,
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 36).toISOString(),
        updated_at: new Date(now.getTime() - 1000 * 60 * 60 * 18).toISOString(),
      },
      {
        id: 'TK-100103-H7F',
        customer_id: 'customer-demo',
        customer_name: 'Jane Cooper (Customer)',
        subject: 'Replacement item arrived damaged',
        description: 'The replacement package arrived with a cracked lid and the product does not match the description in my order. Please advise on the best next step.',
        category: 'Product Issues',
        status: 'Resolved',
        assigned_agent: 'Noah Patel',
        assigned_user_id: 'user-agent-noah',
        reference_number: 'PCK-9801',
        resolution_notes: 'Replacement has been issued and tracked successfully.',
        dashboardUrgency: 'Low',
        dashboardPriority: 35,
        first_response_at: new Date(now.getTime() - 1000 * 60 * 60 * 69).toISOString(),
        resolved_at: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 72).toISOString(),
        updated_at: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
      },
    ];

    db.data.tickets = tickets;
    db.data.ticketHistory = [
      { id: generateHistoryId(), ticket_id: 'TK-100101-A1B', event_type: 'Ticket created', note: 'Ticket created for account access support.', created_at: tickets[0].created_at },
      { id: generateHistoryId(), ticket_id: 'TK-100102-D3E', event_type: 'Ticket created', note: 'Ticket created for refund and cancellation review.', created_at: tickets[1].created_at },
      { id: generateHistoryId(), ticket_id: 'TK-100102-D3E', event_type: 'Status changed', note: 'Status changed to In Progress.', created_at: tickets[1].updated_at },
      { id: generateHistoryId(), ticket_id: 'TK-100103-H7F', event_type: 'Ticket created', note: 'Ticket created for product issue resolution.', created_at: tickets[2].created_at },
      { id: generateHistoryId(), ticket_id: 'TK-100103-H7F', event_type: 'Ticket resolved', note: 'Customer issue resolved successfully and case closed.', created_at: tickets[2].updated_at },
    ];
  }

  // Seed rich historical tickets if dataset is small and not in unit testing mode
  if (process.env.NODE_ENV !== 'test' && db.data.tickets.length < 10) {
    const historicalTickets = [
      {
        id: 'TK-200201-CRT',
        customer_id: 'cust-vip-101',
        customer_name: 'Apex Corp (Enterprise VIP)',
        subject: 'URGENT: Production payment gateway timeout on checkout',
        description: 'Customers are receiving 504 Gateway Timeout during checkout on all major credit card transactions. Requires immediate senior engineer intervention.',
        category: 'Billing and Payments',
        status: 'Resolved',
        assigned_agent: 'Marcus Sterling (Senior Lead)',
        assigned_user_id: 'user-senior-demo',
        reference_number: 'INC-8891',
        resolution_notes: 'Rerouted gateway traffic to primary standby cluster and flushed connection pool.',
        dashboardUrgency: 'Critical',
        dashboardPriority: 96,
        first_response_at: new Date(now.getTime() - 1000 * 60 * 60 * 120 + 1000 * 60 * 8).toISOString(),
        resolved_at: new Date(now.getTime() - 1000 * 60 * 60 * 120 + 1000 * 60 * 75).toISOString(),
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 120).toISOString(),
        updated_at: new Date(now.getTime() - 1000 * 60 * 60 * 118).toISOString(),
      },
      {
        id: 'TK-200202-ATK',
        customer_id: 'cust-user-402',
        customer_name: 'Global Retailers Inc',
        subject: 'API Rate limit exceeded on order synchronization webhook',
        description: 'Our backend sync job stopped processing at midnight. We need our rate limits increased or guidance on bulk batching.',
        category: 'Technical Support',
        status: 'Open',
        assigned_agent: 'Alex Rivera (Support Agent)',
        assigned_user_id: 'user-agent-demo',
        reference_number: 'DEV-441',
        resolution_notes: null,
        dashboardUrgency: 'High',
        dashboardPriority: 82,
        first_response_at: null,
        resolved_at: null,
        created_at: new Date(now.getTime() - 1000 * 60 * 50).toISOString(), // 50m ago, high priority SLA = 60m (approaching/at-risk)
        updated_at: new Date(now.getTime() - 1000 * 60 * 50).toISOString(),
      },
      {
        id: 'TK-200203-BRC',
        customer_id: 'cust-user-503',
        customer_name: 'Sarah Connor',
        subject: 'Unauthorized password change notification received',
        description: 'I got an email saying my password was changed from another IP address, but I did not initiate this change.',
        category: 'Security',
        status: 'In Progress',
        assigned_agent: 'Marcus Sterling (Senior Lead)',
        assigned_user_id: 'user-senior-demo',
        reference_number: 'SEC-991',
        resolution_notes: null,
        dashboardUrgency: 'Critical',
        dashboardPriority: 98,
        first_response_at: new Date(now.getTime() - 1000 * 60 * 35).toISOString(), // 35m response on 15m critical target = Breached!
        resolved_at: null,
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
        updated_at: new Date(now.getTime() - 1000 * 60 * 35).toISOString(),
      },
      {
        id: 'TK-200204-MED',
        customer_id: 'customer-demo',
        customer_name: 'Jane Cooper (Customer)',
        subject: 'Invoice copy needed for Q3 business tax return',
        description: 'Could you please re-send the consolidated PDF invoice for all purchases made between July and September?',
        category: 'Billing and Payments',
        status: 'Resolved',
        assigned_agent: 'Mila Brooks',
        assigned_user_id: 'user-agent-mila',
        reference_number: 'INV-2023-Q3',
        resolution_notes: 'Consolidated invoice generated and emailed to customer.',
        dashboardUrgency: 'Medium',
        dashboardPriority: 48,
        first_response_at: new Date(now.getTime() - 1000 * 60 * 60 * 48 + 1000 * 60 * 90).toISOString(),
        resolved_at: new Date(now.getTime() - 1000 * 60 * 60 * 48 + 1000 * 60 * 240).toISOString(),
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 48).toISOString(),
        updated_at: new Date(now.getTime() - 1000 * 60 * 60 * 44).toISOString(),
      },
      {
        id: 'TK-200205-DEL',
        customer_id: 'cust-user-601',
        customer_name: 'David Miller',
        subject: 'Package marked delivered but not received at front desk',
        description: 'Tracking status indicates delivery was completed at 10 AM, but building concierge has no record of the parcel.',
        category: 'Delivery and Shipping',
        status: 'Resolved',
        assigned_agent: 'Aiden Lee',
        assigned_user_id: 'user-agent-aiden',
        reference_number: 'TRK-981244',
        resolution_notes: 'Carrier driver located parcel in adjacent unit mailbox and redelivered.',
        dashboardUrgency: 'Medium',
        dashboardPriority: 52,
        first_response_at: new Date(now.getTime() - 1000 * 60 * 60 * 96 + 1000 * 60 * 45).toISOString(),
        resolved_at: new Date(now.getTime() - 1000 * 60 * 60 * 96 + 1000 * 60 * 180).toISOString(),
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 96).toISOString(),
        updated_at: new Date(now.getTime() - 1000 * 60 * 60 * 93).toISOString(),
      },
      {
        id: 'TK-200206-LOW',
        customer_id: 'cust-user-702',
        customer_name: 'Emily Watson',
        subject: 'General feedback regarding new mobile app interface',
        description: 'I love the new dark mode theme, but would suggest adding font size toggles for better accessibility.',
        category: 'General Inquiry',
        status: 'Resolved',
        assigned_agent: 'Noah Patel',
        assigned_user_id: 'user-agent-noah',
        reference_number: null,
        resolution_notes: 'Logged user feedback with the product UI team.',
        dashboardUrgency: 'Low',
        dashboardPriority: 25,
        first_response_at: new Date(now.getTime() - 1000 * 60 * 60 * 144 + 1000 * 60 * 120).toISOString(),
        resolved_at: new Date(now.getTime() - 1000 * 60 * 60 * 144 + 1000 * 60 * 300).toISOString(),
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 144).toISOString(),
        updated_at: new Date(now.getTime() - 1000 * 60 * 60 * 139).toISOString(),
      },
      {
        id: 'TK-200207-PRD',
        customer_id: 'cust-user-804',
        customer_name: 'Robert Chen',
        subject: 'Bluetooth sync fails repeatedly on model X5 firmware 2.4',
        description: 'Pairing drops after 10 seconds of connection. Tried resetting network cache and reinstalling companion app with no success.',
        category: 'Product Issues',
        status: 'In Progress',
        assigned_agent: 'Alex Rivera (Support Agent)',
        assigned_user_id: 'user-agent-demo',
        reference_number: 'FW-204-X',
        resolution_notes: null,
        dashboardUrgency: 'High',
        dashboardPriority: 74,
        first_response_at: new Date(now.getTime() - 1000 * 60 * 60 * 4 + 1000 * 60 * 20).toISOString(),
        resolved_at: null,
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 4).toISOString(),
        updated_at: new Date(now.getTime() - 1000 * 60 * 60 * 3).toISOString(),
      },
      {
        id: 'TK-200208-REF',
        customer_id: 'cust-user-905',
        customer_name: 'Liam Vance',
        subject: 'Double charge detected for monthly subscription renewal',
        description: 'My credit card statement displays two identical debits of $49.00 on the same day. Please refund the duplicate transaction.',
        category: 'Refunds and Cancellations',
        status: 'Resolved',
        assigned_agent: 'Aiden Lee',
        assigned_user_id: 'user-agent-aiden',
        reference_number: 'SUB-99411',
        resolution_notes: 'Duplicate transaction refunded immediately. Confirmation sent.',
        dashboardUrgency: 'High',
        dashboardPriority: 86,
        first_response_at: new Date(now.getTime() - 1000 * 60 * 60 * 70 + 1000 * 60 * 25).toISOString(),
        resolved_at: new Date(now.getTime() - 1000 * 60 * 60 * 70 + 1000 * 60 * 110).toISOString(),
        created_at: new Date(now.getTime() - 1000 * 60 * 60 * 70).toISOString(),
        updated_at: new Date(now.getTime() - 1000 * 60 * 60 * 68).toISOString(),
      },
    ];

    for (const hTicket of historicalTickets) {
      if (!db.data.tickets.some((t) => t.id === hTicket.id)) {
        db.data.tickets.push(hTicket);
      }
    }

    // Seed sample CSAT feedbacks
    if ((db.data.ticketFeedback || []).length === 0) {
      db.data.ticketFeedback = [
        {
          id: randomUUID(),
          ticketId: 'TK-200201-CRT',
          customerId: 'cust-vip-101',
          customerName: 'Apex Corp (Enterprise VIP)',
          rating: 5,
          comment: 'Incredible turnaround time! Marcus had our payment cluster back online in under 90 minutes. Exceptional senior engineering support.',
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 117).toISOString(),
        },
        {
          id: randomUUID(),
          ticketId: 'TK-200204-MED',
          customerId: 'customer-demo',
          customerName: 'Jane Cooper (Customer)',
          rating: 5,
          comment: 'Mila sent the consolidated invoice within an hour. Very clear and courteous communication.',
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 43).toISOString(),
        },
        {
          id: randomUUID(),
          ticketId: 'TK-200205-DEL',
          customerId: 'cust-user-601',
          customerName: 'David Miller',
          rating: 4,
          comment: 'Carrier issue was resolved well, though initial tracking took a bit of back and forth.',
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 92).toISOString(),
        },
        {
          id: randomUUID(),
          ticketId: 'TK-200208-REF',
          customerId: 'cust-user-905',
          customerName: 'Liam Vance',
          rating: 5,
          comment: 'Duplicate charge was refunded promptly without hassle. Excellent service.',
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 67).toISOString(),
        },
        {
          id: randomUUID(),
          ticketId: 'TK-100103-H7F',
          customerId: 'customer-demo',
          customerName: 'Jane Cooper (Customer)',
          rating: 4,
          comment: 'Replacement arrived in great condition. Thanks for handling the return smoothly.',
          createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 47).toISOString(),
        },
      ];
    }
  }

  refreshTicketSlaStatuses();
  db.write();
};

ensureSeedData();

// Seed standard demo users for instant multi-role demonstration
export const seedDemoUsers = async () => {
  if (process.env.NODE_ENV === 'test') return;
  if (db.data.dashboardUsers.length > 0) return;

  const demoUsers = [
    {
      id: 'user-admin-demo',
      name: 'Eleanor Vance (Admin)',
      email: 'admin@example.com',
      role: 'Admin',
      active: true,
      team: 'Administration',
      passwordHash: 'fd02774038e35fc36ac6da7bdda640e53032af9e3d5e77f7ac275c3f8aaae8283cea5edb2cc6280a69c022afd0c2be862501f389182c98981d244258ca90e9b1',
      passwordSalt: 'c8be21d9ad98ea3acacebaea37211da3',
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    },
    {
      id: 'user-senior-demo',
      name: 'Marcus Sterling (Senior Lead)',
      email: 'senior@example.com',
      role: 'Senior Support Staff',
      active: true,
      team: 'Senior Staff & Executive Escalations',
      passwordHash: 'd8528739e84a6ba5dd34879b963f6fe3d8cdb93fd3e20c1c2a4f0d23ef83f7db49d611f7665b64a7d8bdaaa4c8cdddb65aca759329f1d17f338b6c87f7525523',
      passwordSalt: '907e0f3ddc499febd5434525ecc3f376',
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    },
    {
      id: 'user-agent-demo',
      name: 'Alex Rivera (Support Agent)',
      email: 'agent@example.com',
      role: 'Support Agent',
      active: true,
      team: 'Technical Support',
      passwordHash: '750f02f75ced21f2303d42359e81fa40a0912167e5aa9306843c3470a5ea83256351df9805f6799c7906f54f17cd9df14930cca55f1528ab849a3b253bba5413',
      passwordSalt: '61b88b1b3a4275f2fe455cdbce24e771',
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    },
    {
      id: 'customer-demo',
      name: 'Jane Cooper (Customer)',
      email: 'customer@example.com',
      role: 'Customer',
      active: true,
      team: '',
      passwordHash: '8672fd3931178a1c6cd45db6f84a57ad1364d38d6517dc441b60403fe66085a3cfa5eed6689f20365939c80436cfd557b369830d2193ec4b016fc182b05902b1',
      passwordSalt: '8e57ff33ca302d3c5e1e6bd527ae6135',
      createdAt: new Date().toISOString(),
      lastLoginAt: null,
    },
  ];

  db.data.dashboardUsers.push(...demoUsers);
  await db.write();
};

await seedDemoUsers();

const saveData = async () => {
  await db.write();
};

const publicUser = ({ passwordHash, passwordSalt, ...user }) => user;

const addDashboardAudit = ({ actorId, actorName, action, targetId, outcome, details = '' }) => {
  const entry = {
    id: randomUUID(),
    actorId,
    actorName,
    action,
    targetId,
    outcome,
    details,
    timestamp: new Date().toISOString(),
  };
  db.data.dashboardAudit.unshift(entry);
  db.data.dashboardAudit = db.data.dashboardAudit.slice(0, 1000);
  return entry;
};

export const getDashboardUserByEmail = (email) =>
  db.data.dashboardUsers.find((user) => user.email.toLowerCase() === email.toLowerCase()) || null;

export const getDashboardUserById = (id) => db.data.dashboardUsers.find((user) => user.id === id) || null;

export const listDashboardUsers = () => db.data.dashboardUsers.map(publicUser);

export const activeAdminCount = () => db.data.dashboardUsers.filter((user) => user.role === 'Admin' && user.active).length;

export const createDashboardUser = async (user) => {
  if (getDashboardUserByEmail(user.email)) throw new Error('A user with this email already exists.');
  const created = {
    id: user.id || randomUUID(),
    name: user.name.trim(),
    email: user.email.trim().toLowerCase(),
    role: user.role,
    active: user.active !== undefined ? user.active : true,
    team: user.team?.trim() || '',
    passwordHash: user.passwordHash,
    passwordSalt: user.passwordSalt,
    createdAt: new Date().toISOString(),
    lastLoginAt: null,
  };
  db.data.dashboardUsers.push(created);
  await saveData();
  return publicUser(created);
};

export const bootstrapDashboardAdmin = async (user) => {
  if (db.data.dashboardUsers.some((entry) => entry.role === 'Admin' && entry.active)) return false;
  await createDashboardUser({ ...user, role: 'Admin' });
  return true;
};

export const updateDashboardUser = async (id, changes, actor) => {
  const user = getDashboardUserById(id);
  if (!user) return null;
  if (typeof changes.email === 'string') {
    const normalizedEmail = changes.email.trim().toLowerCase();
    const existing = getDashboardUserByEmail(normalizedEmail);
    if (existing && existing.id !== id) throw new Error('A user with this email already exists.');
  }
  if (user.role === 'Admin' && user.active && (changes.active === false || (changes.role !== undefined && changes.role !== 'Admin')) && activeAdminCount() <= 1) {
    throw new Error('Cannot deactivate or change the role of the last active administrator.');
  }
  const previous = { role: user.role, active: user.active, team: user.team };
  if (typeof changes.name === 'string') user.name = changes.name.trim();
  if (typeof changes.email === 'string') user.email = changes.email.trim().toLowerCase();
  if (typeof changes.role === 'string') user.role = changes.role;
  if (typeof changes.active === 'boolean') user.active = changes.active;
  if (typeof changes.team === 'string') user.team = changes.team.trim();
  addDashboardAudit({
    actorId: actor?.id || 'admin',
    actorName: actor?.name || 'Administrator',
    action: 'User updated',
    targetId: id,
    outcome: 'success',
    details: JSON.stringify({ previous, changes: { role: user.role, active: user.active, team: user.team } }),
  });
  await saveData();
  return publicUser(user);
};

export const deleteDashboardUser = async (id, actor) => {
  const user = getDashboardUserById(id);
  if (!user) return null;
  if (user.role === 'Admin' && activeAdminCount() <= 1) {
    throw new Error('Cannot delete the last active administrator.');
  }
  db.data.dashboardUsers = db.data.dashboardUsers.filter((u) => u.id !== id);
  addDashboardAudit({
    actorId: actor?.id || 'admin',
    actorName: actor?.name || 'Administrator',
    action: 'User deleted',
    targetId: id,
    outcome: 'success',
    details: `Deleted user ${user.name} (${user.email})`,
  });
  await saveData();
  return true;
};

export const touchDashboardLogin = async (id) => {
  const user = getDashboardUserById(id);
  if (!user) return;
  user.lastLoginAt = new Date().toISOString();
  await saveData();
};

export const createDashboardSession = async (session) => {
  db.data.dashboardSessions = db.data.dashboardSessions.filter((entry) => Date.parse(entry.expiresAt) > Date.now());
  db.data.dashboardSessions.push(session);
  await saveData();
};

export const isDashboardSessionValid = (session, now = Date.now()) => {
  const expiry = Date.parse(session.expiresAt);
  return Number.isFinite(expiry) && expiry > now;
};

export const getDashboardSession = (tokenHash) => {
  const session = db.data.dashboardSessions.find((entry) => entry.tokenHash === tokenHash && isDashboardSessionValid(entry));
  const user = session ? getDashboardUserById(session.userId) : null;
  return user?.active ? { session, user } : null;
};

export const deleteDashboardSession = async (tokenHash) => {
  db.data.dashboardSessions = db.data.dashboardSessions.filter((entry) => entry.tokenHash !== tokenHash);
  await saveData();
};

export const recordDashboardAudit = async (entry) => {
  const result = addDashboardAudit(entry);
  await saveData();
  return result;
};

export const getDashboardAudit = () => db.data.dashboardAudit;

export const getDashboardConfig = () => ({
  teams: db.data.dashboardTeams,
  routingRules: db.data.dashboardRoutingRules,
  escalationSettings: db.data.dashboardEscalationSettings,
});

export const saveDashboardTeams = async (teams, actor) => {
  db.data.dashboardTeams = teams;
  addDashboardAudit({ actorId: actor.id, actorName: actor.name, action: 'Teams updated', targetId: 'teams', outcome: 'success' });
  await saveData();
  return teams;
};

export const saveDashboardRules = async (rules, actor) => {
  db.data.dashboardRoutingRules = rules;
  addDashboardAudit({ actorId: actor.id, actorName: actor.name, action: 'Routing rules updated', targetId: 'routing-rules', outcome: 'success' });
  await saveData();
  return rules;
};

export const saveDashboardEscalationSettings = async (settings, actor) => {
  const previous = db.data.dashboardEscalationSettings;
  db.data.dashboardEscalationSettings = settings;
  addDashboardAudit({ actorId: actor.id, actorName: actor.name, action: 'Escalation settings updated', targetId: 'escalation-settings', outcome: 'success', details: JSON.stringify({ previous, settings }) });
  await saveData();
  return settings;
};

export const getDashboardTickets = (user, filters = {}) => {
  refreshTicketSlaStatuses();
  const visible = (user.role === 'Admin' || user.role === 'Senior Support Staff')
    ? db.data.tickets
    : db.data.tickets.filter((ticket) => ticket.assigned_user_id === user.id || !ticket.assigned_user_id);
  const filtered = visible.filter((ticket) => {
    const term = (filters.search || '').toLowerCase();
    const matchesTerm = !term || `${ticket.id} ${ticket.subject} ${ticket.description || ''} ${ticket.customer_name || ''}`.toLowerCase().includes(term);
    const matchesStatus = !filters.status || ticket.status === filters.status;
    const matchesCategory = !filters.category || ticket.category === filters.category;
    const matchesAgent = !filters.agentId || ticket.assigned_user_id === filters.agentId;
    const matchesUrgency = !filters.urgency || ticket.dashboardUrgency === filters.urgency || ticket.triage?.urgency === filters.urgency;
    const matchesPriority = !filters.minPriority || (ticket.dashboardPriority ?? ticket.triage?.priorityScore ?? -1) >= Number(filters.minPriority);
    const matchesEscalated = !filters.escalated || (filters.escalated === 'true' ? Boolean(ticket.triage?.isEscalatedToSenior || ticket.assigned_agent?.includes('Senior') || ticket.assigned_team?.includes('Senior')) : true);
    const matchesFrustrated = !filters.frustrated || (filters.frustrated === 'true' ? Boolean((ticket.triage?.frustrationScore ?? 0) >= 65 || ticket.triage?.sentiment === 'Frustrated') : true);
    const matchesKb = !filters.kbDeflected || (filters.kbDeflected === 'true' ? Boolean(ticket.triage?.isKbDeflected || ticket.status === 'Resolved') : true);
    const matchesFrom = !filters.from || ticket.created_at >= filters.from;
    const matchesTo = !filters.to || ticket.created_at <= `${filters.to}T23:59:59.999Z`;

    return matchesTerm && matchesStatus && matchesCategory && matchesAgent && matchesUrgency && matchesPriority && matchesEscalated && matchesFrustrated && matchesKb && matchesFrom && matchesTo;
  });

  const sortMode = filters.sortBy || 'priority';
  if (sortMode === 'created' || sortMode === 'newest') {
    return [...filtered].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
  if (sortMode === 'updated') {
    return [...filtered].sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
  }

  return [...filtered].sort((a, b) =>
    (b.dashboardUrgency === 'Critical' ? 1 : 0) - (a.dashboardUrgency === 'Critical' ? 1 : 0) ||
    ((b.dashboardPriority ?? b.triage?.priorityScore ?? -1) - (a.dashboardPriority ?? a.triage?.priorityScore ?? -1)) ||
    new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
};

export const updateDashboardTicket = async ({ ticketId, changes, actor, action, details = '' }) => {
  const ticket = getTicketById(ticketId);
  if (!ticket) return null;
  const before = { status: ticket.status, assignedUserId: ticket.assigned_user_id || null, assignedAgent: ticket.assigned_agent || null };

  if (changes.status === 'Resolved' && !ticket.resolved_at) {
    ticket.resolved_at = new Date().toISOString();
    if (ticket.resolution_deadline) {
      ticket.resolution_sla_status = Date.parse(ticket.resolved_at) <= Date.parse(ticket.resolution_deadline) ? 'Met' : 'Breached';
    }
  } else if (changes.status && changes.status !== 'Resolved' && changes.status !== 'Closed') {
    ticket.resolved_at = null;
  }

  Object.assign(ticket, changes, { updated_at: new Date().toISOString() });
  db.data.ticketHistory.push({
    id: generateHistoryId(),
    ticket_id: ticketId,
    event_type: action,
    note: details || `${action} by ${actor.name}.`,
    created_at: ticket.updated_at,
    actor_id: actor.id,
    actor_name: actor.name,
  });
  addDashboardAudit({
    actorId: actor.id,
    actorName: actor.name,
    action,
    targetId: ticketId,
    outcome: 'success',
    details: JSON.stringify({ before, after: { status: ticket.status, assignedUserId: ticket.assigned_user_id || null, assignedAgent: ticket.assigned_agent || null }, note: details }),
  });
  refreshTicketSlaStatuses();
  await saveData();
  return ticket;
};

export const addInternalDashboardNote = async ({ ticketId, note, actor }) => {
  const entry = { id: randomUUID(), ticketId, note, actorId: actor.id, actorName: actor.name, createdAt: new Date().toISOString() };
  db.data.dashboardNotes.unshift(entry);
  addDashboardAudit({ actorId: actor.id, actorName: actor.name, action: 'Internal note added', targetId: ticketId, outcome: 'success' });
  await saveData();
  return entry;
};

export const getDashboardNotes = (ticketId) => db.data.dashboardNotes.filter((entry) => entry.ticketId === ticketId);

export const saveDashboardDraft = async ({ ticketId, body, actor }) => {
  const entry = { id: randomUUID(), ticketId, body, actorId: actor.id, actorName: actor.name, createdAt: new Date().toISOString(), state: 'Draft' };
  db.data.dashboardDrafts.unshift(entry);
  await saveData();
  return entry;
};

export const getDashboardDrafts = (ticketId) => db.data.dashboardDrafts.filter((entry) => entry.ticketId === ticketId);

export const createDashboardRequest = async ({ ticketId, requestType, reason, actor }) => {
  const entry = { id: randomUUID(), ticketId, requestType, reason, actorId: actor.id, actorName: actor.name, state: 'Requested', createdAt: new Date().toISOString() };
  db.data.dashboardRequests.unshift(entry);
  addDashboardAudit({ actorId: actor.id, actorName: actor.name, action: `${requestType} requested`, targetId: ticketId, outcome: 'success', details: reason });
  await saveData();
  return entry;
};

export const getDashboardRequests = () => db.data.dashboardRequests;

export const resolveDashboardRequest = async ({ id, decision, actor }) => {
  const request = db.data.dashboardRequests.find((entry) => entry.id === id);
  if (!request) return null;
  request.state = decision;
  request.resolvedBy = actor.id;
  request.resolvedAt = new Date().toISOString();
  addDashboardAudit({ actorId: actor.id, actorName: actor.name, action: `Request ${decision.toLowerCase()}`, targetId: request.ticketId, outcome: 'success', details: request.requestType });
  await saveData();
  return request;
};

export const getTicketCategories = () => categoryOptions;
export const getTicketStatuses = () => ticketStatuses;

export const getPriorityCalculations = () => db.data.priorityCalculations;
export const savePriorityCalculation = async (record) => {
  const existingIndex = db.data.priorityCalculations.findIndex(
    (entry) => entry.ticketId.toLowerCase() === record.ticketId.toLowerCase()
  );

  if (existingIndex >= 0) {
    db.data.priorityCalculations.splice(existingIndex, 1);
  }

  db.data.priorityCalculations.unshift(record);
  db.data.priorityCalculations = db.data.priorityCalculations.slice(0, 50);
  await saveData();
  return db.data.priorityCalculations;
};
export const clearPriorityCalculations = async () => {
  db.data.priorityCalculations = [];
  await saveData();
};
export const getPriorityWeights = () => db.data.priorityWeights;
export const savePriorityWeights = async (weights) => {
  db.data.priorityWeights = weights;
  await saveData();
};
export const getRoutingData = () => ({
  teams: db.data.routingTeams,
  tickets: db.data.routingTickets,
  audit: db.data.routingAudit,
  settings: db.data.routingSettings,
});
export const saveRoutingTeams = async (teams) => {
  db.data.routingTeams = teams;
  await saveData();
  return db.data.routingTeams;
};
export const saveRoutingSettings = async (settings) => {
  db.data.routingSettings = settings;
  await saveData();
  return db.data.routingSettings;
};
export const persistRoutingOperation = async ({ record, auditEntry }) => {
  const index = db.data.routingTickets.findIndex((entry) => entry.ticket.ticketId.toLowerCase() === record.ticket.ticketId.toLowerCase());
  const previous = index >= 0 ? db.data.routingTickets[index] : null;
  if (auditEntry.action === 'Assignment' || auditEntry.action === 'Reassignment' || (auditEntry.action === 'Manual Override' && record.assignedTeam)) {
    if (previous?.assignedTeam === record.assignedTeam) {
      throw new Error('This ticket is already assigned to the selected team.');
    }
    if (previous?.assignedTeam) {
      const previousTeam = db.data.routingTeams.find((entry) => entry.name === previous.assignedTeam);
      if (previousTeam?.isSample) previousTeam.openTickets = Math.max(0, previousTeam.openTickets - 1);
    }
  }
  if (index >= 0) db.data.routingTickets.splice(index, 1);
  db.data.routingTickets.unshift(record);
  db.data.routingAudit.unshift(auditEntry);
  db.data.routingAudit = db.data.routingAudit.slice(0, 200);

  if (auditEntry.action === 'Assignment' || auditEntry.action === 'Reassignment' || (auditEntry.action === 'Manual Override' && record.assignedTeam)) {
    const team = db.data.routingTeams.find((entry) => entry.name === record.assignedTeam);
    if (team && team.openTickets < team.capacity) {
      team.openTickets += 1;
    }
  }

  await saveData();
  return { record, audit: db.data.routingAudit };
};
export const clearRoutingData = async () => {
  db.data.routingTickets = [];
  db.data.routingAudit = [];
  await saveData();
};

export const getTickets = ({ status, category, search, sort = 'updated', customerId } = {}) => {
  refreshTicketSlaStatuses();
  let list = customerId
    ? db.data.tickets.filter((ticket) => ticket.customer_id === customerId || ticket.customer_id === 'customer-demo')
    : db.data.tickets;

  const filtered = list.filter((ticket) => {
    let matches = true;

    if (status) {
      matches = matches && ticket.status === status;
    }

    if (category) {
      matches = matches && ticket.category === category;
    }

    if (search) {
      const term = search.trim().toLowerCase();
      const ticketText = `${ticket.id} ${ticket.subject} ${ticket.description || ''}`.toLowerCase();
      matches = matches && ticketText.includes(term);
    }

    return matches;
  });

  filtered.sort((a, b) => {
    const first = sort === 'created' ? new Date(a.created_at).getTime() : new Date(a.updated_at).getTime();
    const second = sort === 'created' ? new Date(b.created_at).getTime() : new Date(b.updated_at).getTime();
    return second - first;
  });

  return filtered;
};

export const getTicketById = (ticketId, customerId) => {
  refreshTicketSlaStatuses();
  if (customerId) {
    return db.data.tickets.find((ticket) => ticket.id === ticketId && (ticket.customer_id === customerId || ticket.customer_id === 'customer-demo')) || null;
  }
  return db.data.tickets.find((ticket) => ticket.id === ticketId) || null;
};

export const createTicket = async ({ subject, description, category, referenceNumber, triage, customerId = 'customer-demo', customerName = 'Demo Customer' }) => {
  const trimmedSubject = subject.trim();
  const trimmedDescription = description.trim();
  const normalizedReference = referenceNumber ? referenceNumber.trim() : null;
  const now = new Date().toISOString();

  const isEscalated = Boolean(triage?.isEscalatedToSenior || triage?.routingLevel === 'Senior Staff Escalation');
  const isKbDeflected = Boolean(triage?.isKbDeflected || triage?.routingLevel === 'Automated Knowledge Base');

  const priority = triage?.urgency || 'Medium';
  const policies = db.data.slaPolicies || defaultSlaPolicies;
  const policy = policies[priority] || policies.Medium || { responseHours: 4, resolutionHours: 24 };
  const createdMs = new Date(now).getTime();

  const ticket = {
    id: generateTicketId(),
    customer_id: customerId,
    customer_name: customerName,
    subject: trimmedSubject,
    description: trimmedDescription,
    category,
    status: isKbDeflected ? 'Resolved' : 'Open',
    assigned_agent: isEscalated ? 'Senior Staff Specialist (Escalated)' : isKbDeflected ? 'Automated Knowledge Base' : (triage?.assignedAgent || null),
    assigned_team: isEscalated ? 'Senior Staff & Executive Escalations' : isKbDeflected ? 'Automated Self-Service Knowledge Base' : (triage?.assignedTeam || null),
    assigned_user_id: isEscalated ? 'user-senior-demo' : null,
    reference_number: normalizedReference,
    resolution_notes: isKbDeflected ? 'Resolved automatically via Automated Knowledge Base guidance.' : null,
    dashboardUrgency: priority,
    dashboardPriority: triage?.priorityScore ?? (isEscalated ? 85 : 35),
    triage: triage || null,
    sla_policy: `${priority} SLA Standard`,
    sla_start_time: now,
    response_deadline: new Date(createdMs + policy.responseHours * 3600 * 1000).toISOString(),
    resolution_deadline: new Date(createdMs + policy.resolutionHours * 3600 * 1000).toISOString(),
    first_response_at: null,
    resolved_at: isKbDeflected ? now : null,
    response_sla_status: isKbDeflected ? 'Met' : 'Within SLA',
    resolution_sla_status: isKbDeflected ? 'Met' : 'Within SLA',
    current_risk_status: isKbDeflected ? 'Met' : 'Within SLA',
    created_at: now,
    updated_at: now,
  };

  db.data.tickets.unshift(ticket);
  db.data.ticketHistory.push({
    id: generateHistoryId(),
    ticket_id: ticket.id,
    event_type: 'Ticket created',
    note: isEscalated
      ? `Customer created a new ${category.toLowerCase()} ticket. [AUTO-ESCALATED TO SENIOR STAFF: ${triage?.escalationReasons?.join('; ') || 'High Priority/Frustration/VIP'}]`
      : isKbDeflected
        ? `Customer created a new ${category.toLowerCase()} ticket. [ROUTINE QUERY: Auto-resolved by Knowledge Base]`
        : `Customer created a new ${category.toLowerCase()} ticket. Prioritized at ${ticket.dashboardPriority}/100.`,
    created_at: now,
  });

  if (isKbDeflected && triage?.kbSolution) {
    db.data.ticketMessages.push({
      id: generateMessageId(),
      ticket_id: ticket.id,
      sender_id: 'kb-bot',
      sender_role: 'agent',
      message: `🤖 Automated Knowledge Base Resolution:\n\n${triage.kbSolution}`,
      created_at: now,
    });
    db.data.ticketHistory.push({
      id: generateHistoryId(),
      ticket_id: ticket.id,
      event_type: 'Ticket resolved',
      note: 'Instant solution provided from Knowledge Base. No queue waiting required.',
      created_at: now,
    });
  }

  await saveData();
  return ticket;
};

export const addReplyToTicket = async ({ ticketId, senderId, senderRole, message, senderName }) => {
  const trimmedMessage = message.trim();
  const now = new Date().toISOString();

  db.data.ticketMessages.push({
    id: generateMessageId(),
    ticket_id: ticketId,
    sender_id: senderId,
    sender_role: senderRole,
    sender_name: senderName || (senderRole === 'agent' ? 'Support Specialist' : 'Customer'),
    message: trimmedMessage,
    created_at: now,
  });

  const targetTicket = db.data.tickets.find((t) => t.id === ticketId);
  if (targetTicket) {
    targetTicket.updated_at = now;
    if (senderRole === 'agent' && !targetTicket.first_response_at) {
      targetTicket.first_response_at = now;
      if (targetTicket.response_deadline) {
        targetTicket.response_sla_status = Date.parse(now) <= Date.parse(targetTicket.response_deadline) ? 'Met' : 'Breached';
      }
    }
  }

  db.data.ticketHistory.push({
    id: generateHistoryId(),
    ticket_id: ticketId,
    event_type: senderRole === 'agent' ? 'Agent replied' : 'Customer replied',
    note: senderRole === 'agent' ? `Support agent ${senderName || ''} responded to the ticket.`.trim() : 'Customer added a new reply.',
    created_at: now,
  });

  await saveData();
  return { ok: true, created_at: now };
};

export const getTicketMessages = (ticketId) => {
  return db.data.ticketMessages
    .filter((message) => message.ticket_id === ticketId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const getTicketHistory = (ticketId) => {
  return db.data.ticketHistory
    .filter((entry) => entry.ticket_id === ticketId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
};

export const getTicketSummary = () => {
  refreshTicketSlaStatuses();
  const summary = {
    total: 0,
    open: 0,
    inProgress: 0,
    resolved: 0,
  };

  for (const ticket of getTickets()) {
    summary.total += 1;
    if (ticket.status === 'Open') summary.open += 1;
    if (ticket.status === 'In Progress') summary.inProgress += 1;
    if (ticket.status === 'Resolved') summary.resolved += 1;
  }

  return summary;
};

// SLA Policies
export const getSlaPolicies = () => db.data.slaPolicies || defaultSlaPolicies;

export const updateSlaPolicies = async (policies, actor) => {
  db.data.slaPolicies = { ...defaultSlaPolicies, ...(db.data.slaPolicies || {}), ...policies };
  addDashboardAudit({
    actorId: actor?.id || 'admin',
    actorName: actor?.name || 'Administrator',
    action: 'SLA policies updated',
    targetId: 'sla-policies',
    outcome: 'success',
    details: JSON.stringify(policies),
  });
  refreshTicketSlaStatuses();
  await saveData();
  return db.data.slaPolicies;
};

// CSAT Feedback
export const submitTicketFeedback = async ({ ticketId, rating, comment = '', customerId, customerName = 'Customer' }) => {
  const ticket = db.data.tickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error('Ticket not found.');
  if (ticket.status !== 'Resolved' && ticket.status !== 'Closed') {
    throw new Error('Feedback can only be submitted for resolved tickets.');
  }
  const numericRating = Math.max(1, Math.min(5, Math.round(Number(rating) || 5)));
  const existingIndex = (db.data.ticketFeedback || []).findIndex((f) => f.ticketId === ticketId);
  const feedbackEntry = {
    id: randomUUID(),
    ticketId,
    rating: numericRating,
    comment: (comment || '').trim().slice(0, 1000),
    customerId: customerId || ticket.customer_id,
    customerName,
    createdAt: new Date().toISOString(),
  };

  db.data.ticketFeedback ??= [];
  if (existingIndex >= 0) {
    db.data.ticketFeedback[existingIndex] = feedbackEntry;
  } else {
    db.data.ticketFeedback.push(feedbackEntry);
  }

  ticket.feedback = feedbackEntry;
  db.data.ticketHistory.push({
    id: generateHistoryId(),
    ticket_id: ticketId,
    event_type: 'CSAT feedback received',
    note: `Customer rated service ${numericRating} / 5 stars${feedbackEntry.comment ? `: "${feedbackEntry.comment}"` : ''}`,
    created_at: feedbackEntry.createdAt,
    actor_id: customerId,
    actor_name: customerName,
  });

  await saveData();
  return feedbackEntry;
};

export const getTicketFeedback = (ticketId) => {
  return (db.data.ticketFeedback || []).find((f) => f.ticketId === ticketId) || null;
};

export const listAllFeedbacks = () => db.data.ticketFeedback || [];

// Priority Override for Senior Support Staff and Administrators
export const overrideTicketPriority = async ({ ticketId, newPriority, newUrgency, reason = '', actor }) => {
  const ticket = db.data.tickets.find((t) => t.id === ticketId);
  if (!ticket) throw new Error('Ticket not found.');
  const beforePriority = ticket.dashboardPriority;
  const beforeUrgency = ticket.dashboardUrgency;
  if (newPriority !== undefined) ticket.dashboardPriority = Number(newPriority);
  if (newUrgency !== undefined) ticket.dashboardUrgency = newUrgency;
  ticket.updated_at = new Date().toISOString();

  const policies = db.data.slaPolicies || defaultSlaPolicies;
  const policy = policies[ticket.dashboardUrgency] || policies.Medium;
  const createdTime = Date.parse(ticket.created_at);
  ticket.response_deadline = new Date(createdTime + policy.responseHours * 3600 * 1000).toISOString();
  ticket.resolution_deadline = new Date(createdTime + policy.resolutionHours * 3600 * 1000).toISOString();

  db.data.ticketHistory.push({
    id: generateHistoryId(),
    ticket_id: ticketId,
    event_type: 'Priority overridden',
    note: `Priority overridden by ${actor.name} (${actor.role}): Priority ${beforePriority} -> ${ticket.dashboardPriority}, Urgency ${beforeUrgency} -> ${ticket.dashboardUrgency}. Reason: ${reason || 'Manual override'}`,
    created_at: ticket.updated_at,
    actor_id: actor.id,
    actor_name: actor.name,
  });

  addDashboardAudit({
    actorId: actor.id,
    actorName: actor.name,
    action: 'Priority overridden',
    targetId: ticketId,
    outcome: 'success',
    details: `Priority changed to ${ticket.dashboardPriority}, urgency to ${ticket.dashboardUrgency}. Reason: ${reason}`,
  });

  refreshTicketSlaStatuses();
  await saveData();
  return ticket;
};
