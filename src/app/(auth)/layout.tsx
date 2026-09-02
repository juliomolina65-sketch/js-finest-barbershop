import Link from "next/link";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen flex flex-col">
      <header className="border-b border-gold-700/30">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link href="/" className="inline-flex items-center gap-3">
            <span className="font-display text-2xl tracking-wider text-logo-mark">
              J&apos;S FINEST
            </span>
            <span className="text-xs tracking-[0.3em] text-gold-400 font-sans">
              BARBERSHOP
            </span>
          </Link>
        </div>
      </header>

      <section className="flex-1 hero-glow relative overflow-hidden">
        <div className="max-w-md mx-auto px-6 py-12 md:py-20">{children}</div>
      </section>
    </main>
  );
}
