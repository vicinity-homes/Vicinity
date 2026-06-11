'use client';

/**
 * EditListingForm — Phase 4.3a metadata editor.
 * Phase 8/listing-form-ux (2026-06-11) overhaul:
 *  - Each field labelled "Required" (publish gate) or "Optional".
 *  - Beds, baths, style use dropdowns with an "Other"/"More" escape to a text
 *    input, so the common case is one click and the long tail still works.
 *  - Lot size is split into a number + unit dropdown (acres / sqft), composed
 *    back into the existing text column on save.
 *  - Misleading placeholders that looked like real default values
 *    (`950000`, `4`, `3.5`) replaced with explicit `e.g. ...` hints.
 *  - Address fields stay read-only (see actions.ts header for the rationale).
 */

import { type UpdateListingInput, updateListing } from '@/app/dashboard/listings/[id]/edit/actions';
import { useMemo, useState, useTransition } from 'react';

interface InitialValues {
  price: number | null;
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  year_built: number | null;
  lot_size: string | null;
  hoa: string | null;
  style: string | null;
  description: string[];
  community_id: string | null;
}

export interface ListingContext {
  address: string;
  city: string;
  state: string;
  neighborhood: string | null;
}

export interface CommunityOption {
  id: string;
  name: string;
  city: string | null;
  state: string;
}

