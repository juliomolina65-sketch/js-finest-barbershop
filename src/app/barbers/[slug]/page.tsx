import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getBarberPhoto, getBarberPortfolio } from "@/lib/barber-assets";
import SiteHeader from "@/components/SiteHeader";
import SocialLinks from "@/components/SocialLinks";
import BarberAvailability, {
  type DayProp,
} from "@/components/BarberAvailability";
import { getBarberOpenWindows, type ScheduleDay } from "@/lib/booking";
import { getCurrentBarber } from "@/lib/auth";
import { getDict } from "@/lib/i18n";

// Live from the DB so newly approved barbers' profiles are reachable immediately.
export const dynamic = "force-dynamic";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** Group consecutive days with the same hours into a single line, e.g. "Tue – Fri 9:00 AM – 8:00 PM". */
function formatSchedule(
  weeklySchedule: string,
  closedLabel: string = "Closed"
): { day: string; hours: string }[] {
  let parsed: ScheduleDay[] = [];
  try {
    parsed = JSON.parse(weeklySchedule);
  } catch {
    return [];
  }
  // Sort starting from Monday so the display is intuitive (Mon - Sun order).
  const ordered = [...parsed].sort((a, b) => {
    const ai = a.dayOfWeek === 0 ? 7 : a.dayOfWeek;
    const bi = b.dayOfWeek === 0 ? 7 : b.dayOfWeek;
    return ai - bi;
  });

  // Group consecutive same-hours into ranges
  const out: { day: string; hours: string }[] = [];
  let i = 0;
  while (i < ordered.length) {
    const cur = ordered[i];
    if (!cur.open || !cur.close) {
      out.push({ day: DAY_NAMES[cur.dayOfWeek], hours: closedLabel });
      i++;
      continue;
    }
    const key = `${cur.open}|${cur.close}`;
    let j = i;
    while (
      j + 1 < ordered.length &&
      ordered[j + 1].open === cur.open &&
      ordered[j + 1].close === cur.close
    ) {
      j++;
    }
    const label =
      i === j
        ? DAY_NAMES[cur.dayOfWeek]
        : `${DAY_NAMES[cur.dayOfWeek]} – ${DAY_NAMES[ordered[j].dayOfWeek]}`;
    out.push({
      day: label,
      hours: `${fmt12h(cur.open)} – ${fmt12h(cur.close)}`,
    });
    i = j + 1;
  }
  return out;
}

function fmt12h(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

function fmt12h12(iso: string) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barber = await prisma.barber.findUnique({ where: { slug } });
  if (!barber) return { title: "Barber not found — J's Finest" };
  return {
    title: `${barber.name} — ${barber.role} — J's Finest Barbershop`,
    description:
      barber.bio.slice(0, 160) ||
      `${barber.name} — ${barber.role} at J's Finest Barbershop.`,
  };
}

