-- Run ONCE in Supabase SQL Editor
alter table devices drop constraint if exists devices_status_check;
alter table devices add constraint devices_status_check
  check (status in ('in_stock','sold','returned','defective','repair'));
alter table devices add column if not exists status_reason text;
alter table sales drop constraint if exists sales_device_id_key; -- a returned phone can be sold again
create index if not exists tasjil_device_idx on tasjil_checks(device_id);