interface Props {
  listingId: string;
  initial: InitialValues;
  communities: CommunityOption[];
  listingContext: ListingContext;
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type GenState = 'idle' | 'loading' | 'error';

const STYLE_OPTIONS = [
  'Craftsman',
  'Colonial',
  'Modern',
  'Contemporary',
  'Ranch',
  'Tudor',
  'Mediterranean',
  'Farmhouse',
  'Townhouse',
  'Condo',
] as const;

const BED_OPTIONS = ['0', '1', '2', '3', '4', '5', '6'] as const;
const BATH_OPTIONS = ['1', '1.5', '2', '2.5', '3', '3.5', '4', '4.5', '5'] as const;

type LotUnit = 'acres' | 'sqft';

/**
 * Parse `"0.35 acres"` / `"15000 sqft"` / `"15,000"` into (numeric string, unit).
 * Falls back to ('', 'acres') if value is null/empty/unparseable.
 */
function parseLotSize(value: string | null): { num: string; unit: LotUnit } {
  if (!value) return { num: '', unit: 'acres' };
  const lower = value.toLowerCase();
  const unit: LotUnit = lower.includes('sqft') || lower.includes('sq ft') ? 'sqft' : 'acres';
  const numMatch = value.match(/[\d.,]+/);
  const num = numMatch ? numMatch[0].replace(/,/g, '') : '';
  return { num, unit };
}

function composeLotSize(num: string, unit: LotUnit): string | null {
  const trimmed = num.trim();
  if (trimmed === '') return null;
  return `${trimmed} ${unit}`;
}

export function EditListingForm({ listingId, initial, communities, listingContext }: Props) {
  const [price, setPrice] = useState(initial.price?.toString() ?? '');

  // Beds: dropdown picks 0-6 or "more" → free-text input. If initial > 6 or
  // a fractional value, start in "more" mode prefilled.
  const initialBeds = initial.beds?.toString() ?? '';
  const initialBedsInList = (BED_OPTIONS as readonly string[]).includes(initialBeds);
  const [bedsMode, setBedsMode] = useState<'list' | 'more'>(
    initialBeds === '' || initialBedsInList ? 'list' : 'more',
  );
  const [beds, setBeds] = useState(initialBeds);

  const initialBaths = initial.baths?.toString() ?? '';
  const initialBathsInList = (BATH_OPTIONS as readonly string[]).includes(initialBaths);
  const [bathsMode, setBathsMode] = useState<'list' | 'more'>(
    initialBaths === '' || initialBathsInList ? 'list' : 'more',
  );
  const [baths, setBaths] = useState(initialBaths);

  const [sqft, setSqft] = useState(initial.sqft?.toString() ?? '');
  const [yearBuilt, setYearBuilt] = useState(initial.year_built?.toString() ?? '');

  const initialLot = useMemo(() => parseLotSize(initial.lot_size), [initial.lot_size]);
  const [lotNum, setLotNum] = useState(initialLot.num);
  const [lotUnit, setLotUnit] = useState<LotUnit>(initialLot.unit);

  const [hoa, setHoa] = useState(initial.hoa ?? '');

  const initialStyleInList = initial.style
    ? (STYLE_OPTIONS as readonly string[]).includes(initial.style)
    : true;
  const [styleMode, setStyleMode] = useState<'list' | 'other'>(
    initialStyleInList ? 'list' : 'other',
  );
  const [style, setStyle] = useState(initial.style ?? '');

  const [description, setDescription] = useState(initial.description.join('\n\n'));
  const [communityId, setCommunityId] = useState<string>(initial.community_id ?? '');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [genState, setGenState] = useState<GenState>('idle');
  const [genError, setGenError] = useState<string | null>(null);

  function parseIntOrNull(s: string): number | null {
    if (s.trim() === '') return null;
    const n = Number.parseInt(s, 10);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }
  function parseFloatOrNull(s: string): number | null {
    if (s.trim() === '') return null;
    const n = Number.parseFloat(s);
    return Number.isFinite(n) && n >= 0 ? n : null;
  }

  async function onGenerate() {
    setGenState('loading');
    setGenError(null);
    try {
      const payload: Record<string, unknown> = {
        address: listingContext.address,
        city: listingContext.city,
        state: listingContext.state,
      };
      if (listingContext.neighborhood) payload.neighborhood = listingContext.neighborhood;
      const priceN = parseIntOrNull(price);
      if (priceN !== null) payload.price = priceN;
      const bedsN = parseFloatOrNull(beds);
      if (bedsN !== null) payload.beds = bedsN;
      const bathsN = parseFloatOrNull(baths);
      if (bathsN !== null) payload.baths = bathsN;
      const sqftN = parseIntOrNull(sqft);
      if (sqftN !== null) payload.sqft = sqftN;
      const styleT = style.trim();
      if (styleT) payload.style = styleT;

      const res = await fetch('/api/generate-copy', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (res.status === 429) throw new Error('Rate limit hit — try again in a minute.');
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const data = (await res.json()) as { paragraphs: string[] };
      setDescription(data.paragraphs.join('\n\n'));
      setGenState('idle');
    } catch (err) {
      setGenState('error');
      setGenError(err instanceof Error ? err.message : 'unknown');
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaveState('saving');
    setErrorMsg(null);

    const payload: UpdateListingInput = {
      price: parseIntOrNull(price),
      beds: parseFloatOrNull(beds),
      baths: parseFloatOrNull(baths),
      sqft: parseIntOrNull(sqft),
      year_built: parseIntOrNull(yearBuilt),
      lot_size: composeLotSize(lotNum, lotUnit),
      hoa: hoa.trim() === '' ? null : hoa.trim(),
      style: style.trim() === '' ? null : style.trim(),
      description,
      community_id: communityId === '' ? null : communityId,
    };

    startTransition(async () => {
      const result = await updateListing(listingId, payload);
      if (result.ok) {
        setSaveState('saved');
        setTimeout(() => setSaveState((s) => (s === 'saved' ? 'idle' : s)), 2000);
      } else {
        setSaveState('error');
        setErrorMsg(result.error);
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <p className="rounded border border-bronze/20 bg-ink2/40 p-3 text-xs text-cream/60">
        <span className="text-red-300">*</span> Required to publish (address, list price, bedrooms,
        bathrooms, and at least one ready video). Other fields are optional and can be added later.
      </p>

      <fieldset className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field label="List price (USD)" required>
          <input
            type="number"
            min="0"
            step="1000"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            placeholder="e.g. 950000"
            className={INPUT_CLASS}
          />
        </Field>
        <Field label="Square feet" optional>
          <input
            type="number"
            min="0"
            step="10"
            value={sqft}
            onChange={(e) => setSqft(e.target.value)}
            placeholder="e.g. 3200"
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Bedrooms" required hint="0 = studio. Pick 7 or more for larger homes.">
          {bedsMode === 'list' ? (
            <select
              value={beds}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__more__') {
                  setBedsMode('more');
                  setBeds('');
                } else {
                  setBeds(v);
                }
              }}
              className={INPUT_CLASS}
            >
              <option value="">— Select —</option>
              {BED_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b === '0' ? '0 (studio)' : b}
                </option>
              ))}
              <option value="__more__">7 or more…</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                min="7"
                step="1"
                value={beds}
                onChange={(e) => setBeds(e.target.value)}
                placeholder="e.g. 8"
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => {
                  setBedsMode('list');
                  setBeds('');
                }}
                className="shrink-0 rounded border border-bronze/30 px-2 text-xs text-cream/60 hover:bg-bronze/10"
              >
                Use list
              </button>
            </div>
          )}
        </Field>

