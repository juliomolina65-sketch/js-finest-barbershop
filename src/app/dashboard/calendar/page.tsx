import { redirect } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getCurrentBarber } from "@/lib/auth";
import { formatLocalDate, type ScheduleDay } from "@/lib/booking";
import { getDict } from "@/lib/i18n";
import CalendarClient from "./CalendarClient";

export const dynamic = "force-dynamic";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_LABELS_FULL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const barber = await getCurrentBarber();
  if (!barber) redirect("/login");

  const { date: dateParam } = await searchParams;

  // Parse weekly schedule once (used in both views)
  let weeklySchedule: ScheduleDay[] = [];
  try {
    const parsed = JSON.parse(barber.weeklySchedule);
    if (Array.isArray(parsed)) weeklySchedule = parsed;
  } catch {
    /* empty */
  }

  // ============ NO DATE → PICK A DAY ============
  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return <DayPickerView barber={barber} weeklySchedule={weeklySchedule} />;
  }

  // ============ DATE GIVEN → SHOW DAY'S SLOT GRID ============
  const today = new Date();
  const todayStr = formatLocalDate(today);
  const dateStr = dateParam;
  const [y, m, d] = dateStr.split("-").map(Number);
  const refDate = new Date(y, m - 1, d);
  const dow = refDate.getDay();

  const todaySched = weeklySchedule.find((s) => s.dayOfWeek === dow) ?? null;

  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

  const appointments = await prisma.appointment.findMany({
    where: {
      claimedById: barber.id,
      status: { in: ["CONFIRMED", "COMPLETED"] },
      startAt: { gte: dayStart, lte: dayEnd },
    },
    include: { service: true, customer: true },
    orderBy: { startAt: "asc" },
  });

  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const isToday = dateStr === todayStr;

  return (
    <section className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 md:py-12">
      <div className="mb-6 flex items-center gap-4 flex-wrap">
        <Link
          href="/dashboard/calendar"
          className="font-sans text-xs tracking-[0.3em] text-green-300 hover:text-gold-200 transition"
        >
          ← ALL DAYS
        </Link>
        <span className="font-sans text-xs text-white/30">·</span>
        <Link
          href="/dashboard"
          className="font-sans text-xs tracking-[0.3em] text-white/50 hover:text-gold-200 transition"
        >
          DASHBOARD
        </Link>
      </div>

      <div className="mb-8">
        <p className="font-sans text-xs tracking-[0.4em] text-green-300">
          {barber.name.toUpperCase()}&apos;S CALENDAR
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-gold-gradient">
          {DAY_LABELS_FULL[dow]}, {refDate.toLocaleDateString([], {
            month: "long",
            day: "numeric",
          })}
          {isToday && (
            <span className="ml-3 text-sm tracking-[0.3em] text-green-300 align-middle">
              · TODAY
            </span>
          )}
        </h1>
        <p className="font-sans text-sm text-white/70 mt-2 max-w-xl">
          Tap any empty time below to drop a customer in.
        </p>
      </div>

      <CalendarClient
        barberId={barber.id}
        dateStr={dateStr}
        isToday={isToday}
        schedule={
          todaySched && todaySched.open && todaySched.close
            ? { open: todaySched.open, close: todaySched.close }
            : null
        }
        appointments={appointments.map((a) => ({
          id: a.id,
          startAt: a.startAt.toISOString(),
          endAt: a.endAt.toISOString(),
          status: a.status,
          notes: a.notes,
          tipCents: a.tipCents,
          customerName: a.customer.name,
          customerPhone: a.customer.phone,
          customerEmailIsWalkIn: a.customer.email.endsWith("@jsfinest.local"),
          customerEmail: a.customer.email,
          serviceName: a.service.name,
          serviceDurationMin: a.service.durationMin,
          servicePriceCents: a.service.priceCents,
        }))}
        services={services.map((s) => ({
          id: s.id,
          name: s.name,
          durationMin: s.durationMin,
          priceCents: s.priceCents,
        }))}
        t={(await getDict()).dashboard.slot}
      />
    </section>
  );
}

/* ============================================================
 * Day picker view — what the barber sees when they hit the
 * calendar page with no specific date.
 * ============================================================ */

