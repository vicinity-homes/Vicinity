/**
 * Poster 1 — Dossier, 1080×1920 vertical PNG (downloadable).
 *
 * Phase 41 (2026-06-20): replaces the phase 40 Editorial poster. Mirrors
 * the new Style 1 dossier look — top band, big serif address + burgundy
 * price chip, hero photo in panel ①, 4-up photo grid in panel ②,
 * numbered specs panel ③, agent footer panel ④. Distinct from poster-2
 * (cinematic full-bleed) and poster-4 (luxury brochure) by structure,
 * not just typography — thumbnails should be obviously different at a
 * glance (Mom Test signal: agent picks one).
 *
 * Static PNG. next/og inline styles only — Tailwind classes do NOT apply.
 * Every flex parent needs `display: 'flex'` (next/og quirk).
 */

import { thumbnailUrl } from '@/lib/cloudflare/stream';
import { demoCoverFor, demoPhotosFor } from '@/lib/demo-media';
import { loadListingFeedBySlug, loadListingPhotos } from '@/lib/listing-feed/load';
import { photoPublicUrl } from '@/lib/supabase/storage';
import { ImageResponse } from 'next/og';

export const runtime = 'edge';

const SIZE = { width: 1080, height: 1920 };

const FALLBACK =
  'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1600&q=80';

const PAPER = '#f3eee7';
const PAPER_2 = '#ece5d8';
const INK = '#1a1a1a';
const INK_SOFT = '#5a5550';
const RULE = '#d8d2c8';
const DOSSIER = '#8a2a23';

function PanelBadge({ n }: { n: number }) {
  return (
    <div
      style={{
        display: 'flex',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: INK,
        color: PAPER,
        fontSize: 22,
        fontFamily: 'sans-serif',
        fontWeight: 600,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
      }}
    >
      {n}
    </div>
  );
}

