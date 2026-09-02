"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getCurrentBarber } from "@/lib/auth";

export type AdminActionResult = { ok: true } | { ok: false; error: string };

async function requireOwner() {
  const current = await getCurrentBarber();
  if (!current) throw new Error("Not authenticated");
  if (!current.isOwner) throw new Error("Owner only");
  return current;
}

/** Approve a pending barber: flip isActive to true so they can log in. */
export async function approveBarber(
  barberId: string
): Promise<AdminActionResult> {
  await requireOwner();
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) return { ok: false, error: "Barber not found." };
  if (barber.isActive) return { ok: false, error: "Already active." };
  await prisma.barber.update({
    where: { id: barberId },
    data: { isActive: true },
  });
  revalidatePath("/dashboard/admin");
  revalidatePath("/barbers");
  return { ok: true };
}

/** Deactivate a barber: hide from customer site, prevent login. Reversible. */
export async function deactivateBarber(
  barberId: string
): Promise<AdminActionResult> {
  const owner = await requireOwner();
  if (barberId === owner.id) {
    return { ok: false, error: "You can't deactivate yourself." };
  }
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) return { ok: false, error: "Barber not found." };
  if (!barber.isActive) return { ok: false, error: "Already deactivated." };
  await prisma.barber.update({
    where: { id: barberId },
    data: { isActive: false },
  });
  revalidatePath("/dashboard/admin");
  revalidatePath("/barbers");
  return { ok: true };
}

/** Reactivate a previously-deactivated barber. */
export async function reactivateBarber(
  barberId: string
): Promise<AdminActionResult> {
  await requireOwner();
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) return { ok: false, error: "Barber not found." };
  if (barber.isActive) return { ok: false, error: "Already active." };
  await prisma.barber.update({
    where: { id: barberId },
    data: { isActive: true },
  });
  revalidatePath("/dashboard/admin");
  revalidatePath("/barbers");
  return { ok: true };
}

/**
 * Grant admin rights: lets this barber add and remove photos in the homepage
 * "Our Work" gallery. Owner-only.
 */
export async function makeAdmin(barberId: string): Promise<AdminActionResult> {
  await requireOwner();
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) return { ok: false, error: "Barber not found." };
  if (!barber.isActive) {
    return { ok: false, error: "Approve this barber before making them an admin." };
  }
  if (barber.isAdmin) return { ok: false, error: "Already an admin." };
  await prisma.barber.update({
    where: { id: barberId },
    data: { isAdmin: true },
  });
  revalidatePath("/dashboard/admin");
  return { ok: true };
}

/** Revoke admin rights. Owner-only. Owners always keep their own access. */
export async function removeAdmin(barberId: string): Promise<AdminActionResult> {
  await requireOwner();
  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) return { ok: false, error: "Barber not found." };
  if (barber.isOwner) {
    return { ok: false, error: "The owner always has admin access." };
  }
  if (!barber.isAdmin) return { ok: false, error: "Not an admin." };
  await prisma.barber.update({
    where: { id: barberId },
    data: { isAdmin: false },
  });
  revalidatePath("/dashboard/admin");
  return { ok: true };
}
