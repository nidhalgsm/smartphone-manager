-- Run in Supabase: SQL Editor > New query > Run
create table devices (
  id uuid primary key default gen_random_uuid(),
  category text not null check (category in ('tunisien','parallele')),
  imei1 text unique, imei2 text unique, serial_number text unique,
  model text, supplier_name text,
  purchase_date timestamptz not null default now(),
  purchase_price numeric(10,3), expected_sale_price numeric(10,3),
  status text not null default 'in_stock' check (status in ('in_stock','sold','returned','defective')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  check (imei1 is not null or serial_number is not null)
);
create table sales (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null unique references devices(id),
  sale_date timestamptz not null default now(),
  sale_price numeric(10,3), seller_name text, notes text,
  created_at timestamptz not null default now()
);
create table tasjil_checks (
  id uuid primary key default gen_random_uuid(),
  device_id uuid not null references devices(id),
  imei_checked text, serial_checked text,
  result_status text not null check (result_status in
    ('autorise','non_autorise','bloque','enregistre_temporairement','a_verifier','erreur')),
  checked_at timestamptz not null default now(),
  source text, message text, checked_by uuid
);
create table audit_log (
  id bigint generated always as identity primary key,
  user_id uuid, action text not null, entity_type text, entity_id text,
  summary text, created_at timestamptz not null default now()
);
create index on devices(status); create index on devices(category);

-- Atomic sale: the device can only move in_stock -> sold once.
create function sell_device(p_device_id uuid, p_price numeric, p_seller text, p_notes text)
returns uuid language plpgsql as $$
declare v_id uuid;
begin
  update devices set status='sold', updated_at=now()
   where id=p_device_id and status='in_stock' and deleted_at is null;
  if not found then raise exception 'DEVICE_NOT_AVAILABLE'; end if;
  insert into sales(device_id, sale_price, seller_name, notes)
   values (p_device_id, p_price, p_seller, p_notes) returning id into v_id;
  return v_id;
end $$;

-- The backend uses the service key; browsers never touch tables directly.
alter table devices enable row level security;
alter table sales enable row level security;
alter table tasjil_checks enable row level security;
alter table audit_log enable row level security;
