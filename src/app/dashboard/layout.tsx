import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBarber } from "@/lib/auth";
import { logoutBarber } from "../(auth)/actions";
import { getDict } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const barber = await getCurrentBarber();
  if (!barber) redirect("/login");
  const t = (await getDict()).dashboard;

  return (
    <main className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/70 border-b border-gold-700/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-0">
          <Link href="/dashboard" className="flex items-center gap-3 min-w-0">
            <span className="font-display text-xl tracking-wider text-green-gradient shrink-0">
              J&apos;S FINEST
            </span>
            <span className="hidden sm:inline text-xs tracking-[0.3em] text-green-300 font-sans">
              {t.portalLabel}
            </span>
          </Link>
          {/* Nav links: full-width second row on phones, inline from sm up */}
          <div className="order-last w-full flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-3 mt-3 border-t border-gold-700/20 sm:order-none sm:w-auto sm:justify-start sm:gap-4 sm:pt-0 sm:mt-0 sm:border-t-0">
            <Link
              href="/dashboard/calendar"
              className="inline-flex items-center font-sans text-xs tracking-[0.25em] text-white/70 hover:text-gold-200 transition"
            >
              {t.nav.calendar}
            </Link>
            <Link
              href="/dashboard/history"
              className="inline-flex items-center font-sans text-xs tracking-[0.25em] text-white/70 hover:text-gold-200 transition"
            >
              {t.nav.history}
            </Link>
            <Link
              href="/dashboard/profile"
              className="inline-flex items-center font-sans text-xs tracking-[0.25em] text-white/70 hover:text-gold-200 transition"
            >
              {t.nav.editProfile}
            </Link>
            {(barber.isOwner || barber.isAdmin) && (
              <Link
                href="/dashboard/work"
                className="inline-flex items-center font-sans text-xs tracking-[0.25em] text-green-200 hover:text-green-100 border border-green-400/40 rounded-sm px-3 py-1.5 transition"
              >
                OUR WORK
              </Link>
            )}
            {barber.isOwner && (
              <Link
                href="/dashboard/admin"
                className="inline-flex items-center font-sans text-xs tracking-[0.25em] text-gold-200 hover:text-gold-100 border border-gold-400/40 rounded-sm px-3 py-1.5 transition"
              >
                {t.nav.admin}
              </Link>
            )}
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="font-display text-sm text-gold-100 leading-none">
                {barber.name}
              </p>
              <p className="font-sans text-[10px] tracking-[0.25em] text-green-300 leading-none mt-1">
                {barber.role.toUpperCase()}
              </p>
            </div>
            <form action={logoutBarber}>
              <button
                type="submit"
                className="font-sans text-xs tracking-[0.25em] text-white/60 hover:text-gold-200 transition"
              >
                {t.nav.logOut}
              </button>
            </form>
          </div>
        </div>
      </header>

      {children}

      <footer className="border-t border-gold-700/30 bg-black mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-6 text-center">
          <p className="font-sans text-[10px] tracking-[0.3em] text-white/40">
            {t.footer}
          </p>
        </div>
      </footer>
    </main>
  );
}
