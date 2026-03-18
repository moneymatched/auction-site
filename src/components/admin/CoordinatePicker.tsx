"use client";

import { APIProvider, Map, AdvancedMarker, MapMouseEvent } from "@vis.gl/react-google-maps";
import { useState } from "react";
import { MapPin } from "lucide-react";

interface CoordinatePickerProps {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}

const DEFAULT_CENTER = { lat: 39.5, lng: -98.35 };
const API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

export default function CoordinatePicker({ lat, lng, onChange }: CoordinatePickerProps) {
  const [marker, setMarker] = useState<{ lat: number; lng: number } | null>(
    lat && lng ? { lat, lng } : null
  );

  function handleMapClick(e: MapMouseEvent) {
    if (!e.detail.latLng) return;
    const newLat = e.detail.latLng.lat;
    const newLng = e.detail.latLng.lng;
    setMarker({ lat: newLat, lng: newLng });
    onChange(newLat, newLng);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 text-xs text-stone-500">
        <MapPin size={13} />
        <span>Click on the map to set the property location</span>
      </div>

      <APIProvider apiKey={API_KEY}>
        <Map
          defaultCenter={marker ?? DEFAULT_CENTER}
          defaultZoom={marker ? 12 : 4}
          mapId="coord-picker"
          gestureHandling="cooperative"
          disableDefaultUI={false}
          onClick={handleMapClick}
          className="w-full rounded-sm border border-stone-300 cursor-crosshair"
          style={{ height: 300 }}
        >
          {marker && (
            <AdvancedMarker position={marker}>
              <div className="w-4 h-4 bg-stone-900 rounded-full border-2 border-white shadow-md" />
            </AdvancedMarker>
          )}
        </Map>
      </APIProvider>

      {/* Manual entry / coordinates display */}
      <div>
        <label className="label">Coordinates</label>
        <input
          type="text"
          value={marker ? `${marker.lat.toFixed(6)}, ${marker.lng.toFixed(6)}` : ""}
          onChange={(e) => {
            const parts = e.target.value.split(",").map((s) => parseFloat(s.trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
              const newMarker = { lat: parts[0], lng: parts[1] };
              setMarker(newMarker);
              onChange(newMarker.lat, newMarker.lng);
            }
          }}
          className="input-field font-mono text-sm"
          placeholder="39.123456, -98.654321"
        />
      </div>
    </div>
  );
}
