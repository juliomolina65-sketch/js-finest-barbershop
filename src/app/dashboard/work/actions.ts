"use server";

import fs from "fs/promises";
import path from "path";
import { revalidatePath } from "next/cache";
import { getCurrentBarber } from "@/lib/auth";
import { WORK_DIR } from "@/lib/storage";

export type WorkActionResult = { ok: true } | { ok: false; error: string };

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const MAX_PER_UPLOAD = 20;

/** Owner or admin. Everyone else is rejected. */
async function requireAdmin() {
  const barber = await getCurrentBarber();
  if (!barber) throw new Error("Not authenticated");
  if (!barber.isOwner && !barber.isAdmin) {
    throw new Error("Admin access required");
  }
  return barber;
}

function extFromMime(mime: string): string | null {
  if (mime === "image/jpeg") return "jpg";
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  return null;
}

function describeRejection(file: File): string {
  if (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    /\.hei[cf]$/i.test(file.name)
  ) {
    return "iPhone HEIC photos aren't supported yet. On your iPhone open Settings → Camera → Formats → choose 'Most Compatible' and retake, or convert the image to JPEG first.";
  }
  return "Only JPEG, PNG, and WebP images are supported.";
}

/** Refresh every surface that renders the homepage gallery. */
function revalidateGallery() {
  revalidatePath("/dashboard/work");
  revalidatePath("/");
}

/**
 * Add one or more photos to the homepage "Our Work" gallery.
 * Files land in the persistent uploads volume with timestamped names so each
 * upload gets a fresh URL (no browser cache staleness).
 */
export async function uploadWorkPhotos(
  formData: FormData
): Promise<WorkActionResult> {
  await requireAdmin();

  const files = formData.getAll("files").filter(Boolean) as File[];
  if (files.length === 0) return { ok: false, error: "No files selected." };
  if (files.length > MAX_PER_UPLOAD) {
    return {
      ok: false,
      error: `Please upload ${MAX_PER_UPLOAD} photos or fewer at a time.`,
    };
  }

  await fs.mkdir(WORK_DIR, { recursive: true });

  for (const file of files) {
    if (!file || file.size === 0) continue;
    if (file.size > MAX_BYTES) {
      return { ok: false, error: `"${file.name}" is larger than 12MB.` };
    }
    const ext = extFromMime(file.type);
    if (!ext) return { ok: false, error: describeRejection(file) };

    const unique = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const buf = Buffer.from(await file.arrayBuffer());
    await fs.writeFile(path.join(WORK_DIR, unique), buf);
  }

  revalidateGallery();
  return { ok: true };
}

/** Remove one photo from the homepage gallery by filename. */
export async function removeWorkPhoto(
  filename: string
): Promise<WorkActionResult> {
  await requireAdmin();

  // Reject any path trickery — only a bare filename inside the work dir is valid.
  const base = path.basename(filename);
  if (base !== filename || base.includes("..")) {
    return { ok: false, error: "Invalid file." };
  }

  const target = path.join(WORK_DIR, base);
  if (!target.startsWith(WORK_DIR)) {
    return { ok: false, error: "Invalid file." };
  }

  try {
    await fs.unlink(target);
  } catch {
    return { ok: false, error: "That photo no longer exists." };
  }

  revalidateGallery();
  return { ok: true };
}
