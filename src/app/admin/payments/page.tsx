import { unstable_noStore } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import PaymentsClient from "./PaymentsClient";

export const dynamic = "force-dynamic";

export type PaymentRow = {
  auctionId: string;
  invoiceId: string | null;
  invoiceNumber: string | null;
  property: string;
  endTime: string;
  winnerName: string | null;
  winnerEmail: string | null;
  winnerPhone: string | null;
  amount: number;
  invoiceStatus: "none" | "draft" | "sent" | "paid";
  sentAt: string | null;
  paidAt: string | null;
  dueDate: string | null;
  notes: string | null;
};

async function getPaymentsData(): Promise<PaymentRow[]> {
  unstable_noStore();
  const supabase = createSupabaseServiceClient();

  const [{ data: auctions }, { data: invoices }, { data: winnerBids }] = await Promise.all([
    supabase
      .from("auctions")
      .select("id, status, start_time, end_time, current_bid, property:properties(title)")
      .order("end_time", { ascending: false }),
    supabase.from("invoices").select("*"),
    supabase
      .from("bids")
      .select("auction_id, bidder_name, bidder_email, bidder_phone, amount")
      .order("amount", { ascending: false }),
  ]);

  const invoiceMap = new Map(
    (invoices ?? []).map((inv) => [inv.auction_id, inv])
  );

  // Keep only the top bid per auction
  const topBidMap = new Map<string, { bidder_name: string | null; bidder_email: string; bidder_phone: string | null; amount: number }>();
  for (const bid of winnerBids ?? []) {
    if (!topBidMap.has(bid.auction_id)) {
      topBidMap.set(bid.auction_id, bid);
    }
  }

  const ended = (auctions ?? []).filter(
    (a) => getEffectiveAuctionStatus(a as { status: string; start_time: string; end_time: string }) === "ended"
  );

  return ended.map((a) => {
    const property = a.property as unknown as { title: string } | null;
    const inv = invoiceMap.get(a.id);
    const winner = topBidMap.get(a.id);

    return {
      auctionId: a.id,
      invoiceId: inv?.id ?? null,
      invoiceNumber: inv?.invoice_number ?? null,
      property: property?.title ?? "—",
      endTime: a.end_time,
      winnerName: inv?.winner_name ?? winner?.bidder_name ?? null,
      winnerEmail: inv?.winner_email ?? winner?.bidder_email ?? null,
      winnerPhone: inv?.winner_phone ?? winner?.bidder_phone ?? null,
      amount: inv?.amount ?? winner?.amount ?? a.current_bid,
      invoiceStatus: (inv?.status as "draft" | "sent" | "paid") ?? "none",
      sentAt: inv?.sent_at ?? null,
      paidAt: inv?.paid_at ?? null,
      dueDate: inv?.due_date ?? null,
      notes: inv?.notes ?? null,
    };
  });
}

export default async function PaymentsPage() {
  const rows = await getPaymentsData();
  return <PaymentsClient rows={rows} />;
}
