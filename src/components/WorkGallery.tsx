"use client";

import Image from "next/image";
import Link from "next/link";

export type GalleryItem = {
  src: string;
  /** Barber slug for click-through, or null for house pics. */
  slug: string | null;
};

type Props = {
  pool: GalleryItem[];
  /** Total seconds for the track to complete one full loop. Lower = faster. */
  speedSec?: number;
};

const DEFAULT_SPEED = 60;
const MIN_SPEED = 25;

/**
 * Horizontal auto-scrolling carousel for the homepage "Our Work" gallery.
 *
 * Why a marquee:
 *  - Single row → much less vertical space than a 3-row grid
 *  - Every photo in the pool gets equal screen time as it drifts past
 *  - Continuous motion reads as "alive" without flashy in-place swaps
 *
 * Loop trick: the pool is rendered twice in a row. The track translates
 * from 0 to -50% over `speedSec`. At -50% the second copy occupies the
 * position the first copy started in — so the loop is seamless.
 *
 * Pause-on-hover, edge fade, and reduced-motion handling all live in the
 * `.work-marquee` CSS classes in globals.css.
 */
export default function WorkGallery({
  pool,
  speedSec = DEFAULT_SPEED,
}: Props) {
  if (pool.length === 0) return null;

  // For tiny pools, slow the animation down a hair so individual photos
  // don't whip across the screen.
  const effectiveSpeed =
    pool.length < 6 ? Math.max(MIN_SPEED, pool.length * 6) : speedSec;

  const looped = [...pool, ...pool];

  return (
    <div className="work-marquee-mask relative w-full overflow-hidden py-2">
      <div
        className="work-marquee flex gap-4 md:gap-5 w-max"
        style={{ animationDuration: `${effectiveSpeed}s` }}
      >
        {looped.map((item, idx) => (
          <Tile key={`${idx}-${item.src}`} item={item} />
        ))}
      </div>
    </div>
  );
}

function Tile({ item }: { item: GalleryItem }) {
  // Gold matted frame: gradient ring → dark mat band → photo with vignette.
  // Uses brand palette stops only (gold-50/100/200/400/600/700).
  const frameClass =
    "group relative block aspect-square w-[220px] sm:w-[240px] md:w-[280px] shrink-0 rounded-sm p-[3px] " +
    "bg-gradient-to-br from-gold-200 via-green-700/40 to-gold-200 " +
    "transition-all duration-500 " +
    "shadow-[0_0_0_1px_rgba(0,0,0,0.65)] " +
    "hover:from-gold-50 hover:via-gold-200/60 hover:to-gold-50 " +
    "hover:shadow-[0_0_0_1px_rgba(0,0,0,0.65),0_0_32px_rgba(212,175,55,0.55)] " +
    "hover:-translate-y-0.5";

  const matClass = "relative w-full h-full rounded-sm p-[2px] bg-black/85";
  const innerClass =
    "relative w-full h-full overflow-hidden rounded-sm bg-bg-card";

  const imgClass =
    "object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.04]";

  const photo = (
    <div className={matClass}>
      <div className={innerClass}>
        <Image
          src={item.src}
          alt="Work at J's Finest Barbershop"
          fill
          sizes="(max-width: 640px) 220px, (max-width: 1024px) 240px, 280px"
          className={imgClass}
        />
        {/* Subtle inner vignette deepens photo edges against the bright gold frame */}
        <div
          aria-hidden
          className="absolute inset-0 pointer-events-none rounded-sm shadow-[inset_0_0_55px_rgba(0,0,0,0.5)]"
        />
      </div>
    </div>
  );

  return item.slug ? (
    <Link href={`/barbers/${item.slug}`} className={frameClass}>
      {photo}
    </Link>
  ) : (
    <div className={frameClass}>{photo}</div>
  );
}
