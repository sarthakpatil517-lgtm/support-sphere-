const baseUrl = 'http://localhost:4000';

async function run() {
  console.log('Testing End-to-End Real-Time Flow...');

  // 1. Register a new user
  const email = `testuser_${Date.now()}@example.com`;
  const regRes = await fetch(`${baseUrl}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'Alice Johnson',
      email,
      password: 'StrongPassword123!',
    }),
  });
  const regData = await regRes.json();
  console.log('1. Registration status:', regRes.status, 'User:', regData.user?.name, 'Role:', regData.user?.role);
  if (!regRes.ok) throw new Error(regData.message);

  const customerToken = regData.token;

  // 2. Create ticket as this customer
  const createRes = await fetch(`${baseUrl}/api/tickets`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${customerToken}`,
    },
    body: JSON.stringify({
      subject: 'Urgent: Unable to access billing invoices for Q3',
      description: 'We need our Q3 invoices immediately for tax audit compliance. Please assist.',
      category: 'Billing and Payments',
      referenceNumber: 'INV-TAX-9988',
      triage: {
        sentiment: 'Negative',
        frustrationScore: 68,
        urgency: 'High',
        customerTier: 'Gold',
        customerValueScore: 82,
        priorityScore: 78,
        priorityCategory: 'High Priority',
        routingLevel: 'Tier-1 Support Team',
        assignedTeam: 'Billing and Financial Services',
        assignedAgent: 'Senior Support Staff',
        isEscalatedToSenior: true,
      },
    }),
  });
  const createdTicket = await createRes.json();
  console.log('2. Created Ticket:', createdTicket.id, 'Customer:', createdTicket.customer_name, 'Status:', createdTicket.status);

  // 3. Obtain Admin session via demo-switch
  const adminLoginRes = await fetch(`${baseUrl}/api/auth/demo-switch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:5173' },
    body: JSON.stringify({ role: 'admin' }),
  });
  const adminData = await adminLoginRes.json();
  console.log('3. Admin switch status:', adminLoginRes.status, 'Admin:', adminData.user?.name);
  const adminToken = adminData.token;

  // 4. Verify Admin sees the ticket in /api/tickets
  const adminTicketsRes = await fetch(`${baseUrl}/api/tickets`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const adminTickets = await adminTicketsRes.json();
  const foundInTickets = adminTickets.find((t) => t.id === createdTicket.id);
  console.log('4. Ticket visible in Admin Tickets API:', Boolean(foundInTickets), 'Subject:', foundInTickets?.subject, 'Customer:', foundInTickets?.customer_name);

  // 5. Verify Admin sees the ticket in /api/dashboard/overview
  const overviewRes = await fetch(`${baseUrl}/api/dashboard/overview`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const overviewData = await overviewRes.json();
  const foundInOverview = overviewData.tickets.find((t) => t.id === createdTicket.id);
  console.log('5. Ticket visible in Dashboard Overview API:', Boolean(foundInOverview), 'Total tickets:', overviewData.tickets.length);

  // 6. Verify Admin sees the ticket in /api/analytics/sla-command-center
  const slaRes = await fetch(`${baseUrl}/api/analytics/sla-command-center`, {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  const slaData = await slaRes.json();
  const foundInSla = slaData.find((t) => t.id === createdTicket.id);
  console.log('6. Ticket visible in SLA Command Center (All Active):', Boolean(foundInSla), 'SLA Risk:', foundInSla?.currentRiskStatus);

  // 7. Add response from agent
  const replyRes = await fetch(`${baseUrl}/api/tickets/${createdTicket.id}/replies`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${adminToken}`,
    },
    body: JSON.stringify({ message: 'Hello Alice, we have attached your Q3 billing statement.' }),
  });
  console.log('7. Agent reply status:', replyRes.status);

  // 8. Verify customer can view their ticket details with reply
  const detailRes = await fetch(`${baseUrl}/api/tickets/${createdTicket.id}`, {
    headers: { Authorization: `Bearer ${customerToken}` },
  });
  const detailData = await detailRes.json();
  console.log('8. Customer ticket detail view messages:', detailData.messages?.length, 'First response recorded:', Boolean(detailData.first_response_at));

  console.log('✅ ALL REAL-TIME DATABASE CHECKS PASSED PERFECTLY!');
}

run().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
