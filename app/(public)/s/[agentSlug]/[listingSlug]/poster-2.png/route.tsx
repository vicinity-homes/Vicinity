/**
 * Poster 2 — Cinematic, 1080×1920 vertical PNG (downloadable).
 *
 * Phase 40.5: full-bleed hero with dark scrim, IG-story feel.
 * Static, no video. next/og inline styles only; Tailwind does not apply.
 */

import { thumbnailUrl } from '@/lib/cloudflare/stream';
import { demoCoverFor } from '@/lib/demo-media';
import { loadListingFeedBySlug } from '@/lib/listing-feed/load';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const SIZE = { width: 1080, height: 1920 };

const FALLBACK =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ agentSlug: string; listingSlug: string }> },
) {
  const { agentSlug, listingSlug } = await params;
  const bundle = await loadListingFeedBySlug(agentSlug, listingSlug);

  let title = 'Vicinity';
  let location = '';
  let price = '';
  let specs = '';
  let bg = FALLBACK;

  if (bundle) {
    const { listing, listingVideos } = bundle;
    title = listing.address;
    location = `${listing.city}, ${listing.state}`;
    price = listing.price ? `$${listing.price.toLocaleString()}` : '';
    specs = [
      listing.beds != null ? `${listing.beds} bd` : null,
      listing.baths != null ? `${listing.baths} ba` : null,
      listing.sqft != null ? `${listing.sqft.toLocaleString()} sqft` : null,
    ]
      .filter(Boolean)
      .join('  ·  ');

    let real: string | null = listing.cover_url ?? null;
    if (!real && listingVideos[0]) {
      try {
        real = thumbnailUrl(listingVideos[0].cf_video_id);
      } catch {
        real = null;
      }
    }
    bg = demoCoverFor(listing.id, real) ?? FALLBACK;
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        backgroundColor: '#0a0a0a',
        fontFamily: 'serif',
      }}
    >
      {/* biome-ignore lint/nursery/noImgElement: ImageResponse renders to PNG */}
      <img
        src={bg}
        alt=""
        width={1080}
        height={1920}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: 'cover',
        }}
      />
      {/* Heavy bottom scrim for legibility */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 35%, rgba(0,0,0,0.85) 100%)',
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 64px 80px',
          width: '100%',
          color: '#fbf8f3',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 22,
            letterSpacing: '0.32em',
            textTransform: 'uppercase',
            opacity: 0.95,
            fontFamily: 'sans-serif',
          }}
        >
          {location || 'VICINITY'}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              display: 'flex',
              fontSize: 96,
              lineHeight: 1.02,
              fontWeight: 500,
              letterSpacing: '-0.015em',
              maxWidth: 960,
            }}
          >
            {title}
          </div>
          {price ? (
            <div
              style={{
                display: 'flex',
                marginTop: 24,
                fontSize: 56,
                opacity: 0.95,
              }}
            >
              {price}
            </div>
          ) : null}
          {specs ? (
            <div
              style={{
                display: 'flex',
                marginTop: 12,
                fontSize: 30,
                opacity: 0.85,
                fontFamily: 'sans-serif',
                letterSpacing: '0.04em',
              }}
            >
              {specs}
            </div>
          ) : null}
          <div
            style={{
              display: 'flex',
              marginTop: 44,
              fontSize: 26,
              letterSpacing: '0.28em',
              textTransform: 'uppercase',
              opacity: 0.9,
              fontFamily: 'sans-serif',
            }}
          >
            Vicinity
          </div>
        </div>
      </div>
    </div>,
    { ...SIZE },
  );
}