export default async function BarberProfile({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const barber = await prisma.barber.findUnique({ where: { slug } });
  if (!barber) notFound();
  // Hidden from the public when pending/deactivated, or when the barber
  // doesn't take appointments (e.g. an owner who only administrates). The
  // owner can still preview any profile from the admin page.
  if (!barber.isActive || !barber.takesAppointments) {
    const viewer = await getCurrentBarber();
    if (!viewer?.isOwner) notFound();
  }

  const t = (await getDict()).barberProfile;
  const photo = getBarberPhoto(slug);
  const portfolio = getBarberPortfolio(slug);
  const specialties: string[] = (() => {
    try {
      const v = JSON.parse(barber.specialties);
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  })();
  const schedule = formatSchedule(barber.weeklySchedule, t.closed);

  const availability = await getBarberOpenWindows(barber.id, 7);
  const days: DayProp[] = availability.map((d, idx) => {
    const [, , dd] = d.dateStr.split("-").map(Number);
    let specialLabel: string | undefined;
    if (idx === 0) specialLabel = t.nextAvailable.todayLabel;
    else if (idx === 1) specialLabel = t.nextAvailable.tomorrowLabel;
    return {
      dateStr: d.dateStr,
      dayOfMonth: dd,
      dayLabel: t.nextAvailable.dayAbbr[d.dayOfWeek],
      specialLabel,
      isClosed: d.isClosed,
      windows: d.windows.map(
        (w) => `${fmt12h12(w.startAt)} – ${fmt12h12(w.endAt)}`
      ),
    };
  });
  const initialIdx = (() => {
    const i = days.findIndex((d) => !d.isClosed && d.windows.length > 0);
    return i >= 0 ? i : 0;
  })();

  return (
    <main className="relative">
      <SiteHeader current="barbers" />

      {/* Owner-only preview notice for barbers who aren't live yet */}
      {!barber.isActive && (
        <div className="bg-gold-400/10 border-b border-gold-400/40">
          <div className="max-w-7xl mx-auto px-6 py-3 text-center">
            <p className="font-sans text-xs tracking-[0.25em] text-gold-200">
              OWNER PREVIEW — THIS PROFILE IS NOT LIVE. CUSTOMERS CAN&apos;T SEE
              IT UNTIL YOU APPROVE {barber.name.toUpperCase()} IN{" "}
              <Link
                href="/dashboard/admin"
                className="underline underline-offset-4 text-gold-100 hover:text-gold-50"
              >
                MANAGE BARBERS
              </Link>
              .
            </p>
          </div>
        </div>
      )}

      {/* ============ BREADCRUMB ============ */}
      <div className="max-w-7xl mx-auto px-6 pt-8">
        <Link
          href="/barbers"
          className="inline-flex items-center gap-2 font-sans text-xs tracking-[0.3em] text-green-300 hover:text-gold-200 transition"
        >
          <span aria-hidden>←</span>
          {t.backToAll}
        </Link>
      </div>

      {/* ============ PROFILE HERO ============ */}
      <section className="hero-glow relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-16 md:pt-14 md:pb-20">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10 md:gap-14 items-center">
            {/* Avatar — uploaded profile photo if present, else the initial */}
            <div className="md:col-span-2">
              <div className="aspect-square bg-gradient-to-br from-bg-elevated to-bg border border-gold-700/30 rounded-sm flex items-center justify-center relative overflow-hidden">
                {photo ? (
                  <Image
                    src={photo}
                    alt={`${barber.name} — ${barber.role}`}
                    fill
                    priority
                    sizes="(max-width: 768px) 100vw, 40vw"
                    className="object-cover"
                  />
                ) : (
                  <>
                    <span className="font-display text-[12rem] md:text-[14rem] leading-none text-gold-gradient">
                      {barber.name.charAt(0)}
                    </span>
                    <div className="absolute inset-0 hero-glow pointer-events-none" />
                  </>
                )}
              </div>
            </div>

            {/* Info */}
            <div className="md:col-span-3">
              <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-3">
                {barber.role.toUpperCase()}
              </p>
              <h1 className="font-display text-5xl md:text-7xl text-gold-gradient mb-4">
                {barber.name}
              </h1>
              {barber.yearsExperience > 0 && (
                <div className="flex items-center gap-6 mb-8">
                  <div>
                    <p className="font-display text-3xl md:text-4xl text-gold-gradient">
                      {barber.yearsExperience}+
                    </p>
                    <p className="font-sans text-xs tracking-[0.25em] text-green-300 mt-1">
                      {t.yearsBehindChair}
                    </p>
                  </div>
                </div>
              )}
              <Link
                href={`/book?barber=${barber.slug}`}
                className="inline-flex items-center justify-center px-8 py-4 text-sm tracking-[0.3em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition shadow-[0_0_30px_rgba(212,175,55,0.35)]"
              >
                {t.bookWith} {barber.name.toUpperCase()}
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BIO ============ */}
      {barber.bio.trim() && (
        <section className="border-t border-gold-700/20">
          <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
            <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-3 text-center">
              {t.story.eyebrow}
            </p>
            <h2 className="font-display text-3xl md:text-4xl text-gold-gradient text-center mb-6">
              {t.story.headingPrefix} {barber.name}
            </h2>
            <div className="divider-gold max-w-[120px] mx-auto mb-8" />
            <p className="font-sans text-base md:text-lg text-white/80 leading-relaxed text-center whitespace-pre-line">
              {barber.bio}
            </p>
          </div>
        </section>
      )}

      {/* ============ PORTFOLIO ============ */}
      <section className="border-t border-gold-700/20 bg-bg-elevated">
        <div className="max-w-7xl mx-auto px-6 py-16 md:py-20">
          <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-3 text-center">
            {t.portfolio.eyebrow}
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-gold-gradient text-center mb-6">
            {barber.name}{t.portfolio.headingSuffix}
          </h2>
          <div className="divider-gold max-w-[120px] mx-auto mb-10" />

          {portfolio.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
              {portfolio.map((src) => (
                <div
                  key={src}
                  className="group relative aspect-square overflow-hidden bg-bg-card/85 backdrop-blur-sm border border-gold-700/30 rounded-sm hover:border-gold-400/60 transition"
                >
                  <Image
                    src={src}
                    alt={`Work by ${barber.name}`}
                    fill
                    sizes="(max-width: 768px) 50vw, 33vw"
                    className="object-cover transition group-hover:scale-105"
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center max-w-xl mx-auto py-8">
              <p className="font-sans text-base text-white/70 leading-relaxed mb-2">
                {t.portfolio.empty}
              </p>
              <p className="font-sans text-xs tracking-wider text-white/40">
                {t.portfolio.emptyHint}
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ============ NEXT AVAILABLE ============ */}
      <section className="border-t border-gold-700/20">
        <div className="max-w-4xl mx-auto px-6 py-16 md:py-20">
          <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-3 text-center">
            {t.nextAvailable.eyebrow}
          </p>
          <h2 className="font-display text-3xl md:text-4xl text-gold-gradient text-center mb-4">
            {t.nextAvailable.headingPrefix} {barber.name}
          </h2>
          <div className="divider-gold max-w-[120px] mx-auto mb-6" />
          <p className="font-sans text-sm text-white/60 text-center max-w-xl mx-auto mb-10">
            {t.nextAvailable.subhead}
          </p>
          <BarberAvailability
            barberSlug={barber.slug}
            days={days}
            initialIndex={initialIdx}
            t={{
              closedLabel: t.nextAvailable.closedLabel,
              fullyBooked: t.nextAvailable.fullyBooked,
              cta: t.nextAvailable.cta,
            }}
          />
        </div>
      </section>

      {/* ============ SPECIALTIES + SCHEDULE ============ */}
      {(specialties.length > 0 || schedule.length > 0) && (
        <section className="border-t border-gold-700/20">
          <div className="max-w-6xl mx-auto px-6 py-16 md:py-20">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {specialties.length > 0 && (
                <div>
                  <h3 className="font-display text-2xl text-gold-100 mb-6 tracking-wide">
                    {t.specialties}
                  </h3>
                  <ul className="space-y-3">
                    {specialties.map((spec) => (
                      <li
                        key={spec}
                        className="flex items-center gap-3 font-sans text-base text-white/85"
                      >
                        <span className="text-green-300" aria-hidden>
                          ◆
                        </span>
                        {spec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {schedule.length > 0 && (
                <div>
                  <h3 className="font-display text-2xl text-gold-100 mb-6 tracking-wide">
                    {t.availability}
                  </h3>
                  <ul className="space-y-3">
                    {schedule.map((s) => (
                      <li
                        key={s.day}
                        className="flex justify-between items-center border-b border-gold-700/20 pb-3 font-sans"
                      >
                        <span className="text-white/85">{s.day}</span>
                        <span
                          className={`text-sm ${
                            s.hours === t.closed ? "text-white/40" : "text-gold-100"
                          }`}
                        >
                          {s.hours}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-gold-700/30 bg-black/80 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-display text-lg tracking-wider">
            <span className="text-logo-mark">J&apos;S FINEST</span>{" "}
            <span className="text-gold-gradient">BARBERSHOP</span>
          </p>
          <SocialLinks />
          <p className="font-sans text-xs tracking-widest text-white/50">
            © {new Date().getFullYear()} — CLEAN CUTS. SHARP STYLE. FINEST YOU.
          </p>
        </div>
      </footer>
    </main>
  );
}
