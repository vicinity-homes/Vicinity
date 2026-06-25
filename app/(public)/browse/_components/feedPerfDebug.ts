// Phase 56 perf debug — feed video lifecycle instrumentation.
// Enable: append `?vdbg=1` to /browse/feed URL, or
//         localStorage.setItem('vdbg', '1') in DevTools / Safari.
// Disable: remove the query param or localStorage key + reload.
//
// Why not just console.log: iPhone Safari users can't see the console without
// a Mac + USB cable. Render an on-screen ring buffer overlay so Vivian can
// screenshot what she sees.

export type VdbgEvent = {
  t: number; // ms since first event
  idx: number; // card index in feed
  cfId: string; // Cloudflare video id (truncated in display)
  type: string; // event name (card-mount, loadedmetadata, playing, …)
  data?: Record<string, unknown>;
};

const RING_MAX = 200;
const buf: VdbgEvent[] = [];
const subs = new Set<() => void>();
let enabled: boolean | null = null;
let startedAt = 0;

export function isVdbgEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  if (enabled !== null) return enabled;
  try {
    const url = new URL(window.location.href);
    if (url.searchParams.get('vdbg') === '1') {
      enabled = true;
      startedAt = performance.now();
      return true;
    }
    if (window.localStorage.getItem('vdbg') === '1') {
      enabled = true;
      startedAt = performance.now();
      return true;
    }
  } catch {
    // localStorage may throw in private mode — fall through.
  }
  enabled = false;
  return false;
}

export function vdbgLog(
  idx: number,
  cfId: string,
  type: string,
  data?: Record<string, unknown>,
): void {
  if (!isVdbgEnabled()) return;
  const t = Math.round(performance.now() - startedAt);
  const ev: VdbgEvent = { t, idx, cfId, type, data };
  buf.push(ev);
  if (buf.length > RING_MAX) buf.shift();
  // eslint-disable-next-line no-console
  console.log(`[VDBG +${t}ms] i${idx} ${cfId.slice(0, 6)} ${type}`, data ?? '');
  for (const s of subs) s();
}

export function vdbgEvents(): VdbgEvent[] {
  return buf.slice();
}

export function vdbgSubscribe(fn: () => void): () => void {
  subs.add(fn);
  return () => {
    subs.delete(fn);
  };
}

export function vdbgNetInfo(): Record<string, unknown> | null {
  if (typeof navigator === 'undefined') return null;
  // NetworkInformation API — Safari iOS 17.4+ exposes it; older returns null.
  const c = (navigator as unknown as { connection?: Record<string, unknown> }).connection;
  if (!c) return null;
  return {
    effectiveType: c.effectiveType,
    downlink: c.downlink,
    rtt: c.rtt,
    saveData: c.saveData,
  };
}

/** Buffered ranges as compact `start-end,start-end` string for logging. */
export function vdbgBuffered(v: HTMLVideoElement): string {
  try {
    const b = v.buffered;
    if (!b.length) return '∅';
    const parts: string[] = [];
    for (let i = 0; i < b.length; i++) {
      parts.push(`${b.start(i).toFixed(1)}-${b.end(i).toFixed(1)}`);
    }
    return parts.join(',');
  } catch {
    return '?';
  }
}
