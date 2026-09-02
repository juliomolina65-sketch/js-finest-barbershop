import path from "path";

/**
 * Where user-uploaded files live: barber profile photos, barber portfolios,
 * and the homepage "Our Work" gallery.
 *
 *   Local dev  →  <project>/uploads
 *   Railway    →  UPLOAD_DIR=/data/uploads  (a mounted persistent volume)
 *
 * These deliberately do NOT live in public/. Next.js serves public/ as it
 * existed when the app was BUILT, so anything uploaded at runtime disappears
 * on the next deploy. Files here are served by the route handler at
 * src/app/uploads/[...path]/route.ts instead, which reads from disk on
 * every request.
 */
export const UPLOAD_ROOT =
  process.env.UPLOAD_DIR ||
  // turbopackIgnore keeps the bundler from tracing the whole project just
  // because this touches cwd — the path is fixed, not a dynamic import.
  path.join(/* turbopackIgnore: true */ process.cwd(), "uploads");

/** public/barbers/<slug>/... equivalent — one folder per barber. */
export const BARBERS_DIR = path.join(UPLOAD_ROOT, "barbers");

/** Curated homepage gallery photos managed by owner/admins. */
export const WORK_DIR = path.join(UPLOAD_ROOT, "work");

/** URL prefix these files are served under. */
export const UPLOAD_URL_PREFIX = "/uploads";

/** Image extensions we accept and serve. */
export const PHOTO_EXTS = ["jpg", "jpeg", "png", "webp", "gif"] as const;

/**
 * Resolve a caller-supplied relative path inside UPLOAD_ROOT, or null if it
 * escapes the root (path traversal) or isn't an image we serve.
 */
export function safeUploadPath(relative: string): string | null {
  const normalized = path
    .normalize(relative)
    .replace(/^(\.\.(\/|\\|$))+/, "");
  const full = path.join(UPLOAD_ROOT, normalized);

  // Must stay inside the upload root.
  if (full !== UPLOAD_ROOT && !full.startsWith(UPLOAD_ROOT + path.sep)) {
    return null;
  }
  const ext = path.extname(full).slice(1).toLowerCase();
  if (!PHOTO_EXTS.includes(ext as (typeof PHOTO_EXTS)[number])) return null;

  return full;
}

/** Content-Type for a file extension. */
export function mimeForExt(ext: string): string {
  switch (ext.toLowerCase()) {
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}
