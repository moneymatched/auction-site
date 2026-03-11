"use client";

import { useState } from "react";
import Image from "next/image";
import { PropertyImage } from "@/types";
import { getImageUrl } from "@/lib/supabase";
import { ChevronLeft, ChevronRight, X, Maximize2 } from "lucide-react";

interface ImageGalleryProps {
  images: PropertyImage[];
  title: string;
}

export default function ImageGallery({ images, title }: ImageGalleryProps) {
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const sorted = [...images].sort((a, b) => {
    if (a.is_primary) return -1;
    if (b.is_primary) return 1;
    return a.display_order - b.display_order;
  });

  if (sorted.length === 0) {
    return (
      <div className="aspect-[16/9] bg-stone-100 flex items-center justify-center rounded-sm">
        <div className="text-center text-stone-300">
          <Maximize2 size={40} className="mx-auto mb-2" />
          <p className="text-sm">No images</p>
        </div>
      </div>
    );
  }

  const prev = () => setCurrent((c) => (c - 1 + sorted.length) % sorted.length);
  const next = () => setCurrent((c) => (c + 1) % sorted.length);

  return (
    <>
      {/* Main gallery */}
      <div className="space-y-2">
        <div className="relative aspect-[16/9] bg-stone-100 rounded-sm overflow-hidden cursor-pointer group"
          onClick={() => setLightbox(true)}>
          <Image
            src={getImageUrl(sorted[current].storage_path)}
            alt={`${title} — photo ${current + 1}`}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 60vw"
            priority={current === 0}
          />
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
          <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/50 text-white text-xs rounded-sm opacity-0 group-hover:opacity-100 transition-opacity">
            View full size
          </div>

          {sorted.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors"
              >
                <ChevronRight size={16} />
              </button>
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                {sorted.map((_, i) => (
                  <button
                    key={i}
                    onClick={(e) => { e.stopPropagation(); setCurrent(i); }}
                    className={`w-1.5 h-1.5 rounded-full transition-colors ${
                      i === current ? "bg-white" : "bg-white/50"
                    }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Thumbnails */}
        {sorted.length > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            {sorted.map((img, i) => (
              <button
                key={img.id}
                onClick={() => setCurrent(i)}
                className={`relative shrink-0 w-16 h-16 rounded-sm overflow-hidden transition-opacity ${
                  i === current ? "ring-2 ring-stone-900" : "opacity-60 hover:opacity-100"
                }`}
              >
                <Image
                  src={getImageUrl(img.storage_path)}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightbox(false)}
        >
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white"
            onClick={() => setLightbox(false)}
          >
            <X size={28} />
          </button>
          <div
            className="relative w-full max-w-5xl max-h-[90vh] aspect-[16/9]"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={getImageUrl(sorted[current].storage_path)}
              alt={`${title} — photo ${current + 1}`}
              fill
              className="object-contain"
              sizes="100vw"
            />
          </div>
          {sorted.length > 1 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); prev(); }}
                className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); next(); }}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight size={20} />
              </button>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-white/70 text-sm">
                {current + 1} / {sorted.length}
              </div>
            </>
          )}
        </div>
      )}
    </>
  );
}
