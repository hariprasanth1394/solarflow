-- SolarFlow multi-tenant seed data
-- Run after migrations
-- This script creates one demo organization and module data.
-- If at least one auth user exists, it links that user as org admin.

begin;

do $$
declare
  v_org_id uuid;
  v_auth_user_id uuid;

  v_customer_1 uuid;
  v_customer_2 uuid;
  v_customer_3 uuid;

  v_supplier_1 uuid;
  v_supplier_2 uuid;

  v_spare_1 uuid;
  v_spare_2 uuid;
  v_spare_3 uuid;
  v_spare_4 uuid;

  v_system_1 uuid;
  v_system_2 uuid;
  v_system_3 uuid;

  v_now timestamptz := now();
begin
  -- 1) Organization
  insert into public.organizations (name, industry, plan, logo_url)
  values ('SolarFlow Demo Org', 'Renewable Energy', 'growth', null)
  returning id into v_org_id;

  -- 2) Link existing auth user as admin (if available)
  select id
    into v_auth_user_id
  from auth.users
  order by created_at asc
  limit 1;

  if v_auth_user_id is not null then
    insert into public.users (id, organization_id, name, email, role, status)
    values (
      v_auth_user_id,
      v_org_id,
      'Demo Admin',
      coalesce((select email from auth.users where id = v_auth_user_id), 'demo.admin@solarflow.local'),
      'admin',
      'active'
    )
    on conflict (id) do update
      set organization_id = excluded.organization_id,
          name = excluded.name,
          role = excluded.role,
          status = excluded.status;

    insert into public.user_settings (organization_id, user_id, theme, notifications_enabled)
    values (v_org_id, v_auth_user_id, 'light', true)
    on conflict (user_id) do update
      set organization_id = excluded.organization_id,
          theme = excluded.theme,
          notifications_enabled = excluded.notifications_enabled;
  end if;

  -- 3) Organization settings
  insert into public.organization_settings (organization_id, company_name, timezone, currency, language)
  values (v_org_id, 'SolarFlow Demo Org', 'Asia/Kolkata', 'INR', 'en')
  on conflict (organization_id) do update
    set company_name = excluded.company_name,
        timezone = excluded.timezone,
        currency = excluded.currency,
        language = excluded.language;

  -- 4) Customers
  insert into public.customers (organization_id, name, email, phone, company, city, state, country, status, notes)
  values
    (v_org_id, 'Ramesh Kumar', 'ramesh@example.com', '+91 9876543210', 'Kumar Textiles', 'Coimbatore', 'Tamil Nadu', 'India', 'active', 'Interested in 5KW rooftop setup'),
    (v_org_id, 'Suresh Patel', 'suresh@example.com', '+91 9988776655', 'Patel Foods', 'Ahmedabad', 'Gujarat', 'India', 'active', 'Commercial 10KW requirement'),
    (v_org_id, 'Priya Nair', 'priya@example.com', '+91 9345678120', 'Nair Residency', 'Kochi', 'Kerala', 'India', 'lead', 'Requested financing options')
  returning id into v_customer_1;

  -- Capture customer IDs explicitly for deterministic references
  select id into v_customer_1 from public.customers where organization_id = v_org_id and email = 'ramesh@example.com' limit 1;
  select id into v_customer_2 from public.customers where organization_id = v_org_id and email = 'suresh@example.com' limit 1;
  select id into v_customer_3 from public.customers where organization_id = v_org_id and email = 'priya@example.com' limit 1;

  -- Assign to admin user when available
  if v_auth_user_id is not null then
    update public.customers
      set assigned_to = v_auth_user_id
    where organization_id = v_org_id
      and id in (v_customer_1, v_customer_2);
  end if;

  -- 5) Tasks
  insert into public.tasks (organization_id, title, description, status, priority, assigned_to, created_by, due_date, created_at)
  values
    (v_org_id, 'Site survey for Ramesh Kumar', 'Complete rooftop inspection and shadow analysis', 'in_progress', 'high', v_auth_user_id, v_auth_user_id, v_now + interval '2 day', v_now),
    (v_org_id, 'Prepare proposal for Suresh Patel', 'Draft 10KW commercial proposal with BOM', 'pending', 'medium', v_auth_user_id, v_auth_user_id, v_now + interval '4 day', v_now),
    (v_org_id, 'Collect KYC from Priya Nair', 'Need address proof and ownership document', 'pending', 'low', v_auth_user_id, v_auth_user_id, v_now + interval '6 day', v_now);

  -- 6) Suppliers
  insert into public.suppliers (organization_id, name, contact, email, phone)
  values
    (v_org_id, 'SunVolt Supplies', 'Arun B', 'sales@sunvolt.in', '+91 8012345678'),
    (v_org_id, 'GreenGrid Components', 'Neha R', 'contact@greengrid.in', '+91 8899001122');

  select id into v_supplier_1 from public.suppliers where organization_id = v_org_id and name = 'SunVolt Supplies' limit 1;
  select id into v_supplier_2 from public.suppliers where organization_id = v_org_id and name = 'GreenGrid Components' limit 1;

  -- 7) Spares
  insert into public.spares (organization_id, name, category, unit, stock_quantity, min_stock, supplier_id, cost_price)
  values
    (v_org_id, 'Mono PERC Panel 540W', 'Panel', 'Nos', 120, 40, v_supplier_1, 9200),
    (v_org_id, 'On-Grid Inverter 5KW', 'Inverter', 'Nos', 12, 4, v_supplier_1, 38500),
    (v_org_id, 'MC4 Connector Pair', 'Connector', 'Pair', 220, 80, v_supplier_2, 190),
    (v_org_id, 'Galvanized Mounting Rail', 'Structure', 'Nos', 300, 100, v_supplier_2, 480);

  select id into v_spare_1 from public.spares where organization_id = v_org_id and name = 'Mono PERC Panel 540W' limit 1;
  select id into v_spare_2 from public.spares where organization_id = v_org_id and name = 'On-Grid Inverter 5KW' limit 1;
  select id into v_spare_3 from public.spares where organization_id = v_org_id and name = 'MC4 Connector Pair' limit 1;
  select id into v_spare_4 from public.spares where organization_id = v_org_id and name = 'Galvanized Mounting Rail' limit 1;

  -- 8) Systems
  insert into public.systems (organization_id, system_name, capacity_kw, description)
  values
    (v_org_id, '5KW Solar System', 5.00, 'Residential rooftop package'),
    (v_org_id, '10KW Solar System', 10.00, 'Commercial package'),
    (v_org_id, '15KW Solar System', 15.00, 'Large rooftop package');

  select id into v_system_1 from public.systems where organization_id = v_org_id and system_name = '5KW Solar System' limit 1;
  select id into v_system_2 from public.systems where organization_id = v_org_id and system_name = '10KW Solar System' limit 1;
  select id into v_system_3 from public.systems where organization_id = v_org_id and system_name = '15KW Solar System' limit 1;

  -- 9) System components (BOM)
  insert into public.system_components (organization_id, system_id, spare_id, quantity_required)
  values
    (v_org_id, v_system_1, v_spare_1, 10),
    (v_org_id, v_system_1, v_spare_2, 1),
    (v_org_id, v_system_1, v_spare_3, 10),
    (v_org_id, v_system_2, v_spare_1, 20),
    (v_org_id, v_system_2, v_spare_2, 2),
    (v_org_id, v_system_2, v_spare_3, 20),
    (v_org_id, v_system_3, v_spare_1, 30),
    (v_org_id, v_system_3, v_spare_2, 3),
    (v_org_id, v_system_3, v_spare_4, 24)
  on conflict (system_id, spare_id) do update
    set quantity_required = excluded.quantity_required;

  -- 10) Stock transactions (trigger updates stock_quantity)
  insert into public.stock_transactions (organization_id, spare_id, type, quantity, reference)
  values
    (v_org_id, v_spare_1, 'purchase', 30, 'PO-2026-0001'),
    (v_org_id, v_spare_2, 'usage', 2, 'SYS-BUILD-0003'),
    (v_org_id, v_spare_3, 'adjustment', -5, 'AUDIT-ADJ-01');

  -- 11) Documents metadata (file path pattern aligns with storage policy)
  insert into public.documents (organization_id, name, file_url, file_type, file_size, uploaded_by, related_customer_id)
  values
    (v_org_id, 'proposal-ramesh.pdf', format('%s/documents/proposals/proposal-ramesh.pdf', v_org_id::text), 'application/pdf', 248901, v_auth_user_id, v_customer_1),
    (v_org_id, 'site-survey-suresh.pdf', format('%s/documents/surveys/site-survey-suresh.pdf', v_org_id::text), 'application/pdf', 312004, v_auth_user_id, v_customer_2);

  -- 12) Reports
  insert into public.reports (organization_id, name, report_type, generated_by, file_url)
  values
    (v_org_id, 'Inventory Snapshot March', 'inventory', v_auth_user_id, format('%s/reports/inventory-snapshot-march.pdf', v_org_id::text)),
    (v_org_id, 'Customer Pipeline Weekly', 'customer', v_auth_user_id, format('%s/reports/customer-pipeline-weekly.pdf', v_org_id::text)),
    (v_org_id, 'Task Completion Weekly', 'task', v_auth_user_id, format('%s/reports/task-completion-weekly.pdf', v_org_id::text));

  -- 13) Dashboard widgets
  insert into public.dashboard_widgets (organization_id, widget_name, widget_type, settings_json)
  values
    (v_org_id, 'Total Customers', 'kpi', '{"source":"customers","metric":"count"}'::jsonb),
    (v_org_id, 'Task Status', 'chart', '{"source":"tasks","groupBy":"status","chart":"donut"}'::jsonb),
    (v_org_id, 'Inventory Alerts', 'list', '{"source":"spares","condition":"stock_quantity < min_stock"}'::jsonb);

  -- 14) Activity logs
  insert into public.activity_logs (organization_id, user_id, action, entity_type, entity_id, details)
  values
    (v_org_id, v_auth_user_id, 'seed_created', 'organization', v_org_id, '{"note":"Initial demo dataset created"}'::jsonb),
    (v_org_id, v_auth_user_id, 'report_generated', 'report', null, '{"report_type":"inventory"}'::jsonb);
end $$;

commit;
