import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentBarber } from "@/lib/auth";
import { prisma } from "@/lib/db";
import AdminClient from "./AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const current = await getCurrentBarber();
  if (!current) redirect("/login");
  if (!current.isOwner) redirect("/dashboard");

  const barbers = await prisma.barber.findMany({
    orderBy: [{ isOwner: "desc" }, { isActive: "desc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          claimedAppointments: { where: { status: "CONFIRMED" } },
        },
      },
    },
  });

  const pending = barbers.filter((b) => !b.isActive && b.passwordHash);
  const active = barbers.filter((b) => b.isActive);
  const deactivated = barbers.filter((b) => !b.isActive && !pending.includes(b));

  return (
    <section className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 md:py-12">
      <div className="mb-8">
        <p className="font-sans text-xs tracking-[0.4em] text-green-300">
          OWNER ONLY
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-gold-gradient">
          Manage Barbers
        </h1>
        <p className="font-sans text-sm text-white/60 mt-2">
          Review new signups, approve them, deactivate barbers who&apos;ve left
          the shop. Make someone an <strong className="text-green-200">admin</strong>{" "}
          to let them manage the homepage OUR WORK gallery.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-10">
        <Stat label="ACTIVE" value={active.length} />
        <Stat label="PENDING APPROVAL" value={pending.length} accent={pending.length > 0} />
        <Stat label="DEACTIVATED" value={deactivated.length} muted />
      </div>

      <AdminClient
        barbers={barbers.map((b) => ({
          id: b.id,
          slug: b.slug,
          name: b.name,
          email: b.email,
          phone: b.phone,
          role: b.role,
          isOwner: b.isOwner,
          isAdmin: b.isAdmin,
          isActive: b.isActive,
          isPending: !b.isActive && Boolean(b.passwordHash),
          isSeedNoPassword: !b.passwordHash,
          confirmedAppointmentCount: b._count.claimedAppointments,
        }))}
        currentOwnerId={current.id}
      />

      <div className="mt-10">
        <Link
          href="/dashboard"
          className="font-sans text-xs tracking-[0.3em] text-green-300 hover:text-gold-200 transition"
        >
          ← BACK TO DASHBOARD
        </Link>
      </div>
    </section>
  );
}

function Stat({
  label,
  value,
  accent,
  muted,
}: {
  label: string;
  value: number;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <div
      className={`bg-bg-card border rounded-sm p-4 ${
        accent
          ? "border-gold-400/60"
          : muted
          ? "border-gold-700/20"
          : "border-gold-700/40"
      }`}
    >
      <p
        className={`font-sans text-[10px] tracking-[0.3em] mb-1 ${
          accent ? "text-gold-200" : "text-green-300"
        }`}
      >
        {label}
      </p>
      <p
        className={`font-display text-3xl ${
          muted ? "text-white/40" : "text-gold-gradient"
        }`}
      >
        {value}
      </p>
    </div>
  );
}
