/**
 * upload-prefill-store — module-level in-memory File[] stash.
 *
 * Used by UploadFAB to hand off picked files across a client-side navigation
 * (FAB → /dashboard/{listings|communities}/new → server action redirect →
 * /edit). The Map lives in this client-bundle module, so it survives soft
 * navigations within the same SPA session. A hard reload (or new tab) will
 * clear it — the prefill ID in the URL would still be present but the
 * consumer just gets `null` and renders the empty state. That's acceptable
 * for V1 — the user just re-picks files.
 *
 * Phase 43.6 (2026-06-20).
 */

const store = new Map<string, File[]>();

/**
 * Stash a File[] and return a fresh ULID-style key. We use crypto.randomUUID
 * here — a real ULID library isn't worth the bytes for V1.
 */
export function stashFiles(files: File[]): string {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  store.set(id, files);
  return id;
}

/**
 * Read + delete. Returns null if the key was never stashed (or already
 * consumed, or the SPA bundle was reloaded).
 */
export function consumePrefill(id: string): File[] | null {
  const files = store.get(id);
  if (!files) return null;
  store.delete(id);
  return files;
}

/**
 * Peek at how many files are stashed without consuming. Used on the /new
 * pages to show a "N files queued" banner before the agent has finished
 * filling out the create form. The actual consumption happens later (on
 * /edit for listings, on /communities/[id] for communities) once a row
 * exists for the upload component to attach to.
 */
export function peekPrefillCount(id: string): number {
  return store.get(id)?.length ?? 0;
}
