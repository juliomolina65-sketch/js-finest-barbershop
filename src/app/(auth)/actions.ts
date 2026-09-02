"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "@/lib/auth";

export type AuthResult = { ok: true } | { ok: false; error: string };

const DEFAULT_SCHEDULE = JSON.stringify([
  { dayOfWeek: 0, open: null, close: null },
  { dayOfWeek: 1, open: null, close: null },
  { dayOfWeek: 2, open: "09:00", close: "20:00" },
  { dayOfWeek: 3, open: "09:00", close: "20:00" },
  { dayOfWeek: 4, open: "09:00", close: "20:00" },
  { dayOfWeek: 5, open: "09:00", close: "20:00" },
  { dayOfWeek: 6, open: "09:00", close: "18:00" },
]);

/** Convert "John Smith" to "john-smith", ensure uniqueness against existing slugs. */
async function generateUniqueSlug(name: string): Promise<string> {
  const base =
    name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") || "barber";

  let slug = base;
  let n = 2;
  // Loop until we find a free slug
  while (true) {
    const conflict = await prisma.barber.findUnique({ where: { slug } });
    if (!conflict) return slug;
    slug = `${base}-${n++}`;
  }
}

/**
 * Sign up flow handles two cases:
 *
 * 1. Email matches an existing barber that has no password yet (seeded staff:
 *    J, Andre). They set a password and the existing row gets activated. Their
 *    isActive value is preserved (the seeded staff stay active).
 *
 * 2. Email does NOT match an existing barber. A new Barber row is created
 *    with isActive=false (pending approval). The owner sees them in the admin
 *    panel and approves them. They are not logged in until approved.
 */
export async function signupBarber(formData: FormData): Promise<AuthResult> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const phone = String(formData.get("phone") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");

  if (!name || !email || !password) {
    return { ok: false, error: "Name, email, and password are required." };
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { ok: false, error: "Enter a valid email address." };
  }
  if (password.length < 8) {
    return { ok: false, error: "Password must be at least 8 characters." };
  }
  if (password !== confirm) {
    return { ok: false, error: "Passwords do not match." };
  }

  const existing = await prisma.barber.findUnique({ where: { email } });
  const hash = await hashPassword(password);

  if (existing) {
    if (existing.passwordHash) {
      return {
        ok: false,
        error: "An account with that email already exists. Sign in instead.",
      };
    }
    // Existing seeded staff (no password set yet) — activate their account.
    await prisma.barber.update({
      where: { id: existing.id },
      data: {
        passwordHash: hash,
        ...(name ? { name } : {}),
        ...(phone ? { phone } : {}),
      },
    });
    if (existing.isActive) {
      await createSession(existing.id);
      redirect("/dashboard");
    }
    // Seeded but somehow inactive — treat as pending
    redirect("/signup/pending");
  }

  // New self-signup: create the row in PENDING (isActive=false) state.
  const slug = await generateUniqueSlug(name);
  await prisma.barber.create({
    data: {
      slug,
      name,
      email,
      phone: phone || null,
      passwordHash: hash,
      role: "Master Barber Associate",
      bio: "",
      yearsExperience: 0,
      weeklySchedule: DEFAULT_SCHEDULE,
      specialties: "[]",
      isOwner: false,
      isActive: false,
    },
  });

  redirect("/signup/pending");
}

export async function loginBarber(formData: FormData): Promise<AuthResult> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { ok: false, error: "Email and password are required." };
  }

  const barber = await prisma.barber.findUnique({ where: { email } });
  if (!barber || !barber.passwordHash) {
    return { ok: false, error: "Invalid email or password." };
  }
  const ok = await verifyPassword(password, barber.passwordHash);
  if (!ok) {
    return { ok: false, error: "Invalid email or password." };
  }
  if (!barber.isActive) {
    return {
      ok: false,
      error:
        "Your account is awaiting owner approval. You'll be able to log in once it's activated.",
    };
  }

  await createSession(barber.id);
  redirect("/dashboard");
}

export async function logoutBarber(): Promise<void> {
  await destroySession();
  redirect("/login");
}
