"use server";

import {
  createReservation,
  getAvailableSlots,
  type Slot,
  type ReservationResult,
} from "@/lib/booking";

export async function fetchSlots(
  dateStr: string,
  serviceId: string
): Promise<Slot[]> {
  return getAvailableSlots(dateStr, serviceId);
}

export async function reserveAppointment(params: {
  serviceId: string;
  startAt: string;
  preferredBarberId: string | null;
  customer: { name: string; email: string; phone: string };
  notes?: string;
}): Promise<ReservationResult> {
  return createReservation(params);
}
