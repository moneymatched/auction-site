"use client";

import { APIProvider, Map, AdvancedMarker, InfoWindow } from "@vis.gl/react-google-maps";
import { useState } from "react";
import { Auction } from "@/types";
import { formatCurrency, getStatusColor } from "@/lib/auction-utils";
import Link from "next/link";
import { getImageUrl } from "@/lib/supabase";
import Image from "next/image";

interface PropertyMapProps {
  auctions: Auction[];
  singleProperty?: boolean;
  lat?: number;
  lng?: number;
}

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 }; // Center of US
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function PropertyMap({
  auctions,
  singleProperty,
  lat,
  lng,
}: PropertyMapProps) {
  const [selected, setSelected] = useState<string | null>(null);

  const mappable = auctions.filter(
    (a) => a.property?.lat && a.property?.lng
  );

  const center =
    singleProperty && lat && lng
      ? { lat, lng }
      : mappable.length > 0
      ? { lat: mappable[0].property!.lat, lng: mappable[0].property!.lng }
      : DEFAULT_CENTER;

  return (
    <APIProvider apiKey={API_KEY}>
      <Map
        defaultCenter={center}
        defaultZoom={singleProperty ? 13 : mappable.length === 1 ? 12 : 5}
        mapId="auction-map"
        gestureHandling="cooperative"
        disableDefaultUI={false}
        className="w-full h-full rounded-sm"
        style={{ minHeight: 400 }}
      >
        {mappable.map((auction) => {
          const prop = auction.property!;
          const primaryImg = prop.images?.find((i) => i.is_primary) ?? prop.images?.[0];
          const selectedAuction = selected === auction.id ? auction : null;

          return (
            <AdvancedMarker
              key={auction.id}
              position={{ lat: prop.lat, lng: prop.lng }}
              onClick={() => setSelected(selected === auction.id ? null : auction.id)}
            >
              {/* Custom marker pin */}
              <div className={`relative flex flex-col items-center cursor-pointer`}>
                <div
                  className={`px-2 py-1 rounded-sm text-xs font-semibold shadow-md whitespace-nowrap border ${
                    auction.status === "live"
                      ? "bg-emerald-600 text-white border-emerald-700"
                      : "bg-white text-stone-800 border-stone-300"
                  }`}
                >
                  {formatCurrency(auction.current_bid > 0 ? auction.current_bid : auction.starting_bid)}
                </div>
                <div
                  className={`w-2 h-2 rotate-45 mt-[-4px] ${
                    auction.status === "live" ? "bg-emerald-600" : "bg-white border border-stone-300"
                  }`}
                />
              </div>

              {selectedAuction && (
                <InfoWindow
                  position={{ lat: prop.lat, lng: prop.lng }}
                  onCloseClick={() => setSelected(null)}
                  headerDisabled
                >
                  <Link
                    href={`/auctions/${auction.id}`}
                    className="block w-52 -m-2 hover:opacity-90 transition-opacity"
                  >
                    {primaryImg && (
                      <div className="relative h-28 mb-2 overflow-hidden rounded-sm">
                        <Image
                          src={getImageUrl(primaryImg.storage_path)}
                          alt={prop.title}
                          fill
                          className="object-cover"
                          sizes="200px"
                        />
                      </div>
                    )}
                    <p className="font-semibold text-stone-900 text-sm leading-snug">{prop.title}</p>
                    <p className="text-xs text-stone-500 mt-0.5">{prop.city}, {prop.state}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-bold text-stone-900">
                        {formatCurrency(auction.current_bid > 0 ? auction.current_bid : auction.starting_bid)}
                      </span>
                      <span className={`status-badge text-xs ${getStatusColor(auction.status)}`}>
                        {auction.status}
                      </span>
                    </div>
                  </Link>
                </InfoWindow>
              )}
            </AdvancedMarker>
          );
        })}
      </Map>
    </APIProvider>
  );
}
