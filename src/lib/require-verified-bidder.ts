import { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Ensures the email belongs to a registered bidder with a confirmed email.
 * Returns a JSON error response to send to the client, or null if OK.
 */
export async function requireVerifiedBidderForBid(
  supabase: SupabaseClient,
  email: string
): Promise<NextResponse | null> {
  const normalized = email.trim().toLowerCase();
  const { data: bidder, error } = await supabase
    .from("bidders")
    .select("email_verified_at")
    .eq("email", normalized)
    .maybeSingle();

  if (error || !bidder) {
    return NextResponse.json(
      { error: "Register as a bidder before placing a bid." },
      { status: 403 }
    );
  }

  if (!bidder.email_verified_at) {
    return NextResponse.json(
      {
        error:
          "Please confirm your email before bidding. Check your inbox for the verification link.",
      },
      { status: 403 }
    );
  }

  return null;
}
