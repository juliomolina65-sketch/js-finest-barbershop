"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { uploadWorkPhotos, removeWorkPhoto } from "./actions";

type Photo = { filename: string; url: string };

export default function WorkClient({
  initialPhotos,
}: {
  initialPhotos: Photo[];
}) {
  const [photos, setPhotos] = useState(initialPhotos);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function flashSaved(msg: string) {
    setFlash(msg);
    setTimeout(() => setFlash((cur) => (cur === msg ? null : cur)), 2500);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("files", f));
    setError(null);
    startTransition(async () => {
      const res = await uploadWorkPhotos(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      flashSaved(
        files.length === 1 ? "Photo added" : `${files.length} photos added`
      );
      if (inputRef.current) inputRef.current.value = "";
      // Reload so the new server-generated filenames come back.
      window.location.reload();
    });
  }

  function handleRemove(filename: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeWorkPhoto(filename);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPhotos((prev) => prev.filter((p) => p.filename !== filename));
      flashSaved("Photo removed");
    });
  }

  return (
    <div className="space-y-6">
      <div className="bg-bg-card border border-gold-700/30 rounded-sm p-5">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="font-sans text-xs tracking-[0.25em] text-green-300">
              HOMEPAGE PHOTOS ({photos.length})
            </p>
            <p className="font-sans text-xs text-white/50 mt-1">
              Shop shots, featured cuts, anything you want front and center.
              JPEG, PNG, or WebP — up to 12MB each.
            </p>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 text-xs tracking-[0.25em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition disabled:opacity-60"
          >
            {isPending ? "WORKING…" : "+ ADD PHOTOS"}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleUpload}
            className="hidden"
          />
        </div>

        {photos.length === 0 ? (
          <p className="font-sans text-sm text-white/50 py-8 text-center">
            No homepage photos yet. Click <strong>ADD PHOTOS</strong> above —
            they&apos;ll show up in the OUR WORK carousel immediately.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {photos.map((p) => (
              <div
                key={p.filename}
                className="relative aspect-square overflow-hidden rounded-sm border border-gold-700/30 group"
              >
                <Image
                  src={p.url}
                  alt="Homepage gallery photo"
                  fill
                  sizes="(max-width: 640px) 33vw, 25vw"
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => handleRemove(p.filename)}
                  disabled={isPending}
                  aria-label="Remove photo"
                  className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center bg-black/70 hover:bg-pole-red text-white rounded-sm opacity-0 group-hover:opacity-100 focus:opacity-100 transition disabled:opacity-100 disabled:cursor-not-allowed"
                >
                  <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
                    <path
                      d="M1 1l12 12M13 1L1 13"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {flash && (
        <p className="font-sans text-xs tracking-[0.25em] text-green-200">
          ✓ {flash.toUpperCase()}
        </p>
      )}
      {error && (
        <p className="font-sans text-sm text-pole-red bg-pole-red/10 border border-pole-red/40 rounded-sm px-4 py-3">
          {error}
        </p>
      )}

      <div className="border-t border-gold-700/20 pt-6">
        <p className="font-sans text-xs text-white/50 mb-3">
          See it live on the homepage:
        </p>
        <Link
          href="/#work"
          target="_blank"
          className="inline-flex items-center px-5 py-2.5 text-xs tracking-[0.25em] font-semibold border border-green-400/70 text-green-100 rounded-sm hover:bg-green-400/10 hover:border-green-300 transition"
        >
          VIEW OUR WORK ↗
        </Link>
      </div>
    </div>
  );
}
