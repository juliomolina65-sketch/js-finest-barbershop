"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentBarber } from "@/lib/auth";
import type { ScheduleDay } from "@/lib/booking";

export type DashboardActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireBarber() {
  const barber = await getCurrentBarber();
  if (!barber) throw new Error("Not authenticated");
  return barber;
}

/**
 * Claim a pending appointment. Either the barber it was preferred for, or any
 * working barber if it was an "Anyone Available" request. First claim wins.
 */
export async function claimAppointment(
  appointmentId: string
): Promise<DashboardActionResult> {
  const barber = await requireBarber();

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appt) return { ok: false, error: "Appointment not found." };
  if (appt.status !== "PENDING") {
    return { ok: false, error: "This appointment is no longer available to claim." };
  }
  if (appt.preferredBarberId && appt.preferredBarberId !== barber.id) {
    return { ok: false, error: "This request was for a different barber." };
  }

  // Make sure the barber doesn't already have an overlapping confirmed appointment
  const conflict = await prisma.appointment.findFirst({
    where: {
      claimedById: barber.id,
      status: { in: ["CONFIRMED"] },
      startAt: { lt: appt.endAt },
      endAt: { gt: appt.startAt },
    },
  });
  if (conflict) {
    return {
      ok: false,
      error: "You already have an appointment that overlaps this time.",
    };
  }

  // Verify the slot falls within the barber's working hours
  const sched = JSON.parse(barber.weeklySchedule) as ScheduleDay[];
  const dow = appt.startAt.getDay();
  const today = sched.find((s) => s.dayOfWeek === dow);
  if (!today || !today.open || !today.close) {
    return { ok: false, error: "You're not scheduled to work that day." };
  }
  // Compare HH:MM strings against the appointment's local time
  const startMin = appt.startAt.getHours() * 60 + appt.startAt.getMinutes();
  const endMin = appt.endAt.getHours() * 60 + appt.endAt.getMinutes();
  const [oh, om] = today.open.split(":").map(Number);
  const [ch, cm] = today.close.split(":").map(Number);
  const openMin = oh * 60 + om;
  const closeMin = ch * 60 + cm;
  if (startMin < openMin || endMin > closeMin) {
    return { ok: false, error: "That time is outside your working hours." };
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: "CONFIRMED", claimedById: barber.id },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  return { ok: true };
}

/**
 * Barber manually adds a walk-in or off-platform appointment. Creates a
 * confirmed appointment directly on their calendar.
 */
export async function createWalkIn(formData: FormData): Promise<DashboardActionResult> {
  const barber = await requireBarber();

  const customerName = String(formData.get("customerName") ?? "").trim();
  const customerPhone = String(formData.get("customerPhone") ?? "").trim();
  const customerEmail = String(formData.get("customerEmail") ?? "").trim().toLowerCase();
  const serviceId = String(formData.get("serviceId") ?? "");
  const dateStr = String(formData.get("date") ?? "");
  const timeStr = String(formData.get("time") ?? "");
  const notes = String(formData.get("notes") ?? "").trim();

  if (!customerName) return { ok: false, error: "Customer name is required." };
  if (!serviceId) return { ok: false, error: "Pick a service." };
  if (!dateStr || !timeStr) return { ok: false, error: "Pick a date and time." };

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return { ok: false, error: "Service not found." };

  const [y, mo, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  const startAt = new Date(y, mo - 1, d, hh, mm, 0, 0);
  if (Number.isNaN(startAt.getTime())) {
    return { ok: false, error: "Invalid date or time." };
  }
  const endAt = new Date(startAt.getTime() + service.durationMin * 60 * 1000);

  // Check this barber doesn't already have an overlapping confirmed appointment
  const conflict = await prisma.appointment.findFirst({
    where: {
      claimedById: barber.id,
      status: { in: ["CONFIRMED"] },
      startAt: { lt: endAt },
      endAt: { gt: startAt },
    },
  });
  if (conflict) {
    return {
      ok: false,
      error: "You already have an appointment that overlaps this time.",
    };
  }

  // Upsert customer (use placeholder email when none provided so the unique
  // constraint still works)
  const emailForRow = customerEmail
    ? customerEmail
    : `walkin-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@jsfinest.local`;

  const customer = await prisma.customer.upsert({
    where: { email: emailForRow },
    update: { name: customerName, phone: customerPhone || null },
    create: {
      email: emailForRow,
      name: customerName,
      phone: customerPhone || null,
    },
  });

  await prisma.appointment.create({
    data: {
      customerId: customer.id,
      serviceId: service.id,
      claimedById: barber.id,
      preferredBarberId: barber.id,
      startAt,
      endAt,
      status: "CONFIRMED",
      notes: notes || null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  return { ok: true };
}

export async function markCompleted(
  appointmentId: string,
  tipDollars?: number
): Promise<DashboardActionResult> {
  const barber = await requireBarber();
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appt) return { ok: false, error: "Appointment not found." };
  if (appt.claimedById !== barber.id) {
    return { ok: false, error: "That's not your appointment." };
  }

  // Tip is optional; parse dollars → cents and reject anything weird
  let tipCents: number | null = null;
  if (typeof tipDollars === "number" && Number.isFinite(tipDollars) && tipDollars > 0) {
    if (tipDollars > 9999) {
      return { ok: false, error: "That tip looks too high — check the amount." };
    }
    tipCents = Math.round(tipDollars * 100);
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: "COMPLETED",
      tipCents,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  revalidatePath("/dashboard/history");
  return { ok: true };
}

export async function cancelAppointment(
  appointmentId: string
): Promise<DashboardActionResult> {
  const barber = await requireBarber();
  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });
  if (!appt) return { ok: false, error: "Appointment not found." };
  // Owner can cancel anything; barbers can only cancel their own
  if (!barber.isOwner && appt.claimedById !== barber.id) {
    return { ok: false, error: "You can only cancel your own appointments." };
  }
  if (appt.status === "COMPLETED") {
    return { ok: false, error: "This appointment is already completed." };
  }

  // If the appointment is still in the future, release it back to the pending
  // pool so any other working barber can pick it up. Only past appointments
  // get a hard cancel — there's no point putting yesterday's slot back in the
  // pool.
  const isFuture = appt.startAt.getTime() > Date.now();

  if (isFuture && appt.status === "CONFIRMED") {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        status: "PENDING",
        claimedById: null,
        // Clear the preferred barber too so any working barber sees it under
        // "Anyone Available" — otherwise it'd just bounce back to the same
        // person.
        preferredBarberId: null,
      },
    });
  } else {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: "CANCELLED" },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/calendar");
  return { ok: true };
}
