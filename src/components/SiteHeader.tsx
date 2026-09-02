import Link from "next/link";
import { getDict, getLocale } from "@/lib/i18n";
import LanguageToggle from "./LanguageToggle";
import MobileMenu from "./MobileMenu";
import SocialLinks from "./SocialLinks";

type Current = "services" | "work" | "barbers" | "visit" | null;

type Props = {
  current?: Current;
};

/**
 * Shared site-wide header used on every public page. Server component so
 * translations are pulled fresh on each request via the locale cookie.
 */
export default async function SiteHeader({ current = null }: Props) {
  const locale = await getLocale();
  const t = (await getDict()).nav;
  const lt = (await getDict()).langToggle;

  const cls = (key: Current) =>
    current === key
      ? "text-green-200"
      : "text-white/80 hover:text-gold-200 transition";

  return (
    <header className="sticky top-0 z-40 backdrop-blur-md bg-black/60 border-b border-gold-700/30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="flex items-center gap-3 min-w-0">
          <span className="font-display text-xl sm:text-2xl tracking-wider text-green-gradient shrink-0">
            J&apos;S FINEST
          </span>
          <span className="hidden lg:inline text-xs tracking-[0.3em] text-gold-400 font-sans">
            BARBERSHOP
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm tracking-widest font-sans">
          <Link href="/#services" className={cls("services")}>
            {t.services}
          </Link>
          <Link href="/#work" className={cls("work")}>
            {t.work}
          </Link>
          <Link href="/barbers" className={cls("barbers")}>
            {t.barbers}
          </Link>
          <Link href="/#visit" className={cls("visit")}>
            {t.visit}
          </Link>
        </nav>

        <div className="flex items-center gap-2.5 sm:gap-4 shrink-0">
          {/* Social icons — inside the hamburger drawer below lg */}
          <SocialLinks className="hidden lg:flex" />
          {/* Below sm these live inside the hamburger drawer instead */}
          <div className="hidden sm:block">
            <LanguageToggle
              current={locale}
              otherLabel={lt.otherLabel}
              switchToLabel={lt.switchTo}
            />
          </div>
          <Link
            href="/login"
            className="hidden sm:inline-flex items-center px-2.5 py-1.5 font-sans text-[10px] tracking-[0.25em] text-green-100 border border-green-700/50 rounded-sm hover:border-green-300 hover:bg-green-400/10 hover:text-green-50 transition"
          >
            {t.barberLogIn}
          </Link>
          {/* Compact language pill — visible on phones (where the full toggle
              is hidden) so Spanish speakers can switch without opening the menu. */}
          <div className="sm:hidden">
            <LanguageToggle
              current={locale}
              otherLabel={lt.otherLabel}
              switchToLabel={lt.switchTo}
              variant="compact"
            />
          </div>
          <Link
            href="/book"
            className="inline-flex items-center px-4 sm:px-5 py-2.5 text-xs tracking-[0.25em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition"
          >
            {t.bookNow}
          </Link>
          <MobileMenu
            current={current}
            labels={{
              services: t.services,
              work: t.work,
              barbers: t.barbers,
              visit: t.visit,
              barberLogIn: t.barberLogIn,
            }}
          />
        </div>
      </div>
    </header>
  );
}
