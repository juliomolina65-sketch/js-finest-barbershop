import { prisma } from "./db";

/** Schedule entry stored as JSON on each Barber row. */
export type ScheduleDay = {
  /** 0 = Sunday ... 6 = Saturday */
  dayOfWeek: number;
  /** "HH:MM" 24-hour, or null when closed */
  open: string | null;
  close: string | null;
};

export type Slot = {
  /** ISO string for transport across the server/client boundary */
  startAt: string;
  endAt: string;
  /** IDs of barbers whose hours include this slot AND who have no confirmed conflict */
  availableBarberIds: string[];
};

/**
 * Returns YYYY-MM-DD for a Date in the LOCAL timezone (not UTC).
 * The booking system works in shop-local time.
 */
export function formatLocalDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Combine a YYYY-MM-DD date string with an "HH:MM" time string into a Date
 * in the local timezone.
 */
function combineDateTime(dateStr: string, timeStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return new Date(y, m - 1, d, hh, mm, 0, 0);
}

/** Slot generation cadence in minutes. Services start every N min. */
const SLOT_STEP_MIN = 30;

/** Minimum lead time before an appointment can start, in minutes. */
const MIN_LEAD_MIN = 60;

/**
 * Given a date string (YYYY-MM-DD) and a service ID, return all available
 * time slots. A slot is "available" when at least one barber is working,
 * has no confirmed conflict, and isn't already promised to a pending request.
 */
export async function getAvailableSlots(
  dateStr: string,
  serviceId: string
): Promise<Slot[]> {
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });
  if (!service || !service.isActive) return [];

  const [y, m, d] = dateStr.split("-").map(Number);
  const refDate = new Date(y, m - 1, d);
  const dayOfWeek = refDate.getDay();

  const barbers = await prisma.barber.findMany({
    // Only bookable barbers create capacity — an admin-only owner must not
    // make a slot look available.
    where: { isActive: true, takesAppointments: true },
  });

  // Existing appointments that day (both PENDING and CONFIRMED hold capacity)
  const dayStart = new Date(y, m - 1, d, 0, 0, 0, 0);
  const dayEnd = new Date(y, m - 1, d, 23, 59, 59, 999);

  const existing = await prisma.appointment.findMany({
    where: {
      startAt: { gte: dayStart, lte: dayEnd },
      status: { in: ["PENDING", "CONFIRMED"] },
    },
    select: {
      startAt: true,
      endAt: true,
      status: true,
      preferredBarberId: true,
      claimedById: true,
    },
  });

  // Each barber's working window today (if any)
  type WorkingBarber = { id: string; open: Date; close: Date };
  const working: WorkingBarber[] = [];
  for (const b of barbers) {
    const schedule = JSON.parse(b.weeklySchedule) as ScheduleDay[];
    const today = schedule.find((s) => s.dayOfWeek === dayOfWeek);
    if (!today || !today.open || !today.close) continue;
    working.push({
      id: b.id,
      open: combineDateTime(dateStr, today.open),
      close: combineDateTime(dateStr, today.close),
    });
  }
  if (working.length === 0) return [];

  const earliestOpen = working.reduce(
    (acc, w) => (w.open < acc ? w.open : acc),
    working[0].open
  );
  const latestClose = working.reduce(
    (acc, w) => (w.close > acc ? w.close : acc),
    working[0].close
  );

  const slotMs = service.durationMin * 60 * 1000;
  const stepMs = SLOT_STEP_MIN * 60 * 1000;

  const slots: Slot[] = [];
  const minStartAt = Date.now() + MIN_LEAD_MIN * 60 * 1000;

  for (
    let t = earliestOpen.getTime();
    t + slotMs <= latestClose.getTime();
    t += stepMs
  ) {
    const slotStart = new Date(t);
    const slotEnd = new Date(t + slotMs);

    // Slot must start at least MIN_LEAD_MIN minutes from now
    if (slotStart.getTime() < minStartAt) continue;

    // 1. Find barbers physically working this slot
    const workingHere = working.filter(
      (w) => slotStart >= w.open && slotEnd <= w.close
    );
    if (workingHere.length === 0) continue;

    // 2. Of those, eliminate barbers with a confirmed/claimed conflict
    const claimedConflictByBarber = new Set(
      existing
        .filter(
          (a) =>
            a.claimedById &&
            a.startAt.getTime() < slotEnd.getTime() &&
            a.endAt.getTime() > slotStart.getTime()
        )
        .map((a) => a.claimedById!)
    );

    // 3. Eliminate barbers who are "soft locked" by a pending request that names them
    const pendingPreferredByBarber = new Set(
      existing
        .filter(
          (a) =>
            a.status === "PENDING" &&
            a.preferredBarberId &&
            !a.claimedById &&
            a.startAt.getTime() < slotEnd.getTime() &&
            a.endAt.getTime() > slotStart.getTime()
        )
        .map((a) => a.preferredBarberId!)
    );

    const freeBarbers = workingHere.filter(
      (w) =>
        !claimedConflictByBarber.has(w.id) &&
        !pendingPreferredByBarber.has(w.id)
    );

    // 4. "Anyone" pending requests at this time consume one free barber each
    const anyPendingCount = existing.filter(
      (a) =>
        a.status === "PENDING" &&
        !a.preferredBarberId &&
        !a.claimedById &&
        a.startAt.getTime() < slotEnd.getTime() &&
        a.endAt.getTime() > slotStart.getTime()
    ).length;

    const effectiveCapacity = freeBarbers.length - anyPendingCount;
    if (effectiveCapacity <= 0) continue;

    slots.push({
      startAt: slotStart.toISOString(),
      endAt: slotEnd.toISOString(),
      availableBarberIds: freeBarbers.map((b) => b.id),
    });
  }

  return slots;
}

