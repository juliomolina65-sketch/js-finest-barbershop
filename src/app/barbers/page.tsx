import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getBarberPhoto } from "@/lib/barber-assets";
import SiteHeader from "@/components/SiteHeader";
import SocialLinks from "@/components/SocialLinks";
import { getDict } from "@/lib/i18n";

// Pulls live from the DB so newly-approved barbers appear automatically.
export const dynamic = "force-dynamic";

export async function generateMetadata() {
  const t = (await getDict()).barbersIndex;
  return {
    title: t.title,
    description:
      "Meet the team behind J's Finest. Master barbers specializing in classic cuts, fades, beard work, and straight-razor shaves.",
  };
}

function shortBio(bio: string, maxLen = 140): string {
  const cleaned = bio.trim();
  if (cleaned.length <= maxLen) return cleaned;
  return cleaned.slice(0, maxLen).replace(/\s+\S*$/, "") + "…";
}

export default async function BarbersIndex() {
  const t = (await getDict()).barbersIndex;
  const rows = await prisma.barber.findMany({
    where: { isActive: true, takesAppointments: true },
    orderBy: [{ isOwner: "desc" }, { yearsExperience: "desc" }, { name: "asc" }],
  });

  const barbers = rows.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    role: b.role,
    bio: b.bio,
    photo: getBarberPhoto(b.slug),
  }));

  return (
    <main className="relative">
      <SiteHeader current="barbers" />

      {/* ============ PAGE HEADER ============ */}
      <section className="hero-glow relative overflow-hidden border-b border-gold-700/20">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28 text-center">
          <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-3">
            {t.eyebrow}
          </p>
          <h1 className="font-display text-5xl md:text-7xl text-gold-gradient mb-6">
            {t.heading}
          </h1>
          <div className="divider-gold max-w-[140px] mx-auto mb-8" />
          <p className="font-sans text-base md:text-lg text-white/80 max-w-2xl mx-auto leading-relaxed">
            {t.intro}
          </p>
        </div>
      </section>

      {/* ============ BARBERS GRID ============ */}
      <section className="border-t border-gold-700/20">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          {barbers.length === 0 ? (
            <p className="text-center font-sans text-base text-white/60">
              {t.empty}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {barbers.map((b) => (
                <Link
                  key={b.id}
                  href={`/barbers/${b.slug}`}
                  className="group bg-bg-card/85 backdrop-blur-sm border border-gold-700/30 rounded-sm overflow-hidden hover:border-gold-400/60 transition flex flex-col"
                >
                  <div className="aspect-square bg-gradient-to-br from-bg-elevated to-bg flex items-center justify-center border-b border-gold-700/30 relative overflow-hidden">
                    {b.photo ? (
                      <Image
                        src={b.photo}
                        alt={`${b.name} — ${b.role}`}
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        className="object-cover transition group-hover:scale-105"
                      />
                    ) : (
                      <>
                        <span className="font-display text-8xl md:text-9xl text-gold-gradient transition group-hover:scale-105">
                          {b.name.charAt(0)}
                        </span>
                        <div className="absolute inset-0 hero-glow pointer-events-none opacity-50" />
                      </>
                    )}
                  </div>
                  <div className="p-7 text-center flex-1 flex flex-col">
                    <h2 className="font-display text-2xl md:text-3xl text-gold-100 mb-1">
                      {b.name}
                    </h2>
                    <p className="font-sans text-xs tracking-[0.25em] text-green-300 mb-4">
                      {b.role.toUpperCase()}
                    </p>
                    {b.bio && (
                      <p className="font-sans text-sm text-white/70 leading-relaxed mb-6 flex-1">
                        {shortBio(b.bio)}
                      </p>
                    )}
                    <div className="flex items-center justify-center gap-2 font-sans text-xs tracking-[0.3em] text-gold-100 group-hover:text-gold-200 transition mt-auto">
                      {t.viewProfile}
                      <span aria-hidden>→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

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
