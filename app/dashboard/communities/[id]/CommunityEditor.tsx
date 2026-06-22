'use client';

/**
 * CommunityEditor — Phase 4.4; Phase 23 (2026-06-14) trimmed; Phase 50
 * (2026-06-22) flattened; Phase 50.4 (2026-06-22) expanded with 10 metadata
 * fields.
 *
 * Phase 50.4 design notes — friction-minimization:
 *   - Every field has a placeholder showing a *real* example so the agent
 *     can start typing without thinking about format. Hints below explain
 *     the field's purpose in 5–7 words.
 *   - All new fields are optional. A community with just name/city/state is
 *     still valid. Empty strings normalize to NULL on submit.
 *   - property_types and highlights use chip-style UI (click to toggle / press
 *     Enter to add) rather than comma-separated text — agents shouldn't have
 *     to learn a serialization format.
 *   - Free-text "_text" fields (HOA fee, year built, price range) accept
 *     ranges like "$220/mo", "2018–2024", "$450k–$1.2M". Forcing strict
 *     numeric types creates more friction than it saves.
 *   - Fields are grouped into Identity / Location / Pitch / Property /
 *     Contact so the page reads as a story, not a form-bingo card.
 *
 * Phase 50 changes:
 *   - Removed inner `<section>` wrapper + duplicate "Community details"
 *     heading. The page-level details panel is now the sole framing card.
 *   - DangerZone moved out — page.tsx renders it as a sibling section.
 */

import { deleteCommunity, updateCommunity } from '@/app/dashboard/communities/actions';
import { COMMUNITY_PROPERTY_TYPES } from '@/lib/zod/community';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';

const INPUT_BASE =
  'w-full rounded border bg-surface px-3 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:ring-1 disabled:cursor-not-allowed disabled:opacity-60';
const INPUT_OK = 'border-line focus:border-line-strong focus:ring-line-strong';
const INPUT_ERR = 'border-red-500/70 focus:border-red-400 focus:ring-red-400';

function inputCls(hasError: boolean) {
  return `${INPUT_BASE} ${hasError ? INPUT_ERR : INPUT_OK}`;
}

interface CommunityRow {
  id: string;
  name: string;
  city: string | null;
  state: string;
  description: string | null;
  zip: string | null;
  county: string | null;
  hoa_fee_text: string | null;
  year_built_text: string | null;
  price_range_text: string | null;
  property_types: string[] | null;
  highlights: string[] | null;
  builder: string | null;
  website: string | null;
  tagline: string | null;
}

