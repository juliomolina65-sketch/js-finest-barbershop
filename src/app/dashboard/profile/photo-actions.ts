"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCurrentBarber } from "@/lib/auth";
import { BARBERS_DIR } from "@/lib/storage";

export type PhotoActionResult =
  | { ok: true }
  | { ok: false; error: string };

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const PROFILE_EXTS = ["jpg", "jpeg", "png", "webp"];

async function requireBarber() {
  const barber = await getCurrentBarber();
  if (!barber) throw new Error("Not authenticated");
  return barber;
}

function extFromMime(mime: string): string | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

function describeRejection(file: File): string {
  if (file.type === "image/heic" || file.type === "image/heif" || /\.hei[cf]$/i.test(file.name)) {
    return "iPhone HEIC photos aren't supported yet. On your iPhone open Settings → Camera → Formats → choose 'Most Compatible' and retake, or convert the image to JPEG first.";
  }
  return "Only JPEG, PNG, and WebP images are supported.";
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function deleteExistingProfilePhotos(slug: string) {
  const dir = path.join(BARBERS_DIR, slug);
  await ensureDir(dir);
  for (const ext of PROFILE_EXTS) {
    const p = path.join(dir, `profile.${ext}`);
    try {
      await fs.unlink(p);
    } catch {
      /* file didn't exist — fine */
    }
  }
}

export async function uploadProfilePhoto(
  formData: FormData
): Promise<PhotoActionResult> {
  const barber = await requireBarber();
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, error: "No file uploaded." };
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "Image must be 12MB or smaller." };
  }
  const ext = extFromMime(file.type);
  if (!ext) {
    return { ok: false, error: describeRejection(file) };
  }

  const dir = path.join(BARBERS_DIR, barber.slug);
  await ensureDir(dir);
  await deleteExistingProfilePhotos(barber.slug);

  const buf = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(dir, `profile.${ext}`), buf);

  revalidatePath("/dashboard/profile");
  revalidatePath(`/barbers/${barber.slug}`);
  revalidatePath("/barbers");
  revalidatePath("/");
  return { ok: true };
}

export async function removeProfilePhoto(): Promise<PhotoActionResult> {
  const barber = await requireBarber();
  await deleteExistingProfilePhotos(barber.slug);
  revalidatePath("/dashboard/profile");
  revalidatePath(`/barbers/${barber.slug}`);
  revalidatePath("/barbers");
  revalidatePath("/");
  return { ok: true };
}

export async function uploadWorkPhotos(
  formData: FormData
): Promise<PhotoActionResult> {
  const barber = await requireBarber();
  const files = formData.getAll("files") as File[];
  if (files.length === 0) return { ok: false, error: "No files uploaded." };
  if (files.length > 12) {
    return { ok: false, error: "Upload up to 12 photos at a time." };
  }

  const dir = path.join(BARBERS_DIR, barber.slug, "work");
  await ensureDir(dir);

  for (const file of files) {
    if (file.size === 0) continue;
    if (file.size > MAX_BYTES) {
      return { ok: false, error: `"${file.name}" is over 12MB. Resize and try again.` };
    }
    const ext = extFromMime(file.type);
    if (!ext) {
      return { ok: false, error: `"${file.name}" — ${describeRejection(file)}` };
    }
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(dir, filename), buf);
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/barbers/${barber.slug}`);
  return { ok: true };
}

export async function removeWorkPhoto(
  filename: string
): Promise<PhotoActionResult> {
  const barber = await requireBarber();

  // Reject any filename that tries to escape the work/ folder
  if (filename.includes("/") || filename.includes("\\") || filename.includes("..")) {
    return { ok: false, error: "Invalid filename." };
  }
  const target = path.join(BARBERS_DIR, barber.slug, "work", filename);
  try {
    await fs.unlink(target);
  } catch {
    return { ok: false, error: "Photo not found." };
  }

  revalidatePath("/dashboard/profile");
  revalidatePath(`/barbers/${barber.slug}`);
  return { ok: true };
}
