import Link from "next/link";
import { unstable_noStore } from "next/cache";
import { createSupabaseServiceClient } from "@/lib/supabase";
import AuctionCard from "@/components/AuctionCard";
import { Auction } from "@/types";
import { getEffectiveAuctionStatus } from "@/lib/auction-status";
import { ArrowRight, MapPin, Gavel, Trophy } from "lucide-react";

async function getLiveAuctions(): Promise<Auction[]> {
  unstable_noStore();
  const supabase = createSupabaseServiceClient();
  const { data } = await supabase
    .from("auctions")
    .select(`*, property:properties(*, images:property_images(*))`)
    .neq("status", "cancelled")
    .order("end_time", { ascending: true });

  const auctions = ((data as Auction[]) ?? [])
    .map((auction) => ({
      ...auction,
      status: getEffectiveAuctionStatus(auction),
    }))
    .filter((auction) => auction.status === "live" || auction.status === "upcoming")
    .slice(0, 3);

  return auctions;
}

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const auctions = await getLiveAuctions();

  return (
    <main>
      {/* Hero — extends behind nav via negative margin */}
      <section className="relative bg-stone-900 text-white overflow-hidden min-h-screen -mt-16 pt-16">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url(/hero-bg.png)" }}
        />
        <div className="absolute inset-0 bg-gradient-to-br from-stone-900/80 via-stone-800/70 to-stone-700/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-44">
          <div className="max-w-2xl">
            <p className="text-stone-400 text-sm font-medium uppercase tracking-widest mb-4">
              Live Land Auctions
            </p>
            <h1 className="text-5xl lg:text-7xl font-light leading-tight mb-6">
              Bid on Land.
            </h1>
            <p className="text-stone-300 text-lg mb-10 leading-relaxed max-w-lg">
              Transparent, real-time online auctions. Browse properties, place bids, and secure land — all from your device.
            </p>
            <div className="flex items-center gap-4 flex-wrap">
              <Link href="/auctions" className="inline-flex items-center gap-2 px-7 py-3 bg-transparent border border-white text-white text-base font-medium rounded-sm hover:bg-white/10 transition-colors">
                Browse Auctions
                <ArrowRight size={18} />
              </Link>
              <Link href="/auctions?view=map" className="inline-flex items-center gap-2 px-7 py-3 bg-transparent border border-white text-white text-base font-medium rounded-sm hover:bg-white/10 transition-colors">
                <MapPin size={18} />
                View on Map
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-white border-b border-stone-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <h2 className="text-2xl font-semibold text-stone-900 mb-12 text-center">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            {[
              {
                icon: <MapPin size={28} className="text-stone-700" />,
                step: "01",
                title: "Browse Properties",
                desc: "Explore listings in grid or map view. Each auction includes photos, acreage, location, and zoning details.",
              },
              {
                icon: <Gavel size={28} className="text-stone-700" />,
                step: "02",
                title: "Place Your Bid",
                desc: "Enter your bid amount and contact info. No account needed. Bids are validated in real time.",
              },
              {
                icon: <Trophy size={28} className="text-stone-700" />,
                step: "03",
                title: "Win & Close",
                desc: "The highest bidder when the timer ends wins. We'll contact you directly to complete the sale offline.",
              },
            ].map((item) => (
              <div key={item.step} className="flex flex-col items-start gap-4">
                <div className="flex items-center gap-3">
                  <span className="text-xs font-mono text-stone-300">{item.step}</span>
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-stone-900 mb-1">{item.title}</h3>
                  <p className="text-stone-500 text-sm leading-relaxed">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live auctions preview */}
      {auctions.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-semibold text-stone-900">
              {auctions.some((a) => a.status === "live") ? "Live Now" : "Upcoming Auctions"}
            </h2>
            <Link href="/auctions" className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-900 transition-colors">
              View all <ArrowRight size={14} />
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {auctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        </section>
      )}

      {auctions.length === 0 && (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 text-center">
          <div className="max-w-sm mx-auto">
            <Gavel size={40} className="mx-auto text-stone-300 mb-4" />
            <h2 className="text-xl font-semibold text-stone-700 mb-2">No Active Auctions</h2>
            <p className="text-stone-400 text-sm">Check back soon — new listings coming.</p>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="border-t border-stone-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span className="text-sm font-semibold text-stone-900">Going Going Gobbi</span>
          <p className="text-xs text-stone-400">
            Payments handled offline. All sales subject to seller approval.
          </p>
        </div>
      </footer>
    </main>
  );
}