async function DayPickerView({
  barber,
  weeklySchedule,
}: {
  barber: { id: string; name: string };
  weeklySchedule: ScheduleDay[];
}) {
  const DAYS_AHEAD = 14;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeEnd = new Date(today);
  rangeEnd.setDate(today.getDate() + DAYS_AHEAD);

  // Fetch all appointments in the range so we can count per day
  const appts = await prisma.appointment.findMany({
    where: {
      claimedById: barber.id,
      status: { in: ["CONFIRMED", "COMPLETED"] },
      startAt: { gte: today, lt: rangeEnd },
    },
    select: { startAt: true, status: true },
  });

  // Build per-day counts
  const dayMap = new Map<
    string,
    { confirmed: number; completed: number }
  >();
  for (const a of appts) {
    const key = formatLocalDate(a.startAt);
    const cur = dayMap.get(key) ?? { confirmed: 0, completed: 0 };
    if (a.status === "COMPLETED") cur.completed++;
    else cur.confirmed++;
    dayMap.set(key, cur);
  }

  // Build 14 days
  const days = [];
  for (let i = 0; i < DAYS_AHEAD; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = formatLocalDate(d);
    const dow = d.getDay();
    const sched = weeklySchedule.find((s) => s.dayOfWeek === dow);
    const isClosed = !sched || !sched.open || !sched.close;
    const counts = dayMap.get(key) ?? { confirmed: 0, completed: 0 };
    days.push({
      dateStr: key,
      dayOfWeek: dow,
      dayLabel: DAY_LABELS[dow],
      dayLabelFull: DAY_LABELS_FULL[dow],
      monthLabel: d.toLocaleDateString([], { month: "short" }),
      dayNumber: d.getDate(),
      isClosed,
      schedule: sched && sched.open && sched.close ? sched : null,
      bookings: counts.confirmed + counts.completed,
      isToday: i === 0,
    });
  }

  return (
    <section className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 md:py-12">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="font-sans text-xs tracking-[0.3em] text-green-300 hover:text-gold-200 transition"
        >
          ← BACK TO DASHBOARD
        </Link>
      </div>

      <div className="mb-8">
        <p className="font-sans text-xs tracking-[0.4em] text-green-300">
          {barber.name.toUpperCase()}&apos;S CALENDAR
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-gold-gradient">
          Pick a Day
        </h1>
        <p className="font-sans text-sm text-white/70 mt-2 max-w-xl">
          Next 14 days — tap a day to see your hours and add bookings.
        </p>
      </div>

      <ul className="space-y-2">
        {days.map((d) => (
          <li key={d.dateStr}>
            {d.isClosed ? (
              <div className="bg-bg-card/40 border border-dashed border-gold-700/20 rounded-sm px-4 py-3 grid grid-cols-[64px_1fr_auto] items-center gap-3 opacity-60">
                <div className="text-center">
                  <p className="font-sans text-[10px] tracking-[0.25em] text-white/40">
                    {d.dayLabel.toUpperCase()}
                  </p>
                  <p className="font-display text-xl text-white/40 leading-none">
                    {d.dayNumber}
                  </p>
                  <p className="font-sans text-[10px] text-white/30">
                    {d.monthLabel}
                  </p>
                </div>
                <div>
                  <p className="font-display text-sm text-white/50">
                    {d.dayLabelFull}
                  </p>
                  <p className="font-sans text-xs text-white/40">Closed</p>
                </div>
                <span className="font-sans text-[10px] tracking-[0.25em] text-white/30">
                  OFF
                </span>
              </div>
            ) : (
              <Link
                href={`/dashboard/calendar?date=${d.dateStr}`}
                className="block bg-bg-card border border-gold-700/40 rounded-sm px-4 py-3 grid grid-cols-[64px_1fr_auto] items-center gap-3 hover:border-gold-400/60 hover:bg-green-400/[0.06] transition group"
              >
                <div className="text-center">
                  <p className="font-sans text-[10px] tracking-[0.25em] text-green-300">
                    {d.dayLabel.toUpperCase()}
                  </p>
                  <p className="font-display text-xl text-gold-100 leading-none">
                    {d.dayNumber}
                  </p>
                  <p className="font-sans text-[10px] text-white/40">
                    {d.monthLabel}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="font-display text-sm text-white">
                    {d.dayLabelFull}
                    {d.isToday && (
                      <span className="ml-2 text-[10px] tracking-[0.25em] text-green-300">
                        TODAY
                      </span>
                    )}
                  </p>
                  <p className="font-sans text-xs text-white/55">
                    {d.schedule
                      ? `${fmt12h(d.schedule.open!)} – ${fmt12h(d.schedule.close!)}`
                      : ""}
                    {d.bookings > 0
                      ? ` · ${d.bookings} booked`
                      : " · open"}
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1.5 text-[10px] tracking-[0.25em] font-semibold bg-gold-400/15 border border-gold-400/50 text-gold-100 rounded-sm group-hover:bg-gradient-to-b group-hover:from-gold-100 group-hover:to-gold-600 group-hover:text-black group-hover:border-gold-400 transition">
                  VIEW
                </span>
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function fmt12h(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}
