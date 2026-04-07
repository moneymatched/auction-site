import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServiceClient } from "@/lib/supabase";

// GET /api/watchlist?email=...
export async function GET(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { data, error } = await supabase
    .from("watchlist")
    .select("auction_id, created_at")
    .eq("bidder_email", email)
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: "Failed to load watchlist" }, { status: 500 });
  }

  if (!data?.length) {
    return NextResponse.json({ auction_ids: [] });
  }

  // Fetch full auction data with properties
  const auctionIds = data.map((w) => w.auction_id);
  const { data: auctions } = await supabase
    .from("auctions")
    .select("*, property:properties(*, images:property_images(*))")
    .in("id", auctionIds);

  return NextResponse.json({ auctions: auctions ?? [] });
}

// POST /api/watchlist  { email, auction_id }
export async function POST(req: NextRequest) {
  const supabase = createSupabaseServiceClient();

  let body: { email: string; auction_id: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  const auctionId = body.auction_id?.trim();
  if (!email || !auctionId) {
    return NextResponse.json({ error: "email and auction_id are required" }, { status: 400 });
  }

  const { error } = await supabase
    .from("watchlist")
    .upsert({ bidder_email: email, auction_id: auctionId }, { onConflict: "bidder_email,auction_id" });

  if (error) {
    return NextResponse.json({ error: "Failed to add to watchlist" }, { status: 500 });
  }

  return NextResponse.json({ added: true });
}

// DELETE /api/watchlist?email=...&auction_id=...
export async function DELETE(req: NextRequest) {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase();
  const auctionId = req.nextUrl.searchParams.get("auction_id")?.trim();
  if (!email || !auctionId) {
    return NextResponse.json({ error: "email and auction_id are required" }, { status: 400 });
  }

  const supabase = createSupabaseServiceClient();

  const { error } = await supabase
    .from("watchlist")
    .delete()
    .eq("bidder_email", email)
    .eq("auction_id", auctionId);

  if (error) {
    return NextResponse.json({ error: "Failed to remove from watchlist" }, { status: 500 });
  }

  return NextResponse.json({ removed: true });
}
