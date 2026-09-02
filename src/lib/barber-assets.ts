import fs from "fs";
import path from "path";
import {
  BARBERS_DIR,
  WORK_DIR,
  UPLOAD_URL_PREFIX,
  PHOTO_EXTS,
} from "./storage";

const PROFILE_EXTS = PHOTO_EXTS;

function isPhoto(filename: string): boolean {
  return PHOTO_EXTS.some((ext) => filename.toLowerCase().endsWith(`.${ext}`));
}

/** Files in a directory, sorted, images only. Empty when the dir is missing. */
function listPhotos(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter(isPhoto).sort();
}

/**
 * Returns the URL of the barber's profile photo if one exists at
 * <uploads>/barbers/<slug>/profile.{jpg|jpeg|png|webp|gif}, otherwise null.
 *
 * Note: no cache-busting query string here because next/image rejects unknown
 * search params by default. Customers may see a cached copy briefly after a
 * replacement; the dashboard preview cache-busts on the client instead.
 */
export function getBarberPhoto(slug: string): string | null {
  const dir = path.join(BARBERS_DIR, slug);
  for (const ext of PROFILE_EXTS) {
    if (fs.existsSync(path.join(dir, `profile.${ext}`))) {
      return `${UPLOAD_URL_PREFIX}/barbers/${slug}/profile.${ext}`;
    }
  }
  return null;
}

/**
 * URLs for every portfolio image in <uploads>/barbers/<slug>/work/.
 * Filenames are timestamp-based and unique, so each upload gets a fresh URL.
 */
export function getBarberPortfolio(slug: string): string[] {
  return listPhotos(path.join(BARBERS_DIR, slug, "work")).map(
    (f) => `${UPLOAD_URL_PREFIX}/barbers/${slug}/work/${f}`
  );
}

/** Same as getBarberPortfolio but just filenames (the dashboard deletes by name). */
export function getBarberPortfolioFilenames(slug: string): string[] {
  return listPhotos(path.join(BARBERS_DIR, slug, "work"));
}

/**
 * Flat list of { src, slug } across every barber's portfolio, round-robin
 * interleaved so no single barber dominates the homepage gallery.
 */
export function getAllPortfolioImages(
  barberSlugs: string[]
): { src: string; slug: string }[] {
  const perBarber = barberSlugs.map((slug) => ({
    slug,
    paths: getBarberPortfolio(slug),
  }));
  const out: { src: string; slug: string }[] = [];
  let added = true;
  let i = 0;
  while (added) {
    added = false;
    for (const b of perBarber) {
      if (i < b.paths.length) {
        out.push({ src: b.paths[i], slug: b.slug });
        added = true;
      }
    }
    i++;
  }
  return out;
}

/**
 * Curated "house" showcase photos from <uploads>/work/ — shop interior,
 * featured cuts, anything not tied to one barber. Managed by owner/admins at
 * /dashboard/work and shown only in the homepage "Our Work" gallery.
 */
export function getHouseWorkImages(): string[] {
  return listPhotos(WORK_DIR).map((f) => `${UPLOAD_URL_PREFIX}/work/${f}`);
}

/** Same as getHouseWorkImages but just filenames, for the admin manager. */
export function getHouseWorkFilenames(): string[] {
  return listPhotos(WORK_DIR);
}

/**
 * Round-robins the house showcase folder + every barber portfolio into one
 * interleaved feed for the homepage gallery. Each entry carries `slug` so the
 * tile links to the right profile; house entries have `slug: null` and render
 * unlinked.
 */
export function getHomepageWorkGallery(
  barberSlugs: string[]
): { src: string; slug: string | null }[] {
  const buckets: { slug: string | null; paths: string[] }[] = [
    { slug: null, paths: getHouseWorkImages() },
    ...barberSlugs.map((slug) => ({
      slug: slug as string | null,
      paths: getBarberPortfolio(slug),
    })),
  ];

  const out: { src: string; slug: string | null }[] = [];
  let added = true;
  let i = 0;
  while (added) {
    added = false;
    for (const b of buckets) {
      if (i < b.paths.length) {
        out.push({ src: b.paths[i], slug: b.slug });
        added = true;
      }
    }
    i++;
  }
  return out;
}
