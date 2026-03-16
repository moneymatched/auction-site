import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { createSupabaseServiceClient } from "@/lib/supabase";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";

const RESEND_URL = "https://api.resend.com/emails";

type WinnerBid = {
  id: string;
  bidder_name: string | null;
  bidder_email: string;
  bidder_phone: string | null;
  amount: number;
};

type AuctionSummary = {
  id: string;
  status: string;
  start_time: string;
  end_time: string;
  property: {
    title: string;
  } | null;
};

type InvoiceRow = {
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
  status: "draft" | "sent" | "paid";
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  updated_at: string;
};

async function requireAuth() {
  const serverSupabase = await createSupabaseServerClient();
  const {
    data: { session },
  } = await serverSupabase.auth.getSession();

  if (!session) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  return { session };
}

function formatDateKey(dateIso: string): string {
  const d = new Date(dateIso);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function buildInvoiceNumber(auctionId: string, endTime: string): string {
  return `INV-${formatDateKey(endTime)}-${auctionId.slice(0, 6).toUpperCase()}`;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function buildEmailSubject(propertyTitle: string, invoiceNumber: string): string {
  return `Invoice ${invoiceNumber} for ${propertyTitle}`;
}

function buildEmailText(params: {
  propertyTitle: string;
  invoiceNumber: string;
  winnerName: string;
  amount: number;
  dueDate: string | null;
  notes: string | null;
}): string {
  const dueText = params.dueDate ? `Due Date: ${params.dueDate}` : "Due Date: Not specified";
  const notesText = params.notes?.trim() ? `\n\nNotes:\n${params.notes.trim()}` : "";

  return [
    `Hi ${params.winnerName},`,
    "",
    `Congratulations on winning the auction for ${params.propertyTitle}.`,
    `Invoice Number: ${params.invoiceNumber}`,
    `Amount Due: $${params.amount.toLocaleString()}`,
    dueText,
    notesText,
    "",
    "Please reply to this email if you have any questions.",
  ].join("\n");
}

function buildEmailHtml(params: {
  propertyTitle: string;
  invoiceNumber: string;
  winnerName: string;
  amount: number;
  dueDate: string | null;
  notes: string | null;
}): string {
  const safeName = escapeHtml(params.winnerName);
  const safeTitle = escapeHtml(params.propertyTitle);
  const safeNumber = escapeHtml(params.invoiceNumber);
  const safeAmount = `$${params.amount.toLocaleString()}`;
  const safeDue = params.dueDate ? escapeHtml(params.dueDate) : "Not specified";
  const safeNotes = params.notes?.trim()
    ? `<p style="margin:0 0 8px;"><strong>Notes:</strong><br/>${escapeHtml(params.notes.trim()).replace(/\n/g, "<br/>")}</p>`
    : "";

  return `
    <div style="font-family:Arial,sans-serif;line-height:1.5;color:#1f2937;">
      <p>Hi ${safeName},</p>
      <p>Congratulations on winning the auction for <strong>${safeTitle}</strong>.</p>
      <p style="margin:0 0 8px;"><strong>Invoice Number:</strong> ${safeNumber}</p>
      <p style="margin:0 0 8px;"><strong>Amount Due:</strong> ${safeAmount}</p>
      <p style="margin:0 0 8px;"><strong>Due Date:</strong> ${safeDue}</p>
      ${safeNotes}
      <p>Please reply to this email if you have any questions.</p>
    </div>
  `;
}

function buildMailto(params: {
  to: string;
  subject: string;
  textBody: string;
}): string {
  const subject = encodeURIComponent(params.subject);
  const body = encodeURIComponent(params.textBody);
  return `mailto:${params.to}?subject=${subject}&body=${body}`;
}

async function getAuctionAndWinner(auctionId: string): Promise<{
  auction: AuctionSummary | null;
  winner: WinnerBid | null;
}> {
  const supabase = createSupabaseServiceClient();
  const [{ data: auction }, { data: winner }] = await Promise.all([
    supabase
      .from("auctions")
      .select("id, status, start_time, end_time, property:properties(title)")
      .eq("id", auctionId)
      .maybeSingle(),
    supabase
      .from("bids")
      .select("id, bidder_name, bidder_email, bidder_phone, amount")
      .eq("auction_id", auctionId)
      .order("amount", { ascending: false })
      .order("placed_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  return {
    auction: (auction as AuctionSummary | null) ?? null,
    winner: (winner as WinnerBid | null) ?? null,
  };
}

async function upsertInvoice(params: {
  auction: AuctionSummary;
  winner: WinnerBid;
  notes: string | null;
  dueDate: string | null;
}): Promise<InvoiceRow | null> {
  const supabase = createSupabaseServiceClient();

  const { data: existing } = await supabase
    .from("invoices")
    .select("*")
    .eq("auction_id", params.auction.id)
    .maybeSingle();

  const invoiceNumber =
    (existing as InvoiceRow | null)?.invoice_number ??
    buildInvoiceNumber(params.auction.id, params.auction.end_time);
  const nowIso = new Date().toISOString();

  const payload = {
    auction_id: params.auction.id,
    winner_bid_id: params.winner.id,
    invoice_number: invoiceNumber,
    winner_name: params.winner.bidder_name || null,
    winner_email: params.winner.bidder_email,
    winner_phone: params.winner.bidder_phone || null,
    amount: params.winner.amount,
    notes: params.notes,
    due_date: params.dueDate,
    status: (existing as InvoiceRow | null)?.status ?? "draft",
    sent_at: (existing as InvoiceRow | null)?.sent_at ?? null,
    updated_at: nowIso,
  };

  const { data, error } = await supabase
    .from("invoices")
    .upsert(payload, { onConflict: "auction_id" })
    .select("*")
    .single();

  if (error) return null;
  return data as InvoiceRow;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: { notes?: string; due_date?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { auction, winner } = await getAuctionAndWinner(params.id);
  if (!auction) {
    return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  }
  if (getEffectiveAuctionStatus(auction) !== "ended") {
    return NextResponse.json(
      { error: "Invoice can only be created after auction ends" },
      { status: 409 }
    );
  }
  if (!winner) {
    return NextResponse.json({ error: "No winning bid found" }, { status: 409 });
  }

  const notes = body.notes?.trim() ? body.notes.trim() : null;
  const dueDate = body.due_date?.trim() ? body.due_date : null;
  const invoice = await upsertInvoice({ auction, winner, notes, dueDate });

  if (!invoice) {
    return NextResponse.json({ error: "Failed to save invoice" }, { status: 500 });
  }

  return NextResponse.json({ invoice });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  let body: { notes?: string; due_date?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { auction, winner } = await getAuctionAndWinner(params.id);
  if (!auction) {
    return NextResponse.json({ error: "Auction not found" }, { status: 404 });
  }
  if (getEffectiveAuctionStatus(auction) !== "ended") {
    return NextResponse.json(
      { error: "Invoice can only be sent after auction ends" },
      { status: 409 }
    );
  }
  if (!winner) {
    return NextResponse.json({ error: "No winning bid found" }, { status: 409 });
  }

  const notes = body.notes?.trim() ? body.notes.trim() : null;
  const dueDate = body.due_date?.trim() ? body.due_date : null;
  const invoice = await upsertInvoice({ auction, winner, notes, dueDate });

  if (!invoice) {
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }

  const propertyTitle = auction.property?.title ?? "Auction Property";
  const winnerName = winner.bidder_name?.trim() || "Bidder";
  const subject = buildEmailSubject(propertyTitle, invoice.invoice_number);
  const textBody = buildEmailText({
    propertyTitle,
    invoiceNumber: invoice.invoice_number,
    winnerName,
    amount: invoice.amount,
    dueDate: invoice.due_date,
    notes: invoice.notes,
  });
  const htmlBody = buildEmailHtml({
    propertyTitle,
    invoiceNumber: invoice.invoice_number,
    winnerName,
    amount: invoice.amount,
    dueDate: invoice.due_date,
    notes: invoice.notes,
  });

  const resendApiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.INVOICE_FROM_EMAIL || "invoice@acrebid.com";

  if (!resendApiKey || !fromEmail) {
    return NextResponse.json({
      success: true,
      delivery: "mailto",
      invoice,
      mailto_url: buildMailto({
        to: invoice.winner_email,
        subject,
        textBody,
      }),
      warning:
        "Email provider not configured. Set RESEND_API_KEY and INVOICE_FROM_EMAIL to send directly from this app.",
    });
  }

  const resendRes = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [invoice.winner_email],
      subject,
      html: htmlBody,
      text: textBody,
    }),
  });

  if (!resendRes.ok) {
    const errorText = await resendRes.text();
    return NextResponse.json(
      {
        error: "Failed to send invoice email",
        details: errorText,
      },
      { status: 502 }
    );
  }

  const supabase = createSupabaseServiceClient();
  const { data: sentInvoice, error: sentUpdateError } = await supabase
    .from("invoices")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", invoice.id)
    .select("*")
    .single();

  if (sentUpdateError) {
    return NextResponse.json(
      { error: "Invoice email sent but status update failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    delivery: "resend",
    invoice: sentInvoice,
  });
}

export async function PUT(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const supabase = createSupabaseServiceClient();
  const { data, error } = await supabase
    .from("invoices")
    .update({
      status: "paid",
      paid_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("auction_id", params.id)
    .select("*")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to mark as paid" }, { status: 500 });
  }

  return NextResponse.json({ invoice: data });
}
