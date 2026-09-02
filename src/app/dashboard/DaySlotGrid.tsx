"use client";

import { useState, useTransition } from "react";
import {
  createWalkIn,
  markCompleted,
  cancelAppointment,
} from "./actions";
import type { Dict } from "@/lib/i18n";

export type DaySlotApptLite = {
  id: string;
  startAt: string;
  endAt: string;
  status: string;
  notes: string | null;
  tipCents: number | null;
  customerName: string;
  customerPhone: string | null;
  customerEmailIsWalkIn: boolean;
  customerEmail: string;
  serviceName: string;
  serviceDurationMin: number;
  servicePriceCents: number;
};

export type DaySlotServiceLite = {
  id: string;
  name: string;
  durationMin: number;
  priceCents: number;
};

type Props = {
  dateStr: string;
  isToday: boolean;
  schedule: { open: string; close: string } | null;
  appointments: DaySlotApptLite[];
  services: DaySlotServiceLite[];
  t: Dict["dashboard"]["slot"];
};

const SLOT_STEP_MIN = 30;

function timeToMin(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function minToTime(min: number): string {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}
function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
function money(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

type SlotEntry =
  | { kind: "appt"; appt: DaySlotApptLite; isStart: boolean }
  | { kind: "empty"; isPast: boolean };

export default function DaySlotGrid({
  dateStr,
  isToday,
  schedule,
  appointments,
  services,
  t,
}: Props) {
  const [openAdd, setOpenAdd] = useState<string | null>(null);
  /** Custom-time form (any time, not just the 30-minute grid). */
  const [customOpen, setCustomOpen] = useState(false);
  /** Appointment ID we're currently entering a tip for (after clicking DONE). */
  const [tippingFor, setTippingFor] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function doAction(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setActionError(null);
    startTransition(async () => {
      const res = await fn();
      if (!res.ok && res.error) setActionError(res.error);
    });
  }

  if (!schedule) {
    return (
      <div className="bg-bg-card/40 border border-dashed border-gold-700/30 rounded-sm p-10 text-center">
        <p className="font-display text-xl text-gold-100 mb-2">{t.offToday}</p>
        <p className="font-sans text-sm text-white/50">
          {t.offTodayHint}{" "}
          <a
            href="/dashboard/profile"
            className="text-gold-200 hover:text-gold-100 underline underline-offset-4"
          >
            {t.offTodayLink}
          </a>
          .
        </p>
      </div>
    );
  }

  const openMin = timeToMin(schedule.open);
  const closeMin = timeToMin(schedule.close);
  const nowMin = isToday
    ? new Date().getHours() * 60 + new Date().getMinutes()
    : -1;

  // Seed the custom-time picker with something sensible: the next quarter hour
  // if the shop is open now, otherwise opening time.
  const defaultCustomTime = minToTime(
    isToday && nowMin > openMin && nowMin < closeMin
      ? Math.min(closeMin - 15, Math.ceil((nowMin + 5) / 15) * 15)
      : openMin
  );

  const slots: { startMin: number; entry: SlotEntry }[] = [];
  for (let t = openMin; t < closeMin; t += SLOT_STEP_MIN) {
    const slotStartIso = combineToIso(dateStr, minToTime(t));
    const slotEndIso = combineToIso(dateStr, minToTime(t + SLOT_STEP_MIN));
    const covering = appointments.find(
      (a) => a.startAt < slotEndIso && a.endAt > slotStartIso
    );
    if (covering) {
      const isStart =
        new Date(covering.startAt).getHours() * 60 +
          new Date(covering.startAt).getMinutes() ===
        t;
      slots.push({
        startMin: t,
        entry: { kind: "appt", appt: covering, isStart },
      });
    } else {
      // Hide past EMPTY slots entirely — they're not bookable and just clutter
      // the grid. Past BOOKED slots still show above so the barber can mark
      // them DONE.
      if (isToday && t + SLOT_STEP_MIN <= nowMin) continue;
      slots.push({ startMin: t, entry: { kind: "empty", isPast: false } });
    }
  }

  return (
    <div>
      {actionError && (
        <div className="mb-4 bg-pole-red/10 border border-pole-red/40 rounded-sm px-4 py-3 text-pole-red font-sans text-sm">
          {actionError}
        </div>
      )}

      {/* Custom time — the grid below only offers 30-minute starts, which is
          too rigid for a walk-in that shows up at 5:12. */}
      <div className="mb-3">
        {customOpen ? (
          <div className="bg-bg-card border border-green-400/50 rounded-sm px-3 py-3">
            <p className="font-sans text-[10px] tracking-[0.25em] text-green-300 mb-2">
              {t.customTimeHint}
            </p>
            <QuickAdd
              dateStr={dateStr}
              timeStr={defaultCustomTime}
              services={services}
              editableTime
              onDone={() => setCustomOpen(false)}
              onError={setActionError}
              t={t}
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => {
              setCustomOpen(true);
              setOpenAdd(null);
            }}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[11px] tracking-[0.25em] font-semibold border border-green-400/50 text-green-100 rounded-sm hover:border-green-300 hover:bg-green-400/10 transition"
          >
            {t.customTime}
          </button>
        )}
      </div>

      <div className="bg-bg-card border border-gold-700/30 rounded-sm overflow-hidden">
        {slots.map(({ startMin, entry }, idx) => {
          const timeStr = minToTime(startMin);
          const timeLabel = fmt12h(timeStr);

          if (entry.kind === "appt") {
            if (!entry.isStart) {
              return (
                <div
                  key={timeStr}
                  className="grid grid-cols-[64px_1fr] items-center bg-gold-400/[0.04] border-t border-gold-700/20 px-3 py-1"
                >
                  <p className="font-sans text-[10px] text-white/30">
                    {timeLabel}
                  </p>
                  <p className="font-sans text-[10px] text-green-300/60 italic">
                    ↳ {entry.appt.customerName} {t.continues}
                  </p>
                </div>
              );
            }
            return (
              <AppointmentRow
                key={timeStr}
                timeLabel={timeLabel}
                appt={entry.appt}
                isFirst={idx === 0}
                isPending={isPending}
                isTipping={tippingFor === entry.appt.id}
                onStartTip={() => setTippingFor(entry.appt.id)}
                onFinishTip={(tipDollars) => {
                  setTippingFor(null);
                  doAction(() =>
                    markCompleted(entry.appt.id, tipDollars)
                  );
                }}
                onCancelTip={() => setTippingFor(null)}
                onCancel={() => doAction(() => cancelAppointment(entry.appt.id))}
                t={t}
              />
            );
          }

          const isOpenForAdd = openAdd === timeStr;
          if (isOpenForAdd) {
            return (
              <div
                key={timeStr}
                className={`grid grid-cols-[64px_1fr] items-center border-t border-gold-400/60 bg-gold-400/[0.08] px-3 py-2 ${
                  idx === 0 ? "border-t-0" : ""
                }`}
              >
                <p className="font-display text-xs text-gold-100">
                  {timeLabel}
                </p>
                <QuickAdd
                  dateStr={dateStr}
                  timeStr={timeStr}
                  services={services}
                  onDone={() => setOpenAdd(null)}
                  onError={setActionError}
                  t={t}
                />
              </div>
            );
          }
          return (
            <button
              key={timeStr}
              type="button"
              onClick={() => setOpenAdd(timeStr)}
              disabled={entry.isPast}
              className={`w-full grid grid-cols-[64px_1fr_auto] items-center gap-2 border-t border-gold-700/20 px-3 py-1.5 text-left transition group ${
                idx === 0 ? "border-t-0" : ""
              } ${
                entry.isPast
                  ? "opacity-40 cursor-not-allowed"
                  : "hover:bg-green-400/[0.08] hover:border-green-400/40 cursor-pointer"
              }`}
            >
              <p className="font-sans text-[11px] text-white/50">{timeLabel}</p>
              <p className="font-sans text-xs text-white/30 group-hover:text-white/60 transition">
                {t.free}
              </p>
              <span className="inline-flex items-center px-2.5 py-1 text-[9px] tracking-[0.2em] font-semibold bg-gold-400/15 border border-gold-400/50 text-gold-100 rounded-sm group-hover:bg-gradient-to-b group-hover:from-gold-100 group-hover:to-gold-600 group-hover:text-black group-hover:border-gold-400 transition">
                {t.addBooking}
              </span>
            </button>
          );
        })}
        {slots.length === 0 && (
          <div className="p-6 text-center font-sans text-sm text-white/50">
            {isToday ? t.dayDone : t.slotsMisconfigured}
          </div>
        )}
      </div>
    </div>
  );
}

function AppointmentRow({
  timeLabel,
  appt,
  isFirst,
  isPending,
  isTipping,
  onStartTip,
  onFinishTip,
  onCancelTip,
  onCancel,
  t,
}: {
  timeLabel: string;
  appt: DaySlotApptLite;
  isFirst: boolean;
  isPending: boolean;
  isTipping: boolean;
  onStartTip: () => void;
  onFinishTip: (tipDollars?: number) => void;
  onCancelTip: () => void;
  onCancel: () => void;
  t: Dict["dashboard"]["slot"];
}) {
  const isDone = appt.status === "COMPLETED";
  const endTime = new Date(appt.endAt).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });
  return (
    <div
      className={`grid grid-cols-[64px_1fr] items-start border-t ${
        isFirst ? "border-t-0" : ""
      } ${
        isTipping ? "border-gold-400/60" : "border-gold-700/20"
      } px-3 py-2 ${
        isDone
          ? "bg-bg-elevated opacity-70"
          : isTipping
          ? "bg-gold-400/[0.10]"
          : "bg-gold-400/[0.06]"
      }`}
    >
      <div>
        <p className="font-display text-xs text-gold-100">{timeLabel}</p>
        <p className="font-sans text-[9px] text-white/40 leading-tight">
          → {endTime}
        </p>
      </div>
      <div className="flex items-center justify-between gap-2 flex-wrap min-w-0">
        <div className="min-w-0 flex-1">
          <p className="font-display text-sm text-white leading-tight">
            {appt.customerName}
            {isDone && (
              <span className="ml-2 text-[9px] tracking-[0.3em] text-green-300">
                {t.doneTagDone}
                {appt.tipCents && appt.tipCents > 0
                  ? ` · +${money(appt.tipCents)} ${t.tipTag}`
                  : ""}
              </span>
            )}
          </p>
          <p className="font-sans text-[11px] text-white/55 leading-tight mt-0.5 truncate">
            {appt.serviceName} · {appt.serviceDurationMin}m ·{" "}
            {money(appt.servicePriceCents)}
            {appt.customerPhone ? ` · ${appt.customerPhone}` : ""}
          </p>
          {appt.notes && (
            <p className="font-sans text-[10px] text-white/40 italic leading-tight truncate">
              “{appt.notes}”
            </p>
          )}
        </div>
        {!isDone &&
          (isTipping ? (
            <TipEntry
              onSubmit={onFinishTip}
              onCancel={onCancelTip}
              isPending={isPending}
              t={t}
            />
          ) : (
            <div className="flex gap-1.5 shrink-0">
              <button
                type="button"
                onClick={onStartTip}
                disabled={isPending}
                className="inline-flex items-center px-2 py-0.5 text-[9px] tracking-[0.2em] font-semibold bg-gold-400/15 border border-gold-400/50 text-gold-100 rounded-sm hover:bg-gold-400/25 transition disabled:opacity-60"
              >
                {t.done}
              </button>
              <button
                type="button"
                onClick={onCancel}
                disabled={isPending}
                className="inline-flex items-center px-2 py-0.5 text-[9px] tracking-[0.2em] font-semibold border border-pole-red/60 text-pole-red rounded-sm hover:bg-pole-red/10 transition disabled:opacity-60"
              >
                {t.cancel}
              </button>
            </div>
          ))}
      </div>
    </div>
  );
}

