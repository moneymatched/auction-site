export type AuctionStatus = "upcoming" | "live" | "ended" | "cancelled";

export interface Property {
  id: string;
  title: string;
  description: string;
  address: string;
  city: string;
  state: string;
  acreage: number;
  zoning_type: string;
  lat: number;
  lng: number;
  created_at: string;
  images?: PropertyImage[];
}

export interface PropertyImage {
  id: string;
  property_id: string;
  storage_path: string;
  display_order: number;
  is_primary: boolean;
}

export interface Auction {
  id: string;
  property_id: string;
  status: AuctionStatus;
  start_time: string;
  end_time: string;
  starting_bid: number;
  reserve_price: number | null;
  current_bid: number;
  bid_count: number;
  min_bid_increment: number;
  auto_extend_seconds: number;
  auto_extend_threshold: number;
  notes: string | null;
  created_at: string;
  property?: Property;
}

export interface Bidder {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  created_at: string;
}

export interface Bid {
  id: string;
  auction_id: string;
  bidder_name: string | null;
  bidder_email: string;
  bidder_phone: string | null;
  amount: number;
  placed_at: string;
  ip_address: string | null;
  was_auto_extended: boolean;
}

export type InvoiceStatus = "draft" | "sent" | "paid";

export interface Invoice {
  id: string;
  auction_id: string;
  winner_bid_id: string | null;
  invoice_number: string;
  winner_name: string | null;
  winner_email: string;
  winner_phone: string | null;
  amount: number;
  notes: string | null;
  due_date: string | null;
  status: InvoiceStatus;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
}
