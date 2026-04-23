#!/usr/bin/env node

/*
  Reseed customers for the current authenticated user's organization.
  - Deletes customer-linked rows first (activity logs, docs, tasks, progress)
  - Deletes existing customers
  - Inserts 20 customers with mixed statuses (exactly 10 in Created)

  Usage (PowerShell):
    $env:NEXT_PUBLIC_SUPABASE_URL='https://...supabase.co'
    $env:NEXT_PUBLIC_SUPABASE_ANON_KEY='...'
    $env:SUPABASE_ACCESS_TOKEN='eyJ...'
    node scripts/reseed-customers.js
*/

const { createClient } = require('@supabase/supabase-js');

function assertEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

async function run() {
  const url = assertEnv('NEXT_PUBLIC_SUPABASE_URL');
  const anonKey = assertEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const accessToken = assertEnv('SUPABASE_ACCESS_TOKEN');

  const supabase = createClient(url, anonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  const orgRpc = await supabase.rpc('current_user_org_id');
  if (orgRpc.error) throw orgRpc.error;
  const organizationId = orgRpc.data;
  if (!organizationId) throw new Error('Unable to resolve organization_id from authenticated user');

  console.log(`Resolved organization: ${organizationId}`);

  const existing = await supabase
    .from('customers')
    .select('id')
    .eq('organization_id', organizationId);

  if (existing.error) throw existing.error;
  const customerIds = (existing.data || []).map((x) => x.id);

  console.log(`Existing customers to remove: ${customerIds.length}`);

  if (customerIds.length > 0) {
    const delActivity = await supabase
      .from('activity_logs')
      .delete()
      .eq('organization_id', organizationId)
      .eq('entity_type', 'customer')
      .in('entity_id', customerIds);
    if (delActivity.error) throw delActivity.error;

    const delProgress = await supabase
      .from('customer_progress')
      .delete()
      .eq('organization_id', organizationId)
      .in('customer_id', customerIds);
    if (delProgress.error) throw delProgress.error;

    const delTasks = await supabase
      .from('tasks')
      .delete()
      .eq('organization_id', organizationId)
      .in('related_customer_id', customerIds);
    if (delTasks.error) throw delTasks.error;

    const delDocs = await supabase
      .from('documents')
      .delete()
      .eq('organization_id', organizationId)
      .in('related_customer_id', customerIds);
    if (delDocs.error) throw delDocs.error;

    const delCustomers = await supabase
      .from('customers')
      .delete()
      .eq('organization_id', organizationId)
      .in('id', customerIds);
    if (delCustomers.error) throw delCustomers.error;
  }

  const createdSet = Array.from({ length: 10 }, (_, i) => ({
    name: `Customer ${String(i + 1).padStart(2, '0')} - Created`,
    phone: `900000${String(1000 + i).slice(-4)}`,
    email: `customer.created.${i + 1}@example.com`,
    company: `Created Co ${i + 1}`,
    city: 'Chennai',
    state: 'Tamil Nadu',
    country: 'India',
    status: 'Created',
    current_stage: 'CREATED',
    notes: 'Seeded: created stage',
    organization_id: organizationId,
  }));

  const mixedSet = [
    { name: 'Customer 11 - Approval Submitted', status: 'Approval Submitted', current_stage: 'SUBMITTED' },
    { name: 'Customer 12 - Approval Submitted', status: 'Approval Submitted', current_stage: 'SUBMITTED' },
    { name: 'Customer 13 - Approved', status: 'Approved', current_stage: 'INSTALLATION' },
    { name: 'Customer 14 - Approved', status: 'Approved', current_stage: 'INSTALLATION' },
    { name: 'Customer 15 - In Progress', status: 'In Progress', current_stage: 'INSTALLATION' },
    { name: 'Customer 16 - In Progress', status: 'In Progress', current_stage: 'INSTALLATION' },
    { name: 'Customer 17 - Installation Completed - Payment Pending', status: 'Installation Completed - Payment Pending', current_stage: 'INSTALLATION' },
    { name: 'Customer 18 - Partial Payment', status: 'Partial Payment', current_stage: 'CLOSURE' },
    { name: 'Customer 19 - Completed', status: 'Completed', current_stage: 'CLOSED' },
    { name: 'Customer 20 - Completed', status: 'Completed', current_stage: 'CLOSED' },
  ].map((row, i) => ({
    ...row,
    phone: `900001${String(2000 + i).slice(-4)}`,
    email: `customer.mixed.${i + 11}@example.com`,
    company: `Mixed Co ${i + 11}`,
    city: 'Bengaluru',
    state: 'Karnataka',
    country: 'India',
    notes: `Seeded: ${row.status}`,
    organization_id: organizationId,
  }));

  const payload = [...createdSet, ...mixedSet];

  const ins = await supabase
    .from('customers')
    .insert(payload)
    .select('id,status,current_stage');

  if (ins.error) throw ins.error;

  const counts = payload.reduce((acc, row) => {
    acc[row.status] = (acc[row.status] || 0) + 1;
    return acc;
  }, {});

  console.log('Inserted customers:', ins.data?.length || 0);
  console.log('Status distribution:', counts);
  console.log('Created status count:', counts.Created || 0);
}

run().catch((error) => {
  console.error('Reseed failed:', error.message || error);
  process.exit(1);
});
