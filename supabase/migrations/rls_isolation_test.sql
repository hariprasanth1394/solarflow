-- RLS isolation validation for 3 tenants
-- Prerequisites:
-- 1) Run migrations and seed scripts first.
-- 2) Have at least 3 users in public.users with distinct organization_id.
-- 3) Run in Supabase SQL Editor.

begin;

-- Force policy evaluation with authenticated role where possible.
do $$
begin
  begin
    execute 'set local role authenticated';
  exception
    when others then
      raise notice 'Could not set role authenticated in this environment. Continuing with current role.';
  end;
end $$;

create temp table if not exists rls_test_results (
  test_name text,
  actor_user_id uuid,
  actor_org_id uuid,
  expected text,
  actual text,
  passed boolean,
  details text
) on commit drop;

truncate table rls_test_results;

do $$
declare
  actor record;
  actor_count integer;
  visible_customer_orgs integer;
  visible_task_orgs integer;
  visible_spare_orgs integer;
  visible_doc_orgs integer;

  foreign_customer_id uuid;
  update_count integer;
begin
  select count(*)
  into actor_count
  from (
    select distinct u.id, u.organization_id
    from public.users u
    where u.organization_id is not null
    order by u.created_at asc
    limit 3
  ) t;

  if actor_count < 3 then
    insert into rls_test_results(test_name, expected, actual, passed, details)
    values (
      'precheck_three_tenants',
      'at least 3 users with distinct organizations',
      actor_count::text,
      false,
      'Create 3 auth users (each should get separate org via signup trigger) and rerun.'
    );
    return;
  end if;

  for actor in
    select u.id, u.organization_id
    from public.users u
    where u.organization_id is not null
    order by u.created_at asc
    limit 3
  loop
    perform set_config('request.jwt.claim.sub', actor.id::text, true);

    -- Validate tenant-scoped visibility by distinct org counts per table
    select count(distinct organization_id) into visible_customer_orgs from public.customers;
    select count(distinct organization_id) into visible_task_orgs from public.tasks;
    select count(distinct organization_id) into visible_spare_orgs from public.spares;
    select count(distinct organization_id) into visible_doc_orgs from public.documents;

    insert into rls_test_results(test_name, actor_user_id, actor_org_id, expected, actual, passed, details)
    values (
      'select_customers_org_scope',
      actor.id,
      actor.organization_id,
      '1 distinct org',
      visible_customer_orgs::text,
      visible_customer_orgs = 1,
      'Customers visibility should be scoped to actor organization only.'
    );

    insert into rls_test_results(test_name, actor_user_id, actor_org_id, expected, actual, passed, details)
    values (
      'select_tasks_org_scope',
      actor.id,
      actor.organization_id,
      '1 distinct org',
      visible_task_orgs::text,
      visible_task_orgs = 1,
      'Tasks visibility should be scoped to actor organization only.'
    );

    insert into rls_test_results(test_name, actor_user_id, actor_org_id, expected, actual, passed, details)
    values (
      'select_spares_org_scope',
      actor.id,
      actor.organization_id,
      '1 distinct org',
      visible_spare_orgs::text,
      visible_spare_orgs = 1,
      'Spares visibility should be scoped to actor organization only.'
    );

    insert into rls_test_results(test_name, actor_user_id, actor_org_id, expected, actual, passed, details)
    values (
      'select_documents_org_scope',
      actor.id,
      actor.organization_id,
      '1 distinct org',
      visible_doc_orgs::text,
      visible_doc_orgs = 1,
      'Documents visibility should be scoped to actor organization only.'
    );

    -- Cross-tenant update should affect 0 rows
    select c.id
      into foreign_customer_id
    from public.customers c
    where c.organization_id <> actor.organization_id
    limit 1;

    if foreign_customer_id is null then
      insert into rls_test_results(test_name, actor_user_id, actor_org_id, expected, actual, passed, details)
      values (
        'update_foreign_customer_blocked',
        actor.id,
        actor.organization_id,
        '0 updated rows',
        'N/A',
        true,
        'Skipped because no foreign-tenant customer row exists in current dataset.'
      );
    else
      update public.customers
      set notes = coalesce(notes, '')
      where id = foreign_customer_id;

      get diagnostics update_count = row_count;

      insert into rls_test_results(test_name, actor_user_id, actor_org_id, expected, actual, passed, details)
      values (
        'update_foreign_customer_blocked',
        actor.id,
        actor.organization_id,
        '0 updated rows',
        update_count::text,
        update_count = 0,
        'RLS should block updates to customer records outside actor organization.'
      );
    end if;
  end loop;
end $$;

select *
from rls_test_results
order by test_name, actor_user_id;

-- Optional summary
select
  count(*) as total_tests,
  count(*) filter (where passed) as passed_tests,
  count(*) filter (where not passed) as failed_tests
from rls_test_results;

rollback;
