/**
 * BrandMark — global Vicinity wordmark used in landing TL, SiteHeader, and
 * auth chrome. Single source of truth so all three stay aligned.
 *
 * Design intent (2026-06-20, phase44.5):
 *   - Compact: V monogram + tightened VICINITY wordmark (tracking 0.18em vs
 *     the earlier sparse 0.32em) so the lockup carries weight without
 *     hogging horizontal real estate.
 *   - Material depth (NOT 3D bevel): V tile is a flat-luxury monogram —
 *     gold gradient + 1px inset highlight/lowlight + 1px lift shadow.
 *     Reads as a struck-metal seal, stays compatible with editorial
 *     luxury idiom (Aman / Loewe). Wordmark itself stays flat to avoid
 *     casino/Web-2.0 emboss territory.
 *   - Clickable affordance: wrapped in a transparent-bordered pill that
 *     materializes a gold ring + 5% gold wash on hover/focus, so the
 *     element reads as interactive without permanent button chrome.
 */

import Link from 'next/link';

type Props = {
  /** Override Link href (e.g. agent dashboard for authenticated agents). */
  href?: string;
  /** Additional classes for layout context (positioning, margins). */
  className?: string;
};

export function BrandMark({ href = '/', className }: Props) {
  return (
    <Link
      href={href}
      aria-label="Vicinity — home"
      className={`group inline-flex items-center gap-2 rounded-md border border-transparent px-2 py-1.5 transition hover:border-[#c9a24a]/40 hover:bg-[#c9a24a]/5 focus-visible:border-[#c9a24a]/60 focus-visible:bg-[#c9a24a]/5 focus-visible:outline-none ${
        className ?? ''
      }`}
    >
      <span
        aria-hidden="true"
        className="flex h-6 w-6 items-center justify-center rounded-[3px] font-serif text-[13px] leading-none shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.18),0_1px_2px_rgba(0,0,0,0.28)] transition group-hover:brightness-110"
        style={{
          background:
            'linear-gradient(135deg, #d8b463 0%, #c9a24a 45%, #a07a2c 100%)',
          color: '#1a1410',
        }}
      >
        V
      </span>
      <span
        className="font-medium uppercase"
        style={{
          color: '#c9a24a',
          letterSpacing: '0.18em',
          fontSize: '12px',
        }}
      >
        {/* First V is supplied by the monogram tile (Loewe/Bottega idiom) —
            the wordmark continues from "ICINITY" to avoid a doubled V.
            Negative left margin nudges the wordmark slightly closer to the
            tile so the eye reads the monogram as the missing V. */}
        <span className="-ml-0.5">ICINITY</span>
      </span>
    </Link>
  );
}
