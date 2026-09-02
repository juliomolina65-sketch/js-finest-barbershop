"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentBarber } from "@/lib/auth";

export type ProfileActionResult =
  | { ok: true }
  | { ok: false; error: string };

async function requireBarber() {
  const barber = await getCurrentBarber();
  if (!barber) throw new Error("Not authenticated");
  return barber;
}

/**
 * Save profile fields (bio, role, years, specialties, phone, display name).
 * Specialties come in as one-per-line text — we normalize and store as JSON.
 */
export async function updateBarberProfile(
  formData: FormData
): Promise<ProfileActionResult> {
  const barber = await requireBarber();

  const name = String(formData.get("name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim();
  const bio = String(formData.get("bio") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const yearsRaw = String(formData.get("yearsExperience") ?? "0");
  const specialtiesRaw = String(formData.get("specialties") ?? "");

  if (!name) return { ok: false, error: "Name is required." };
  if (!role) return { ok: false, error: "Role is required." };

  const yearsExperience = Math.max(0, Math.min(99, Number(yearsRaw) || 0));

  // Specialties: one per line, max ~12, dedupe, strip blanks
  const specialties = Array.from(
    new Set(
      specialtiesRaw
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean)
    )
  ).slice(0, 12);

  // Owner can edit their own "role" but can't strip themselves of owner status
  // (we don't expose isOwner here at all). For non-owners, role is fully editable.

  await prisma.barber.update({
    where: { id: barber.id },
    data: {
      name,
      role,
      bio,
      phone: phone || null,
      yearsExperience,
      specialties: JSON.stringify(specialties),
    },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath(`/barbers/${barber.slug}`);
  revalidatePath("/barbers");
  revalidatePath("/");
  return { ok: true };
}

type ScheduleInput = { dayOfWeek: number; open: string | null; close: string | null };

/**
 * Save the barber's weekly working schedule. 7 days, each with open/close
 * "HH:MM" strings (null for closed). Validates that close > open.
 */
export async function updateBarberSchedule(
  formData: FormData
): Promise<ProfileActionResult> {
  const barber = await requireBarber();

  const days: ScheduleInput[] = [];
  for (let d = 0; d <= 6; d++) {
    const closed = formData.get(`day_${d}_closed`) === "on";
    const open = String(formData.get(`day_${d}_open`) ?? "").trim();
    const close = String(formData.get(`day_${d}_close`) ?? "").trim();
    if (closed || !open || !close) {
      days.push({ dayOfWeek: d, open: null, close: null });
      continue;
    }
    if (!/^\d{2}:\d{2}$/.test(open) || !/^\d{2}:\d{2}$/.test(close)) {
      return { ok: false, error: `Invalid time format on day ${d}.` };
    }
    if (close <= open) {
      return {
        ok: false,
        error: `Closing time must be after opening time (day ${d}).`,
      };
    }
    days.push({ dayOfWeek: d, open, close });
  }

  await prisma.barber.update({
    where: { id: barber.id },
    data: { weeklySchedule: JSON.stringify(days) },
  });

  revalidatePath("/dashboard/profile");
  revalidatePath(`/barbers/${barber.slug}`);
  revalidatePath("/book");
  return { ok: true };
}
