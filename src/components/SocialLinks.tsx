import { SOCIAL } from "@/lib/social";

type Props = {
  /** Extra classes for the wrapping flex row (e.g. justify-center). */
  className?: string;
  /** Icon size classes; defaults to w-5 h-5. */
  iconClass?: string;
  /**
   * "bar" (default) = plain inline icons for header/footer/drawer.
   * "hero" = large circular gold-bordered buttons with an eyebrow label,
   * used as a feature block on the homepage hero.
   */
  variant?: "bar" | "hero";
  /** Eyebrow text shown above the icons in the "hero" variant. */
  label?: string;
};

function InstagramIcon({ iconClass }: { iconClass: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={iconClass}
      aria-hidden
    >
      <rect x="2.5" y="2.5" width="19" height="19" rx="5" />
      <circle cx="12" cy="12" r="4.2" />
      <circle cx="17.3" cy="6.7" r="1.1" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TikTokIcon({ iconClass }: { iconClass: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={iconClass} aria-hidden>
      <path d="M19.6 7.3c-1.5-.3-2.8-1.2-3.6-2.5-.5-.8-.8-1.7-.8-2.8h-3v13.6c0 1.6-1.3 2.9-2.9 2.9s-2.9-1.3-2.9-2.9 1.3-2.9 2.9-2.9c.3 0 .6 0 .9.1V9.7c-.3 0-.6-.1-.9-.1-3.3 0-5.9 2.7-5.9 5.9s2.6 5.9 5.9 5.9 5.9-2.7 5.9-5.9V9.6c1.3.9 2.8 1.5 4.4 1.5V8.2l-.9-.9z" />
    </svg>
  );
}

/**
 * Instagram / TikTok icon links. Icons only render for profiles that have a
 * URL set in src/lib/social.ts, so adding TikTok later is a one-line change.
 */
export default function SocialLinks({
  className = "",
  iconClass,
  variant = "bar",
  label = "FOLLOW THE FINEST",
}: Props) {
  const resolvedIconClass =
    iconClass ?? (variant === "hero" ? "w-5 h-5" : "w-5 h-5");

  const links = [
    SOCIAL.instagram && {
      href: SOCIAL.instagram,
      label: "Instagram",
      icon: <InstagramIcon iconClass={resolvedIconClass} />,
    },
    SOCIAL.tiktok && {
      href: SOCIAL.tiktok,
      label: "TikTok",
      icon: <TikTokIcon iconClass={resolvedIconClass} />,
    },
  ].filter(Boolean) as { href: string; label: string; icon: React.ReactNode }[];

  if (links.length === 0) return null;

  if (variant === "hero") {
    return (
      <div className={`flex flex-col items-center gap-4 ${className}`}>
        <div className="flex items-center gap-3">
          <span className="h-px w-8 bg-gradient-to-r from-transparent to-gold-700/60" />
          <p className="font-sans text-[10px] tracking-[0.4em] text-green-300">
            {label}
          </p>
          <span className="h-px w-8 bg-gradient-to-l from-transparent to-gold-700/60" />
        </div>
        <div className="flex items-center gap-4">
          {links.map((l) => (
            <a
              key={l.label}
              href={l.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={l.label}
              title={l.label}
              className="w-12 h-12 inline-flex items-center justify-center rounded-full border border-gold-400/50 text-gold-100 bg-black/30 shadow-[0_0_20px_rgba(212,175,55,0.12)] hover:text-green-100 hover:border-green-300 hover:bg-green-400/10 hover:-translate-y-1 hover:shadow-[0_0_26px_rgba(63,143,99,0.45)] transition-all duration-300"
            >
              {l.icon}
            </a>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-4 ${className}`}>
      {links.map((l) => (
        <a
          key={l.label}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={l.label}
          title={l.label}
          className="text-gold-100/90 hover:text-green-200 hover:-translate-y-0.5 transition-all duration-300"
        >
          {l.icon}
        </a>
      ))}
    </div>
  );
}