/** A single continuous free window on a barber's calendar. */
export type OpenWindow = {
  startAt: string; // ISO
  endAt: string; // ISO
};

/** Per-day availability summary for a single barber. */
export type BarberDayAvailability = {
  dateStr: string; // YYYY-MM-DD in shop-local time
  dayOfWeek: number; // 0 = Sun ... 6 = Sat
  isClosed: boolean; // true when this barber doesn't work this day
  windows: OpenWindow[]; // free continuous windows (≥ MIN_WINDOW_MIN)
};

/** Minimum length we'll bother displaying as a "free window". */
const MIN_WINDOW_MIN = 20;

/**
 * Returns the next `daysAhead` days of free windows for one barber.
 * Used on the public profile page to show real-time availability.
 *
 * "Busy" for this barber means:
 *  - any PENDING/CONFIRMED appointment where claimedById === barberId, OR
 *  - any PENDING appointment that named this barber as preferred and is not
 *    yet claimed (soft-lock — they could still take it).
 * "Anyone Available" pending requests are NOT subtracted here because they
 * aren't pinned to a specific barber until a barber claims them.
 */
export async function getBarberOpenWindows(
  barberId: string,
  daysAhead: number = 7
): Promise<BarberDayAvailability[]> {
  // No isActive gate here — the profile page decides who may view an inactive
  // barber (owner preview); active-only filtering for customers happens there.
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) return [];

  let schedule: ScheduleDay[] = [];
  try {
    schedule = JSON.parse(barber.weeklySchedule) as ScheduleDay[];
  } catch {
    return [];
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rangeStart = today;
  const rangeEnd = new Date(today);
  rangeEnd.setDate(today.getDate() + daysAhead);
  rangeEnd.setHours(23, 59, 59, 999);

  const busy = await prisma.appointment.findMany({
    where: {
      startAt: { gte: rangeStart, lte: rangeEnd },
      status: { in: ["PENDING", "CONFIRMED"] },
      OR: [
        { claimedById: barberId },
        {
          preferredBarberId: barberId,
          claimedById: null,
          status: "PENDING",
        },
      ],
    },
    select: { startAt: true, endAt: true },
  });

  const minStartAt = Date.now() + MIN_LEAD_MIN * 60 * 1000;
  const minWindowMs = MIN_WINDOW_MIN * 60 * 1000;

  const out: BarberDayAvailability[] = [];

  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();
    const dateStr = formatLocalDate(d);

    const day = schedule.find((s) => s.dayOfWeek === dow);
    if (!day || !day.open || !day.close) {
      out.push({ dateStr, dayOfWeek: dow, isClosed: true, windows: [] });
      continue;
    }

    const dayOpen = combineDateTime(dateStr, day.open).getTime();
    const dayClose = combineDateTime(dateStr, day.close).getTime();

    // Effective start for today only — push past the lead-time floor.
    const effectiveOpen = i === 0 ? Math.max(dayOpen, minStartAt) : dayOpen;
    if (effectiveOpen >= dayClose) {
      out.push({ dateStr, dayOfWeek: dow, isClosed: false, windows: [] });
      continue;
    }

    // Busy intervals clipped to [effectiveOpen, dayClose], sorted by start.
    const intervals = busy
      .map((b) => ({
        start: Math.max(b.startAt.getTime(), effectiveOpen),
        end: Math.min(b.endAt.getTime(), dayClose),
      }))
      .filter((b) => b.end > b.start)
      .sort((a, b) => a.start - b.start);

    // Walk the day, emitting free gaps.
    const windows: OpenWindow[] = [];
    let cursor = effectiveOpen;
    for (const b of intervals) {
      if (b.start > cursor) {
        const gap = b.start - cursor;
        if (gap >= minWindowMs) {
          windows.push({
            startAt: new Date(cursor).toISOString(),
            endAt: new Date(b.start).toISOString(),
          });
        }
      }
      if (b.end > cursor) cursor = b.end;
    }
    if (dayClose > cursor && dayClose - cursor >= minWindowMs) {
      windows.push({
        startAt: new Date(cursor).toISOString(),
        endAt: new Date(dayClose).toISOString(),
      });
    }

    out.push({ dateStr, dayOfWeek: dow, isClosed: false, windows });
  }

  return out;
}