export function CommunityEditor({
  community,
  canEditMetadata,
}: {
  community: CommunityRow;
  canEditMetadata: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState(community.name);
  const [city, setCity] = useState(community.city ?? '');
  const [state, setState] = useState(community.state);
  const [zip, setZip] = useState(community.zip ?? '');
  const [county, setCounty] = useState(community.county ?? '');
  const [tagline, setTagline] = useState(community.tagline ?? '');
  const [highlights, setHighlights] = useState<string[]>(community.highlights ?? []);
  const [description, setDescription] = useState(community.description ?? '');
  const [propertyTypes, setPropertyTypes] = useState<string[]>(community.property_types ?? []);
  const [builder, setBuilder] = useState(community.builder ?? '');
  const [yearBuilt, setYearBuilt] = useState(community.year_built_text ?? '');
  const [priceRange, setPriceRange] = useState(community.price_range_text ?? '');
  const [hoaFee, setHoaFee] = useState(community.hoa_fee_text ?? '');
  const [website, setWebsite] = useState(community.website ?? '');

  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Track whether the form has any unsaved changes vs. the loaded row. Lets
  // us disable the Save button when there's nothing to save — small thing
  // but quietly removes a "did it actually save?" foot-gun.
  const isDirty = useMemo(() => {
    const trimOrNull = (v: string) => (v.trim() === '' ? null : v.trim());
    const same = (a: string | null, b: string | null) => (a ?? null) === (b ?? null);
    const sameArray = (a: string[] | null, b: string[]) =>
      JSON.stringify(a ?? []) === JSON.stringify(b);
    return !(
      same(community.name, name.trim()) &&
      same(community.city, trimOrNull(city)) &&
      same(community.state, state.trim().toUpperCase()) &&
      same(community.zip, trimOrNull(zip)) &&
      same(community.county, trimOrNull(county)) &&
      same(community.tagline, trimOrNull(tagline)) &&
      same(community.description, trimOrNull(description)) &&
      same(community.builder, trimOrNull(builder)) &&
      same(community.year_built_text, trimOrNull(yearBuilt)) &&
      same(community.price_range_text, trimOrNull(priceRange)) &&
      same(community.hoa_fee_text, trimOrNull(hoaFee)) &&
      same(community.website, trimOrNull(website)) &&
      sameArray(community.property_types, propertyTypes) &&
      sameArray(community.highlights, highlights)
    );
  }, [
    community,
    name,
    city,
    state,
    zip,
    county,
    tagline,
    description,
    builder,
    yearBuilt,
    priceRange,
    hoaFee,
    website,
    propertyTypes,
    highlights,
  ]);

  function clearFieldError(field: string) {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function togglePropertyType(t: string) {
    setPropertyTypes((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]));
    clearFieldError('property_types');
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canEditMetadata) return;
    setSaveState('saving');
    setFieldErrors({});
    setFormError(null);
    const trimOrNull = (v: string) => (v.trim() === '' ? null : v.trim());
    startTransition(async () => {
      const result = await updateCommunity(community.id, {
        name: name.trim(),
        city: trimOrNull(city),
        state: state.trim().toUpperCase(),
        description: trimOrNull(description),
        zip: trimOrNull(zip),
        county: trimOrNull(county),
        hoa_fee_text: trimOrNull(hoaFee),
        year_built_text: trimOrNull(yearBuilt),
        price_range_text: trimOrNull(priceRange),
        property_types: propertyTypes.length > 0 ? propertyTypes : null,
        highlights: highlights.length > 0 ? highlights : null,
        builder: trimOrNull(builder),
        website: trimOrNull(website),
        tagline: trimOrNull(tagline),
      });
      if (result.ok) {
        setSaveState('saved');
        setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000);
        router.refresh();
      } else {
        setSaveState('error');
        if (result.fieldErrors) setFieldErrors(result.fieldErrors);
        if (!result.fieldErrors || Object.keys(result.fieldErrors).length === 0) {
          setFormError(result.error);
        }
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-8" noValidate>
      {/* — Identity ——————————————————————————————————————— */}
      <FieldGroup title="Identity">
        <Field label="Name" required error={fieldErrors.name} hint="2–120 characters">
          <input
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              clearFieldError('name');
            }}
            maxLength={120}
            placeholder="e.g. Peachtree Corners"
            disabled={!canEditMetadata}
            aria-invalid={!!fieldErrors.name}
            className={inputCls(!!fieldErrors.name)}
          />
        </Field>
        <Field
          label="Tagline"
          error={fieldErrors.tagline}
          hint="One-line pitch shown on the community card. Optional."
        >
          <input
            type="text"
            value={tagline}
            onChange={(e) => {
              setTagline(e.target.value);
              clearFieldError('tagline');
            }}
            maxLength={120}
            placeholder="e.g. Walkable new-build townhomes minutes from MARTA"
            disabled={!canEditMetadata}
            aria-invalid={!!fieldErrors.tagline}
            className={inputCls(!!fieldErrors.tagline)}
          />
        </Field>
      </FieldGroup>

      {/* — Location ——————————————————————————————————————— */}
      <FieldGroup title="Location">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_5rem_7rem]">
          <Field label="City" error={fieldErrors.city}>
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                clearFieldError('city');
              }}
              maxLength={80}
              placeholder="Atlanta"
              disabled={!canEditMetadata}
              aria-invalid={!!fieldErrors.city}
              className={inputCls(!!fieldErrors.city)}
            />
          </Field>
          <Field label="State" required error={fieldErrors.state}>
            <input
              type="text"
              value={state}
              onChange={(e) => {
                setState(e.target.value.toUpperCase());
                clearFieldError('state');
              }}
              maxLength={2}
              placeholder="GA"
              disabled={!canEditMetadata}
              aria-invalid={!!fieldErrors.state}
              className={inputCls(!!fieldErrors.state)}
            />
          </Field>
          <Field label="ZIP" error={fieldErrors.zip}>
            <input
              type="text"
              value={zip}
              onChange={(e) => {
                setZip(e.target.value);
                clearFieldError('zip');
              }}
              maxLength={10}
              placeholder="30092"
              disabled={!canEditMetadata}
              aria-invalid={!!fieldErrors.zip}
              className={inputCls(!!fieldErrors.zip)}
            />
          </Field>
        </div>
        <Field label="County" error={fieldErrors.county} hint="Optional. Helps property-tax lookups.">
          <input
            type="text"
            value={county}
            onChange={(e) => {
              setCounty(e.target.value);
              clearFieldError('county');
            }}
            maxLength={80}
            placeholder="Gwinnett County"
            disabled={!canEditMetadata}
            aria-invalid={!!fieldErrors.county}
            className={inputCls(!!fieldErrors.county)}
          />
        </Field>
      </FieldGroup>

      {/* — Pitch ——————————————————————————————————————— */}
      <FieldGroup title="Pitch">
        <Field
          label="Highlights"
          error={fieldErrors.highlights}
          hint="Up to 8 short phrases. Press Enter to add one."
        >
          <ChipInput
            values={highlights}
            onChange={(next) => {
              setHighlights(next);
              clearFieldError('highlights');
            }}
            placeholder="e.g. Top-rated schools"
            maxItems={8}
            maxLength={80}
            disabled={!canEditMetadata}
            ariaInvalid={!!fieldErrors.highlights}
          />
        </Field>
        <Field
          label="Description"
          error={fieldErrors.description}
          hint="Longer story for the community page. Up to 2000 characters."
        >
          <textarea
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              clearFieldError('description');
            }}
            rows={4}
            maxLength={2000}
            placeholder="Tell buyers what makes this community feel like home — vibe, who lives here, what you'd notice on a Saturday morning."
            disabled={!canEditMetadata}
            aria-invalid={!!fieldErrors.description}
            className={`${inputCls(!!fieldErrors.description)} resize-y`}
          />
        </Field>
      </FieldGroup>

      {/* — Property ——————————————————————————————————————— */}
      <FieldGroup title="Property">
        <Field
          label="Property types"
          error={fieldErrors.property_types}
          hint="Pick all that apply."
        >
          <div className="flex flex-wrap gap-2">
            {COMMUNITY_PROPERTY_TYPES.map((t) => {
              const active = propertyTypes.includes(t);
              return (
                <button
                  key={t}
                  type="button"
                  disabled={!canEditMetadata}
                  onClick={() => togglePropertyType(t)}
                  aria-pressed={active}
                  className={`rounded-full border px-3 py-1 text-xs transition disabled:cursor-not-allowed disabled:opacity-60 ${
                    active
                      ? 'border-ink bg-ink text-cream'
                      : 'border-line bg-surface text-ink2 hover:border-line-strong hover:text-ink'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Builder" error={fieldErrors.builder} hint="Optional.">
            <input
              type="text"
              value={builder}
              onChange={(e) => {
                setBuilder(e.target.value);
                clearFieldError('builder');
              }}
              maxLength={120}
              placeholder="e.g. Pulte, Toll Brothers"
              disabled={!canEditMetadata}
              aria-invalid={!!fieldErrors.builder}
              className={inputCls(!!fieldErrors.builder)}
            />
          </Field>
          <Field label="Year built" error={fieldErrors.year_built_text} hint="A year or a range.">
            <input
              type="text"
              value={yearBuilt}
              onChange={(e) => {
                setYearBuilt(e.target.value);
                clearFieldError('year_built_text');
              }}
              maxLength={40}
              placeholder="e.g. 2018–2024"
              disabled={!canEditMetadata}
              aria-invalid={!!fieldErrors.year_built_text}
              className={inputCls(!!fieldErrors.year_built_text)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            label="Price range"
            error={fieldErrors.price_range_text}
            hint="Type any format you like."
          >
            <input
              type="text"
              value={priceRange}
              onChange={(e) => {
                setPriceRange(e.target.value);
                clearFieldError('price_range_text');
              }}
              maxLength={80}
              placeholder="e.g. $450k – $1.2M"
              disabled={!canEditMetadata}
              aria-invalid={!!fieldErrors.price_range_text}
              className={inputCls(!!fieldErrors.price_range_text)}
            />
          </Field>
          <Field
            label="HOA fee"
            error={fieldErrors.hoa_fee_text}
            hint="Monthly, annual, whatever's accurate."
          >
            <input
              type="text"
              value={hoaFee}
              onChange={(e) => {
                setHoaFee(e.target.value);
                clearFieldError('hoa_fee_text');
              }}
              maxLength={80}
              placeholder="e.g. $220/mo + one-time initiation"
              disabled={!canEditMetadata}
              aria-invalid={!!fieldErrors.hoa_fee_text}
              className={inputCls(!!fieldErrors.hoa_fee_text)}
            />
          </Field>
        </div>
      </FieldGroup>

      {/* — Contact ——————————————————————————————————————— */}
      <FieldGroup title="Contact">
        <Field
          label="Website"
          error={fieldErrors.website}
          hint="Builder or HOA site. Must start with https://."
        >
          <input
            type="url"
            value={website}
            onChange={(e) => {
              setWebsite(e.target.value);
              clearFieldError('website');
            }}
            maxLength={500}
            placeholder="https://peachtreecorners.example.com"
            disabled={!canEditMetadata}
            aria-invalid={!!fieldErrors.website}
            className={inputCls(!!fieldErrors.website)}
          />
        </Field>
      </FieldGroup>

      {canEditMetadata && (
        <div className="flex items-center gap-3 border-line border-t pt-4">
          <button
            type="submit"
            disabled={isPending || saveState === 'saving' || !isDirty}
            className="rounded bg-ink px-4 py-2 text-sm font-medium text-cream transition hover:opacity-90 disabled:opacity-50"
          >
            {saveState === 'saving' ? 'Saving…' : 'Save changes'}
          </button>
          {saveState === 'saved' && <span className="text-sm text-emerald-400">✓ Saved</span>}
          {saveState !== 'saved' && !isDirty && (
            <span className="text-muted text-xs">No unsaved changes</span>
          )}
          {saveState === 'error' && formError && (
            <span className="text-sm text-red-400">Error: {formError}</span>
          )}
        </div>
      )}
    </form>
  );
}

export function CommunityDangerZone({ communityId }: { communityId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function handleDelete() {
    if (
      !confirm(
        'Permanently delete this community? Schools, POIs, photos, videos and saved entries for it will be removed. Listings will be detached but not deleted. This cannot be undone.',
      )
    )
      return;
    setErr(null);
    startTransition(async () => {
      const res = await deleteCommunity(communityId);
      if (res.ok) {
        router.replace('/dashboard/communities');
      } else {
        setErr(res.error);
      }
    });
  }

  return (
    <section>
      <div className="rounded-2xl border border-rose-300/60 bg-rose-50/40 p-5 sm:p-6">
        <h2 className="font-semibold text-ink text-sm">Danger zone</h2>
        <p className="mt-1 text-ink2 text-xs">
          Permanently delete this community. Schools, POIs, photos, videos and saved entries will be
          removed. Listings will be detached but not deleted. This cannot be undone.
        </p>
        <button
          type="button"
          onClick={handleDelete}
          disabled={isPending}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-rose-600 px-5 py-3 font-medium text-sm text-white transition hover:bg-rose-700 active:scale-[0.99] disabled:opacity-60 sm:w-auto sm:min-w-[240px]"
        >
          {isPending ? 'Deleting…' : 'Delete this community'}
        </button>
        {err && (
          <p className="mt-3 rounded border border-red-500/40 bg-red-500/10 p-2 text-red-600 text-xs">
            Error: {err}
          </p>
        )}
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────
// — small UI primitives —
// ─────────────────────────────────────────────────────────────────

function FieldGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-4">
      <legend className="-mb-1 font-semibold text-ink text-sm">{title}</legend>
      {children}
    </fieldset>
  );
}

function Field({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-1 block font-medium text-ink2 text-xs">
        {label}
        {required && <span className="ml-0.5 text-ink">*</span>}
      </span>
      {children}
      {error ? (
        <span className="mt-1 block text-[11px] text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11px] text-muted">{hint}</span>
      ) : null}
    </div>
  );
}

/**
 * ChipInput — accumulates short phrases as removable chips. Press Enter or
 * comma to commit the current text; click ✕ to remove an existing chip.
 *
 * Why this UI: agents would otherwise need to remember a comma-separated
 * format. With chips, the input *is* the format — what they see is what
 * gets saved.
 */
function ChipInput({
  values,
  onChange,
  placeholder,
  maxItems,
  maxLength,
  disabled,
  ariaInvalid,
}: {
  values: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
  maxItems: number;
  maxLength: number;
  disabled?: boolean;
  ariaInvalid?: boolean;
}) {
  const [draft, setDraft] = useState('');
  const atMax = values.length >= maxItems;

  function commit() {
    const v = draft.trim();
    if (!v) return;
    if (atMax) return;
    if (values.includes(v)) {
      setDraft('');
      return;
    }
    onChange([...values, v.slice(0, maxLength)]);
    setDraft('');
  }

  function removeAt(idx: number) {
    onChange(values.filter((_, i) => i !== idx));
  }

  return (
    <div
      className={`flex flex-wrap items-center gap-2 rounded border bg-surface px-2 py-2 ${
        ariaInvalid ? 'border-red-500/70' : 'border-line focus-within:border-line-strong'
      } ${disabled ? 'cursor-not-allowed opacity-60' : ''}`}
    >
      {values.map((v, i) => (
        <span
          // biome-ignore lint/suspicious/noArrayIndexKey: chip identity = position+value, and onChange swaps the array wholesale
          key={`${i}-${v}`}
          className="inline-flex items-center gap-1 rounded-full border border-line bg-bg px-2 py-0.5 text-ink2 text-xs"
        >
          <span>{v}</span>
          {!disabled && (
            <button
              type="button"
              onClick={() => removeAt(i)}
              className="text-muted text-xs hover:text-ink"
              aria-label={`Remove ${v}`}
            >
              ×
            </button>
          )}
        </span>
      ))}
      {!atMax && (
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') {
              e.preventDefault();
              commit();
            } else if (e.key === 'Backspace' && draft === '' && values.length > 0) {
              onChange(values.slice(0, -1));
            }
          }}
          onBlur={commit}
          placeholder={values.length === 0 ? placeholder : ''}
          maxLength={maxLength}
          disabled={disabled}
          className="min-w-[8rem] flex-1 bg-transparent px-1 py-1 text-ink text-sm placeholder:text-muted focus:outline-none disabled:cursor-not-allowed"
        />
      )}
      {atMax && (
        <span className="px-1 text-muted text-[11px]">Max {maxItems} reached</span>
      )}
    </div>
  );
}
