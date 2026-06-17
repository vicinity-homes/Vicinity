# Phase 34b · Buyer Experience (V1 redo)

**Branch**: `phase34b/v1-redo`
**Spec source of truth**: `public/prototype/index.html` (V1 — Scenario A + B sections, lines 279–522)
**Status**: in progress
**Supersedes**: phase34b v0.34.0 (`d0f7d5e` reverted in `d50715b` 2026-06-17) — that was a v2-prototype build, decided wrong.

---

## Why V1 (and why we reverted v2)

User intent (2026-06-17 thread): the previous "v2" prototype kept simple gestures but **deleted the information layer** (community stats, host card, video category previews) — over-correction. V1's information density is the actual product goal. Multiple gestures (vertical swipe + horizontal carousel + bottom sheet) are acceptable because each lives in a clearly-labeled L0/L1/L2/L3 layer with explicit back paths and a HUD-like layer indicator.

**Missing data is acceptable as fake data with code comments**, marked for phase35 to wire to real schema.

---

## Scope (locked)

### Scenario A — Listing → Community sheet → L2 community video carousel
1. **L0 · Listing feed** (existing `BrowseFeed`)
   - Add **community chip** at top-left of each card when listing has a community.
   - Chip content: `🏘️ <name> / ⭐ 4.8 · 23 videos · in this area / ›` *(rating + total-video-count = fake; community name + fan-out video count = real)*.
   - Pulse animation on first appearance per session — guides first-time discovery without obstructing listing meta on the right rail.
2. **L1 · Community sheet** (new bottom sheet `CommunitySheet.tsx`)
   - Slides up from bottom; backdrop mask dismisses; close `×` in header.
   - Contents (top to bottom):
     - Title block: `<community.name>` + `<city, state> · 12 sq mi · 23 videos` *(sq mi = fake)*
     - Three stat cards: `9.2 School` / `22 min to Seattle` / `$1.4M Median` *(all three fake — will become real in phase35)*
     - Description: `<community.description>` + `Hosted by <Mark Liu> · 8 yrs in area` *(host = fake)*
     - `COMMUNITY VIDEOS · N` heading + horizontal-scroll **video strip** of community videos (5 visible thumbnails with category labels: Schools / Commute / Parks / Dining / Nightlife)
   - Tapping a video thumbnail → push to L2.
3. **L2 · Community video carousel** (new fullscreen `CommunityCarousel.tsx`)
   - Fullscreen, **horizontal swipe** between community videos for this community.
   - Top header: `‹ Back · 14207 NE 23rd Pl` (returns to L0 listing context, NOT the sheet).
   - Counter `1 / 5` + segmented progress bar.
   - Each card: video player + category label.

### Scenario B — `/browse/` Communities tab → L1 community video feed → L2 listings sheet → L3 listing carousel
1. **L0 · `/browse/` segmented `Homes | Communities`**
   - Communities tab: existing community grid (name, cover, video count, listing count, **fake `⭐4.8 · School 9.2 · $1.4M`** badges).
   - Tap card → L1.
2. **L1 · Community video feed** (existing `CommunityVideoFeed`)
   - **Vertical swipe** between community videos (existing).
   - Add bottom-left chip: `🏠 N homes here` (real count via `activeListingsCount`).
   - Tap chip → L2.
3. **L2 · Listings bottom sheet** (new `CommunityListingsSheet.tsx`)
   - Slides up over L1; backdrop mask; close `×`.
   - Title: `Homes in <community.name>` / `N active listings · sorted by newest` (real).
   - Body: vertical list of listing thumbnails (`listings-mini`) — image + price + address + bd/ba/sqft.
   - Tap a listing → L3.
4. **L3 · Listing carousel** (new `CommunityListingCarousel.tsx`)
   - Fullscreen, **horizontal swipe** between active listings in this community.
   - Top header: `‹ Back · All homes here` (returns to L2 sheet).
   - Counter + progress.

---

## Data plan — what's real, what's fake, what becomes real later

