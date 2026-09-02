import Link from "next/link";
import { getDict } from "@/lib/i18n";

export const metadata = {
  title: "Pending Approval — J's Finest",
};

export const dynamic = "force-dynamic";

export default async function SignupPendingPage() {
  const t = (await getDict()).auth;
  return (
    <div className="text-center">
      <div className="inline-flex items-center justify-center w-16 h-16 rounded-full border border-gold-400 bg-gold-400/10 mb-6">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="#D4AF37" strokeWidth="2" />
          <path
            d="M12 7v5l3 2"
            stroke="#5FAA7D"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
      <p className="font-sans text-xs tracking-[0.4em] text-green-300 mb-2">
        {t.pendingEyebrow}
      </p>
      <h1 className="font-display text-3xl md:text-4xl text-gold-gradient mb-4">
        {t.pendingTitle}
      </h1>
      <p className="font-sans text-sm md:text-base text-white/80 max-w-sm mx-auto leading-relaxed mb-2">
        {t.pendingBody}
      </p>
      <p className="font-sans text-sm text-white/60 max-w-sm mx-auto leading-relaxed mb-8">
        {t.pendingBody2}
      </p>

      <Link
        href="/"
        className="inline-flex items-center justify-center px-6 py-3 text-xs tracking-[0.3em] font-semibold border border-green-400/70 text-green-100 rounded-sm hover:bg-green-400/10 hover:border-green-300 transition"
      >
        {t.backToHome}
      </Link>
    </div>
  );
}
