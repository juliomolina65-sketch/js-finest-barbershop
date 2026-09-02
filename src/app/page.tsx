import Image from "next/image";
import Link from "next/link";
import { prisma } from "@/lib/db";
import { getHomepageWorkGallery, getBarberPhoto } from "@/lib/barber-assets";
import SiteHeader from "@/components/SiteHeader";
import WorkGallery from "@/components/WorkGallery";
import SocialLinks from "@/components/SocialLinks";
import { getDict, type Dict } from "@/lib/i18n";

// Live DB read so approved barbers appear without a redeploy.
export const dynamic = "force-dynamic";

/**
 * Menu shown on the homepage. Prices live here; names and descriptions come
 * from the translated catalog in i18n (keyed by the same slug the database
 * uses), so the menu renders in the reader's language.
 */
const SERVICE_MENU: { slug: keyof Dict["landing"]["serviceCatalog"]; price: string }[] = [
  { slug: "classic-cut", price: "$30" },
  { slug: "skin-fade", price: "$35" },
  { slug: "beard-trim", price: "$20" },
  { slug: "hot-towel-shave", price: "$35" },
  { slug: "kids-cut", price: "$22" },
  { slug: "finest-package", price: "$60" },
];

export default async function Home() {
  const dict = await getDict();
  const t = dict.landing;

  // Show only 3 barbers on the landing — rest live behind "SEE ALL BARBERS".
  const barberRows = await prisma.barber.findMany({
    where: { isActive: true },
    orderBy: [{ isOwner: "desc" }, { yearsExperience: "desc" }, { name: "asc" }],
    take: 3,
  });
  const barbersWithPhotos = barberRows.map((b) => ({
    id: b.id,
    slug: b.slug,
    name: b.name,
    role: b.role,
    bio: b.bio,
    photo: getBarberPhoto(b.slug),
  }));

  // Gather a sample of portfolio photos across ALL active barbers for the
  // homepage gallery. Interleaved so it's not dominated by one barber.
  const allActiveSlugs = await prisma.barber.findMany({
    where: { isActive: true },
    select: { slug: true },
  });
  // Pass the full pool to the client gallery — it picks 9 visible tiles
  // and rotates them. Cap the pool just to keep the JSON payload small.
  const workImages = getHomepageWorkGallery(
    allActiveSlugs.map((b) => b.slug)
  ).slice(0, 36);

  return (
    <main className="relative">
      <SiteHeader />

      {/* ============ HERO ============ */}
      <section className="hero-glow relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 pt-10 pb-20 md:pt-16 md:pb-28 text-center">
          <div className="flex justify-center mb-10 fade-up">
            <div className="relative w-[340px] h-[340px] sm:w-[440px] sm:h-[440px] md:w-[560px] md:h-[560px] lg:w-[640px] lg:h-[640px]">
              <Image
                src="/logo.png"
                alt="J's Finest Barbershop — Clean Cuts. Sharp Style. Finest You."
                fill
                priority
                sizes="(max-width: 640px) 340px, (max-width: 768px) 440px, (max-width: 1024px) 560px, 640px"
                className="object-contain drop-shadow-[0_0_40px_rgba(212,175,55,0.15)]"
              />
            </div>
          </div>

          <div className="fade-up-delay-2 flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-8 py-4 text-sm tracking-[0.3em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition shadow-[0_0_30px_rgba(212,175,55,0.35)]"
            >
              {t.hero.bookAppointment}
            </Link>
            <a
              href="#barbers"
              className="inline-flex items-center justify-center px-8 py-4 text-sm tracking-[0.3em] font-semibold border border-green-400/70 text-green-100 rounded-sm hover:bg-green-400/10 hover:border-green-300 transition"
            >
              {t.hero.meetBarbers}
            </a>
          </div>

          <SocialLinks
            variant="hero"
            label={t.hero.followUs}
            iconClass="w-6 h-6"
            className="fade-up-delay-3 mt-12"
          />
        </div>
      </section>

      {/* ============ ABOUT ============ */}
      <section className="border-t border-gold-700/20">
        <div className="max-w-4xl mx-auto px-6 py-20 md:py-28 text-center">
          <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-4">
            {t.about.eyebrow}
          </p>
          <h2 className="font-display text-3xl md:text-5xl text-gold-gradient mb-8">
            {t.about.heading}
          </h2>
          <div className="divider-gold max-w-[120px] mx-auto mb-8" />
          <p className="font-sans text-base md:text-lg text-white/80 leading-relaxed">
            {t.about.body}
          </p>
        </div>
      </section>

      {/* ============ SERVICES ============ */}
      <section id="services" className="border-t border-gold-700/20 bg-bg-elevated">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-3">
              {t.services.eyebrow}
            </p>
            <h2 className="font-display text-4xl md:text-6xl text-gold-gradient mb-4">
              {t.services.heading}
            </h2>
            <div className="divider-gold max-w-[120px] mx-auto" />
          </div>

          {/* Mobile: horizontal swipe carousel (next card peeks in). md+: grid. */}
          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 -mx-6 px-6 pb-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-6 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
            {SERVICE_MENU.map(({ slug, price }) => {
              const item = t.serviceCatalog[slug];
              return (
                <article
                  key={slug}
                  className="group relative snap-center shrink-0 w-[80%] sm:w-[46%] md:w-auto md:shrink bg-bg-card border border-gold-700/30 rounded-sm p-6 md:p-8 hover:border-gold-400/60 transition"
                >
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="font-display text-xl md:text-2xl text-gold-100">
                      {item.name}
                    </h3>
                    <span className="font-display text-2xl text-gold-gradient shrink-0">
                      {price}
                    </span>
                  </div>
                  <p className="font-sans text-sm text-white/70 leading-relaxed">
                    {item.desc}
                  </p>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ OUR WORK ============ */}
      <section id="work" className="border-t border-gold-700/20">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-3">
              {t.work.eyebrow}
            </p>
            <h2 className="font-display text-4xl md:text-6xl text-gold-gradient mb-4">
              {t.work.heading}
            </h2>
            <div className="divider-gold max-w-[120px] mx-auto mb-6" />
            <p className="font-sans text-sm md:text-base text-white/70 max-w-2xl mx-auto leading-relaxed">
              {t.work.body}
            </p>
          </div>

          {workImages.length === 0 ? (
            <p className="text-center font-sans text-sm text-white/50">
              {t.work.empty}
            </p>
          ) : (
            <WorkGallery pool={workImages} />
          )}
        </div>
      </section>

      {/* ============ BARBERS ============ */}
      <section id="barbers" className="border-t border-gold-700/20">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-3">
              {t.barbers.eyebrow}
            </p>
            <h2 className="font-display text-4xl md:text-6xl text-gold-gradient mb-4">
              {t.barbers.heading}
            </h2>
            <div className="divider-gold max-w-[120px] mx-auto" />
          </div>

          {/* Mobile: horizontal swipe carousel so profiles sit side by side. md+: grid. */}
          <div className="flex overflow-x-auto snap-x snap-mandatory no-scrollbar gap-4 -mx-6 px-6 pb-2 md:grid md:grid-cols-3 md:gap-8 md:overflow-visible md:mx-0 md:px-0 md:pb-0">
            {barbersWithPhotos.map((b) => (
              <Link
                key={b.slug}
                href={`/barbers/${b.slug}`}
                className="group snap-center shrink-0 w-[82%] sm:w-[46%] md:w-auto md:shrink bg-bg-card border border-gold-700/30 rounded-sm overflow-hidden hover:border-gold-400/60 transition flex flex-col"
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
                    <span className="font-display text-7xl text-gold-gradient transition group-hover:scale-105">
                      {b.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="p-6 text-center flex-1 flex flex-col">
                  <h3 className="font-display text-2xl text-gold-100 mb-1">
                    {b.name}
                  </h3>
                  <p className="font-sans text-xs tracking-[0.25em] text-green-300 mb-3">
                    {b.role.toUpperCase()}
                  </p>
                  {b.bio && (
                    <p className="font-sans text-sm text-white/70 leading-relaxed flex-1 mb-4">
                      {b.bio.length > 100
                        ? b.bio.slice(0, 100).replace(/\s+\S*$/, "") + "…"
                        : b.bio}
                    </p>
                  )}
                  <span className="font-sans text-xs tracking-[0.3em] text-gold-100 group-hover:text-gold-200 transition">
                    {t.barbers.viewProfile} →
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link
              href="/barbers"
              className="inline-flex items-center px-6 py-3 text-xs tracking-[0.3em] font-semibold border border-green-400/70 text-green-100 rounded-sm hover:bg-green-400/10 hover:border-green-300 transition"
            >
              {t.barbers.seeAll}
            </Link>
          </div>
        </div>
      </section>

      {/* ============ VISIT US ============ */}
      <section id="visit" className="border-t border-gold-700/20 bg-bg-elevated">
        <div className="max-w-6xl mx-auto px-6 py-20 md:py-28">
          <div className="text-center mb-14">
            <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-3">
              {t.visit.eyebrow}
            </p>
            <h2 className="font-display text-4xl md:text-6xl text-gold-gradient mb-4">
              {t.visit.heading}
            </h2>
            <div className="divider-gold max-w-[120px] mx-auto" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
            <div>
              <h3 className="font-display text-xl text-gold-100 mb-4 tracking-wide">
                {t.visit.hoursTitle}
              </h3>
              <ul className="font-sans text-sm md:text-base text-white/80 space-y-2">
                <li className="flex justify-between">
                  <span>{t.visit.days.monSun}</span>
                  <span>9:00 AM – 9:00 PM</span>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-display text-xl text-gold-100 mb-4 tracking-wide">
                {t.visit.contactTitle}
              </h3>
              <ul className="font-sans text-sm md:text-base text-white/80 space-y-3">
                <li>
                  <span className="block text-xs tracking-[0.3em] text-green-300 mb-1">
                    {t.visit.addressLabel}
                  </span>
                  {t.visit.addressPlaceholder}
                </li>
                <li>
                  <span className="block text-xs tracking-[0.3em] text-green-300 mb-1">
                    {t.visit.phoneLabel}
                  </span>
                  {t.visit.phonePlaceholder}
                </li>
                <li>
                  <span className="block text-xs tracking-[0.3em] text-green-300 mb-1">
                    {t.visit.emailLabel}
                  </span>
                  jsfinestbarbershopmesquite@gmail.com
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ============ BOOK CTA ============ */}
      <section id="book" className="border-t border-gold-700/20 relative overflow-hidden">
        <div className="absolute inset-0 hero-glow pointer-events-none" />
        <div className="relative max-w-4xl mx-auto px-6 py-24 md:py-32 text-center">
          <h2 className="font-display text-4xl md:text-6xl text-gold-gradient mb-6">
            {t.bookCta.heading}
          </h2>
          <p className="font-sans text-base md:text-lg text-white/80 mb-10 max-w-2xl mx-auto">
            {t.bookCta.body}
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-10 py-4 text-sm tracking-[0.3em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition shadow-[0_0_40px_rgba(212,175,55,0.4)]"
            >
              {t.bookCta.bookOnline}
            </Link>
            <a
              href="tel:+19453609937"
              className="inline-flex items-center justify-center px-10 py-4 text-sm tracking-[0.3em] font-semibold border border-green-400/70 text-green-100 rounded-sm hover:bg-green-400/10 hover:border-green-300 transition"
            >
              {t.bookCta.callToBook}
            </a>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-t border-gold-700/30 bg-black">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-display text-lg tracking-wider">
            <span className="text-green-gradient">J&apos;S FINEST</span>{" "}
            <span className="text-gold-gradient">BARBERSHOP</span>
          </p>
          <div className="flex items-center gap-6">
            <SocialLinks />
            <Link
              href="/login"
              className="font-sans text-[10px] tracking-[0.3em] text-white/40 hover:text-gold-200 transition"
            >
              {t.footer.barberPortal}
            </Link>
            <p className="font-sans text-xs tracking-widest text-white/50">
              © {new Date().getFullYear()} — {t.footer.tagline}
            </p>
          </div>
        </div>
      </footer>
    </main>
  );
}
