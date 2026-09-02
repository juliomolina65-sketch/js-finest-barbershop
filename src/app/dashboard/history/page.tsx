import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBarber } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export default async function HistoryPage() {
  const barber = await getCurrentBarber();
  if (!barber) redirect("/login");

  const completed = await prisma.appointment.findMany({
    where: {
      claimedById: barber.id,
      status: "COMPLETED",
    },
    include: { service: true, customer: true },
    orderBy: { startAt: "desc" },
  });

  // ----- Stats -----
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfWeek = (() => {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - d.getDay()); // back to Sunday
    return d;
  })();

  const thisMonth = completed.filter((a) => a.startAt >= startOfMonth);
  const thisWeek = completed.filter((a) => a.startAt >= startOfWeek);
  const earnedThisMonthCents = thisMonth.reduce(
    (acc, a) => acc + a.service.priceCents + (a.tipCents ?? 0),
    0
  );
  const tipsThisMonthCents = thisMonth.reduce(
    (acc, a) => acc + (a.tipCents ?? 0),
    0
  );
  const lifetimeEarnedCents = completed.reduce(
    (acc, a) => acc + a.service.priceCents + (a.tipCents ?? 0),
    0
  );

  // ----- Group by month -----
  type Group = { key: string; label: string; rows: typeof completed };
  const groups = new Map<string, Group>();
  for (const a of completed) {
    const key = `${a.startAt.getFullYear()}-${a.startAt.getMonth()}`;
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        label: `${MONTH_NAMES[a.startAt.getMonth()]} ${a.startAt.getFullYear()}`,
        rows: [],
      });
    }
    groups.get(key)!.rows.push(a);
  }
  const grouped = Array.from(groups.values());

  return (
    <section className="flex-1 max-w-4xl w-full mx-auto px-6 py-8 md:py-12">
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
          {barber.name.toUpperCase()}&apos;S HISTORY
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-gold-gradient">
          Cut Log
        </h1>
        <p className="font-sans text-sm text-white/60 mt-2">
          Every appointment you&apos;ve marked DONE, most recent first.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-10">
        <Stat label="LIFETIME" value={String(completed.length)} sub="cuts" />
        <Stat
          label="THIS MONTH"
          value={String(thisMonth.length)}
          sub="cuts"
          accent
        />
        <Stat label="THIS WEEK" value={String(thisWeek.length)} sub="cuts" />
        <Stat
          label="EARNED · MONTH"
          value={`$${Math.round(earnedThisMonthCents / 100).toLocaleString()}`}
          sub={`$${Math.round(tipsThisMonthCents / 100).toLocaleString()} in tips`}
        />
      </div>

      {/* Grouped list */}
      {grouped.length === 0 ? (
        <div className="bg-bg-card/40 border border-dashed border-gold-700/30 rounded-sm p-10 text-center">
          <p className="font-display text-xl text-gold-100 mb-2">
            No cuts logged yet.
          </p>
          <p className="font-sans text-sm text-white/50">
            When you mark an appointment DONE on your calendar, it&apos;ll
            appear here.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          {grouped.map((g) => (
            <section key={g.key}>
              <div className="flex items-baseline justify-between mb-3 border-b border-gold-700/30 pb-2">
                <h2 className="font-display text-xl text-gold-gradient">
                  {g.label}
                </h2>
                <p className="font-sans text-xs tracking-[0.25em] text-green-300">
                  {g.rows.length} {g.rows.length === 1 ? "cut" : "cuts"} · $
                  {Math.round(
                    g.rows.reduce(
                      (acc, a) => acc + a.service.priceCents + (a.tipCents ?? 0),
                      0
                    ) / 100
                  ).toLocaleString()}
                </p>
              </div>
              <ul className="space-y-2">
                {g.rows.map((a) => (
                  <li
                    key={a.id}
                    className="bg-bg-card border border-gold-700/30 rounded-sm px-4 py-3 grid grid-cols-[auto_1fr_auto] items-center gap-3"
                  >
                    <div className="text-center w-14 shrink-0">
                      <p className="font-display text-lg text-gold-100 leading-none">
                        {a.startAt.getDate()}
                      </p>
                      <p className="font-sans text-[10px] tracking-[0.2em] text-green-300 mt-1">
                        {a.startAt
                          .toLocaleDateString([], { weekday: "short" })
                          .toUpperCase()}
                      </p>
                    </div>
                    <div className="min-w-0">
                      <p className="font-display text-sm text-white">
                        {a.customer.name}
                      </p>
                      <p className="font-sans text-xs text-white/55 truncate">
                        {a.service.name} ·{" "}
                        {a.startAt.toLocaleTimeString([], {
                          hour: "numeric",
                          minute: "2-digit",
                        })}{" "}
                        · {a.service.durationMin}m
                        {a.customer.phone &&
                        !a.customer.email.endsWith("@jsfinest.local")
                          ? ` · ${a.customer.phone}`
                          : ""}
                      </p>
                      {a.notes && (
                        <p className="font-sans text-[11px] text-white/40 italic truncate">
                          “{a.notes}”
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-display text-sm text-gold-gradient leading-tight">
                        ${Math.round(a.service.priceCents / 100)}
                      </p>
                      {a.tipCents && a.tipCents > 0 ? (
                        <p className="font-sans text-[10px] text-green-200 tracking-wider leading-tight mt-0.5">
                          +${Math.round(a.tipCents / 100)} tip
                        </p>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}

function Stat({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`bg-bg-card border rounded-sm p-4 ${
        accent ? "border-green-400/60" : "border-gold-700/30"
      }`}
    >
      <p
        className={`font-sans text-[10px] tracking-[0.3em] mb-1 ${
          accent ? "text-green-200" : "text-green-300"
        }`}
      >
        {label}
      </p>
      <p className="font-display text-2xl md:text-3xl text-gold-gradient leading-none">
        {value}
      </p>
      {sub && (
        <p className="font-sans text-[10px] text-white/40 mt-2 truncate">
          {sub}
        </p>
      )}
    </div>
  );
}
