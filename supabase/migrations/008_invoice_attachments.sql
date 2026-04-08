create table invoice_attachments (
  id uuid primary key default uuid_generate_v4(),
  invoice_id uuid not null references invoices(id) on delete cascade,
  file_name text not null,
  storage_path text not null,
  content_type text,
  size_bytes bigint,
  created_at timestamptz not null default now()
);

create index idx_invoice_attachments_invoice_id on invoice_attachments(invoice_id);

alter table invoice_attachments enable row level security;
create policy "Public read invoice attachments" on invoice_attachments for select using (true);
create policy "Auth write invoice attachments" on invoice_attachments for all using (auth.role() = 'authenticated');
