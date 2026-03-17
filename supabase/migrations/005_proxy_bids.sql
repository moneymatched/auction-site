-- Add is_proxy flag to bids so auto-proxy bids are distinguishable
alter table bids add column is_proxy boolean not null default false;

-- Proxy bids: store a bidder's maximum willingness-to-pay per auction.
-- The system auto-bids on their behalf up to this amount.
create table proxy_bids (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid not null references auctions(id) on delete cascade,
  bidder_email text not null,
  bidder_name text not null default '',
  bidder_phone text not null default '',
  max_amount numeric not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint proxy_bids_unique_bidder_auction unique (auction_id, bidder_email)
);

create index idx_proxy_bids_auction_id on proxy_bids(auction_id);
