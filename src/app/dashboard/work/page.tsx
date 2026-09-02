import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentBarber } from "@/lib/auth";
import { getHouseWorkFilenames } from "@/lib/barber-assets";
import WorkClient from "./WorkClient";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Our Work Gallery — J's Finest",
};

export default async function WorkAdminPage() {
  const barber = await getCurrentBarber();
  if (!barber) redirect("/login");
  // Owner and admins only — everyone else goes back to their dashboard.
  if (!barber.isOwner && !barber.isAdmin) redirect("/dashboard");

  const photos = getHouseWorkFilenames().map((filename) => ({
    filename,
    url: `/uploads/work/${filename}`,
  }));

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
          ADMIN
        </p>
        <h1 className="font-display text-4xl md:text-5xl text-gold-gradient">
          Our Work Gallery
        </h1>
        <p className="font-sans text-sm text-white/70 mt-2 max-w-xl">
          Photos you add here appear in the scrolling{" "}
          <strong className="text-gold-100">OUR WORK</strong> section on the
          homepage right away — mixed in with the barbers&apos; own portfolio
          photos.
        </p>
      </div>

      <WorkClient initialPhotos={photos} />
    </section>
  );
}
