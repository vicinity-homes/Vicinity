/**
 * Poster 4 — Luxury Brochure, 1080×1920 vertical PNG (downloadable).
 *
 * Phase 40.5: paper background, framed photo, serif title, two-col specs.
 * Static, no video. next/og inline styles only; Tailwind does not apply.
 */

import { thumbnailUrl } from '@/lib/cloudflare/stream';
import { demoCoverFor } from '@/lib/demo-media';
import { loadListingFeedBySlug } from '@/lib/listing-feed/load';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const contentType = 'image/png';

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
  let bedsLabel = '';
  let bathsLabel = '';
  let sqftLabel = '';
  let community = '';
  let bg = FALLBACK;

  if (bundle) {
    const { listing, listingVideos } = bundle;
    title = listing.address;
    location = `${listing.city}, ${listing.state}`;
    price = listing.price ? `$${listing.price.toLocaleString()}` : '';
    bedsLabel = listing.beds != null ? String(listing.beds) : '';
    bathsLabel = listing.baths != null ? String(listing.baths) : '';
    sqftLabel = listing.sqft != null ? listing.sqft.toLocaleString() : '';
    community = bundle.community?.name ?? '';

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

  const specPairs = [
    { k: 'Bedrooms', v: bedsLabel },
    { k: 'Bathrooms', v: bathsLabel },
    { k: 'Sq ft', v: sqftLabel },
  ].filter((s) => s.v);

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f3eee7',
        fontFamily: 'serif',
        color: '#313131',
        padding: '72px 64px',
      }}
    >
      {/* Wordmark + meta */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          paddingBottom: 18,
          borderBottom: '1px solid #d8d2c8',
        }}
      >
        <div style={{ display: 'flex', fontSize: 30, letterSpacing: '-0.01em' }}>Vicinity</div>
        <div
          style={{
            display: 'flex',
            fontSize: 16,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: '#7a7470',
            fontFamily: 'sans-serif',
          }}
        >
          Featured residence
        </div>
      </div>

      {/* Framed photo */}
      <div
        style={{
          display: 'flex',
          marginTop: 48,
          backgroundColor: '#fbf8f3',
          border: '1px solid #d8d2c8',
          padding: 12,
        }}
      >
        {/* biome-ignore lint/nursery/noImgElement: ImageResponse renders to PNG */}
        <img
          src={bg}
          alt=""
          width={952}
          height={952}
          style={{ width: '100%', height: 880, objectFit: 'cover' }}
        />
      </div>

      {/* Title */}
      <div
        style={{
          display: 'flex',
          marginTop: 40,
          fontSize: 18,
          letterSpacing: '0.28em',
          textTransform: 'uppercase',
          color: '#7a7470',
          fontFamily: 'sans-serif',
        }}
      >
        {location}
      </div>
      <div
        style={{
          display: 'flex',
          marginTop: 12,
          fontSize: 68,
          lineHeight: 1.05,
          letterSpacing: '-0.01em',
        }}
      >
        {title}
      </div>
      {price ? (
        <div
          style={{
            display: 'flex',
            marginTop: 14,
            fontSize: 40,
            color: '#5a5550',
          }}
        >
          {price}
        </div>
      ) : null}

      {/* 2-col specs */}
      {specPairs.length > 0 ? (
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            marginTop: 32,
            borderTop: '1px solid #d8d2c8',
            paddingTop: 18,
            gap: 24,
          }}
        >
          {specPairs.map((s) => (
            <div
              key={s.k}
              style={{
                display: 'flex',
                flexDirection: 'column',
                width: '30%',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  fontSize: 14,
                  letterSpacing: '0.22em',
                  textTransform: 'uppercase',
                  color: '#7a7470',
                  fontFamily: 'sans-serif',
                }}
              >
                {s.k}
              </div>
              <div style={{ display: 'flex', marginTop: 6, fontSize: 36 }}>{s.v}</div>
            </div>
          ))}
        </div>
      ) : null}

      <div style={{ flex: 1 }} />

      {/* Footer: community */}
      <div
        style={{
          display: 'flex',
          marginTop: 28,
          paddingTop: 18,
          borderTop: '1px solid #d8d2c8',
          fontSize: 18,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: '#7a7470',
          fontFamily: 'sans-serif',
        }}
      >
        {community || 'Vicinity'}
      </div>
    </div>,
    { ...SIZE },
  );
}
