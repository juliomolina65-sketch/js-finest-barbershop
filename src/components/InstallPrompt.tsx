"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "jsf-install-dismissed";
const SHOW_DELAY_MS = 3500;

export type InstallPromptLabels = {
  brand: string;
  message: string;
  install: string;
  iosTitle: string;
  iosEyebrow: string;
  iosStep1Prefix: string;
  iosStep1Bold: string;
  iosStep1Suffix: string;
  iosStep2Prefix: string;
  iosStep2Bold: string;
  iosStep2Suffix: string;
  iosStep3Prefix: string;
  iosStep3Bold: string;
  iosStep3Suffix: string;
};

export default function InstallPrompt({ labels }: { labels: InstallPromptLabels }) {
  const [visible, setVisible] = useState(false);
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [iosInstructionsOpen, setIosInstructionsOpen] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Already dismissed? Stay quiet.
    if (localStorage.getItem(DISMISS_KEY)) return;

    // Already installed (running in standalone) ? Stay quiet.
    const standalone =
      window.matchMedia?.("(display-mode: standalone)").matches ||
      // iOS Safari uses this non-standard property
      (window.navigator as unknown as { standalone?: boolean }).standalone ===
        true;
    if (standalone) return;

    const ua = window.navigator.userAgent;
    const ios = /iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua);
    setIsIOS(ios);

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);

    // Show the banner after a short delay so it doesn't feel aggressive
    const t = window.setTimeout(() => setVisible(true), SHOW_DELAY_MS);

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.clearTimeout(t);
    };
  }, []);

  const dismiss = () => {
    setVisible(false);
    setIosInstructionsOpen(false);
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* localStorage can throw in private mode — ignore */
    }
  };

  const onInstall = async () => {
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        await deferredPrompt.userChoice;
      } catch {
        /* user closed the native prompt */
      }
      setDeferredPrompt(null);
      dismiss();
      return;
    }
    if (isIOS) {
      setIosInstructionsOpen(true);
      return;
    }
    // No native prompt and not iOS — most desktop browsers don't allow programmatic install.
    // Open instructions modal as a fallback.
    setIosInstructionsOpen(true);
  };

  if (!visible) return null;

  return (
    <>
      {/* ============ BOTTOM BANNER ============ */}
      <div
        role="dialog"
        aria-label="Add to home screen"
        className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-1.5rem)] max-w-sm animate-[fadeUp_0.5s_ease-out_both]"
      >
        <div className="flex items-center gap-3 bg-bg-card/95 backdrop-blur-md border border-gold-400/60 rounded-md px-3 py-2.5 shadow-[0_10px_40px_rgba(0,0,0,0.5),0_0_30px_rgba(212,175,55,0.15)]">
          {/* Logo */}
          <div className="shrink-0 w-9 h-9 rounded-sm bg-black/60 border border-gold-700/40 flex items-center justify-center overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icon-192.png"
              alt=""
              className="w-7 h-7 object-contain"
            />
          </div>

          {/* Copy */}
          <div className="flex-1 min-w-0">
            <p className="font-sans text-[11px] tracking-[0.18em] text-green-300 leading-none mb-0.5">
              {labels.brand}
            </p>
            <p className="font-sans text-sm text-white leading-tight">
              {labels.message}
            </p>
          </div>

          {/* Install button */}
          <button
            type="button"
            onClick={onInstall}
            className="shrink-0 inline-flex items-center px-3 py-1.5 text-[11px] tracking-[0.2em] font-semibold bg-gradient-to-b from-gold-100 to-gold-600 text-black rounded-sm hover:brightness-110 transition"
          >
            {labels.install}
          </button>

          {/* Dismiss X */}
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 w-7 h-7 flex items-center justify-center text-white/60 hover:text-gold-200 transition"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M1 1l12 12M13 1L1 13"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* ============ iOS INSTRUCTIONS OVERLAY ============ */}
      {iosInstructionsOpen && (
        <div
          className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={dismiss}
          role="presentation"
        >
          <div
            className="relative w-full max-w-sm bg-bg-card border border-gold-400/50 rounded-md p-6 shadow-[0_0_60px_rgba(212,175,55,0.2)]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={dismiss}
              aria-label="Close"
              className="absolute top-3 right-3 w-8 h-8 flex items-center justify-center text-white/60 hover:text-gold-200 transition"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                aria-hidden
              >
                <path
                  d="M1 1l12 12M13 1L1 13"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                />
              </svg>
            </button>

            <p className="font-sans text-xs tracking-[0.3em] text-green-300 mb-2">
              {labels.iosEyebrow}
            </p>
            <h3 className="font-display text-2xl text-gold-gradient mb-4">
              {labels.iosTitle}
            </h3>
            <ol className="font-sans text-sm text-white/85 leading-relaxed space-y-3">
              <li className="flex gap-3">
                <span className="font-display text-green-300 shrink-0">1.</span>
                <span>
                  {labels.iosStep1Prefix}{" "}
                  <strong className="text-gold-100">{labels.iosStep1Bold}</strong>{" "}
                  {labels.iosStep1Suffix}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-green-300 shrink-0">2.</span>
                <span>
                  {labels.iosStep2Prefix}{" "}
                  <strong className="text-gold-100">{labels.iosStep2Bold}</strong>
                  {labels.iosStep2Suffix}
                </span>
              </li>
              <li className="flex gap-3">
                <span className="font-display text-green-300 shrink-0">3.</span>
                <span>
                  {labels.iosStep3Prefix}{" "}
                  <strong className="text-gold-100">{labels.iosStep3Bold}</strong>
                  {labels.iosStep3Suffix}
                </span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
