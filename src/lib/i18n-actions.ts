"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { LOCALE_COOKIE, type Locale } from "./i18n";

const ONE_YEAR_SEC = 60 * 60 * 24 * 365;

export async function setLocale(locale: Locale): Promise<void> {
  const jar = await cookies();
  jar.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: ONE_YEAR_SEC,
    sameSite: "lax",
  });
  // Revalidate the root layout so every page re-renders with the new dict.
  revalidatePath("/", "layout");
}
