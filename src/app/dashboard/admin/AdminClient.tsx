"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  approveBarber,
  deactivateBarber,
  reactivateBarber,
  makeAdmin,
  removeAdmin,
} from "./actions";

type BarberRow = {
  id: string;
  slug: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isOwner: boolean;
  isAdmin: boolean;
  isActive: boolean;
  isPending: boolean;
  isSeedNoPassword: boolean;
  confirmedAppointmentCount: number;
};

export default function AdminClient({
  barbers,
  currentOwnerId,
}: {
  barbers: BarberRow[];
  currentOwnerId: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function doAction(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok && res.error) setError(res.error);
    });
  }

  return (
    <div>
      {error && (
        <div className="mb-6 bg-pole-red/10 border border-pole-red/40 rounded-sm px-4 py-3 text-pole-red font-sans text-sm">
          {error}
        </div>
      )}

      <ul className="space-y-3">
        {barbers.map((b) => (
          <li
            key={b.id}
            className={`bg-bg-card border rounded-sm p-4 flex flex-wrap items-center gap-4 ${
              b.isPending
                ? "border-gold-400/60"
                : b.isActive
                ? "border-gold-700/40"
                : "border-gold-700/20 opacity-70"
            }`}
          >
            <div className="flex-1 min-w-[200px]">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-display text-lg text-white">{b.name}</p>
                {b.isOwner && (
                  <span className="font-sans text-[10px] tracking-[0.25em] bg-gold-400/15 text-gold-200 border border-gold-400/40 rounded-sm px-2 py-0.5">
                    OWNER
                  </span>
                )}
                {b.isAdmin && !b.isOwner && (
                  <span className="font-sans text-[10px] tracking-[0.25em] bg-green-400/15 text-green-200 border border-green-400/50 rounded-sm px-2 py-0.5">
                    ADMIN
                  </span>
                )}
                {b.isPending && (
                  <span className="font-sans text-[10px] tracking-[0.25em] bg-gold-400/20 text-gold-200 border border-gold-400/60 rounded-sm px-2 py-0.5">
                    PENDING
                  </span>
                )}
                {!b.isActive && !b.isPending && (
                  <span className="font-sans text-[10px] tracking-[0.25em] bg-white/5 text-white/40 border border-white/10 rounded-sm px-2 py-0.5">
                    DEACTIVATED
                  </span>
                )}
                {b.isSeedNoPassword && (
                  <span className="font-sans text-[10px] tracking-[0.25em] bg-white/5 text-white/40 border border-white/10 rounded-sm px-2 py-0.5">
                    NOT ACTIVATED YET
                  </span>
                )}
              </div>
              <p className="font-sans text-xs text-white/60 mt-1">
                {b.role} · {b.email}
                {b.phone ? ` · ${b.phone}` : ""}
              </p>
              <p className="font-sans text-[11px] text-white/40 mt-1">
                {b.confirmedAppointmentCount} confirmed appointment
                {b.confirmedAppointmentCount === 1 ? "" : "s"}
              </p>
            </div>

            <div className="flex gap-2 flex-wrap">
              <Link
                href={`/barbers/${b.slug}`}
                target="_blank"
                className="inline-flex items-center px-3 py-1.5 text-[10px] tracking-[0.25em] font-semibold border border-gold-700/40 text-white/70 rounded-sm hover:border-gold-400/60 hover:text-gold-100 transition"
              >
                VIEW PROFILE ↗
              </Link>

              {b.isPending && (
                <button
                  type="button"
                  onClick={() => doAction(() => approveBarber(b.id))}
                  disabled={isPending}
                  className="inline-flex items-center px-4 py-1.5 text-[10px] tracking-[0.25em] font-semibold bg-gradient-to-b from-green-100 to-green-600 text-black rounded-sm hover:brightness-110 transition disabled:opacity-60"
                >
                  APPROVE
                </button>
              )}

              {/* Admin rights — owner keeps them permanently, so no toggle there */}
              {!b.isOwner && b.isActive && !b.isPending && (
                b.isAdmin ? (
                  <button
                    type="button"
                    onClick={() => doAction(() => removeAdmin(b.id))}
                    disabled={isPending}
                    className="inline-flex items-center px-3 py-1.5 text-[10px] tracking-[0.25em] font-semibold border border-green-400/50 text-green-200 rounded-sm hover:bg-green-400/10 transition disabled:opacity-60"
                  >
                    REMOVE ADMIN
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => doAction(() => makeAdmin(b.id))}
                    disabled={isPending}
                    className="inline-flex items-center px-3 py-1.5 text-[10px] tracking-[0.25em] font-semibold bg-green-400/15 border border-green-400/50 text-green-100 rounded-sm hover:bg-green-400/25 transition disabled:opacity-60"
                  >
                    MAKE ADMIN
                  </button>
                )
              )}

              {!b.isOwner &&
                b.isActive &&
                !b.isPending &&
                b.id !== currentOwnerId && (
                  <button
                    type="button"
                    onClick={() => doAction(() => deactivateBarber(b.id))}
                    disabled={isPending}
                    className="inline-flex items-center px-3 py-1.5 text-[10px] tracking-[0.25em] font-semibold border border-pole-red/60 text-pole-red rounded-sm hover:bg-pole-red/10 transition disabled:opacity-60"
                  >
                    DEACTIVATE
                  </button>
                )}

              {!b.isActive && !b.isPending && !b.isSeedNoPassword && (
                <button
                  type="button"
                  onClick={() => doAction(() => reactivateBarber(b.id))}
                  disabled={isPending}
                  className="inline-flex items-center px-3 py-1.5 text-[10px] tracking-[0.25em] font-semibold bg-green-400/15 border border-green-400/50 text-green-100 rounded-sm hover:bg-green-400/25 transition disabled:opacity-60"
                >
                  REACTIVATE
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>

      {barbers.length === 0 && (
        <p className="text-center font-sans text-sm text-white/50 py-12">
          No barbers in the system yet.
        </p>
      )}
    </div>
  );
}
