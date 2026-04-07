-- Login tokens for magic-link authentication
alter table bidders add column if not exists login_token text;
alter table bidders add column if not exists login_token_expires_at timestamptz;

-- Watchlist: bidders can save auctions they want to follow
create table if not exists watchlist (
  id uuid primary key default gen_random_uuid(),
  bidder_email text not null,
  auction_id uuid not null references auctions(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(bidder_email, auction_id)
);

-- Allow public read/write (API routes use service role)
alter table watchlist enable row level security;
create policy "Public read watchlist" on watchlist for select using (true);
create policy "Public insert watchlist" on watchlist for insert with check (true);
create policy "Public delete watchlist" on watchlist for delete using (true);
