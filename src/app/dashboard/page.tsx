import { getCurrentBarber } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import type { ScheduleDay } from "@/lib/booking";
import { formatLocalDate } from "@/lib/booking";
import { getDict } from "@/lib/i18n";
import DashboardClient from "./DashboardClient";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const barber = await getCurrentBarber();
  if (!barber) redirect("/login");

  // Anchor "today" to local midnight
  const today = new Date();
  const dayStart = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    0,
    0,
    0,
    0
  );
  const dayEnd = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate(),
    23,
    59,
    59,
    999
  );
  const weekEnd = new Date(dayStart);
  weekEnd.setDate(dayStart.getDate() + 7);

  // 1. Today's confirmed appointments for this barber
  const todays = await prisma.appointment.findMany({
    where: {
      claimedById: barber.id,
      status: { in: ["CONFIRMED", "COMPLETED"] },
      startAt: { gte: dayStart, lte: dayEnd },
    },
    include: { service: true, customer: true },
    orderBy: { startAt: "asc" },
  });

  // 2. Upcoming confirmed appointments for this barber (next 7 days, excl. today)
  const upcoming = await prisma.appointment.findMany({
    where: {
      claimedById: barber.id,
      status: "CONFIRMED",
      startAt: { gt: dayEnd, lt: weekEnd },
    },
    include: { service: true, customer: true },
    orderBy: { startAt: "asc" },
  });

  // 3. Pending requests this barber can claim
  const pendingForMe = await prisma.appointment.findMany({
    where: {
      status: "PENDING",
      preferredBarberId: barber.id,
      startAt: { gte: dayStart, lt: weekEnd },
    },
    include: { service: true, customer: true },
    orderBy: { startAt: "asc" },
  });

  const pendingAnyone = await prisma.appointment.findMany({
    where: {
      status: "PENDING",
      preferredBarberId: null,
      startAt: { gte: dayStart, lt: weekEnd },
    },
    include: { service: true, customer: true },
    orderBy: { startAt: "asc" },
  });

  // Filter pendingAnyone to ones within this barber's working hours
  let weeklySchedule: ScheduleDay[] = [];
  try {
    const parsed = JSON.parse(barber.weeklySchedule);
    if (Array.isArray(parsed)) weeklySchedule = parsed;
  } catch {
    /* empty */
  }
  const within = (a: typeof pendingAnyone[number]) => {
    const dow = a.startAt.getDay();
    const day = weeklySchedule.find((s) => s.dayOfWeek === dow);
    if (!day || !day.open || !day.close) return false;
    const [oh, om] = day.open.split(":").map(Number);
    const [ch, cm] = day.close.split(":").map(Number);
    const openMin = oh * 60 + om;
    const closeMin = ch * 60 + cm;
    const startMin = a.startAt.getHours() * 60 + a.startAt.getMinutes();
    const endMin = a.endAt.getHours() * 60 + a.endAt.getMinutes();
    return startMin >= openMin && endMin <= closeMin;
  };
  const pendingAnyoneFiltered = pendingAnyone.filter(within);

  // 4. Services + today's working hours for the slot grid
  const services = await prisma.service.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" },
  });

  const todayDow = today.getDay();
  const todaySched = weeklySchedule.find((s) => s.dayOfWeek === todayDow) ?? null;
  const todaySchedule =
    todaySched && todaySched.open && todaySched.close
      ? { open: todaySched.open, close: todaySched.close }
      : null;

  const dict = await getDict();

  return (
    <DashboardClient
      barber={{
        id: barber.id,
        name: barber.name,
        role: barber.role,
        isOwner: barber.isOwner,
      }}
      todayDateStr={formatLocalDate(today)}
      todaySchedule={todaySchedule}
      todays={serializeAppointments(todays)}
      upcoming={serializeAppointments(upcoming)}
      pendingForMe={serializeAppointments(pendingForMe)}
      pendingAnyone={serializeAppointments(pendingAnyoneFiltered)}
      services={services.map((s) => ({
        id: s.id,
        name: s.name,
        priceCents: s.priceCents,
        durationMin: s.durationMin,
      }))}
      t={dict.dashboard}
    />
  );
}

type ApptRow = Awaited<
  ReturnType<typeof prisma.appointment.findMany<{ include: { service: true; customer: true } }>>
>[number];

function serializeAppointments(rows: ApptRow[]) {
  return rows.map((a) => ({
    id: a.id,
    startAt: a.startAt.toISOString(),
    endAt: a.endAt.toISOString(),
    status: a.status,
    notes: a.notes,
    tipCents: a.tipCents,
    customerName: a.customer.name,
    customerEmail: a.customer.email,
    customerPhone: a.customer.phone,
    customerEmailIsWalkIn: a.customer.email.endsWith("@jsfinest.local"),
    serviceName: a.service.name,
    serviceDurationMin: a.service.durationMin,
    servicePriceCents: a.service.priceCents,
  }));
}
