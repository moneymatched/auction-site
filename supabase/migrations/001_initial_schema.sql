-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Properties table
create table properties (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  description text not null default '',
  address text not null default '',
  city text not null default '',
  state text not null default '',
  acreage numeric not null default 0,
  zoning_type text not null default 'Agricultural',
  lat numeric,
  lng numeric,
  created_at timestamptz not null default now()
);

-- Property images table
create table property_images (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete cascade,
  storage_path text not null,
  display_order int not null default 0,
  is_primary boolean not null default false
);

-- Auctions table
create table auctions (
  id uuid primary key default uuid_generate_v4(),
  property_id uuid not null references properties(id) on delete restrict,
  status text not null default 'upcoming' check (status in ('upcoming','live','ended','cancelled')),
  start_time timestamptz not null,
  end_time timestamptz not null,
  starting_bid numeric not null default 0,
  reserve_price numeric,
  current_bid numeric not null default 0,
  bid_count int not null default 0,
  min_bid_increment numeric not null default 100,
  auto_extend_seconds int not null default 300,
  auto_extend_threshold int not null default 120,
  notes text,
  created_at timestamptz not null default now()
);

-- Bids table
create table bids (
  id uuid primary key default uuid_generate_v4(),
  auction_id uuid not null references auctions(id) on delete cascade,
  bidder_name text not null,
  bidder_email text not null,
  bidder_phone text not null,
  amount numeric not null,
  placed_at timestamptz not null default now(),
  ip_address text,
  was_auto_extended boolean not null default false
);

-- Indexes
create index idx_auctions_status on auctions(status);
create index idx_auctions_property_id on auctions(property_id);
create index idx_bids_auction_id on bids(auction_id);
create index idx_bids_placed_at on bids(placed_at desc);
create index idx_property_images_property_id on property_images(property_id);

-- Row Level Security
alter table properties enable row level security;
alter table property_images enable row level security;
alter table auctions enable row level security;
alter table bids enable row level security;

-- Public read access
create policy "Public read properties" on properties for select using (true);
create policy "Public read property_images" on property_images for select using (true);
create policy "Public read auctions" on auctions for select using (true);
create policy "Public read bids" on bids for select using (true);

-- Authenticated write access (admin only via service role in API routes)
create policy "Auth write properties" on properties for all using (auth.role() = 'authenticated');
create policy "Auth write property_images" on property_images for all using (auth.role() = 'authenticated');
create policy "Auth write auctions" on auctions for all using (auth.role() = 'authenticated');
create policy "Auth write bids" on bids for insert using (true); -- anyone can place a bid
create policy "Auth manage bids" on bids for update using (auth.role() = 'authenticated');

-- Enable Realtime for live bidding
alter publication supabase_realtime add table auctions;
alter publication supabase_realtime add table bids;
