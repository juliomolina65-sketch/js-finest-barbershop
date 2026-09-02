import fs from "fs/promises";
import path from "path";
import { safeUploadPath, mimeForExt } from "@/lib/storage";

/**
 * Serves uploaded images from the persistent upload directory (a mounted
 * volume in production). Replaces static public/ serving, which can't hold
 * runtime uploads across deploys.
 *
 * Filenames are unique per upload, so responses are safely cacheable. The one
 * exception is profile.<ext>, which is overwritten in place — the dashboard
 * cache-busts that with its own query string.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: segments } = await params;
  const relative = segments.join("/");

  const full = safeUploadPath(relative);
  if (!full) return new Response("Not found", { status: 404 });

  try {
    const file = await fs.readFile(full);
    const ext = path.extname(full).slice(1);
    // Uint8Array keeps the body a plain BodyInit across Node/Edge typings.
    return new Response(new Uint8Array(file), {
      headers: {
        "Content-Type": mimeForExt(ext),
        "Content-Length": String(file.byteLength),
        "Cache-Control": "public, max-age=3600, must-revalidate",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
