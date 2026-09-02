import { prisma } from "@/lib/db";
import { getAvailableDates } from "@/lib/booking";
import BookingFlow from "./BookingFlow";
import SiteHeader from "@/components/SiteHeader";
import SocialLinks from "@/components/SocialLinks";
import { getDict } from "@/lib/i18n";

export const metadata = {
  title: "Book — J's Finest Barbershop",
  description:
    "Reserve your chair at J's Finest. Pick your service, day, time, and barber.",
};

// SQLite is local; pages should re-render fresh on each request so newly booked
// slots disappear immediately.
export const dynamic = "force-dynamic";

export default async function BookPage({
  searchParams,
}: {
  searchParams: Promise<{ barber?: string }>;
}) {
  const { barber: barberParam } = await searchParams;

  const [services, barbers] = await Promise.all([
    prisma.service.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.barber.findMany({
      where: { isActive: true },
      select: { id: true, slug: true, name: true, role: true },
      orderBy: { isOwner: "desc" },
    }),
  ]);

  // Resolve ?barber=<slug> to a real barber, ignore if it doesn't match an active barber.
  const initialBarberSlug =
    barberParam && barbers.some((b) => b.slug === barberParam)
      ? barberParam
      : null;

  // Pre-compute the next 30 days that have *any* potential availability
  // (a barber working). Slot-level filtering happens client-side via server action.
  const candidateDates = services.length
    ? await getAvailableDates(services[0].id, 30)
    : [];

  const dict = await getDict();
  const t = dict.book;

  return (
    <main className="relative">
      <SiteHeader />

      <section className="hero-glow relative overflow-hidden border-b border-gold-700/20">
        <div className="max-w-4xl mx-auto px-6 py-14 md:py-20 text-center">
          <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-3">
            {t.eyebrow}
          </p>
          <h1 className="font-display text-4xl md:text-6xl text-gold-gradient mb-4">
            {t.heading}
          </h1>
          <div className="divider-gold max-w-[140px] mx-auto" />
        </div>
      </section>

      <BookingFlow
        services={services.map((s) => ({
          id: s.id,
          slug: s.slug,
          name: s.name,
          priceCents: s.priceCents,
          durationMin: s.durationMin,
          description: s.description,
        }))}
        barbers={barbers}
        candidateDates={candidateDates}
        initialBarberSlug={initialBarberSlug}
        t={t}
        serviceCatalog={dict.landing.serviceCatalog}
      />

      <footer className="border-t border-gold-700/30 bg-black">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-display text-lg tracking-wider">
            <span className="text-green-gradient">J&apos;S FINEST</span>{" "}
            <span className="text-gold-gradient">BARBERSHOP</span>
          </p>
          <SocialLinks />
          <p className="font-sans text-xs tracking-widest text-white/50">
            © {new Date().getFullYear()} — {dict.landing.footer.tagline}
          </p>
        </div>
      </footer>
    </main>
  );
}
