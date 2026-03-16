"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/auction-utils";
import { PaymentRow } from "./page";
import { FileText, CheckCircle, RefreshCw } from "lucide-react";

const STATUS_FILTERS = ["all", "none", "draft", "sent", "paid"] as const;
type Filter = (typeof STATUS_FILTERS)[number];

const STATUS_LABELS: Record<string, string> = {
  none: "No Invoice",
  draft: "Draft",
  sent: "Sent",
  paid: "Paid",
};

const STATUS_COLORS: Record<string, string> = {
  none: "bg-stone-100 text-stone-500",
  draft: "bg-amber-50 text-amber-700",
  sent: "bg-blue-50 text-blue-700",
  paid: "bg-emerald-50 text-emerald-700",
};

export default function PaymentsClient({ rows }: { rows: PaymentRow[] }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [rowData, setRowData] = useState<PaymentRow[]>(rows);
  const [actionState, setActionState] = useState<Record<string, { loading: boolean; error: string | null }>>({});

  const filtered = filter === "all" ? rowData : rowData.filter((r) => r.invoiceStatus === filter);

  function setRowAction(auctionId: string, loading: boolean, error: string | null = null) {
    setActionState((prev) => ({ ...prev, [auctionId]: { loading, error } }));
  }

  async function markPaid(row: PaymentRow) {
    setRowAction(row.auctionId, true);
    try {
      const res = await fetch(`/api/auctions/${row.auctionId}/invoice`, { method: "PUT" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to mark paid");

      setRowData((prev) =>
        prev.map((r) =>
          r.auctionId === row.auctionId
            ? { ...r, invoiceStatus: "paid", paidAt: json.invoice.paid_at }
            : r
        )
      );
      setRowAction(row.auctionId, false);
    } catch (e) {
      setRowAction(row.auctionId, false, (e as Error).message);
    }
  }

  const counts = STATUS_FILTERS.reduce<Record<string, number>>((acc, f) => {
    acc[f] = f === "all" ? rowData.length : rowData.filter((r) => r.invoiceStatus === f).length;
    return acc;
  }, {});

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold text-stone-900">Payments</h1>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-stone-100 rounded-md p-1 w-fit">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              filter === f ? "bg-white text-stone-900 shadow-sm" : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {f === "all" ? "All" : STATUS_LABELS[f]}
            <span className={`ml-1.5 text-xs ${filter === f ? "text-stone-500" : "text-stone-400"}`}>
              {counts[f]}
            </span>
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-stone-400 py-12 text-center">No records found.</p>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-xs text-stone-400 uppercase tracking-wider">
                  <th className="text-left px-4 py-3 font-medium">Invoice #</th>
                  <th className="text-left px-4 py-3 font-medium">Property</th>
                  <th className="text-left px-4 py-3 font-medium">Winner</th>
                  <th className="text-left px-4 py-3 font-medium">End Date</th>
                  <th className="text-right px-4 py-3 font-medium">Winning Bid</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Last Sent</th>
                  <th className="text-left px-4 py-3 font-medium">Paid</th>
                  <th className="text-left px-4 py-3 font-medium">Notes</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {filtered.map((row) => {
                  const state = actionState[row.auctionId];
                  const loading = state?.loading ?? false;
                  const error = state?.error ?? null;

                  return (
                    <tr key={row.auctionId} className="hover:bg-stone-50 transition-colors">
                      <td className="px-4 py-3 text-stone-400 font-mono text-xs">
                        {row.invoiceNumber ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <a
                          href={`/admin/auctions/${row.auctionId}`}
                          className="font-medium text-stone-800 hover:text-stone-600"
                        >
                          {row.property}
                        </a>
                      </td>
                      <td className="px-4 py-3">
                        {row.winnerName || row.winnerEmail ? (
                          <div>
                            <p className="text-stone-800 font-medium">{row.winnerName ?? row.winnerEmail}</p>
                            {row.winnerName && (
                              <p className="text-stone-400 text-xs">{row.winnerEmail}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-stone-400">No bids</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-stone-500 whitespace-nowrap">
                        {new Date(row.endTime).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-stone-900 whitespace-nowrap">
                        {row.amount > 0 ? formatCurrency(row.amount) : "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[row.invoiceStatus]}`}>
                          {STATUS_LABELS[row.invoiceStatus]}
                        </span>
                        {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                      </td>
                      <td className="px-4 py-3 text-stone-400 text-xs whitespace-nowrap">
                        {row.sentAt ? new Date(row.sentAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-stone-400 text-xs whitespace-nowrap">
                        {row.paidAt ? new Date(row.paidAt).toLocaleDateString() : "—"}
                      </td>
                      <td className="px-4 py-3 text-stone-500 text-xs max-w-[160px] truncate">
                        {row.notes ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {row.winnerEmail && row.invoiceStatus !== "paid" && (
                            <a
                              href={`/admin/auctions/${row.auctionId}`}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-stone-900 text-white hover:bg-stone-700 transition-colors whitespace-nowrap"
                            >
                              <FileText size={12} />
                              {row.invoiceStatus === "sent" ? "View Invoice" : "Create Invoice"}
                            </a>
                          )}
                          {row.invoiceStatus === "sent" && (
                            <button
                              onClick={() => markPaid(row)}
                              disabled={loading}
                              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors whitespace-nowrap"
                            >
                              {loading ? <RefreshCw size={12} className="animate-spin" /> : <CheckCircle size={12} />}
                              Mark Paid
                            </button>
                          )}
                          {row.invoiceStatus === "paid" && (
                            <span className="text-xs text-emerald-600 font-medium flex items-center gap-1">
                              <CheckCircle size={12} />
                              Paid
                            </span>
                          )}
                          {!row.winnerEmail && (
                            <span className="text-xs text-stone-300">No winner</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
