/**
 * Poster 1 — Editorial, 1080×1920 vertical PNG (downloadable).
 *
 * Phase 40.5: agent-facing share asset for WeChat moments / IG / 朋友圈.
 * Distinct from `opengraph-image.tsx` (1200×630 link preview) — this is
 * a manual-download image. Static, no video. next/og inline styles only;
 * Tailwind classes do not apply here.
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

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f3eee7',
        fontFamily: 'serif',
        color: '#1a1a1a',
      }}
    >
      {/* Hero photo, top ~62% */}
      <div style={{ position: 'relative', display: 'flex', width: '100%', height: 1190 }}>
        {/* biome-ignore lint/nursery/noImgElement: ImageResponse renders to PNG */}
        <img
          src={bg}
          alt=""
          width={1080}
          height={1190}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <div
          style={{
            position: 'absolute',
            top: 48,
            left: 56,
            display: 'flex',
            fontSize: 22,
            letterSpacing: '0.28em',
            textTransform: 'uppercase',
            color: '#fbf8f3',
            background: 'rgba(0,0,0,0.35)',
            padding: '10px 18px',
          }}
        >
          {location || 'VICINITY'}
        </div>
      </div>

      {/* Editorial info block */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '56px 64px 64px',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 72,
            lineHeight: 1.05,
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        {price ? (
          <div
            style={{
              display: 'flex',
              marginTop: 18,
              fontSize: 44,
              color: '#5a5550',
            }}
          >
            {price}
          </div>
        ) : null}

        {/* 3-col specs */}
        <div
          style={{
            display: 'flex',
            marginTop: 36,
            borderTop: '1px solid #d8d2c8',
            borderBottom: '1px solid #d8d2c8',
            paddingTop: 20,
            paddingBottom: 20,
            gap: 32,
          }}
        >
          {[
            { k: 'Bedrooms', v: bedsLabel },
            { k: 'Bathrooms', v: bathsLabel },
            { k: 'Sq ft', v: sqftLabel },
          ]
            .filter((s) => s.v)
            .map((s) => (
              <div
                key={s.k}
                style={{ display: 'flex', flexDirection: 'column', flex: 1 }}
              >
                <div
                  style={{
                    display: 'flex',
                    fontSize: 16,
                    letterSpacing: '0.22em',
                    textTransform: 'uppercase',
                    color: '#7a7470',
                    fontFamily: 'sans-serif',
                  }}
                >
                  {s.k}
                </div>
                <div style={{ display: 'flex', marginTop: 8, fontSize: 44 }}>{s.v}</div>
              </div>
            ))}
        </div>

        <div style={{ flex: 1 }} />

        {/* Footer: community + Vicinity wordmark */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
          }}
        >
          <div
            style={{
              display: 'flex',
              fontSize: 22,
              letterSpacing: '0.22em',
              textTransform: 'uppercase',
              color: '#7a7470',
              fontFamily: 'sans-serif',
            }}
          >
            {community || 'Featured residence'}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 28,
              letterSpacing: '0.04em',
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
