"use client";

import Link from "next/link";
import { useState } from "react";
import LanguageToggle from "./LanguageToggle";
import SocialLinks from "./SocialLinks";
import type { Locale } from "@/lib/i18n";

type Props = {
  current: string | null;
  labels: {
    services: string;
    work: string;
    barbers: string;
    visit: string;
    barberLogIn: string;
  };
  locale: Locale;
  langOtherLabel: string;
  langSwitchToLabel: string;
};

/**
 * Hamburger menu for phones/small tablets (hidden from md up, where the
 * full inline nav takes over). Drops a panel below the sticky header with
 * the section links plus — below sm, where the header hides them — the
 * language toggle and BARBER LOG IN.
 */
export default function MobileMenu({
  current,
  labels,
  locale,
  langOtherLabel,
  langSwitchToLabel,
}: Props) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const items = [
    { key: "services", href: "/#services", label: labels.services },
    { key: "work", href: "/#work", label: labels.work },
    { key: "barbers", href: "/barbers", label: labels.barbers },
    { key: "visit", href: "/#visit", label: labels.visit },
  ];

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label="Menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="w-10 h-10 inline-flex items-center justify-center border border-gold-700/40 rounded-sm text-gold-100 hover:border-gold-400 hover:bg-gold-400/10 transition"
      >
        {open ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
            <path
              d="M2 2l12 12M14 2L2 14"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden>
            <path
              d="M1 1h16M1 7h16M1 13h16"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full bg-black/95 backdrop-blur-md border-b border-gold-700/30 shadow-[0_20px_40px_rgba(0,0,0,0.6)]">
          <nav className="px-6 py-3 flex flex-col font-sans text-sm tracking-widest">
            {items.map((item) => (
              <Link
                key={item.key}
                href={item.href}
                onClick={close}
                className={`py-3.5 border-b border-gold-700/15 ${
                  current === item.key
                    ? "text-green-200"
                    : "text-white/85 hover:text-gold-200"
                } transition`}
              >
                {item.label}
              </Link>
            ))}

            {/* Below sm the header hides these two — surface them here */}
            <div className="sm:hidden flex items-center justify-between gap-3 py-4">
              <LanguageToggle
                current={locale}
                otherLabel={langOtherLabel}
                switchToLabel={langSwitchToLabel}
              />
              <Link
                href="/login"
                onClick={close}
                className="inline-flex items-center px-4 py-2.5 text-[11px] tracking-[0.25em] font-semibold text-green-100 border border-green-400/60 rounded-sm hover:border-green-300 hover:bg-green-400/10 transition"
              >
                {labels.barberLogIn}
              </Link>
            </div>

            {/* Social media */}
            <div className="flex items-center gap-3 pt-3 pb-4 sm:pt-4 border-t border-gold-700/15">
              <SocialLinks iconClass="w-6 h-6" />
            </div>
          </nav>
        </div>
      )}
    </div>
  );
}
