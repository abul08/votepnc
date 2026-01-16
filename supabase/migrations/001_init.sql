create extension if not exists "uuid-ossp";

create type public.user_role as enum ('admin', 'candidate');

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  password_hash text,
  role public.user_role not null default 'candidate',
  created_at timestamptz not null default now()
);

create table if not exists public.candidates (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.users (id) on delete cascade,
  name text not null,
  phone text,
  position text,
  created_at timestamptz not null default now()
);

create table if not exists public.voters (
  id uuid primary key default uuid_generate_v4(),
  sumaaru text not null,
  name text not null,
  address text,
  phone text,
  sex text,
  nid text,
  present_location text,
  registered_box text,
  job_in text,
  job_by text,
  created_by uuid references public.users (id),
  updated_by uuid references public.users (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.voter_assignments (
  candidate_id uuid references public.candidates (id) on delete cascade,
  voter_id uuid references public.voters (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (candidate_id, voter_id)
);

create table if not exists public.candidate_permissions (
  id uuid primary key default uuid_generate_v4(),
  candidate_id uuid references public.candidates (id) on delete cascade,
  field text not null,
  can_edit boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_log (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users (id) on delete set null,
  action text not null,
  timestamp timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create table if not exists public.audit_log (
  id uuid primary key default uuid_generate_v4(),
  table_name text not null,
  record_id uuid,
  action text not null,
  changed_by uuid,
  changed_at timestamptz not null default now(),
  before_data jsonb,
  after_data jsonb
);

create or replace function public.set_voter_audit_fields()
returns trigger
language plpgsql
as $$
begin
  if tg_op = 'INSERT' then
    new.created_by := auth.uid();
    new.updated_by := auth.uid();
    new.created_at := now();
    new.updated_at := now();
  else
    new.updated_by := auth.uid();
    new.updated_at := now();
  end if;
  return new;
end;
$$;

create trigger voters_audit_fields
before insert or update on public.voters
for each row execute function public.set_voter_audit_fields();

create or replace function public.audit_changes()
returns trigger
language plpgsql
as $$
begin
  insert into public.audit_log (
    table_name,
    record_id,
    action,
    changed_by,
    before_data,
    after_data
  )
  values (
    tg_table_name,
    case when tg_op = 'DELETE' then old.id else new.id end,
    tg_op,
    auth.uid(),
    case when tg_op in ('UPDATE', 'DELETE') then to_jsonb(old) else null end,
    case when tg_op in ('INSERT', 'UPDATE') then to_jsonb(new) else null end
  );
  return coalesce(new, old);
end;
$$;

create trigger users_audit
after insert or update or delete on public.users
for each row execute function public.audit_changes();

create trigger candidates_audit
after insert or update or delete on public.candidates
for each row execute function public.audit_changes();

create trigger voters_audit
after insert or update or delete on public.voters
for each row execute function public.audit_changes();

alter table public.users enable row level security;
alter table public.candidates enable row level security;
alter table public.voters enable row level security;
alter table public.voter_assignments enable row level security;
alter table public.candidate_permissions enable row level security;
alter table public.activity_log enable row level security;
alter table public.audit_log enable row level security;

create policy "admins_full_access_users"
on public.users
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy "users_view_self"
on public.users
for select
using (auth.uid() = id);

create policy "admins_full_access_candidates"
on public.candidates
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy "candidate_view_self"
on public.candidates
for select
using (user_id = auth.uid());

create policy "admins_full_access_candidate_permissions"
on public.candidate_permissions
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy "candidate_view_permissions"
on public.candidate_permissions
for select
using (
  exists (
    select 1
    from public.candidates c
    where c.id = candidate_id
      and c.user_id = auth.uid()
  )
);

create policy "admins_full_access_voters"
on public.voters
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy "candidate_read_assigned_voters"
on public.voters
for select
using (
  exists (
    select 1
    from public.voter_assignments va
    join public.candidates c on c.id = va.candidate_id
    where va.voter_id = id
      and c.user_id = auth.uid()
  )
);

create policy "admins_full_access_voter_assignments"
on public.voter_assignments
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy "candidate_view_assignments"
on public.voter_assignments
for select
using (
  exists (
    select 1
    from public.candidates c
    where c.id = candidate_id
      and c.user_id = auth.uid()
  )
);

create policy "admins_full_access_activity_log"
on public.activity_log
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy "users_insert_own_activity"
on public.activity_log
for insert
with check (user_id = auth.uid());

create policy "candidate_view_own_activity"
on public.activity_log
for select
using (user_id = auth.uid());

create policy "admins_full_access_audit_log"
on public.audit_log
for all
using (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'))
with check (exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin'));

create policy "allow_audit_insert"
on public.audit_log
for insert
with check (auth.uid() is not null);

create or replace function public.get_candidate_voters()
returns table(voter jsonb)
language sql
security definer
set search_path = public
as $$
  with candidate as (
    select id
    from public.candidates
    where user_id = auth.uid()
  ),
  perms as (
    select array_agg(field) as fields
    from public.candidate_permissions cp
    join candidate c on c.id = cp.candidate_id
  )
  select jsonb_object_agg(e.key, e.value) as voter
  from public.voters v
  join public.voter_assignments va on va.voter_id = v.id
  join candidate c on c.id = va.candidate_id
  cross join perms p
  cross join lateral jsonb_each(to_jsonb(v)) e
  where e.key = any(p.fields) or e.key in ('id', 'sumaaru', 'name')
  group by v.id;
$$;

create or replace function public.update_candidate_voter(
  p_voter_id uuid,
  p_updates jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed_fields text[];
  kv record;
  set_clause text := '';
begin
  select array_agg(field)
  into allowed_fields
  from public.candidate_permissions cp
  join public.candidates c on c.id = cp.candidate_id
  where c.user_id = auth.uid();

  if allowed_fields is null then
    raise exception 'No permissions found';
  end if;

  if not exists (
    select 1
    from public.voter_assignments va
    join public.candidates c on c.id = va.candidate_id
    where va.voter_id = p_voter_id
      and c.user_id = auth.uid()
  ) then
    raise exception 'Not authorized to update this voter';
  end if;

  for kv in select * from jsonb_each_text(p_updates)
  loop
    if kv.key = any(allowed_fields) then
      set_clause := set_clause || format('%I = %L,', kv.key, kv.value);
    end if;
  end loop;

  if set_clause = '' then
    raise exception 'No permitted fields supplied';
  end if;

  set_clause := set_clause || format('updated_by = %L, updated_at = now()', auth.uid());

  execute format('update public.voters set %s where id = %L', set_clause, p_voter