'use client';

import type { Ref, ReactNode } from 'react';

import { FEED_FRAME_CLASS, FEED_VSCROLL_CLASS } from './constants';

/**
 * Phase 45.23 (2026-06-21): shared shell for the three feed surfaces
 * (BrowseFeed, CommunityVideoFeed, CommunityCarousel). Owns the outer
 * phone-shape frame and (when `axis === 'vertical'`) the inner snap
 * scroller. Overlays — top header, right rail, captions, sheets, modals
 * — render as siblings of the scroller so they stay fixed relative to
 * the viewport while the cards scroll/swipe underneath.
 *
 * Slot model intentionally minimal: the only thing FeedShell renders by
 * default is the frame + (optional) scroller. Each feed still controls
 * its own overlay JSX so per-feed differences (community pill vs back
 * button, homes-here chip, listings sheet) live with the feed that owns
 * the data.
 *
 * `axis === 'horizontal'` skips the inner snap scroller entirely — the
 * caller (CommunityCarousel today) provides its own swipe pager as the
 * single child.
 */
export type FeedShellProps = {
  /** Ref forwarded to the inner snap scroller (vertical only). */
  scrollerRef?: Ref<HTMLDivElement>;
  /** Cards / pages to scroll through. */
  children: ReactNode;
  /** Absolute-positioned overlays (top bar, rail, captions, chips, sheets, modals). */
  overlays?: ReactNode;
  /** Vertical snap scroll (default) or horizontal pager (no scroller — caller owns). */
  axis?: 'vertical' | 'horizontal';
};

export function FeedShell({
  scrollerRef,
  children,
  overlays,
  axis = 'vertical',
}: FeedShellProps) {
  return (
    <div className={FEED_FRAME_CLASS}>
      {axis === 'vertical' ? (
        <div
          ref={scrollerRef}
          className={FEED_VSCROLL_CLASS}
          style={{ scrollSnapType: 'y mandatory' }}
        >
          {children}
        </div>
      ) : (
        children
      )}
      {overlays}
    </div>
  );
}