/**
 * Determine which days in the next N days have ANY availability for a given
 * service. Used to enable/disable dates in the calendar picker.
 */
export async function getAvailableDates(
  serviceId: string,
  daysAhead: number = 30
): Promise<string[]> {
  const out: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // For performance, fetch barbers + appointments once and reuse
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });
  if (!service) return [];

  const barbers = await prisma.barber.findMany({
    where: { isActive: true, takesAppointments: true },
  });
  const allSchedules = barbers.map((b) => ({
    id: b.id,
    days: JSON.parse(b.weeklySchedule) as ScheduleDay[],
  }));

  // A day is *potentially* available if at least one barber is working.
  // We don't subtract appointments here for speed — the time-slot screen
  // does the precise check.
  for (let i = 0; i < daysAhead; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const dow = d.getDay();
    const someoneWorking = allSchedules.some((s) => {
      const today = s.days.find((x) => x.dayOfWeek === dow);
      return today && today.open && today.close;
    });
    if (someoneWorking) out.push(formatLocalDate(d));
  }
  return out;
}

/** Result returned by createReservation server action */
export type ReservationResult =
  | { ok: true; token: string; appointmentId: string }
  | { ok: false; error: string };

/**
 * Create an appointment. Will recheck availability inside a transaction to
 * prevent two people from grabbing the same slot at the same time.
 */
export async function createReservation(params: {
  serviceId: string;
  startAt: string; // ISO
  preferredBarberId: string | null;
  customer: { name: string; email: string; phone: string };
  notes?: string;
}): Promise<ReservationResult> {
  const { serviceId, startAt, preferredBarberId, customer, notes } = params;

  // Basic input validation
  if (!customer.name.trim()) return { ok: false, error: "Name is required." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(customer.email))
    return { ok: false, error: "A valid email is required." };
  if (!customer.phone.trim()) return { ok: false, error: "Phone is required." };

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
  });
  if (!service) return { ok: false, error: "Service not found." };

  const start = new Date(startAt);
  if (Number.isNaN(start.getTime()))
    return { ok: false, error: "Invalid time selected." };
  const minStartAt = Date.now() + MIN_LEAD_MIN * 60 * 1000;
  if (start.getTime() < minStartAt)
    return {
      ok: false,
      error: `Please book at least ${MIN_LEAD_MIN} minutes in advance.`,
    };

  const end = new Date(start.getTime() + service.durationMin * 60 * 1000);

  // Recheck this slot has capacity
  const dateStr = formatLocalDate(start);
  const slots = await getAvailableSlots(dateStr, serviceId);
  const matching = slots.find((s) => s.startAt === start.toISOString());
  if (!matching)
    return {
      ok: false,
      error: "Sorry — that slot was just taken. Pick a different time.",
    };
  if (
    preferredBarberId &&
    !matching.availableBarberIds.includes(preferredBarberId)
  )
    return {
      ok: false,
      error: "That barber is no longer available at this time.",
    };

  // Upsert customer by email
  const cust = await prisma.customer.upsert({
    where: { email: customer.email.toLowerCase() },
    update: { name: customer.name, phone: customer.phone },
    create: {
      email: customer.email.toLowerCase(),
      name: customer.name,
      phone: customer.phone,
    },
  });

  // When the customer picks a SPECIFIC barber, confirm to that barber's
  // calendar directly — no claim step needed. When they pick "Anyone Available",
  // leave it PENDING so any working barber can claim it.
  const isDirectBooking = Boolean(preferredBarberId);

  const appt = await prisma.appointment.create({
    data: {
      customerId: cust.id,
      serviceId,
      preferredBarberId: preferredBarberId ?? null,
      claimedById: isDirectBooking ? preferredBarberId : null,
      startAt: start,
      endAt: end,
      status: isDirectBooking ? "CONFIRMED" : "PENDING",
      notes: notes?.trim() || null,
    },
  });

  return { ok: true, token: appt.cancelToken, appointmentId: appt.id };
}
