import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBarber } from "@/lib/auth";
import { getBarberPhoto, getBarberPortfolio, getBarberPortfolioFilenames } from "@/lib/barber-assets";
import type { ScheduleDay } from "@/lib/booking";
import ProfileClient from "./ProfileClient";

export const dynamic = "force-dynamic";

export default async function ProfileSettingsPage() {
  const barber = await getCurrentBarber();
  if (!barber) redirect("/login");

  let weeklySchedule: ScheduleDay[] = [];
  try {
    const parsed = JSON.parse(barber.weeklySchedule);
    if (Array.isArray(parsed)) weeklySchedule = parsed;
  } catch {
    /* fall through with empty schedule */
  }
  // Ensure all 7 days are present
  const fullWeek: ScheduleDay[] = [];
  for (let d = 0; d <= 6; d++) {
    const found = weeklySchedule.find((s) => s.dayOfWeek === d);
    fullWeek.push(
      found ?? { dayOfWeek: d, open: null, close: null }
    );
  }

  let specialties: string[] = [];
  try {
    const parsed = JSON.parse(barber.specialties);
    if (Array.isArray(parsed)) specialties = parsed;
  } catch {
    /* empty */
  }

  return (
    <section className="flex-1 max-w-3xl w-full mx-auto px-6 py-8 md:py-12">
      <div className="mb-6">
        <Link
          href="/dashboard"
          className="font-sans text-xs tracking-[0.3em] text-green-300 hover:text-gold-200 transition"
        >
          ← BACK TO DASHBOARD
        </Link>
      </div>
      <div className="mb-8">
        <p className="font-sans text-xs tracking-[0.4em] text-green-300">
          YOUR PROFILE
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-gold-gradient">
          Edit Profile
        </h1>
        <p className="font-sans text-sm text-white/60 mt-2">
          Changes show up on your public profile and the team page immediately.
        </p>
      </div>

      <ProfileClient
        initial={{
          slug: barber.slug,
          name: barber.name,
          role: barber.role,
          phone: barber.phone ?? "",
          yearsExperience: barber.yearsExperience,
          bio: barber.bio,
          specialties,
          weeklySchedule: fullWeek,
          profilePhoto: getBarberPhoto(barber.slug),
          portfolio: getBarberPortfolioFilenames(barber.slug).map((filename) => ({
            filename,
            url:
              getBarberPortfolio(barber.slug).find((u) =>
                u.split("?")[0].endsWith(`/${filename}`)
              ) ?? `/uploads/barbers/${barber.slug}/work/${filename}`,
          })),
        }}
      />
    </section>
  );
}
