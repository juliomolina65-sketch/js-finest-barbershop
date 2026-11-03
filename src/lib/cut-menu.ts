/**
 * A barber's own cuts and prices ("cut menu"), stored as JSON on
 * Barber.cutMenu. Edited in Edit Profile and shown on the public profile.
 * Shared by the server action (to clean what the form sends) and the pages.
 */
export type CutMenuItem = { name: string; priceCents: number; note?: string };

export const CUT_MENU_MAX_ITEMS = 20;
const MAX_PRICE_CENTS = 1000 * 100;

/** Accepts anything (parsed JSON or a JSON string); returns only valid items. */
export function parseCutMenu(raw: unknown): CutMenuItem[] {
  let value = raw;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return [];
    }
  }
  if (!Array.isArray(value)) return [];

  const items: CutMenuItem[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const e = entry as Record<string, unknown>;
    const name = String(e.name ?? "").trim().slice(0, 60);
    const priceCents = Math.round(Number(e.priceCents));
    if (!name || !Number.isFinite(priceCents)) continue;
    if (priceCents < 0 || priceCents > MAX_PRICE_CENTS) continue;
    const note = String(e.note ?? "").trim().slice(0, 80);
    items.push(note ? { name, priceCents, note } : { name, priceCents });
    if (items.length === CUT_MENU_MAX_ITEMS) break;
  }
  return items;
}

/** "$35" or "$32.50" */
export function formatPrice(cents: number): string {
  const dollars = cents / 100;
  return Number.isInteger(dollars) ? `$${dollars}` : `$${dollars.toFixed(2)}`;
}