function TipEntry({
  onSubmit,
  onCancel,
  isPending,
  t,
}: {
  onSubmit: (tipDollars?: number) => void;
  onCancel: () => void;
  isPending: boolean;
  t: Dict["dashboard"]["slot"];
}) {
  const [tip, setTip] = useState("");

  function save(e: React.FormEvent) {
    e.preventDefault();
    const parsed = Number(tip);
    if (tip && (!Number.isFinite(parsed) || parsed < 0)) return;
    onSubmit(tip ? parsed : undefined);
  }

  return (
    <form onSubmit={save} className="flex items-center gap-1.5 shrink-0">
      <div className="relative">
        <span className="absolute left-2 top-1/2 -translate-y-1/2 font-display text-xs text-green-300">
          $
        </span>
        <input
          type="number"
          step="1"
          min="0"
          max="9999"
          value={tip}
          onChange={(e) => setTip(e.target.value)}
          placeholder={t.tipPlaceholder}
          autoFocus
          className="w-[80px] bg-bg border border-gold-400/60 rounded-sm pl-5 pr-2 py-1 font-sans text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-green-400 transition"
        />
      </div>
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center px-2 py-1 text-[9px] tracking-[0.2em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition disabled:opacity-60"
      >
        {t.save}
      </button>
      <button
        type="button"
        onClick={() => onSubmit(undefined)}
        disabled={isPending}
        className="inline-flex items-center px-2 py-1 text-[9px] tracking-[0.2em] font-semibold border border-gold-700/40 text-white/60 rounded-sm hover:text-gold-200 hover:border-gold-400/60 transition disabled:opacity-60"
      >
        {t.skip}
      </button>
      <button
        type="button"
        onClick={onCancel}
        disabled={isPending}
        aria-label="Back"
        className="w-7 h-7 inline-flex items-center justify-center text-white/60 hover:text-gold-200 transition"
      >
        <svg width="12" height="12" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 1l12 12M13 1L1 13"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </form>
  );
}

function QuickAdd({
  dateStr,
  timeStr,
  services,
  onDone,
  onError,
  t,
  editableTime = false,
}: {
  dateStr: string;
  timeStr: string;
  services: DaySlotServiceLite[];
  onDone: () => void;
  onError: (msg: string) => void;
  t: Dict["dashboard"]["slot"];
  /** Show a time picker so the barber can book any minute, not just the grid. */
  editableTime?: boolean;
}) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [time, setTime] = useState(timeStr);
  const [isPending, startTransition] = useTransition();
  const defaultService = services[0];

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    if (!trimmedName) {
      onError(t.nameRequired);
      return;
    }
    if (!defaultService) {
      onError("No services configured. Ask the owner to add one.");
      return;
    }
    if (editableTime && !time) {
      onError(t.timeLabel);
      return;
    }
    const fd = new FormData();
    fd.append("customerName", trimmedName);
    fd.append("customerEmail", "");
    fd.append("customerPhone", trimmedPhone);
    fd.append("serviceId", defaultService.id);
    fd.append("date", dateStr);
    fd.append("time", editableTime ? time : timeStr);
    fd.append("notes", "");
    onError("");
    startTransition(async () => {
      const res = await createWalkIn(fd);
      if (!res.ok) {
        onError(res.error);
        return;
      }
      onDone();
    });
  }

  return (
    <form onSubmit={submit} className="flex items-center gap-2 flex-wrap">
      {editableTime && (
        <label className="flex items-center gap-2 shrink-0">
          <span className="font-sans text-[10px] tracking-[0.2em] text-green-300">
            {t.timeLabel.toUpperCase()}
          </span>
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            required
            className="bg-bg border border-green-400/60 rounded-sm px-3 py-2 font-sans text-sm text-white focus:outline-none focus:border-green-300 transition"
          />
        </label>
      )}
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.customerName}
        autoFocus
        className="flex-1 min-w-[140px] bg-bg border border-gold-400/60 rounded-sm px-3 py-2 font-sans text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-green-400 transition"
      />
      <input
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder={t.phoneOptional}
        inputMode="tel"
        autoComplete="tel"
        className="w-[150px] bg-bg border border-gold-700/40 rounded-sm px-3 py-2 font-sans text-sm text-white placeholder:text-white/40 focus:outline-none focus:border-green-400 transition"
      />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex items-center px-4 py-2 text-xs tracking-[0.25em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition disabled:opacity-60"
      >
        {isPending ? t.saving : t.save}
      </button>
      <button
        type="button"
        onClick={onDone}
        disabled={isPending}
        aria-label="Cancel"
        className="w-8 h-8 inline-flex items-center justify-center text-white/60 hover:text-gold-200 transition"
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path
            d="M1 1l12 12M13 1L1 13"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </form>
  );
}

function combineToIso(dateStr: string, timeStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0).toISOString();
}
