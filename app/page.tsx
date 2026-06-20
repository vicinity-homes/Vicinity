import { SiteFooter } from '@/components/site/SiteFooter';
import {
  LANDING_HERO_POSTER,
  LANDING_HERO_VIDEO,
  LANDING_SUBTITLE,
  LANDING_TAGLINE,
} from '@/lib/copy/landing';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function HomePage() {
  // If already authed, the landing's Login button is meaningless and Explore
  // should be the default — send them straight to /browse.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect('/browse');

  return (
    <>
      {/* Hero — full-bleed video, soft cream wash over, centered headline + dual CTA. */}
      <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden bg-bg">
        <video
          autoPlay
          muted
          loop
          playsInline
          // WeChat X5 inline-autoplay hints — without these, X5 swaps the video
          // for a system play button and the hero appears static (poster only).
          webkit-playsinline="true"
          x5-playsinline="true"
          x5-video-player-type="h5-page"
          x5-video-player-fullscreen="false"
          poster={LANDING_HERO_POSTER}
          className="absolute inset-0 h-full w-full object-cover"
        >
          <source src={LANDING_HERO_VIDEO} type="video/mp4" />
        </video>
        {/* Bottom-only cream fade — keeps the video readable up top (no grey haze
            from a mid-screen cream wash) while the text panel still lands on cream. */}
        <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-b from-bg/0 via-bg/60 to-bg" />

        <div className="relative z-10 flex h-full flex-col items-center justify-center px-6 text-center">
          <div className="eyebrow mb-6 !text-ink">Vicinity</div>
          <h1 className="display-xl max-w-4xl text-ink">{LANDING_TAGLINE}</h1>
          <p className="mx-auto mt-6 max-w-xl text-base text-ink leading-[1.7] sm:text-lg">
            {LANDING_SUBTITLE}
          </p>
          <div className="mt-10 flex flex-col justify-center gap-3 sm:flex-row">
            <Link
              href="/browse"
              className="inline-flex items-center justify-center bg-ink px-8 py-4 text-[12px] tracking-[0.22em] text-surface uppercase transition hover:bg-[#1f1f1f]"
            >
              Explore
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center border border-line-strong px-8 py-4 text-[12px] tracking-[0.22em] text-ink uppercase transition hover:border-ink"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <SiteFooter />
    </>
  );
}
