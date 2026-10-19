-- ==========================================
-- PANJRAPOLE - Migration 2: remarks column + Cheque payment mode
-- Run this once in Supabase SQL Editor, AFTER schema.sql and fix-grants.sql.
-- ==========================================

-- New optional columns.
alter table pj_receipt_items add column if not exists remark text;
alter table pj_receipts add column if not exists bank_name text;
alter table pj_receipts add column if not exists cheque_no text;
alter table pj_receipts add column if not exists cheque_date date;

-- Widen the payment_mode check to allow 'cheque' too. Finds whatever
-- Postgres auto-named the original inline check constraint (rather than
-- guessing the name) so this is safe to run even if it differs.
do $$
declare
  v_conname text;
begin
  select conname into v_conname
  from pg_constraint
  where conrelid = 'pj_receipts'::regclass
    and contype = 'c'
    and pg_get_constraintdef(oid) ilike '%payment_mode%';
  if v_conname is not null then
    execute format('alter table pj_receipts drop constraint %I', v_conname);
  end if;
end $$;

alter table pj_receipts add constraint pj_receipts_payment_mode_check
  check (payment_mode in ('cash','online','cheque'));

-- The function signatures are changing (new params), so drop the old
-- overloads first - "create or replace" can't change a parameter list.
drop function if exists pj_create_receipt(date,text,text,text,text,text,text,boolean,text,text,jsonb);
drop function if exists pj_update_receipt(uuid,text,text,text,text,text,text,boolean,text,text,jsonb);

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
  p_bank_name text,
  p_cheque_no text,
  p_cheque_date date,
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
  if p_payment_mode not in ('cash','online','cheque') then raise exception 'Invalid payment mode.'; end if;
  if p_payment_mode = 'cheque' and (p_cheque_no is null or trim(p_cheque_no) = '') then
    raise exception 'Cheque number is required for a cheque payment.';
  end if;
  if jsonb_array_length(coalesce(p_items, '[]'::jsonb)) = 0 then
    raise exception 'Add at least one donation head with an amount.';
  end if;

  select coalesce(sum((it->>'amount')::numeric), 0) into v_total
  from jsonb_array_elements(p_items) it;
  if v_total <= 0 then raise exception 'Total amount must be greater than zero.'; end if;

  v_no := pj_next_receipt_no();

  insert into pj_receipts (
    receipt_no, receipt_date, donor_name, donor_whatsapp, donor_city, donor_address,
    donor_email, donor_pan, want_80g, payment_mode, payment_ref, bank_name, cheque_no, cheque_date,
    total_amount, created_by
  ) values (
    v_no, coalesce(p_receipt_date, current_date), trim(p_donor_name), trim(p_donor_whatsapp), trim(p_donor_city), nullif(trim(p_donor_address),''),
    nullif(trim(p_donor_email),''), upper(nullif(trim(p_donor_pan),'')), coalesce(p_want_80g,false), p_payment_mode,
    nullif(trim(p_payment_ref),''), nullif(trim(p_bank_name),''), nullif(trim(p_cheque_no),''), p_cheque_date,
    v_total, auth.uid()
  ) returning pj_receipts.id into v_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into pj_receipt_items (receipt_id, head_id, amount, remark)
    values (v_id, (v_item->>'head_id')::uuid, (v_item->>'amount')::numeric, nullif(trim(v_item->>'remark'),''));
  end loop;

  return query select v_id, v_no;
end;
$$;

revoke all on function pj_create_receipt(date,text,text,text,text,text,text,boolean,text,text,text,text,date,jsonb) from public;
grant execute on function pj_create_receipt(date,text,text,text,text,text,text,boolean,text,text,text,text,date,jsonb) to authenticated;

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
  p_bank_name text,
  p_cheque_no text,
  p_cheque_date date,
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
  if p_payment_mode not in ('cash','online','cheque') then raise exception 'Invalid payment mode.'; end if;
  if p_payment_mode = 'cheque' and (p_cheque_no is null or trim(p_cheque_no) = '') then
    raise exception 'Cheque number is required for a cheque payment.';
  end if;
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
    donor_pan = upper(nullif(trim(p_donor_pan),'')),
    want_80g = coalesce(p_want_80g,false),
    payment_mode = p_payment_mode,
    payment_ref = nullif(trim(p_payment_ref),''),
    bank_name = nullif(trim(p_bank_name),''),
    cheque_no = nullif(trim(p_cheque_no),''),
    cheque_date = p_cheque_date,
    total_amount = v_total,
    last_edited_by = case when v_locked then auth.uid() else last_edited_by end,
    last_edited_at = case when v_locked then now() else last_edited_at end
  where id = p_receipt_id;

  delete from pj_receipt_items where receipt_id = p_receipt_id;
  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into pj_receipt_items (receipt_id, head_id, amount, remark)
    values (p_receipt_id, (v_item->>'head_id')::uuid, (v_item->>'amount')::numeric, nullif(trim(v_item->>'remark'),''));
  end loop;
end;
$$;

revoke all on function pj_update_receipt(uuid,text,text,text,text,text,text,boolean,text,text,text,text,date,jsonb) from public;
grant execute on function pj_update_receipt(uuid,text,text,text,text,text,text,boolean,text,text,text,text,date,jsonb) to authenticated;
