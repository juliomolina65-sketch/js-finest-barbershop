import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getDict } from "@/lib/i18n";

export const dynamic = "force-dynamic";

export default async function ConfirmedPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const appt = await prisma.appointment.findUnique({
    where: { cancelToken: token },
    include: {
      service: true,
      customer: true,
      preferredBarber: { select: { name: true, role: true } },
      claimedBy: { select: { name: true, role: true } },
    },
  });
  if (!appt) notFound();

  const t = (await getDict()).confirmed;

  const when = appt.startAt;
  const dayStr = when.toLocaleDateString([], {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeStr = when.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit",
  });

  const barberLine =
    appt.claimedBy?.name ??
    (appt.preferredBarber
      ? `${appt.preferredBarber.name} ${t.pendingBarberSpecific}`
      : t.pendingNoBarber);

  const statusLabel =
    appt.status === "PENDING"
      ? t.status.pending
      : appt.status === "CONFIRMED"
      ? t.status.confirmed
      : appt.status;

  return (
    <main className="relative">
      <header className="sticky top-0 z-40 backdrop-blur-md bg-black/60 border-b border-gold-700/30">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="font-display text-2xl tracking-wider text-logo-mark">
              J&apos;S FINEST
            </span>
            <span className="hidden sm:inline text-xs tracking-[0.3em] text-gold-400 font-sans">
              BARBERSHOP
            </span>
          </Link>
          <Link
            href="/"
            className="font-sans text-xs tracking-[0.25em] text-green-300 hover:text-gold-200 transition"
          >
            {t.home}
          </Link>
        </div>
      </header>

      <section className="hero-glow relative overflow-hidden">
        <div className="max-w-2xl mx-auto px-6 py-16 md:py-24 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-gold-400 bg-gold-400/10 mb-6">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12.5L10 17.5L20 7.5"
                stroke="#5FAA7D"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-2">
            {statusLabel}
          </p>
          <h1 className="font-display text-4xl md:text-5xl text-gold-gradient mb-4">
            {t.heading}
          </h1>
          <p className="font-sans text-base md:text-lg text-white/80 mb-10 max-w-md mx-auto">
            {t.body}
          </p>

          <div className="bg-bg-card border border-gold-700/30 rounded-sm p-6 md:p-8 text-left space-y-4">
            <Row label={t.when} value={`${dayStr} · ${timeStr}`} />
            <Row label={t.service} value={appt.service.name} />
            <Row
              label={t.price}
              value={`$${(appt.service.priceCents / 100).toFixed(0)} — ${t.payAtChair}`}
            />
            <Row label={t.barberLabel} value={barberLine} />
            <Row label={t.nameLabel} value={appt.customer.name} />
            <Row label={t.emailLabel} value={appt.customer.email} />
            {appt.customer.phone && (
              <Row label={t.phoneLabel} value={appt.customer.phone} />
            )}
            {appt.notes && <Row label={t.notesLabel} value={appt.notes} />}
          </div>

          <p className="font-sans text-xs text-white/40 mt-6">
            {t.reservationId} {appt.id}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/book"
              className="inline-flex items-center justify-center px-6 py-3 text-xs tracking-[0.3em] font-semibold border border-green-400/70 text-green-100 rounded-sm hover:bg-green-400/10 hover:border-green-300 transition"
            >
              {t.bookAnother}
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-6 py-3 text-xs tracking-[0.3em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition"
            >
              {t.backToSite}
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-gold-700/30 bg-black">
        <div className="max-w-7xl mx-auto px-6 py-10 text-center">
          <p className="font-display text-lg tracking-wider">
            <span className="text-logo-mark">J&apos;S FINEST</span>{" "}
            <span className="text-gold-gradient">BARBERSHOP</span>
          </p>
        </div>
      </footer>
    </main>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="font-sans text-[10px] tracking-[0.3em] text-green-300 mb-1">
        {label}
      </p>
      <p className="font-sans text-base text-white">{value}</p>
    </div>
  );
}
