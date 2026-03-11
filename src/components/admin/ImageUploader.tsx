"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { getImageUrl } from "@/lib/supabase";
import { PropertyImage } from "@/types";
import { Upload, X, Star, Loader2, GripVertical } from "lucide-react";

interface ImageUploaderProps {
  propertyId: string;
  existingImages: PropertyImage[];
  onChange: (images: PropertyImage[]) => void;
}

export default function ImageUploader({ propertyId, existingImages, onChange }: ImageUploaderProps) {
  const [images, setImages] = useState<PropertyImage[]>(existingImages);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList) {
    setError("");
    setUploading(true);
    const newImages: PropertyImage[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file.type.startsWith("image/")) {
        setError("Only image files are allowed.");
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError("Each image must be under 10MB.");
        continue;
      }

      const formData = new FormData();
      formData.set("file", file);
      formData.set("property_id", propertyId);
      formData.set("display_order", String(images.length + newImages.length));
      formData.set("is_primary", images.length === 0 && newImages.length === 0 ? "true" : "false");

      const res = await fetch("/api/property-images", {
        method: "POST",
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error ?? `Failed to upload ${file.name}`);
        continue;
      }

      newImages.push(data as PropertyImage);
    }

    const updated = [...images, ...newImages];
    setImages(updated);
    onChange(updated);
    setUploading(false);
  }

  async function setPrimary(id: string) {
    const res = await fetch(`/api/property-images/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_primary: true }),
    });

    if (!res.ok) return;

    const updated = images.map((img) => ({
      ...img,
      is_primary: img.id === id,
    }));
    setImages(updated);
    onChange(updated);
  }

  async function removeImage(id: string) {
    const res = await fetch(`/api/property-images/${id}`, { method: "DELETE" });

    if (!res.ok) return;

    const updated = images.filter((img) => img.id !== id);
    if (updated.length > 0 && !updated.some((i) => i.is_primary)) {
      await setPrimary(updated[0].id);
      return;
    }
    setImages(updated);
    onChange(updated);
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-sm p-8 text-center cursor-pointer transition-colors ${
          uploading ? "border-stone-200 bg-stone-50" : "border-stone-300 hover:border-stone-400 hover:bg-stone-50"
        }`}
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          if (!uploading && e.dataTransfer.files.length > 0) {
            handleFiles(e.dataTransfer.files);
          }
        }}
      >
        {uploading ? (
          <div className="flex items-center justify-center gap-2 text-stone-500">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Uploading…</span>
          </div>
        ) : (
          <>
            <Upload size={24} className="mx-auto text-stone-400 mb-2" />
            <p className="text-sm text-stone-600 font-medium">Drop images here or click to upload</p>
            <p className="text-xs text-stone-400 mt-1">JPG, PNG, WebP up to 10MB each</p>
          </>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-sm px-3 py-2">{error}</p>
      )}

      {/* Image grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {images.map((img) => (
            <div key={img.id} className="group relative aspect-square rounded-sm overflow-hidden bg-stone-100">
              <Image
                src={getImageUrl(img.storage_path)}
                alt="Property"
                fill
                className="object-cover"
                sizes="120px"
              />
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors" />

              {img.is_primary && (
                <div className="absolute top-1.5 left-1.5 bg-amber-400 text-white rounded-sm px-1.5 py-0.5 text-xs font-medium">
                  Primary
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                {!img.is_primary && (
                  <button
                    onClick={() => setPrimary(img.id)}
                    title="Set as primary"
                    className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-amber-50 transition-colors"
                  >
                    <Star size={13} className="text-amber-500" />
                  </button>
                )}
                <button
                  onClick={() => removeImage(img.id)}
                  title="Remove"
                  className="w-7 h-7 bg-white rounded-full flex items-center justify-center hover:bg-red-50 transition-colors"
                >
                  <X size={13} className="text-red-500" />
                </button>
              </div>

              <GripVertical size={14} className="absolute bottom-1.5 right-1.5 text-white/60" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
