-- Invoices for auction winners
create table invoices (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid not null references auctions(id) on delete cascade,
  winner_bid_id uuid references bids(id) on delete set null,
  invoice_number text not null unique,
  winner_name text,
  winner_email text not null,
  winner_phone text,
  amount numeric not null,
  notes text,
  due_date date,
  status text not null default 'draft' check (status in ('draft', 'sent')),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint invoices_auction_unique unique (auction_id)
);

create index idx_invoices_auction_id on invoices(auction_id);
create index idx_invoices_winner_email on invoices(winner_email);
create index idx_invoices_status on invoices(status);

alter table invoices enable row level security;
create policy "Public read invoices" on invoices for select using (true);
create policy "Auth write invoices" on invoices for all using (auth.role() = 'authenticated');
