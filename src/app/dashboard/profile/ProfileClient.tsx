"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, useTransition } from "react";
import { updateBarberProfile, updateBarberSchedule } from "./actions";
import {
  uploadProfilePhoto,
  removeProfilePhoto,
  uploadWorkPhotos,
  removeWorkPhoto,
} from "./photo-actions";
import type { ScheduleDay } from "@/lib/booking";

/** Must stay under next.config.ts experimental.proxyClientMaxBodySize. */
const MAX_BATCH_MB = 55;
const MAX_BATCH_BYTES = MAX_BATCH_MB * 1024 * 1024;

const DAY_LABELS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type Props = {
  initial: {
    slug: string;
    name: string;
    role: string;
    phone: string;
    yearsExperience: number;
    bio: string;
    specialties: string[];
    weeklySchedule: ScheduleDay[];
    profilePhoto: string | null;
    portfolio: { url: string; filename: string }[];
  };
};

export default function ProfileClient({ initial }: Props) {
  return (
    <div className="space-y-12">
      <PhotosSection
        initialProfilePhoto={initial.profilePhoto}
        initialPortfolio={initial.portfolio}
        slug={initial.slug}
        name={initial.name}
      />
      <ProfileSection initial={initial} />
      <ScheduleSection initial={initial.weeklySchedule} />

      <div className="border-t border-gold-700/20 pt-6">
        <p className="font-sans text-xs text-white/50 mb-3">
          Preview your public profile:
        </p>
        <Link
          href={`/barbers/${initial.slug}`}
          target="_blank"
          className="inline-flex items-center px-5 py-2.5 text-xs tracking-[0.25em] font-semibold border border-green-400/70 text-green-100 rounded-sm hover:bg-green-400/10 hover:border-green-300 transition"
        >
          VIEW PUBLIC PROFILE ↗
        </Link>
      </div>
    </div>
  );
}

