-- Reset demo data and seed inventory-aware onboarding sample set
-- Intended for non-production/demo environments

begin;

truncate table
  public.customer_progress,
  public.activity_logs,
  public.dashboard_widgets,
  public.reports,
  public.documents,
  public.stock_transactions,
  public.system_components,
  public.tasks,
  public.customers,
  public.systems,
  public.spares,
  public.suppliers,
  public.user_settings,
  public.organization_settings,
  public.users,
  public.organizations
restart identity cascade;

do $$
declare
  v_org_id uuid;
  v_auth_user_id uuid;
  v_supplier_1 uuid;
  v_supplier_2 uuid;
  v_spare_panel uuid;
  v_spare_inverter uuid;
  v_spare_connector uuid;
  v_spare_rail uuid;
  v_system_5kw uuid;
  v_system_7kw uuid;
  v_system_10kw uuid;
begin
  insert into public.organizations (name, industry, plan, logo_url)
  values ('SolarFlow Sample Org', 'Renewable Energy', 'growth', null)
  returning id into v_org_id;

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
      'Sample Admin',
      coalesce((select email from auth.users where id = v_auth_user_id), 'sample.admin@solarflow.local'),
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

  insert into public.organization_settings (organization_id, company_name, timezone, currency, language)
  values (v_org_id, 'SolarFlow Sample Org', 'Asia/Kolkata', 'INR', 'en');

  insert into public.suppliers (organization_id, name, contact, email, phone)
  values
    (v_org_id, 'SunVolt Supplies', 'Arun B', 'sales@sunvolt.in', '+91 8012345678'),
    (v_org_id, 'GreenGrid Components', 'Neha R', 'contact@greengrid.in', '+91 8899001122');

  select id into v_supplier_1 from public.suppliers where organization_id = v_org_id and name = 'SunVolt Supplies' limit 1;
  select id into v_supplier_2 from public.suppliers where organization_id = v_org_id and name = 'GreenGrid Components' limit 1;

  insert into public.spares (organization_id, name, category, unit, stock_quantity, min_stock, supplier_id, cost_price)
  values
    (v_org_id, 'Mono PERC Panel 540W', 'Panel', 'Nos', 300, 40, v_supplier_1, 9200),
    (v_org_id, 'On-Grid Inverter 5KW', 'Inverter', 'Nos', 32, 4, v_supplier_1, 38500),
    (v_org_id, 'MC4 Connector Pair', 'Connector', 'Pair', 900, 80, v_supplier_2, 190),
    (v_org_id, 'Galvanized Mounting Rail', 'Structure', 'Nos', 800, 100, v_supplier_2, 480);

  select id into v_spare_panel from public.spares where organization_id = v_org_id and name = 'Mono PERC Panel 540W' limit 1;
  select id into v_spare_inverter from public.spares where organization_id = v_org_id and name = 'On-Grid Inverter 5KW' limit 1;
  select id into v_spare_connector from public.spares where organization_id = v_org_id and name = 'MC4 Connector Pair' limit 1;
  select id into v_spare_rail from public.spares where organization_id = v_org_id and name = 'Galvanized Mounting Rail' limit 1;

  insert into public.systems (organization_id, system_name, capacity_kw, description)
  values
    (v_org_id, '5kW Residential System', 5.00, 'Residential rooftop package'),
    (v_org_id, '7kW Residential System', 7.00, 'Mid-size residential package'),
    (v_org_id, '10kW Commercial System', 10.00, 'Commercial rooftop package');

  select id into v_system_5kw from public.systems where organization_id = v_org_id and system_name = '5kW Residential System' limit 1;
  select id into v_system_7kw from public.systems where organization_id = v_org_id and system_name = '7kW Residential System' limit 1;
  select id into v_system_10kw from public.systems where organization_id = v_org_id and system_name = '10kW Commercial System' limit 1;

  insert into public.system_components (organization_id, system_id, spare_id, quantity_required)
  values
    (v_org_id, v_system_5kw, v_spare_panel, 10),
    (v_org_id, v_system_5kw, v_spare_inverter, 1),
    (v_org_id, v_system_5kw, v_spare_connector, 10),
    (v_org_id, v_system_5kw, v_spare_rail, 12),

    (v_org_id, v_system_7kw, v_spare_panel, 14),
    (v_org_id, v_system_7kw, v_spare_inverter, 2),
    (v_org_id, v_system_7kw, v_spare_connector, 14),
    (v_org_id, v_system_7kw, v_spare_rail, 16),

    (v_org_id, v_system_10kw, v_spare_panel, 20),
    (v_org_id, v_system_10kw, v_spare_inverter, 2),
    (v_org_id, v_system_10kw, v_spare_connector, 20),
    (v_org_id, v_system_10kw, v_spare_rail, 24)
  on conflict (system_id, spare_id) do update
    set quantity_required = excluded.quantity_required;

  insert into public.customers (
    organization_id,
    name,
    email,
    phone,
    company,
    city,
    state,
    country,
    status,
    current_stage,
    system_id,
    assigned_to,
    notes
  )
  values
    (v_org_id, 'Ramesh Kumar', 'ramesh@example.com', '+91 9876543210', 'Kumar Textiles', 'Coimbatore', 'Tamil Nadu', 'India', 'Active', 'CREATED', v_system_5kw, v_auth_user_id, '5kW starter customer'),
    (v_org_id, 'Suresh Patel', 'suresh@example.com', '+91 9988776655', 'Patel Foods', 'Ahmedabad', 'Gujarat', 'India', 'Active', 'SUBMITTED', v_system_7kw, v_auth_user_id, '7kW government docs in progress'),
    (v_org_id, 'Priya Nair', 'priya@example.com', '+91 9345678120', 'Nair Residency', 'Kochi', 'Kerala', 'India', 'Created', 'APPROVED', v_system_5kw, v_auth_user_id, 'Approved, waiting for install'),
    (v_org_id, 'Arun Raj', 'arun@example.com', '+91 9898989898', 'Raj Industries', 'Chennai', 'Tamil Nadu', 'India', 'Installation', 'INSTALLATION', v_system_10kw, v_auth_user_id, 'Commercial 10kW install');

  insert into public.tasks (organization_id, title, description, status, priority, assigned_to, created_by, related_customer_id, due_date)
  select
    v_org_id,
    'Initial Site Survey',
    'Complete on-site measurements and shadow analysis',
    'pending',
    'high',
    v_auth_user_id,
    v_auth_user_id,
    c.id,
    now() + interval '3 day'
  from public.customers c
  where c.organization_id = v_org_id
  limit 2;

  insert into public.activity_logs (organization_id, user_id, action, entity_type, entity_id, details)
  values
    (v_org_id, v_auth_user_id, 'sample_seed_completed', 'organization', v_org_id, '{"note":"Sample systems and customers seeded"}'::jsonb);
end $$;

commit;
