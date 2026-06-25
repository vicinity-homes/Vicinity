// Active HLS prefetch for iOS native-HLS path.
//
// Why this exists: on iPhone Safari, `canPlayType('application/vnd.apple.mpegurl')`
// is truthy → we hand the URL straight to `<video>.src` and skip hls.js entirely.
// hls.js's 20s rolling buffer on neighbor cards is therefore bypassed: each
// neighbor card sets `preload="auto"` but iOS aggressively downgrades that to
// `metadata` on cellular / low-power, so segments are NOT fetched until the
// card activates and `play()` runs. This produces the ~1s black-flash + stall
// observed on every swipe (vdbg logs in phase56 show `activate -> stall-waiting
// -> autoplay-blocked-retry-muted -> first-frame ≈ 1000-1300ms`).
//
// What we do: explicitly `fetch()` the master manifest, parse the first variant
// playlist URL, fetch that, then fetch the first 2 segment URLs. Browser HTTP
// cache stores them; when the card later sets `<video>.src`, segments hit cache
// and `first-frame` lands in <300ms typically.
//
// Bandwidth cost: 2 segments × ~6s × low bitrate variant ≈ ~300-600 KB per
// neighbor card. With shouldMount window of ±1, that's ≤2 prefetches in flight.
// We dedupe by master URL so cycling back to the same card doesn't refetch.
//
// All fetches are best-effort, abortable on unmount, and silent on failure.

import { vdbgLog } from './feedPerfDebug';

const inflight = new Map<string, AbortController>();
const completed = new Set<string>();

function firstNonCommentLine(text: string): string | null {
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line && !line.startsWith('#')) return line;
  }
  return null;
}

function nonCommentLines(text: string, max: number): string[] {
  const out: string[] = [];
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (line && !line.startsWith('#')) {
      out.push(line);
      if (out.length >= max) break;
    }
  }
  return out;
}

/**
 * Fire-and-forget prefetch of the master manifest + 1 variant + first 2 segments.
 *
 * @param masterUrl  HLS master playlist URL (e.g. cf-stream `.../manifest/video.m3u8`)
 * @param idx        debug logging context
 * @param cfId       debug logging context
 */
export function prefetchHlsHead(masterUrl: string, idx: number, cfId: string): () => void {
  if (completed.has(masterUrl)) return () => {};
  if (inflight.has(masterUrl)) return () => {};

  const ctrl = new AbortController();
  inflight.set(masterUrl, ctrl);
  const signal = ctrl.signal;

  (async () => {
    try {
      vdbgLog(idx, cfId, 'prefetch-start', {});
      const masterRes = await fetch(masterUrl, { signal, credentials: 'omit' });
      if (!masterRes.ok) {
        vdbgLog(idx, cfId, 'prefetch-error', { stage: 'master', status: masterRes.status });
        return;
      }
      const masterText = await masterRes.text();
      vdbgLog(idx, cfId, 'prefetch-master', { bytes: masterText.length });

      const variantRel = firstNonCommentLine(masterText);
      if (!variantRel) {
        vdbgLog(idx, cfId, 'prefetch-error', { stage: 'no-variant' });
        return;
      }
      const variantUrl = new URL(variantRel, masterUrl).toString();
      const variantRes = await fetch(variantUrl, { signal, credentials: 'omit' });
      if (!variantRes.ok) {
        vdbgLog(idx, cfId, 'prefetch-error', { stage: 'variant', status: variantRes.status });
        return;
      }
      const variantText = await variantRes.text();
      vdbgLog(idx, cfId, 'prefetch-variant', { bytes: variantText.length });

      const segs = nonCommentLines(variantText, 2);
      for (const seg of segs) {
        const segUrl = new URL(seg, variantUrl).toString();
        // Don't await — segments fetch in parallel, all best-effort.
        fetch(segUrl, { signal, credentials: 'omit' })
          .then((r) => {
            if (r.ok) vdbgLog(idx, cfId, 'prefetch-segment', { ok: true });
            else vdbgLog(idx, cfId, 'prefetch-segment', { ok: false, status: r.status });
          })
          .catch(() => {
            // Aborted or network error — silent.
          });
      }
      completed.add(masterUrl);
    } catch (err: unknown) {
      // Aborted on unmount — expected; only log other errors.
      if ((err as { name?: string })?.name !== 'AbortError') {
        vdbgLog(idx, cfId, 'prefetch-error', { stage: 'exception' });
      }
    } finally {
      inflight.delete(masterUrl);
    }
  })();

  return () => ctrl.abort();
}