        <Field
          label="Bathrooms"
          required
          hint="Half baths count as 0.5. Pick more than 5 for custom."
        >
          {bathsMode === 'list' ? (
            <select
              value={baths}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__more__') {
                  setBathsMode('more');
                  setBaths('');
                } else {
                  setBaths(v);
                }
              }}
              className={INPUT_CLASS}
            >
              <option value="">— Select —</option>
              {BATH_OPTIONS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="__more__">More than 5…</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                type="number"
                min="0"
                step="0.5"
                value={baths}
                onChange={(e) => setBaths(e.target.value)}
                placeholder="e.g. 5.5"
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => {
                  setBathsMode('list');
                  setBaths('');
                }}
                className="shrink-0 rounded border border-bronze/30 px-2 text-xs text-cream/60 hover:bg-bronze/10"
              >
                Use list
              </button>
            </div>
          )}
        </Field>

        <Field label="Year built" optional>
          <input
            type="number"
            min="1800"
            max="2100"
            value={yearBuilt}
            onChange={(e) => setYearBuilt(e.target.value)}
            placeholder="e.g. 2008"
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Lot size" optional>
          <div className="flex gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              value={lotNum}
              onChange={(e) => setLotNum(e.target.value)}
              placeholder={lotUnit === 'acres' ? 'e.g. 0.35' : 'e.g. 15000'}
              className={INPUT_CLASS}
            />
            <select
              value={lotUnit}
              onChange={(e) => setLotUnit(e.target.value as LotUnit)}
              className={`${INPUT_CLASS} max-w-[7rem]`}
            >
              <option value="acres">acres</option>
              <option value="sqft">sqft</option>
            </select>
          </div>
        </Field>

        <Field label="HOA" optional hint="Leave blank if none.">
          <input
            type="text"
            value={hoa}
            onChange={(e) => setHoa(e.target.value)}
            placeholder="e.g. $120/mo"
            maxLength={80}
            className={INPUT_CLASS}
          />
        </Field>

        <Field label="Style" optional>
          {styleMode === 'list' ? (
            <select
              value={style}
              onChange={(e) => {
                const v = e.target.value;
                if (v === '__other__') {
                  setStyleMode('other');
                  setStyle('');
                } else {
                  setStyle(v);
                }
              }}
              className={INPUT_CLASS}
            >
              <option value="">— Select —</option>
              {STYLE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
              <option value="__other__">Other…</option>
            </select>
          ) : (
            <div className="flex gap-2">
              <input
                type="text"
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                placeholder="e.g. Mid-century"
                maxLength={80}
                className={INPUT_CLASS}
              />
              <button
                type="button"
                onClick={() => {
                  setStyleMode('list');
                  setStyle('');
                }}
                className="shrink-0 rounded border border-bronze/30 px-2 text-xs text-cream/60 hover:bg-bronze/10"
              >
                Use list
              </button>
            </div>
          )}
        </Field>
      </fieldset>

      <Field
        label="Community"
        optional
        hint="Links this listing to a shared community for school + POI data. Manage communities at /dashboard/communities."
      >
        <select
          value={communityId}
          onChange={(e) => setCommunityId(e.target.value)}
          className={INPUT_CLASS}
        >
          <option value="">— None —</option>
          {communities.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
              {c.city ? ` (${c.city}, ${c.state})` : ` (${c.state})`}
            </option>
          ))}
        </select>
      </Field>

      <Field
        label="Description"
        optional
        hint="One paragraph per blank line. Up to 10 paragraphs, English only."
      >
        <div className="mb-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onGenerate}
            disabled={genState === 'loading'}
            className="rounded border border-bronze/50 px-3 py-1 text-xs text-cream hover:bg-bronze/20 disabled:opacity-50"
          >
            {genState === 'loading' ? 'Generating…' : '✨ Generate description'}
          </button>
          {genState === 'error' && (
            <span className="text-xs text-red-400">Error: {genError ?? 'unknown'}</span>
          )}
          <span className="text-xs text-cream/40">Overwrites current text.</span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={8}
          placeholder="Tell buyers what makes this home special. Press Enter twice for a new paragraph."
          className={`${INPUT_CLASS} min-h-[10rem] resize-y`}
        />
      </Field>

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
          <span className="text-sm text-red-400">Error: {errorMsg ?? 'unknown'}</span>
        )}
      </div>
    </form>
  );
}

const INPUT_CLASS =
  'w-full rounded border border-bronze/30 bg-ink2 px-3 py-2 text-sm text-cream placeholder:text-cream/40 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold';

function Field({
  label,
  hint,
  required,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="block">
      <span className="mb-1 flex items-center gap-2 text-xs font-medium text-cream/70">
        <span>{label}</span>
        {required ? (
          <span className="rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-red-300">
            <span aria-hidden="true">*</span> Required
          </span>
        ) : optional ? (
          <span className="rounded border border-cream/15 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-cream/40">
            Optional
          </span>
        ) : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-xs text-cream/40">{hint}</span> : null}
    </div>
  );
}
