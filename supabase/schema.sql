-- ==========================================
-- PANJRAPOLE DONATION ENTRY - Full Schema
-- Run this once in Supabase SQL Editor (project vijevnaudlpyzxizhzuc)
-- ==========================================

-- ---------- TABLES ----------

create table if not exists pj_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null check (role in ('clerk','admin')),
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists pj_heads (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists pj_settings (
  id smallint primary key default 1 check (id = 1),
  org_name text not null default 'Shree Vadodara Panjrapole, Baroda',
  org_address text,
  org_phone text,
  org_pan text default 'AAATV1139M',
  starting_receipt_no integer,
  updated_at timestamptz not null default now()
);
insert into pj_settings (id) values (1) on conflict (id) do nothing;

create table if not exists pj_receipt_counter (
  id smallint primary key default 1 check (id = 1),
  next_no integer
);
insert into pj_receipt_counter (id, next_no) values (1, null) on conflict (id) do nothing;

create table if not exists pj_receipts (
  id uuid primary key default gen_random_uuid(),
  receipt_no integer unique,
  receipt_date date not null default current_date,
  donor_name text not null,
  donor_whatsapp text not null,
  donor_city text not null,
  donor_address text,
  donor_email text,
  donor_pan text,
  want_80g boolean not null default false,
  payment_mode text not null check (payment_mode in ('cash','online')),
  payment_ref text,
  total_amount numeric(12,2) not null,
  created_by uuid not null references pj_profiles(id),
  created_at timestamptz not null default now(),
  printed_at timestamptz,
  locked boolean not null default false,
  last_edited_by uuid references pj_profiles(id),
  last_edited_at timestamptz
);

create index if not exists idx_pj_receipts_date on pj_receipts(receipt_date);
create index if not exists idx_pj_receipts_created_by on pj_receipts(created_by);

create table if not exists pj_receipt_items (
  id uuid primary key default gen_random_uuid(),
  receipt_id uuid not null references pj_receipts(id) on delete cascade,
  head_id uuid not null references pj_heads(id),
  amount numeric(12,2) not null check (amount > 0)
);

create index if not exists idx_pj_receipt_items_receipt on pj_receipt_items(receipt_id);

-- ---------- SEED HEADS (from the paper receipt book) ----------
insert into pj_heads (name, sort_order) values
  ('Nibhav / Ghaaschaaro / Jivdaya', 1),
  ('Kabootar Chan', 2),
  ('Jiv Chhodavva', 3),
  ('Dava Khate', 4),
  ('Ladoo / Gol Vitran', 5)
on conflict do nothing;

-- ---------- ROLE HELPERS ----------

create or replace function pj_is_admin()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists(select 1 from pj_profiles where id = auth.uid() and role = 'admin' and active);
$$;

create or replace function pj_is_active_user()
returns boolean
language sql security definer stable
set search_path = public
as $$
  select exists(select 1 from pj_profiles where id = auth.uid() and active);
$$;

-- ---------- RLS ----------

alter table pj_profiles enable row level security;
alter table pj_heads enable row level security;
alter table pj_settings enable row level security;
alter table pj_receipt_counter enable row level security;
alter table pj_receipts enable row level security;
alter table pj_receipt_items enable row level security;

-- profiles: see own row, or every row if admin. Self-insert only allowed as
-- a pending, inactive clerk - role/active escalation only ever happens via
-- the pj_admin_set_profile RPC below, never a direct client update.
create policy "profiles_select" on pj_profiles for select
  using (id = auth.uid() or pj_is_admin());

create policy "profiles_self_signup" on pj_profiles for insert
  with check (id = auth.uid() and role = 'clerk' and active = false);

-- heads: any logged-in, activated user can read; only admin manages.
create policy "heads_select" on pj_heads for select
  using (pj_is_active_user());
create policy "heads_admin_write" on pj_heads for insert
  with check (pj_is_admin());
create policy "heads_admin_update" on pj_heads for update
  using (pj_is_admin());

-- settings: readable by any activated user (clerk entry screen needs org
-- header details for printing); only admin updates (via RPC only, see below).
create policy "settings_select" on pj_settings for select
  using (pj_is_active_user());

-- counter: admin-readable only (clerk never needs to see raw next_no).
create policy "counter_admin_select" on pj_receipt_counter for select
  using (pj_is_admin());

-- receipts: a clerk sees only receipts they created; admin sees everything.
-- No direct insert/update grants on this table at all - every write goes
-- through a SECURITY DEFINER RPC below, so a receipt_no can never be forged
-- and the printed-lock can never be bypassed from the client.
create policy "receipts_select" on pj_receipts for select
  using (created_by = auth.uid() or pj_is_admin());

-- receipt_items: same visibility as their parent receipt.
create policy "receipt_items_select" on pj_receipt_items for select
  using (exists (
    select 1 from pj_receipts r
    where r.id = receipt_id and (r.created_by = auth.uid() or pj_is_admin())
  ));

-- Lock down direct table writes - everything happens through RPCs instead,
-- which run as the function owner and bypass RLS entirely by design.
revoke insert, update, delete on pj_receipts from authenticated, anon;
revoke insert, update, delete on pj_receipt_items from authenticated, anon;
revoke insert, update, delete on pj_settings from authenticated, anon;
revoke insert, update, delete on pj_receipt_counter from authenticated, anon;
revoke delete on pj_heads from authenticated, anon;
revoke update on pj_profiles from authenticated, anon;

-- ---------- RPCs ----------

-- Atomic increment-and-return, so two clerks saving at the same instant can
-- never get the same receipt number. Fails loudly if the admin hasn't set a
-- starting number yet (Admin -> Settings), instead of silently starting at 1.
create or replace function pj_next_receipt_no()
returns integer
language plpgsql security definer
set search_path = public
as $$
declare
  v_assigned integer;
  v_start integer;
begin
  if not pj_is_active_user() then
    raise exception 'Not authorized.';
  end if;

  select next_no into v_assigned from pj_receipt_counter where id = 1 for update;

  if v_assigned is null then
    select starting_receipt_no into v_start from pj_settings where id = 1;
    if v_start is null then
      raise exception 'Starting receipt number is not set yet. Go to Admin -> Settings and set it first.';
    end if;
    update pj_receipt_counter set next_no = v_start + 1 where id = 1;
    return v_start;
  end if;

  update pj_receipt_counter set next_no = next_no + 1 where id = 1;
  return v_assigned;
end;
$$;

revoke all on function pj_next_receipt_no() from public;
grant execute on function pj_next_receipt_no() to authenticated;

-- Creates a receipt + its line items in one atomic call. p_items is a jsonb
-- array like [{"head_id":"...","amount":100}, ...].
create or replace function pj_create_receipt(
  p_receipt_date date,
  p_donor_name text,
  p_donor_whatsapp text,
  p_donor_city text,
  p_donor_address text,
  p_donor_email text,
  p_donor_pan text,
  p_want_80g boolean,
  p_payment_mode text,
  p_payment_ref text,
  p_items jsonb
)
returns table(id uuid, receipt_no integer)
language plpgsql security definer
set search_path = public
as $$
declare
  v_id uuid;
  v_no integer;
  v_total numeric(12,2);
  v_item jsonb;
begin
  if not pj_is_active_user() then
    raise exception 'Your account is not active yet.';
  end if;
  if p_donor_name is null or trim(p_donor_name) = '' then raise exception 'Donor name is required.'; end if;
  if p_donor_whatsapp is null or trim(p_donor_whatsapp) = '' then raise exception 'WhatsApp number is required.'; end if;
  if p_donor_city is null or trim(p_donor_city) = '' then raise exception 'City is required.'; end if;
  if p_want_80g and (p_donor_pan is null or trim(p_donor_pan) = '') then
    raise exception 'PAN is required for an 80G receipt.';
  end if;
  if p_payment_mode not in ('cash','online') then raise exception 'Invalid payment mode.'; end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Add at least one donation head with an amount.';
  end if;

  select coalesce(sum((it->>'amount')::numeric), 0) into v_total
  from jsonb_array_elements(p_items) it;
  if v_total <= 0 then raise exception 'Total amount must be greater than zero.'; end if;

  v_no := pj_next_receipt_no();

  insert into pj_receipts (
    receipt_no, receipt_date, donor_name, donor_whatsapp, donor_city, donor_address,
    donor_email, donor_pan, want_80g, payment_mode, payment_ref, total_amount, created_by
  ) values (
    v_no, coalesce(p_receipt_date, current_date), trim(p_donor_name), trim(p_donor_whatsapp), trim(p_donor_city), nullif(trim(p_donor_address),''),
    nullif(trim(p_donor_email),''), nullif(trim(p_donor_pan),''), coalesce(p_want_80g,false), p_payment_mode, nullif(trim(p_payment_ref),''), v_total, auth.uid()
  ) returning pj_receipts.id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into pj_receipt_items (receipt_id, head_id, amount)
    values (v_id, (v_item->>'head_id')::uuid, (v_item->>'amount')::numeric);
  end loop;

  return query select v_id, v_no;
end;
$$;

revoke all on function pj_create_receipt(date,text,text,text,text,text,text,boolean,text,text,jsonb) from public;
grant execute on function pj_create_receipt(date,text,text,text,text,text,text,boolean,text,text,jsonb) to authenticated;

-- Marks a receipt as printed/locked the first time it's printed. Reprinting
-- an already-locked receipt is a harmless no-op (doesn't move printed_at).
create or replace function pj_mark_printed(p_receipt_id uuid)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_creator uuid;
begin
  select created_by into v_creator from pj_receipts where id = p_receipt_id;
  if v_creator is null then raise exception 'Receipt not found.'; end if;
  if v_creator <> auth.uid() and not pj_is_admin() then
    raise exception 'Not authorized.';
  end if;
  update pj_receipts set printed_at = coalesce(printed_at, now()), locked = true
  where id = p_receipt_id and printed_at is null;
end;
$$;

revoke all on function pj_mark_printed(uuid) from public;
grant execute on function pj_mark_printed(uuid) to authenticated;

-- Edits a receipt + replaces its line items. Before printing, the clerk who
-- created it (or any admin) can edit; once printed/locked, only an admin can.
create or replace function pj_update_receipt(
  p_receipt_id uuid,
  p_donor_name text,
  p_donor_whatsapp text,
  p_donor_city text,
  p_donor_address text,
  p_donor_email text,
  p_donor_pan text,
  p_want_80g boolean,
  p_payment_mode text,
  p_payment_ref text,
  p_items jsonb
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_locked boolean;
  v_creator uuid;
  v_total numeric(12,2);
  v_item jsonb;
begin
  select locked, created_by into v_locked, v_creator from pj_receipts where id = p_receipt_id;
  if v_creator is null then raise exception 'Receipt not found.'; end if;

  if v_locked and not pj_is_admin() then
    raise exception 'This receipt is already printed and locked. Ask an admin to edit it.';
  end if;
  if not v_locked and not (v_creator = auth.uid() or pj_is_admin()) then
    raise exception 'Not authorized.';
  end if;

  if p_donor_name is null or trim(p_donor_name) = '' then raise exception 'Donor name is required.'; end if;
  if p_donor_whatsapp is null or trim(p_donor_whatsapp) = '' then raise exception 'WhatsApp number is required.'; end if;
  if p_donor_city is null or trim(p_donor_city) = '' then raise exception 'City is required.'; end if;
  if p_want_80g and (p_donor_pan is null or trim(p_donor_pan) = '') then
    raise exception 'PAN is required for an 80G receipt.';
  end if;
  if p_payment_mode not in ('cash','online') then raise exception 'Invalid payment mode.'; end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Add at least one donation head with an amount.';
  end if;

  select coalesce(sum((it->>'amount')::numeric), 0) into v_total
  from jsonb_array_elements(p_items) it;
  if v_total <= 0 then raise exception 'Total amount must be greater than zero.'; end if;

  update pj_receipts set
    donor_name = trim(p_donor_name),
    donor_whatsapp = trim(p_donor_whatsapp),
    donor_city = trim(p_donor_city),
    donor_address = nullif(trim(p_donor_address),''),
    donor_email = nullif(trim(p_donor_email),''),
    donor_pan = nullif(trim(p_donor_pan),''),
    want_80g = coalesce(p_want_80g,false),
    payment_mode = p_payment_mode,
    payment_ref = nullif(trim(p_payment_ref),''),
    total_amount = v_total,
    last_edited_by = case when v_locked then auth.uid() else last_edited_by end,
    last_edited_at = case when v_locked then now() else last_edited_at end
  where id = p_receipt_id;

  delete from pj_receipt_items where receipt_id = p_receipt_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into pj_receipt_items (receipt_id, head_id, amount)
    values (p_receipt_id, (v_item->>'head_id')::uuid, (v_item->>'amount')::numeric);
  end loop;
end;
$$;

revoke all on function pj_update_receipt(uuid,text,text,text,text,text,text,boolean,text,text,jsonb) from public;
grant execute on function pj_update_receipt(uuid,text,text,text,text,text,text,boolean,text,text,jsonb) to authenticated;

-- Admin-only: set the starting receipt number (blocked once the counter has
-- already been initialized by the first receipt) and the org header details
-- used on the printed receipt.
create or replace function pj_update_settings(
  p_org_name text,
  p_org_address text,
  p_org_phone text,
  p_org_pan text,
  p_starting_receipt_no integer
)
returns void
language plpgsql security definer
set search_path = public
as $$
declare
  v_counter_started integer;
begin
  if not pj_is_admin() then raise exception 'Admin only.'; end if;

  select next_no into v_counter_started from pj_receipt_counter where id = 1;
  if v_counter_started is not null and p_starting_receipt_no is distinct from (select starting_receipt_no from pj_settings where id = 1) then
    raise exception 'Receipts have already started — the starting number can no longer be changed.';
  end if;

  update pj_settings set
    org_name = coalesce(nullif(trim(p_org_name),''), org_name),
    org_address = nullif(trim(p_org_address),''),
    org_phone = nullif(trim(p_org_phone),''),
    org_pan = coalesce(nullif(trim(p_org_pan),''), org_pan),
    starting_receipt_no = p_starting_receipt_no,
    updated_at = now()
  where id = 1;
end;
$$;

revoke all on function pj_update_settings(text,text,text,text,integer) from public;
grant execute on function pj_update_settings(text,text,text,text,integer) to authenticated;

-- Admin-only: activate/deactivate a clerk, or promote to admin.
create or replace function pj_admin_set_profile(p_id uuid, p_role text, p_active boolean)
returns void
language plpgsql security definer
set search_path = public
as $$
begin
  if not pj_is_admin() then raise exception 'Admin only.'; end if;
  if p_role not in ('clerk','admin') then raise exception 'Invalid role.'; end if;
  update pj_profiles set role = p_role, active = p_active where id = p_id;
end;
$$;

revoke all on function pj_admin_set_profile(uuid,text,boolean) from public;
grant execute on function pj_admin_set_profile(uuid,text,boolean) to authenticated;

-- Admin-only: today's and all-time total per head, for the Live dashboard.
create or replace function pj_head_totals()
returns table(head_id uuid, head_name text, today_total numeric, cumulative_total numeric)
language plpgsql security definer stable
set search_path = public
as $$
begin
  if not pj_is_admin() then raise exception 'Admin only.'; end if;
  return query
    select
      h.id,
      h.name,
      coalesce(sum(ri.amount) filter (where r.receipt_date = current_date), 0) as today_total,
      coalesce(sum(ri.amount), 0) as cumulative_total
    from pj_heads h
    left join pj_receipt_items ri on ri.head_id = h.id
    left join pj_receipts r on r.id = ri.receipt_id
    where h.active
    group by h.id, h.name, h.sort_order
    order by h.sort_order;
end;
$$;

revoke all on function pj_head_totals() from public;
grant execute on function pj_head_totals() to authenticated;

-- ==========================================
-- AFTER RUNNING THIS FILE:
-- 1. Sign up your own admin account once via signup.html.
-- 2. Run this (with your real auth user id) to promote yourself to admin:
--    select id, name from pj_profiles;   -- find your row
--    select pj_admin_set_profile('<your-id-here>', 'admin', true);
-- 3. Log in as admin -> Settings -> set the starting receipt number before
--    the first real receipt is entered.
-- ==========================================
