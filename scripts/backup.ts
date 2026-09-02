/**
 * Backs up everything that can't be rebuilt from the repo:
 *   • the SQLite database (barbers, customers, appointments, tips)
 *   • the uploads folder (profile photos, portfolios, homepage gallery)
 *
 * Run locally:            npm run db:backup
 * Run against Railway:    railway run npm run db:backup
 *
 * Output: backups/<timestamp>/  — copy that folder somewhere safe
 * (Google Drive, external disk). Keeping it only on the same machine or the
 * same volume as the original defeats the purpose.
 */
// Loads .env locally. On Railway the variables are already in the environment,
// and a missing .env file is ignored.
import "dotenv/config";
import fs from "fs";
import path from "path";
import { UPLOAD_ROOT } from "../src/lib/storage";

function dbPathFromUrl(url: string | undefined): string | null {
  if (!url) return null;
  if (!url.startsWith("file:")) return null; // Postgres etc. — use pg_dump instead
  const raw = url.slice("file:".length);
  return path.isAbsolute(raw) ? raw : path.join(process.cwd(), "prisma", raw);
}

function stamp(): string {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}_${p(
    d.getHours()
  )}${p(d.getMinutes())}`;
}

function dirSize(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  let total = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    total += entry.isDirectory() ? dirSize(full) : fs.statSync(full).size;
  }
  return total;
}

function mb(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const outDir = path.join(process.cwd(), "backups", stamp());
fs.mkdirSync(outDir, { recursive: true });

// ---- Database ----
const dbPath = dbPathFromUrl(process.env.DATABASE_URL);
if (dbPath && fs.existsSync(dbPath)) {
  fs.copyFileSync(dbPath, path.join(outDir, "database.db"));
  console.log(`✓ database  ${mb(fs.statSync(dbPath).size)}  ← ${dbPath}`);
} else if (dbPath) {
  console.warn(`! database not found at ${dbPath} — skipped`);
} else {
  console.warn(
    "! DATABASE_URL is not a SQLite file: URL. For Postgres use pg_dump instead."
  );
}

// ---- Uploads ----
if (fs.existsSync(UPLOAD_ROOT)) {
  const dest = path.join(outDir, "uploads");
  fs.cpSync(UPLOAD_ROOT, dest, { recursive: true });
  console.log(`✓ uploads   ${mb(dirSize(UPLOAD_ROOT))}  ← ${UPLOAD_ROOT}`);
} else {
  console.warn(`! no uploads folder at ${UPLOAD_ROOT} — skipped`);
}

console.log(`\nBackup written to: ${outDir}`);
console.log("Copy this folder off the machine to make it a real backup.");