function PhotosSection({
  initialProfilePhoto,
  initialPortfolio,
  slug,
  name,
}: {
  initialProfilePhoto: string | null;
  initialPortfolio: { url: string; filename: string }[];
  slug: string;
  name: string;
}) {
  const [profilePhoto, setProfilePhoto] = useState(initialProfilePhoto);
  const [portfolio, setPortfolio] = useState(initialPortfolio);
  const [error, setError] = useState<string | null>(null);
  const [savedFlash, setSavedFlash] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const profileInputRef = useRef<HTMLInputElement>(null);
  const workInputRef = useRef<HTMLInputElement>(null);

  function flashSaved(msg: string) {
    setSavedFlash(msg);
    setTimeout(() => setSavedFlash((cur) => (cur === msg ? null : cur)), 2500);
  }

  function handleProfileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append("file", file);
    setError(null);
    startTransition(async () => {
      const res = await uploadProfilePhoto(fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Build a synthetic URL with a cache-bust so we can show the new image
      // without waiting for a full page navigation.
      const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
      setProfilePhoto(`/uploads/barbers/${slug}/profile.${ext}?v=${Date.now()}`);
      flashSaved("Profile photo updated");
      if (profileInputRef.current) profileInputRef.current.value = "";
    });
  }

  function handleProfileRemove() {
    setError(null);
    startTransition(async () => {
      const res = await removeProfilePhoto();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setProfilePhoto(null);
      flashSaved("Profile photo removed");
    });
  }

  function handleWorkUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // The server accepts a 60MB request body. Phone photos run 3-8MB each, so
    // a full batch can blow past that — and the server-side failure surfaces as
    // an opaque "Unexpected end of form". Check here instead so the barber gets
    // an instruction they can act on.
    const list = Array.from(files);
    const totalBytes = list.reduce((sum, f) => sum + f.size, 0);
    if (totalBytes > MAX_BATCH_BYTES) {
      const totalMb = Math.ceil(totalBytes / (1024 * 1024));
      setError(
        `Those ${list.length} photos total about ${totalMb}MB, which is over the ${MAX_BATCH_MB}MB limit per upload. Select a few at a time and upload again.`
      );
      if (workInputRef.current) workInputRef.current.value = "";
      return;
    }

    const fd = new FormData();
    list.forEach((f) => fd.append("files", f));
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
      if (workInputRef.current) workInputRef.current.value = "";
      // Easiest way to pick up the newly-saved filenames is to reload data from server
      window.location.reload();
    });
  }

  function handleWorkRemove(filename: string) {
    setError(null);
    startTransition(async () => {
      const res = await removeWorkPhoto(filename);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setPortfolio((prev) => prev.filter((p) => p.filename !== filename));
      flashSaved("Photo removed");
    });
  }

  return (
    <section className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-gold-gradient mb-1">Photos</h2>
        <p className="font-sans text-xs text-white/50">
          Upload a profile picture and showcase your best work. JPEG, PNG, or
          WebP — up to 12MB each.
        </p>
      </div>

      {/* Profile photo */}
      <div className="bg-bg-card border border-gold-700/30 rounded-sm p-5">
        <p className="font-sans text-xs tracking-[0.25em] text-green-300 mb-3">
          PROFILE PHOTO
        </p>
        <div className="flex items-start gap-5 flex-wrap">
          <div className="relative w-32 h-32 sm:w-40 sm:h-40 rounded-sm overflow-hidden border border-gold-700/40 bg-gradient-to-br from-bg-elevated to-bg flex items-center justify-center shrink-0">
            {profilePhoto ? (
              <Image
                src={profilePhoto}
                alt={`${name} profile photo`}
                fill
                sizes="160px"
                className="object-cover"
                unoptimized
              />
            ) : (
              <span className="font-display text-5xl text-gold-gradient">
                {name.charAt(0)}
              </span>
            )}
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="flex gap-3 flex-wrap">
              <button
                type="button"
                onClick={() => profileInputRef.current?.click()}
                disabled={isPending}
                className="inline-flex items-center px-4 py-2 text-xs tracking-[0.25em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition disabled:opacity-60"
              >
                {profilePhoto ? "REPLACE" : "UPLOAD"}
              </button>
              {profilePhoto && (
                <button
                  type="button"
                  onClick={handleProfileRemove}
                  disabled={isPending}
                  className="inline-flex items-center px-3 py-2 text-xs tracking-[0.25em] font-semibold border border-pole-red/60 text-pole-red rounded-sm hover:bg-pole-red/10 transition disabled:opacity-60"
                >
                  REMOVE
                </button>
              )}
            </div>
            <input
              ref={profileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleProfileUpload}
              className="hidden"
            />
            <p className="font-sans text-xs text-white/50 mt-3">
              A square headshot looks best. Shows up next to your name on every
              page.
            </p>
          </div>
        </div>
      </div>

      {/* Portfolio */}
      <div className="bg-bg-card border border-gold-700/30 rounded-sm p-5">
        <div className="flex items-end justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className="font-sans text-xs tracking-[0.25em] text-green-300">
              YOUR WORK ({portfolio.length})
            </p>
            <p className="font-sans text-xs text-white/50 mt-1">
              Photos of cuts, fades, beards. Shown in your portfolio gallery.
            </p>
          </div>
          <button
            type="button"
            onClick={() => workInputRef.current?.click()}
            disabled={isPending}
            className="inline-flex items-center px-4 py-2 text-xs tracking-[0.25em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition disabled:opacity-60"
          >
            + ADD PHOTOS
          </button>
          <input
            ref={workInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            onChange={handleWorkUpload}
            className="hidden"
          />
        </div>

        {portfolio.length === 0 ? (
          <p className="font-sans text-sm text-white/50 py-6 text-center">
            No portfolio photos yet. Click <strong>ADD PHOTOS</strong> above to
            upload your best work.
          </p>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
            {portfolio.map((p) => (
              <div
                key={p.filename}
                className="relative aspect-square overflow-hidden rounded-sm border border-gold-700/30 group"
              >
                <Image
                  src={p.url}
                  alt="Portfolio work"
                  fill
                  sizes="(max-width: 640px) 33vw, 25vw"
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => handleWorkRemove(p.filename)}
                  disabled={isPending}
                  aria-label="Remove photo"
                  className="absolute top-1 right-1 w-7 h-7 flex items-center justify-center bg-black/70 hover:bg-pole-red text-white rounded-sm opacity-0 group-hover:opacity-100 transition disabled:opacity-100 disabled:cursor-not-allowed"
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

      {savedFlash && (
        <p className="font-sans text-xs tracking-[0.25em] text-green-200">
          ✓ {savedFlash.toUpperCase()}
        </p>
      )}
      {error && (
        <p className="font-sans text-sm text-pole-red bg-pole-red/10 border border-pole-red/40 rounded-sm px-4 py-3">
          {error}
        </p>
      )}
    </section>
  );
}

function ProfileSection({ initial }: { initial: Props["initial"] }) {
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateBarberProfile(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-gold-gradient mb-1">About</h2>
        <p className="font-sans text-xs text-white/50">
          Your name, role, bio, and contact info.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Field
          name="name"
          label="Display Name"
          defaultValue={initial.name}
          required
        />
        <Field
          name="role"
          label="Role / Title"
          defaultValue={initial.role}
          hint='e.g. "Master Barber Associate"'
          required
        />
        <Field
          name="phone"
          label="Phone (for SMS notifications)"
          defaultValue={initial.phone}
          type="tel"
        />
        <Field
          name="yearsExperience"
          label="Years of Experience"
          defaultValue={String(initial.yearsExperience)}
          type="number"
          min={0}
          max={99}
        />
      </div>

      <div>
        <label className="block">
          <span className="font-sans text-xs tracking-[0.25em] text-green-300 block mb-2">
            BIO / DESCRIPTION
          </span>
          <textarea
            name="bio"
            rows={6}
            defaultValue={initial.bio}
            placeholder="Tell customers about yourself — your style, your experience, what makes your cuts different…"
            className="w-full bg-bg-card border border-gold-700/40 rounded-sm px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400 transition resize-y"
          />
        </label>
      </div>

      <div>
        <label className="block">
          <span className="font-sans text-xs tracking-[0.25em] text-green-300 block mb-2">
            SPECIALTIES
          </span>
          <textarea
            name="specialties"
            rows={5}
            defaultValue={initial.specialties.join("\n")}
            placeholder={"One per line — e.g.\nSkin Fades\nBeard Sculpting\nClassic Cuts"}
            className="w-full bg-bg-card border border-gold-700/40 rounded-sm px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400 transition resize-y"
          />
          <span className="font-sans text-xs text-white/50 mt-1 block">
            One per line. Shown as bullet points on your public profile.
          </span>
        </label>
      </div>

      <SaveRow
        isPending={isPending}
        error={error}
        savedAt={savedAt}
        label="SAVE PROFILE"
        pendingLabel="SAVING…"
      />
    </form>
  );
}

function ScheduleSection({ initial }: { initial: ScheduleDay[] }) {
  const [days, setDays] = useState(initial);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function setDay(dow: number, patch: Partial<ScheduleDay>) {
    setDays((prev) =>
      prev.map((d) => (d.dayOfWeek === dow ? { ...d, ...patch } : d))
    );
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await updateBarberSchedule(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      setSavedAt(Date.now());
    });
  }

  return (
    <form action={handleSubmit} className="space-y-5 border-t border-gold-700/20 pt-10">
      <div>
        <h2 className="font-display text-2xl text-gold-gradient mb-1">Weekly Hours</h2>
        <p className="font-sans text-xs text-white/50">
          Set your open and close times for each day. Customers can only book
          you during these windows.
        </p>
      </div>

      <ul className="space-y-2">
        {days
          .slice()
          .sort((a, b) => {
            // Display Mon - Sun
            const ai = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
            const bi = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
            return ai - bi;
          })
          .map((d) => {
            const isClosed = !d.open || !d.close;
            return (
              <li
                key={d.dayOfWeek}
                className="grid grid-cols-12 gap-3 items-center bg-bg-card border border-gold-700/30 rounded-sm px-4 py-3"
              >
                <div className="col-span-3 sm:col-span-2">
                  <p className="font-display text-sm text-gold-100">
                    {DAY_LABELS[d.dayOfWeek]}
                  </p>
                </div>
                <label className="col-span-3 sm:col-span-2 flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name={`day_${d.dayOfWeek}_closed`}
                    checked={isClosed}
                    onChange={(e) =>
                      setDay(d.dayOfWeek, {
                        open: e.target.checked ? null : "09:00",
                        close: e.target.checked ? null : "20:00",
                      })
                    }
                    className="accent-[#3F8F63]"
                  />
                  <span className="font-sans text-xs tracking-[0.2em] text-white/70">
                    CLOSED
                  </span>
                </label>
                <div className="col-span-3 sm:col-span-4">
                  <input
                    type="time"
                    name={`day_${d.dayOfWeek}_open`}
                    value={d.open ?? ""}
                    onChange={(e) =>
                      setDay(d.dayOfWeek, {
                        open: e.target.value || null,
                      })
                    }
                    disabled={isClosed}
                    className="w-full bg-bg border border-gold-700/40 rounded-sm px-3 py-2 font-sans text-sm text-white disabled:opacity-40 focus:outline-none focus:border-green-400 transition"
                  />
                </div>
                <div className="col-span-3 sm:col-span-4">
                  <input
                    type="time"
                    name={`day_${d.dayOfWeek}_close`}
                    value={d.close ?? ""}
                    onChange={(e) =>
                      setDay(d.dayOfWeek, {
                        close: e.target.value || null,
                      })
                    }
                    disabled={isClosed}
                    className="w-full bg-bg border border-gold-700/40 rounded-sm px-3 py-2 font-sans text-sm text-white disabled:opacity-40 focus:outline-none focus:border-green-400 transition"
                  />
                </div>
              </li>
            );
          })}
      </ul>

      <SaveRow
        isPending={isPending}
        error={error}
        savedAt={savedAt}
        label="SAVE HOURS"
        pendingLabel="SAVING…"
      />
    </form>
  );
}

function SaveRow({
  isPending,
  error,
  savedAt,
  label,
  pendingLabel,
}: {
  isPending: boolean;
  error: string | null;
  savedAt: number | null;
  label: string;
  pendingLabel: string;
}) {
  return (
    <div className="flex items-center gap-4 flex-wrap">
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center px-6 py-3 text-xs tracking-[0.3em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition shadow-[0_0_30px_rgba(212,175,55,0.35)] disabled:opacity-60"
      >
        {isPending ? pendingLabel : label}
      </button>
      {savedAt && !isPending && !error && (
        <span className="font-sans text-xs tracking-[0.25em] text-green-200">
          ✓ SAVED
        </span>
      )}
      {error && (
        <p className="font-sans text-sm text-pole-red bg-pole-red/10 border border-pole-red/40 rounded-sm px-3 py-2">
          {error}
        </p>
      )}
    </div>
  );
}

function Field({
  name,
  label,
  defaultValue,
  type = "text",
  required,
  min,
  max,
  hint,
}: {
  name: string;
  label: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  min?: number;
  max?: number;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="font-sans text-xs tracking-[0.25em] text-green-300 block mb-2">
        {label.toUpperCase()}
        {required ? " *" : ""}
      </span>
      <input
        name={name}
        type={type}
        defaultValue={defaultValue}
        required={required}
        min={min}
        max={max}
        className="w-full bg-bg-card border border-gold-700/40 rounded-sm px-4 py-3 font-sans text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400 transition"
      />
      {hint && (
        <span className="font-sans text-xs text-white/50 mt-1 block">
          {hint}
        </span>
      )}
    </label>
  );
}
