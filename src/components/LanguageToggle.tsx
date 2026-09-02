"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setLocale } from "@/lib/i18n-actions";
import type { Locale } from "@/lib/i18n";

type Props = {
  current: Locale;
  /** Label of the OTHER language (the one clicking switches to). */
  otherLabel: string;
  /** Hover/aria text — e.g. "Español" or "English". */
  switchToLabel: string;
};

export default function LanguageToggle({
  current,
  otherLabel,
  switchToLabel,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function toggle() {
    const next: Locale = current === "en" ? "es" : "en";
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={isPending}
      aria-label={`Switch to ${switchToLabel}`}
      title={switchToLabel}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 font-sans text-xs tracking-[0.2em] border border-green-400/50 text-green-100 rounded-sm hover:border-green-300 hover:bg-green-400/10 hover:text-green-50 transition disabled:opacity-60"
    >
      <span className="font-display font-bold text-gold-200">{otherLabel}</span>
      <span aria-hidden className="hidden sm:inline text-green-600">·</span>
      <span className="hidden sm:inline text-[10px] text-white/80">
        {switchToLabel.toUpperCase()}
      </span>
    </button>
  );
}
