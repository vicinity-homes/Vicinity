/**
 * Phase 45.23 (2026-06-21): shared layout constants for the three feed
 * surfaces (BrowseFeed, CommunityVideoFeed, CommunityCarousel). Centralized
 * so a fix in z-stack or safe-area math propagates to all three at once —
 * the recurring class of bugs we kept hitting through phases 45.19–45.22
 * (overlay buttons disappearing, modal hidden behind carousel, rail too
 * close to home indicator) was a direct consequence of three near-copies
 * drifting independently.
 */

// Right-rail bottom inset — sits at thumb height, clear of iOS home
// indicator. Restored to this value in phase 45.21 after a brief
// experiment with a tighter inset that put the rail at the screen edge.
export const FEED_RAIL_BOTTOM = 'max(6rem, calc(env(safe-area-inset-bottom) + 5rem))';

// Caption block bottom inset — leaves space for the mobile home indicator
// without burying the price/title under it.
export const FEED_CAPTION_BOTTOM = 'max(1rem, env(safe-area-inset-bottom))';

// Z-stack constants. Modal is z-[70] (phase 45.20 Bug A: previously z-50,
// got hidden behind CommunityCarousel's z-[60] outer frame). Keep modal
// above every overlay layer; nothing else here ever exceeds 40.
export const FEED_Z = {
  content: 'z-0',
  gradient: 'z-10',
  caption: 'z-20',
  rail: 'z-20',
  topbar: 'z-30',
  modal: 'z-[70]',
} as const;

// Outer phone-shape frame, used by all three feeds. On md+ the feed is
// constrained to a 9:16 portrait column so desktop users see the same
// crop as mobile rather than a stretched landscape video.
export const FEED_FRAME_CLASS =
  'relative mx-auto h-screen w-full overflow-hidden bg-black md:w-[min(430px,calc(100vh*9/16))] md:shadow-2xl md:shadow-black/50';

// Vertical snap scroller class (BrowseFeed + CommunityVideoFeed). Each
// child page should be `h-screen w-full snap-start snap-always`.
export const FEED_VSCROLL_CLASS =
  'h-full w-full snap-y snap-mandatory overflow-y-scroll overscroll-contain';
