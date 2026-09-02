"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { claimAppointment, cancelAppointment } from "./actions";
import DaySlotGrid, {
  type DaySlotApptLite,
  type DaySlotServiceLite,
} from "./DaySlotGrid";
import type { Dict } from "@/lib/i18n";

type BarberLite = { id: string; name: string; role: string; isOwner: boolean };
type ApptLite = DaySlotApptLite;

type Props = {
  barber: BarberLite;
  todayDateStr: string;
  todaySchedule: { open: string; close: string } | null;
  todays: ApptLite[];
  upcoming: ApptLite[];
  pendingForMe: ApptLite[];
  pendingAnyone: ApptLite[];
  services: DaySlotServiceLite[];
  t: Dict["dashboard"];
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
}
function fmtDay(iso: string) {
  return new Date(iso).toLocaleDateString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
function money(cents: number) {
  return `$${(cents / 100).toFixed(0)}`;
}

export default function DashboardClient({
  barber,
  todayDateStr,
  todaySchedule,
  todays,
  upcoming,
  pendingForMe,
  pendingAnyone,
  services,
  t,
}: Props) {
  const th = t.home;
  const ts = t.slot;
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function doAction(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok && res.error) setActionError(res.error);
    });
  }

  // Parse as LOCAL date — new Date("YYYY-MM-DD") would parse as UTC midnight
  // and display yesterday's date for US timezones.
  const [ty, tm, td] = todayDateStr.split("-").map(Number);
  const todayDate = new Date(ty, tm - 1, td);
  const todayLabel = todayDate.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <section className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 md:py-12">
      <div className="mb-8">
        <p className="font-sans text-xs tracking-[0.4em] text-green-300">
          {th.welcome} {barber.name.toUpperCase()}
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-gold-gradient">
          {todayLabel}
        </h1>
        <p className="font-sans text-sm text-white/70 mt-2 max-w-xl">
          {th.intro}
        </p>
      </div>

      {actionError && (
        <div className="mb-6 bg-pole-red/10 border border-pole-red/40 rounded-sm px-4 py-3 text-pole-red font-sans text-sm">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* ============ MAIN: TODAY'S CALENDAR ============ */}
        <div className="lg:col-span-2 space-y-10">
          <section>
            <div className="flex items-end justify-between mb-4 gap-4 flex-wrap">
              <h2 className="font-display text-2xl text-gold-gradient">
                {th.yourDay}
              </h2>
              <Link
                href="/dashboard/calendar"
                className="font-sans text-xs tracking-[0.25em] text-green-300 hover:text-gold-200 transition"
              >
                {th.viewFullCalendar}
              </Link>
            </div>

            <DaySlotGrid
              dateStr={todayDateStr}
              isToday={true}
              schedule={todaySchedule}
              appointments={todays}
              services={services}
              t={ts}
            />
          </section>

          {/* Upcoming */}
          <section>
            <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-1">
              {th.next7Days}
            </p>
            <h2 className="font-display text-2xl text-gold-gradient mb-4">
              {th.comingUp}
            </h2>
            {upcoming.length === 0 ? (
              <EmptyState title={th.comingUpEmpty} hint={th.comingUpHint} />
            ) : (
              <ul className="space-y-3">
                {upcoming.map((a) => (
                  <UpcomingCard
                    key={a.id}
                    appt={a}
                    onCancel={() => doAction(() => cancelAppointment(a.id))}
                    isPending={isPending}
                    cancelLabel={th.cancel}
                  />
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* ============ SIDEBAR ============ */}
        <aside className="space-y-8">
          <section>
            <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-1">
              {th.askedForYou}
            </p>
            <h2 className="font-display text-xl text-gold-gradient mb-3">
              {th.pending} — {pendingForMe.length}
            </h2>
            {pendingForMe.length === 0 ? (
              <p className="font-sans text-xs text-white/40">{th.noneAsked}</p>
            ) : (
              <ul className="space-y-3">
                {pendingForMe.map((a) => (
                  <PendingCard
                    key={a.id}
                    appt={a}
                    onClaim={() => doAction(() => claimAppointment(a.id))}
                    disabled={isPending}
                    takeLabel={th.illTakeIt}
                  />
                ))}
              </ul>
            )}
          </section>

          <section>
            <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-1">
              {th.openRequests}
            </p>
            <h2 className="font-display text-xl text-gold-gradient mb-3">
              {th.anyoneAvailable} — {pendingAnyone.length}
            </h2>
            {pendingAnyone.length === 0 ? (
              <p className="font-sans text-xs text-white/40">{th.noneOpen}</p>
            ) : (
              <ul className="space-y-3">
                {pendingAnyone.map((a) => (
                  <PendingCard
                    key={a.id}
                    appt={a}
                    onClaim={() => doAction(() => claimAppointment(a.id))}
                    disabled={isPending}
                    takeLabel={th.illTakeIt}
                  />
                ))}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </section>
  );
}

function UpcomingCard({
  appt,
  onCancel,
  isPending,
  cancelLabel,
}: {
  appt: ApptLite;
  onCancel: () => void;
  isPending: boolean;
  cancelLabel: string;
}) {
  return (
    <li className="bg-bg-card border border-gold-700/40 rounded-sm p-4 flex flex-wrap items-center gap-4">
      <div className="shrink-0 min-w-[110px]">
        <p className="font-sans text-[10px] tracking-[0.25em] text-green-300 mb-0.5">
          {fmtDay(appt.startAt).toUpperCase()}
        </p>
        <p className="font-display text-xl text-gold-100">
          {fmtTime(appt.startAt)}
        </p>
        <p className="font-sans text-xs text-white/50">
          {appt.serviceDurationMin} min · {money(appt.servicePriceCents)}
        </p>
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-display text-base text-white">{appt.customerName}</p>
        <p className="font-sans text-xs text-white/60">
          {appt.serviceName}
          {!appt.customerEmailIsWalkIn && appt.customerEmail
            ? ` · ${appt.customerEmail}`
            : ""}
          {appt.customerPhone ? ` · ${appt.customerPhone}` : ""}
        </p>
        {appt.notes && (
          <p className="font-sans text-xs text-white/40 mt-1 italic">
            “{appt.notes}”
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        className="inline-flex items-center px-3 py-1.5 text-[10px] tracking-[0.25em] font-semibold border border-pole-red/60 text-pole-red rounded-sm hover:bg-pole-red/10 transition disabled:opacity-60"
      >
        {cancelLabel}
      </button>
    </li>
  );
}

function PendingCard({
  appt,
  onClaim,
  disabled,
  takeLabel,
}: {
  appt: ApptLite;
  onClaim: () => void;
  disabled: boolean;
  takeLabel: string;
}) {
  return (
    <li className="bg-bg-card border border-gold-400/40 rounded-sm p-3">
      <p className="font-display text-sm text-gold-100">
        {fmtDay(appt.startAt)} · {fmtTime(appt.startAt)}
      </p>
      <p className="font-sans text-xs text-white/70 mt-1">
        {appt.serviceName} · {appt.serviceDurationMin}m ·{" "}
        {money(appt.servicePriceCents)}
      </p>
      <p className="font-sans text-xs text-white/50 mt-1">
        {appt.customerName}
        {appt.customerPhone ? ` · ${appt.customerPhone}` : ""}
      </p>
      {appt.notes && (
        <p className="font-sans text-xs text-white/40 mt-1 italic">
          “{appt.notes}”
        </p>
      )}
      <button
        type="button"
        onClick={onClaim}
        disabled={disabled}
        className="mt-3 w-full inline-flex items-center justify-center px-3 py-2 text-[10px] tracking-[0.3em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition disabled:opacity-60"
      >
        {takeLabel}
      </button>
    </li>
  );
}

function EmptyState({ title, hint }: { title: string; hint: string }) {
  return (
    <div className="bg-bg-card/40 border border-dashed border-gold-700/30 rounded-sm p-6 text-center">
      <p className="font-display text-base text-gold-100">{title}</p>
      <p className="font-sans text-xs text-white/50 mt-2">{hint}</p>
    </div>
  );
}
