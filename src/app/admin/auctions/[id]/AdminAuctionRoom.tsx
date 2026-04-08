"use client";

import { useState, useEffect, useRef } from "react";
import { Auction, Bid, Invoice, InvoiceAttachment, Property } from "@/types";
import { createSupabaseBrowserClient } from "@/lib/supabase";
import { formatCurrency, getStatusColor, getStatusLabel } from "@/lib/auction-utils";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import CountdownTimer from "@/components/CountdownTimer";
import AuctionForm from "../AuctionForm";
import {
  Download,
  Radio,
  Square,
  Plus,
  Clock,
  Trophy,
  Eye,
  ChevronDown,
  ChevronUp,
  Save,
  Mail,
  FileText,
  Upload,
  Link2,
  Trash2,
} from "lucide-react";

interface AdminAuctionRoomProps {
  auction: Auction;
  bids: Bid[];
  properties: Property[];
  invoice: Invoice | null;
  invoiceAttachments: InvoiceAttachment[];
}

export default function AdminAuctionRoom({
  auction: initialAuction,
  bids: initialBids,
  properties,
  invoice: initialInvoice,
  invoiceAttachments: initialInvoiceAttachments,
}: AdminAuctionRoomProps) {
  const [auction, setAuction] = useState(initialAuction);
  const [bids, setBids] = useState(initialBids);
  const [saving, setSaving] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [confirmingEnd, setConfirmingEnd] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(initialInvoice);
  const [invoiceNotes, setInvoiceNotes] = useState(initialInvoice?.notes ?? "");
  const [invoiceDueDate, setInvoiceDueDate] = useState(initialInvoice?.due_date ?? "");
  const [invoiceSaving, setInvoiceSaving] = useState(false);
  const [invoiceSending, setInvoiceSending] = useState(false);
  const [invoiceUploading, setInvoiceUploading] = useState(false);
  const [invoiceAttachments, setInvoiceAttachments] = useState<InvoiceAttachment[]>(initialInvoiceAttachments);
  const [invoiceError, setInvoiceError] = useState<string | null>(null);
  const [invoiceMessage, setInvoiceMessage] = useState<string | null>(null);
  const attachmentInputRef = useRef<HTMLInputElement>(null);

  // Realtime subscription
  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    const channel = supabase
      .channel(`admin-auction:${auction.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "auctions", filter: `id=eq.${auction.id}` },
        (payload) => setAuction((prev) => ({ ...prev, ...(payload.new as Auction) }))
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bids", filter: `auction_id=eq.${auction.id}` },
        (payload) => setBids((prev) => [payload.new as Bid, ...prev])
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [auction.id]);

  async function updateStatus(status: string) {
    setSaving(true);
    const res = await fetch(`/api/auctions/${auction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) setAuction((prev) => ({ ...prev, status: status as Auction["status"] }));
    setSaving(false);
  }

  async function extendTime(extraSeconds: number) {
    setSaving(true);
    const newEnd = new Date(new Date(auction.end_time).getTime() + extraSeconds * 1000).toISOString();
    const res = await fetch(`/api/auctions/${auction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ end_time: newEnd }),
    });
    if (res.ok) setAuction((prev) => ({ ...prev, end_time: newEnd }));
    setSaving(false);
  }

  function exportCSV() {
    const header = "Bidder Name,Email,Phone,Amount,Time,Extended Timer\n";
    const rows = [...bids]
      .reverse()
      .map((b) =>
        [b.bidder_name, b.bidder_email, b.bidder_phone, b.amount, b.placed_at, b.was_auto_extended ? "Yes" : "No"]
          .map((v) => `"${String(v ?? "").replace(/"/g, '""').replace(/[\r\n]+/g, " ")}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bids-${auction.id.slice(0, 8)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const winner = bids.reduce<Bid | null>((current, candidate) => {
    if (!current) return candidate;
    if (candidate.amount > current.amount) return candidate;
    if (candidate.amount < current.amount) return current;
    return new Date(candidate.placed_at) > new Date(current.placed_at) ? candidate : current;
  }, null);
  const property = auction.property!;
  const effectiveStatus = getEffectiveAuctionStatus(auction);
  const buyerPremiumRate = Math.max(0, Number(property.buyer_premium ?? 0));
  const docFee = Math.max(0, Number(property.doc_fee ?? 0));
  const hammerPrice = Math.max(0, Number(winner?.amount ?? 0));
  const buyerPremiumAmount = Math.round(hammerPrice * (buyerPremiumRate / 100) * 100) / 100;
  const computedTotalDue = Math.round((hammerPrice + buyerPremiumAmount + docFee) * 100) / 100;
  const earnestMoneyDeposit = Math.round(computedTotalDue * 0.1 * 100) / 100;
  const amountDue = invoice?.amount ?? computedTotalDue;

  function formatFileSize(value: number | null): string {
    if (!value || value < 1024) return `${value ?? 0} B`;
    if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
    return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function saveInvoiceDraft() {
    setInvoiceSaving(true);
    setInvoiceError(null);
    setInvoiceMessage(null);
    const res = await fetch(`/api/auctions/${auction.id}/invoice`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: invoiceNotes,
        due_date: invoiceDueDate || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setInvoiceError(data.error || "Failed to save invoice draft");
      setInvoiceSaving(false);
      return;
    }
    setInvoice(data.invoice as Invoice);
    if (Array.isArray(data.attachments)) {
      setInvoiceAttachments(data.attachments as InvoiceAttachment[]);
    }
    setInvoiceMessage("Invoice draft saved.");
    setInvoiceSaving(false);
  }

  async function sendInvoice() {
    setInvoiceSending(true);
    setInvoiceError(null);
    setInvoiceMessage(null);
    const res = await fetch(`/api/auctions/${auction.id}/invoice`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: invoiceNotes,
        due_date: invoiceDueDate || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detailedError =
        typeof data.details === "string" && data.details.trim()
          ? `${data.error || "Failed to send invoice"}: ${data.details}`
          : data.error || "Failed to send invoice";
      setInvoiceError(detailedError);
      setInvoiceSending(false);
      return;
    }

    setInvoice(data.invoice as Invoice);
    if (Array.isArray(data.attachments)) {
      setInvoiceAttachments(data.attachments as InvoiceAttachment[]);
    }
    if (data.delivery === "mailto" && data.mailto_url) {
      setInvoiceMessage(
        data.warning || "Opening your default email app with the invoice details pre-filled."
      );
      const a = document.createElement("a");
      a.href = data.mailto_url as string;
      a.click();
    } else {
      setInvoiceMessage("Invoice email sent to winner.");
    }
    setInvoiceSending(false);
  }

  async function ensureInvoiceExists(): Promise<Invoice | null> {
    if (invoice) return invoice;
    const res = await fetch(`/api/auctions/${auction.id}/invoice`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        notes: invoiceNotes,
        due_date: invoiceDueDate || null,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setInvoiceError(data.error || "Save draft before uploading files");
      return null;
    }
    const newInvoice = data.invoice as Invoice;
    setInvoice(newInvoice);
    if (Array.isArray(data.attachments)) {
      setInvoiceAttachments(data.attachments as InvoiceAttachment[]);
    }
    return newInvoice;
  }

  async function uploadInvoiceAttachment(file: File) {
    setInvoiceError(null);
    setInvoiceMessage(null);
    setInvoiceUploading(true);

    const inv = await ensureInvoiceExists();
    if (!inv) {
      setInvoiceUploading(false);
      return;
    }

    const formData = new FormData();
    formData.set("file", file);

    const res = await fetch(`/api/invoices/${inv.id}/attachments`, {
      method: "POST",
      body: formData,
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setInvoiceError(data.error || "Failed to upload attachment");
      setInvoiceUploading(false);
      return;
    }

    setInvoiceAttachments((prev) => [...prev, data as InvoiceAttachment]);
    setInvoiceMessage("Attachment uploaded.");
    setInvoiceUploading(false);
  }

  async function removeInvoiceAttachment(attachmentId: string) {
    if (!invoice) return;
    setInvoiceError(null);
    setInvoiceMessage(null);
    const res = await fetch(`/api/invoices/${invoice.id}/attachments/${attachmentId}`, {
      method: "DELETE",
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setInvoiceError(data.error || "Failed to delete attachment");
      return;
    }
    setInvoiceAttachments((prev) => prev.filter((item) => item.id !== attachmentId));
    setInvoiceMessage("Attachment removed.");
  }

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-stone-900">{property.title}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className={`status-badge ${getStatusColor(effectiveStatus)}`}>
              {effectiveStatus === "live" && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />}
              {getStatusLabel(effectiveStatus)}
            </span>
            <span className="text-sm text-stone-400">{auction.bid_count} bids</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/auctions/${auction.id}`} target="_blank" className="btn-ghost text-sm">
            <Eye size={14} />
            Public View
          </a>
          <button onClick={exportCSV} className="btn-secondary text-sm">
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Control panel */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Current bid */}
        <div className="card p-5">
          <p className="text-xs text-stone-400 mb-1">Current Bid</p>
          <p className="text-2xl font-semibold text-stone-900">
            {formatCurrency(auction.current_bid > 0 ? auction.current_bid : auction.starting_bid)}
          </p>
        </div>

        {/* Timer */}
        <div className="card p-5">
          <p className="text-xs text-stone-400 mb-2">Time Remaining</p>
          <CountdownTimer endTime={auction.end_time} status={effectiveStatus} size="md" />
        </div>

        {/* Actions */}
        <div className="card p-5 space-y-2">
          <p className="text-xs text-stone-400 mb-1">Controls</p>
          {effectiveStatus !== "live" && (
            <button
              onClick={() => updateStatus("live")}
              disabled={saving}
              className="btn-primary w-full text-sm bg-emerald-600 hover:bg-emerald-700"
            >
              <Radio size={14} />
              Go Live
            </button>
          )}
          {effectiveStatus === "live" && !confirmingEnd && (
            <button
              onClick={() => setConfirmingEnd(true)}
              disabled={saving}
              className="btn-secondary w-full text-sm text-red-600 border-red-200 hover:bg-red-50"
            >
              <Square size={14} />
              End Auction
            </button>
          )}
          {effectiveStatus === "live" && confirmingEnd && (
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmingEnd(false); updateStatus("ended"); }}
                disabled={saving}
                className="btn-secondary flex-1 text-sm text-red-600 border-red-300 bg-red-50 hover:bg-red-100"
              >
                Confirm End
              </button>
              <button
                onClick={() => setConfirmingEnd(false)}
                disabled={saving}
                className="btn-ghost text-sm flex-1"
              >
                Cancel
              </button>
            </div>
          )}
          <div className="flex gap-2">
            {[5, 10, 30].map((min) => (
              <button
                key={min}
                onClick={() => extendTime(min * 60)}
                disabled={saving}
                className="btn-ghost text-xs flex-1"
              >
                <Plus size={11} />+{min}m
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Winner highlight */}
      {winner && (effectiveStatus === "ended" || effectiveStatus === "live") && (
        <div className={`card p-5 ${effectiveStatus === "ended" ? "border-emerald-200 bg-emerald-50" : "border-stone-200"}`}>
          <div className="flex items-center gap-2 mb-3">
            <Trophy size={16} className={effectiveStatus === "ended" ? "text-emerald-600" : "text-stone-400"} />
            <h2 className="text-sm font-semibold text-stone-900">
              {effectiveStatus === "ended" ? "Winner" : "Highest Bidder"}
            </h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {winner.bidder_name && (
              <div>
                <p className="text-xs text-stone-400">Name</p>
                <p className="text-sm font-medium text-stone-900">{winner.bidder_name}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-stone-400">Email</p>
              <p className="text-sm font-medium text-stone-900">{winner.bidder_email}</p>
            </div>
            {winner.bidder_phone && (
              <div>
                <p className="text-xs text-stone-400">Phone</p>
                <p className="text-sm font-medium text-stone-900">{winner.bidder_phone}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-stone-400">Winning Bid</p>
              <p className="text-sm font-semibold text-emerald-700">{formatCurrency(winner.amount)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Invoice panel */}
      {winner && effectiveStatus === "ended" && (
        <div className="card p-5 space-y-4">
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-stone-500" />
            <h2 className="text-sm font-semibold text-stone-900">Winner Invoice</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-stone-400">Invoice Number</p>
              <p className="text-sm font-medium text-stone-900">
                {invoice?.invoice_number || "Will be generated when saved"}
              </p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Winner Email</p>
              <p className="text-sm font-medium text-stone-900">{winner.bidder_email}</p>
            </div>
            <div>
              <p className="text-xs text-stone-400">Amount Due</p>
              <p className="text-sm font-semibold text-emerald-700">
                {formatCurrency(amountDue)}
              </p>
            </div>
          </div>

          <div className="rounded-lg border border-stone-200 bg-stone-50 p-4">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide">Invoice Breakdown</p>
            <div className="mt-2 space-y-2 text-sm">
              <div className="flex items-center justify-between text-stone-700">
                <span>Winning Bid (Hammer Price)</span>
                <span className="font-medium">{formatCurrency(hammerPrice)}</span>
              </div>
              <div className="flex items-center justify-between text-stone-700">
                <span>Buyer&apos;s Premium ({buyerPremiumRate}%)</span>
                <span className="font-medium">{formatCurrency(buyerPremiumAmount)}</span>
              </div>
              <div className="flex items-center justify-between text-stone-700">
                <span>Documentation Fee</span>
                <span className="font-medium">{formatCurrency(docFee)}</span>
              </div>
              <div className="border-t border-stone-200 pt-2 flex items-center justify-between text-stone-900">
                <span className="font-semibold">Total Amount Due</span>
                <span className="font-semibold text-emerald-700">{formatCurrency(amountDue)}</span>
              </div>
              <div className="flex items-center justify-between text-stone-600">
                <span>Earnest Money Deposit (10%, due in 24 hours)</span>
                <span className="font-medium">{formatCurrency(earnestMoneyDeposit)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="invoice-due-date" className="label">Due date</label>
              <input
                id="invoice-due-date"
                type="date"
                className="input-field"
                value={invoiceDueDate}
                onChange={(e) => setInvoiceDueDate(e.target.value)}
              />
            </div>
            <div>
              <p className="text-xs text-stone-400">Invoice Status</p>
              <p className="text-sm font-medium text-stone-900">
                {invoice?.status === "paid"
                  ? `Paid${invoice.paid_at ? ` on ${new Date(invoice.paid_at).toLocaleString()}` : ""}`
                  : invoice?.status === "sent"
                  ? `Sent${invoice.sent_at ? ` on ${new Date(invoice.sent_at).toLocaleString()}` : ""}`
                  : "Draft"}
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="invoice-notes" className="label">Notes to include in invoice email</label>
            <textarea
              id="invoice-notes"
              className="input-field min-h-28"
              placeholder="Add payment instructions, pickup details, or any winner notes."
              value={invoiceNotes}
              onChange={(e) => setInvoiceNotes(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="label">Supporting documents</label>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => attachmentInputRef.current?.click()}
                disabled={invoiceSaving || invoiceSending || invoiceUploading}
                className="btn-secondary text-sm"
              >
                <Upload size={14} />
                {invoiceUploading ? "Uploading..." : "Upload Document"}
              </button>
              <p className="text-xs text-stone-500">
                Upload wire instructions or related docs (max 15MB).
              </p>
            </div>
            <input
              ref={attachmentInputRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  uploadInvoiceAttachment(file);
                }
                e.currentTarget.value = "";
              }}
            />

            {invoiceAttachments.length > 0 && (
              <div className="space-y-1 rounded-md border border-stone-200 bg-stone-50 p-3">
                {invoiceAttachments.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-2 text-sm">
                    <a
                      href={item.public_url || "#"}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-stone-700 hover:text-stone-900 underline"
                    >
                      <Link2 size={13} />
                      {item.file_name}
                    </a>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-stone-500">{formatFileSize(item.size_bytes)}</span>
                      <button
                        type="button"
                        onClick={() => removeInvoiceAttachment(item.id)}
                        className="text-red-600 hover:text-red-700"
                        title="Remove attachment"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {(invoiceError || invoiceMessage) && (
            <p className={`text-sm ${invoiceError ? "text-red-600" : "text-emerald-700"}`}>
              {invoiceError || invoiceMessage}
            </p>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              onClick={saveInvoiceDraft}
              disabled={invoiceSaving || invoiceSending}
              className="btn-secondary text-sm"
            >
              <Save size={14} />
              {invoiceSaving ? "Saving..." : "Save Draft"}
            </button>
            <button
              onClick={sendInvoice}
              disabled={invoiceSaving || invoiceSending}
              className="btn-primary text-sm"
            >
              <Mail size={14} />
              {invoiceSending ? "Sending..." : "Email Invoice to Winner"}
            </button>
          </div>
        </div>
      )}

      {/* Bid history */}
      <div className="card">
        <div className="flex items-center justify-between p-5 border-b border-stone-100">
          <h2 className="text-sm font-semibold text-stone-900">
            All Bids <span className="text-stone-400 font-normal">({bids.length})</span>
          </h2>
          <div className="flex items-center gap-1 text-xs text-stone-400">
            <Clock size={12} />
            Live updates
          </div>
        </div>

        {bids.length === 0 ? (
          <p className="p-5 text-sm text-stone-400">No bids yet.</p>
        ) : (
          <div className="divide-y divide-stone-50 max-h-96 overflow-y-auto">
            {bids.map((bid, idx) => (
              <div
                key={bid.id}
                className={`grid grid-cols-5 gap-3 px-5 py-3 text-sm ${idx === 0 ? "bg-emerald-50/50" : ""}`}
              >
                <div className="col-span-2">
                  <p className={`font-medium ${idx === 0 ? "text-emerald-700" : "text-stone-800"}`}>
                    {bid.bidder_name || bid.bidder_email}
                    {idx === 0 && <span className="ml-1 text-xs text-emerald-500">★</span>}
                  </p>
                  {bid.bidder_name && <p className="text-xs text-stone-400">{bid.bidder_email}</p>}
                  {bid.bidder_phone && <p className="text-xs text-stone-400">{bid.bidder_phone}</p>}
                </div>
                <div>
                  <p className={`font-semibold ${idx === 0 ? "text-emerald-700" : "text-stone-700"}`}>
                    {formatCurrency(bid.amount)}
                  </p>
                </div>
                <div className="text-xs text-stone-400 col-span-2">
                  <p>{new Date(bid.placed_at).toLocaleString()}</p>
                  {bid.was_auto_extended && (
                    <p className="text-amber-600">Extended timer</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Edit auction section */}
      <div className="card">
        <button
          onClick={() => setShowEdit(!showEdit)}
          className="w-full flex items-center justify-between p-5 text-sm font-semibold text-stone-900 hover:bg-stone-50 transition-colors"
        >
          Edit Auction Settings
          {showEdit ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {showEdit && (
          <div className="p-5 border-t border-stone-100">
            <AuctionForm properties={properties} auction={auction} />
          </div>
        )}
      </div>
    </div>
  );
}
