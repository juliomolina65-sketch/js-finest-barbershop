"use client";

import Link from "next/link";
import { useState } from "react";

export type DayProp = {
  /** YYYY-MM-DD */
  dateStr: string;
  /** Day-of-month, e.g. 24 */
  dayOfMonth: number;
  /** Localized abbreviated weekday, e.g. "Mon" */
  dayLabel: string;
  /** Optional override that replaces dayLabel for the first two days */
  specialLabel?: string;
  /** True when the barber doesn't work this day */
  isClosed: boolean;
  /** Pre-formatted free windows ("9:00 AM – 12:30 PM") */
  windows: string[];
};

type Strings = {
  closedLabel: string;
  fullyBooked: string;
  cta: string;
};

type Props = {
  barberSlug: string;
  days: DayProp[];
  /** Index to select on initial render — first day with windows, or 0. */
  initialIndex: number;
  t: Strings;
};

export default function BarberAvailability({
  barberSlug,
  days,
  initialIndex,
  t,
}: Props) {
  const [selectedIdx, setSelectedIdx] = useState(
    Math.min(Math.max(initialIndex, 0), Math.max(days.length - 1, 0))
  );
  const selected = days[selectedIdx];
  if (!selected) return null;

  return (
    <div>
      {/* Day tab strip */}
      <div className="flex gap-2 overflow-x-auto pb-2 -mx-2 px-2 mb-8 scrollbar-thin">
        {days.map((day, idx) => {
          const isSelected = idx === selectedIdx;
          const hasWindows = day.windows.length > 0;
          const label = day.specialLabel ?? day.dayLabel;
          return (
            <button
              key={day.dateStr}
              type="button"
              onClick={() => setSelectedIdx(idx)}
              className={[
                "shrink-0 flex flex-col items-center justify-center px-4 py-3 min-w-[88px] rounded-sm border transition font-sans",
                isSelected
                  ? "border-gold-400 bg-green-700/25 text-green-100 shadow-[0_0_18px_rgba(212,175,55,0.18)]"
                  : hasWindows
                    ? "border-gold-700/40 text-white/80 hover:border-gold-400/70 hover:text-gold-100"
                    : "border-gold-700/15 text-white/35",
              ].join(" ")}
              aria-pressed={isSelected}
            >
              <span className="text-[10px] tracking-[0.25em] mb-1">
                {label.toUpperCase()}
              </span>
              <span
                className={[
                  "font-display text-2xl leading-none",
                  isSelected
                    ? "text-gold-gradient"
                    : hasWindows
                      ? "text-gold-100"
                      : "text-white/40",
                ].join(" ")}
              >
                {day.dayOfMonth}
              </span>
              <span
                className={[
                  "mt-2 h-1.5 w-1.5 rounded-full",
                  hasWindows
                    ? isSelected
                      ? "bg-green-200"
                      : "bg-green-400/70"
                    : "bg-white/15",
                ].join(" ")}
                aria-hidden
              />
            </button>
          );
        })}
      </div>

      {/* Windows for the selected day */}
      <div className="min-h-[88px] mb-8">
        {selected.isClosed ? (
          <p className="font-sans text-sm tracking-[0.2em] text-white/40 text-center py-6">
            {t.closedLabel.toUpperCase()}
          </p>
        ) : selected.windows.length === 0 ? (
          <p className="font-sans text-sm tracking-[0.2em] text-white/40 text-center py-6">
            {t.fullyBooked.toUpperCase()}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2 justify-center">
            {selected.windows.map((w) => (
              <span
                key={w}
                className="font-sans text-sm px-4 py-2 rounded-sm border border-gold-700/40 bg-bg-elevated text-green-100"
              >
                {w}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <Link
          href={`/book?barber=${barberSlug}`}
          className="inline-flex items-center justify-center px-8 py-4 text-sm tracking-[0.3em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition shadow-[0_0_30px_rgba(212,175,55,0.35)]"
        >
          {t.cta}
        </Link>
      </div>
    </div>
  );
}
