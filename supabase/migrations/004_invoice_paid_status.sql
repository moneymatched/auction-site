alter table invoices
  add column if not exists paid_at timestamptz;

alter table invoices
  drop constraint if exists invoices_status_check;

alter table invoices
  add constraint invoices_status_check
  check (status in ('draft', 'sent', 'paid'));