| Surface                            | Field                       | Real? | Source                                            | Phase35 plan                                                   |
| ---------------------------------- | --------------------------- | ----- | ------------------------------------------------- | -------------------------------------------------------------- |
| Chip + sheet header                | community name              | ✅    | `communities.name`                                | —                                                              |
| Chip + sheet header                | city / state                | ✅    | `communities.city, communities.state`             | —                                                              |
| Chip subtitle                      | total video count           | ✅    | `community_video_membership` count                | —                                                              |
| Chip subtitle                      | ⭐ 4.8                      | ❌    | hardcoded `4.8`                                   | New `communities.rating numeric(2,1)` (manual or computed)     |
| Sheet header                       | sq mi                       | ❌    | hardcoded `12 sq mi`                              | New `communities.area_sq_mi numeric`                           |
| Sheet stat — School                | 9.2                         | ❌    | hardcoded `9.2`                                   | GreatSchools API or `communities.school_score numeric(2,1)`    |
| Sheet stat — Commute               | 22 min to Seattle           | ❌    | hardcoded `22 min · to Seattle`                   | New `communities.commute_anchor text`, `commute_minutes int`   |
| Sheet stat — Median                | $1.4M                       | ❌    | hardcoded `$1.4M`                                 | New `communities.median_price_cents bigint`                    |
| Sheet description                  | description                 | ✅    | `communities.description`                         | —                                                              |
| Sheet description                  | host (Mark Liu · 8 yrs)     | ❌    | hardcoded                                         | Reuse `communities.created_by` + `agents` + `years_in_area`    |
| Sheet video strip                  | category label              | ✅    | `community_videos.category`                       | —                                                              |
| Sheet video strip                  | thumbnail                   | ✅    | `cf_video_id` → `thumbnailUrl()`                  | —                                                              |
| L2 community carousel              | videos                      | ✅    | community videos                                  | —                                                              |
| /browse Communities cards          | rating / school / median    | ❌    | hardcoded                                         | Same as above                                                  |
| /browse Communities cards          | name / cover / video count  | ✅    | already shipped                                   | —                                                              |
| L1 community feed listings chip    | active count                | ✅    | `listings` count where `community_id` and active  | —                                                              |
| L2 listings sheet                  | listing list                | ✅    | `listings` where `community_id`                   | —                                                              |
| L3 listing carousel                | listing details             | ✅    | `listings`                                        | —                                                              |

**Implementation rule**: every fake field is a TS constant in a single file (`lib/community/fake-stats.ts`) keyed by community slug, with a top-level `// FAKE — phase35` banner and explicit pointers to the migration that will replace it. No fake data scattered across components.

---

## Component plan

NEW:
- `lib/community/fake-stats.ts` — keyed fake-data lookup with phase35 deletion banner.
- `app/(public)/browse/_components/BrowseTabs.tsx` — segmented `Homes | Communities`.
- `app/_components/CommunityGrid.tsx` — shared grid (used by `/browse?tab=communities` and `/communities`).
- `lib/communities/list.ts` — shared `fetchCommunityListCards()`.
- `app/(public)/browse/_components/CommunitySheet.tsx` — A's L1 sheet.
- `app/(public)/browse/_components/CommunityCarousel.tsx` — A's L2 horizontal carousel.
- `app/(public)/c/[slug]/feed/_components/CommunityListingsSheet.tsx` — B's L2 listings sheet.
- `app/(public)/c/[slug]/feed/_components/CommunityListingCarousel.tsx` — B's L3 listing carousel.

MODIFIED:
- `app/(public)/browse/_components/BrowseFeed.tsx` — chip becomes A's entry to L1 sheet (NOT direct nav).
- `app/(public)/browse/page.tsx` — wire `BrowseTabs`.
- `app/(public)/communities/page.tsx` — use shared helpers.
- `app/(public)/c/[slug]/feed/CommunityVideoFeed.tsx` — bottom-left chip opens L2 sheet (not nav).
- `lib/feed/browse-cards.ts` — populate `card.community = { slug, name, videoCount }`.

---

## Constraints

- **Tap targets ≥ 44×44** (WCAG 2.1) — already enforced project-wide.
- **No mute button** in any new surface — system volume keys (per phase34a.T2).
- **Single CTA per concept** — V1 is OK because each layer has a distinct, labeled affordance and a different surface; this isn't redundant CTA, it's progressive disclosure.
- **English only** — no `_zh`, no Chinese-community copy.
- **CLAUDE.md §0.3 surgical** — touch only what V1 spec requires.
- **CLAUDE.md §0.4 verifiable** — tsc clean, build green, smoke each layer's back-path.

---

## Verification checklist

Before ff-to-main:

1. `tsc --noEmit` clean
2. `next build` green; bundle deltas reported in DEVLOG
3. Smoke (Vercel preview):
   - `/browse` → tap a listing with community → chip appears top-left → tap → sheet slides up → tap community video thumb → L2 carousel → ‹ back → returns to L0 (NOT sheet)
   - `/browse?tab=communities` → tab swap works, URL persists → tap card → L1 community video feed → bottom chip → L2 listings sheet → tap listing → L3 carousel → ‹ back → returns to L2 sheet
   - Dismiss sheet via mask, via `×`, via swipe-down — all work
4. `/c/[slug]/feed` direct-link still works (no regression)
5. `/browse/feed?community=<slug>` direct-link still works (no regression — it's the same destination as L3, just deep-linked)

---

## Out of scope (phase35)

- `communities.rating / area_sq_mi / school_score / commute_* / median_price_cents` migrations
- Host concept formalization (`agents.years_in_area`)
- GreatSchools API integration (or admin UI for manual scores)
- Replace fake-stats.ts callers with real selects
