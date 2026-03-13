-- Registered bidders
create table bidders (
  id uuid primary key default uuid_generate_v4(),
  first_name text not null,
  last_name text not null,
  email text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  constraint bidders_email_unique unique (email)
);

create index idx_bidders_email on bidders(email);

alter table bidders enable row level security;

-- Anyone can register as a bidder
create policy "Public insert bidders" on bidders for insert with check (true);

-- Bidders can read their own record by email (used by API with service role)
create policy "Public read bidders" on bidders for select using (true);