function PanelHeader({ n, label }: { n: number; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
      <PanelBadge n={n} />
      <div
        style={{
          display: 'flex',
          fontSize: 22,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
          color: INK,
          fontFamily: 'sans-serif',
          fontWeight: 600,
        }}
      >
        {label}
      </div>
    </div>
  );
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ agentSlug: string; listingSlug: string }> },
) {
  const { agentSlug, listingSlug } = await params;
  const bundle = await loadListingFeedBySlug(agentSlug, listingSlug);

  let title = 'Vicinity';
  let location = '';
  let price = '';
  let pricePerSqft = '';
  let bedsLabel = '';
  let bathsLabel = '';
  let sqftLabel = '';
  let community = '';
  let agentName = '';
  let dossierNo = '0000';
  let bg = FALLBACK;
  let interior: string[] = [];

  if (bundle) {
    const { listing, listingVideos, agent } = bundle;
    title = listing.address;
    location = `${listing.city}, ${listing.state}`;
    price = listing.price ? `$${listing.price.toLocaleString()}` : '';
    pricePerSqft =
      listing.price && listing.sqft
        ? `$${Math.round(listing.price / listing.sqft).toLocaleString()} / sqft`
        : '';
    bedsLabel = listing.beds != null ? String(listing.beds) : '';
    bathsLabel = listing.baths != null ? String(listing.baths) : '';
    sqftLabel = listing.sqft != null ? listing.sqft.toLocaleString() : '';
    community = bundle.community?.name ?? '';
    agentName = agent.name;
    dossierNo = listing.id.slice(0, 4).toUpperCase();

    let real: string | null = listing.cover_url ?? null;
    if (!real && listingVideos[0]) {
      try {
        real = thumbnailUrl(listingVideos[0].cf_video_id);
      } catch {
        real = null;
      }
    }
    bg = demoCoverFor(listing.id, real) ?? FALLBACK;

    // Interior 4-up grid for panel ② — pulls listing photos through demo-media.
    try {
      const photos = await loadListingPhotos(listing.id);
      const realUrls = photos.map((p) => photoPublicUrl(p.storage_path));
      const album = demoPhotosFor(listing.id, realUrls);
      interior = album.slice(1, 5);
    } catch {
      interior = [];
    }
  }

  return new ImageResponse(
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: PAPER,
        fontFamily: 'serif',
        color: INK,
      }}
    >
      {/* Top band */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '20px 56px',
          borderBottom: `1px solid ${INK}`,
          fontFamily: 'sans-serif',
          fontSize: 18,
          letterSpacing: '0.24em',
          textTransform: 'uppercase',
        }}
      >
        <div style={{ display: 'flex' }}>VICINITY · LISTING DOSSIER</div>
        <div style={{ display: 'flex', color: INK_SOFT }}>No. {dossierNo}</div>
      </div>

      {/* Masthead */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '36px 56px 28px',
          borderBottom: `2px solid ${INK}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 18,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: INK_SOFT,
            fontFamily: 'sans-serif',
          }}
        >
          {location || 'VICINITY'} · For private sale
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 16,
            fontSize: 76,
            lineHeight: 1.02,
            fontWeight: 500,
            letterSpacing: '-0.01em',
          }}
        >
          {title}
        </div>
        <div
          style={{
            display: 'flex',
            marginTop: 22,
            alignItems: 'center',
            gap: 24,
            fontFamily: 'sans-serif',
            fontSize: 22,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          {price ? (
            <div style={{ display: 'flex', color: DOSSIER, fontWeight: 600 }}>{price}</div>
          ) : null}
          {bedsLabel ? <div style={{ display: 'flex' }}>{bedsLabel} BD</div> : null}
          {bathsLabel ? <div style={{ display: 'flex' }}>{bathsLabel} BA</div> : null}
          {sqftLabel ? <div style={{ display: 'flex' }}>{sqftLabel} SQFT</div> : null}
        </div>
        {pricePerSqft ? (
          <div
            style={{
              display: 'flex',
              marginTop: 14,
              padding: '6px 12px',
              border: `1px solid ${DOSSIER}`,
              color: DOSSIER,
              fontFamily: 'sans-serif',
              fontSize: 16,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              alignSelf: 'flex-start',
            }}
          >
            {pricePerSqft}
          </div>
        ) : null}
      </div>

      {/* Panel ① — The Home (hero photo) */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 56px 20px',
          borderBottom: `1px solid ${RULE}`,
        }}
      >
        <PanelHeader n={1} label="The Home" />
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: 540,
            border: `1px solid ${INK}`,
            overflow: 'hidden',
          }}
        >
          {/* biome-ignore lint/nursery/noImgElement: ImageResponse renders to PNG */}
          <img
            src={bg}
            alt=""
            width={968}
            height={540}
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      </div>

      {/* Panel ② — Inside (4-up photo grid) */}
      {interior.length >= 4 ? (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            padding: '24px 56px 20px',
            borderBottom: `1px solid ${RULE}`,
          }}
        >
          <PanelHeader n={2} label="Inside" />
          <div style={{ display: 'flex', gap: 6 }}>
            {interior.slice(0, 4).map((src) => (
              <div
                key={src}
                style={{
                  display: 'flex',
                  flex: 1,
                  height: 232,
                  border: `1px solid ${INK}`,
                  overflow: 'hidden',
                }}
              >
                {/* biome-ignore lint/nursery/noImgElement: ImageResponse renders to PNG */}
                <img
                  src={src}
                  alt=""
                  width={236}
                  height={232}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flex: 1 }} />

      {/* Panel ③ — Represented by + footer band */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '24px 56px 28px',
          backgroundColor: PAPER_2,
          borderTop: `1px solid ${INK}`,
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div
              style={{
                display: 'flex',
                fontFamily: 'sans-serif',
                fontSize: 16,
                letterSpacing: '0.24em',
                textTransform: 'uppercase',
                color: INK_SOFT,
              }}
            >
              Represented by
            </div>
            <div style={{ display: 'flex', marginTop: 8, fontSize: 36, letterSpacing: '-0.005em' }}>
              {agentName || 'Vicinity Agent'}
            </div>
            {community ? (
              <div
                style={{
                  display: 'flex',
                  marginTop: 8,
                  fontFamily: 'sans-serif',
                  fontSize: 16,
                  letterSpacing: '0.18em',
                  textTransform: 'uppercase',
                  color: INK_SOFT,
                }}
              >
                {community}
              </div>
            ) : null}
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: 32,
              letterSpacing: '0.04em',
              fontFamily: 'serif',
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
