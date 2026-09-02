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
  /**
   * "compact" shows just the target language word ("Español" / "English") in a
   * small pill. Used in the mobile header next to BOOK NOW so Spanish speakers
   * can switch without discovering the hamburger menu first.
   */
  variant?: "default" | "compact";
};

export default function LanguageToggle({
  current,
  otherLabel,
  switchToLabel,
  variant = "default",
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

  if (variant === "compact") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={isPending}
        aria-label={`Switch to ${switchToLabel}`}
        title={switchToLabel}
        className="inline-flex items-center px-2.5 py-2 font-sans text-[11px] font-semibold tracking-[0.12em] border border-green-400/60 text-green-100 rounded-sm hover:border-green-300 hover:bg-green-400/10 hover:text-green-50 transition disabled:opacity-60 whitespace-nowrap"
      >
        {switchToLabel}
      </button>
    );
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
