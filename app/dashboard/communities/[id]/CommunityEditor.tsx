'use client';

/**
 * CommunityEditor — Phase 4.4; Phase 23 (2026-06-14) trimmed.
 *
 * This used to host three sections (metadata + schools + POIs). Phase 23
 * removed schools/POIs from the UI; only the metadata form lives here now.
 * If we want to bring per-community schools/POIs back later, recover the
 * SchoolsSection / PoisSection from git history.
 */

import { updateCommunity } from '@/app/dashboard/communities/actions';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

const INPUT_CLASS =
  'w-full rounded border border-bronze/30 bg-ink2 px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold';

interface CommunityRow {
  id: string;
  name: string;
  city: string | null;
  state: string;
  description: string | null;
}

export function CommunityEditor({
  community,
  canEditMetadata,
}: {
  community: CommunityRow;
  canEditMetadata: boolean;
}) {
  return (
    <div className="space-y-6">
      <MetadataSection community={community} canEdit={canEditMetadata} />
    </div>
  );
}

function MetadataSection({
  community,
  canEdit,
}: {
  community: CommunityRow;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(community.name);
  const [city, setCity] = useState(community.city ?? '');
  const [state, setState] = useState(community.state);
  const [description, setDescription] = useState(community.description ?? '');
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEdit) return;
    setSaveState('saving');
    setError(null);
    startTransition(async () => {
      const result = await updateCommunity(community.id, {
        name: name.trim(),
        city: city.trim() === '' ? null : city.trim(),
        state: state.trim().toUpperCase(),
        description: description.trim() === '' ? null : description.trim(),
      });
      if (result.ok) {
        setSaveState('saved');
        setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000);
        router.refresh();
      } else {
        setSaveState('error');
        setError(result.error);
      }
    });
  }

  return (
    <section className="rounded border border-bronze/30 bg-ink2 p-6">
      <div className="mb-4 flex items-baseline justify-between gap-2">
        <h2 className="text-base font-semibold">Community details</h2>
        {!canEdit && (
          <span className="rounded-full border border-bronze/30 px-2 py-0.5 text-[10px] uppercase tracking-wider text-cream/60">
            View only
          </span>
        )}
      </div>
      {!canEdit && (
        <p className="mb-4 rounded border border-bronze/20 bg-ink px-3 py-2 text-xs text-cream/60">
          Only the agent who created this community can edit metadata. You can still upload videos
          and photos.
        </p>
      )}
      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="Name" required>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={120}
            disabled={!canEdit}
            className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
          />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_5rem]">
          <Field label="City">
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
              disabled={!canEdit}
              className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
            />
          </Field>
          <Field label="State" required>
            <input
              type="text"
              value={state}
              onChange={(e) => setState(e.target.value.toUpperCase())}
              required
              maxLength={2}
              disabled={!canEdit}
              className={`${INPUT_CLASS} disabled:cursor-not-allowed disabled:opacity-60`}
            />
          </Field>
        </div>
        <Field label="Description">
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            maxLength={2000}
            disabled={!canEdit}
            className={`${INPUT_CLASS} resize-y disabled:cursor-not-allowed disabled:opacity-60`}
          />
        </Field>
        {canEdit && (
          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={isPending || saveState === 'saving'}
              className="rounded bg-gold px-4 py-2 text-sm font-medium text-ink transition hover:opacity-90 disabled:opacity-50"
            >
              {saveState === 'saving' ? 'Saving…' : 'Save changes'}
            </button>
            {saveState === 'saved' && <span className="text-sm text-emerald-400">✓ Saved</span>}
            {saveState === 'error' && (
              <span className="text-sm text-red-400">Error: {error ?? 'unknown'}</span>
            )}
          </div>
        )}
      </form>
    </section>
  );
}

function Field({
  label,
  required,
  hint,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-1 block text-xs font-medium text-cream/70">
        {label}
        {required && <span className="ml-0.5 text-gold">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-cream/40">{hint}</span>}
    </div>
  );
}
