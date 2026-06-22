/**
 * Zod schemas for community editor (Phase 4.4; Phase 50.4 expansion).
 *
 * Communities are V1-shared (no per-agent ownership), but schools/pois carry
 * `recorded_by` + `source_url` for fair-housing audit. The `source_url`
 * constraint is enforced at the DB level (`text not null`) AND here so the
 * UI can give a clear error before round-tripping.
 *
 * Phase 50.4 (2026-06-22): adds 10 optional metadata fields to
 * UpdateCommunityInput so agents can describe communities richly without
 * being forced into rigid numeric/enum types. Free-text "_text" fields are
 * intentional — agents routinely write ranges like "$450k–$1.2M" or
 * "2018–2024" and strict numeric types create more friction than they save.
 */

import { z } from 'zod';

// Standard Property Types Vivian's team sees in NoVA / metro Atlanta. We let
// the UI render this as multi-select chips and store as text[] so agents
// can pick any combo (or leave empty).
export const COMMUNITY_PROPERTY_TYPES = [
  'Single Family',
  'Townhome',
  'Condo',
  'Active Adult 55+',
  'New Construction',
  'Resale',
  'Custom Build',
] as const;
export type CommunityPropertyType = (typeof COMMUNITY_PROPERTY_TYPES)[number];

// Light helper: trim+empty-to-null for free-text optional fields. We don't
// want a stray space to be saved as a non-null value.
const optionalText = (max: number, label: string) =>
  z.string().max(max, `${label} must be ${max} characters or fewer`).optional().nullable();

const optionalUrl = z
  .string()
  .max(500, 'Website must be 500 characters or fewer')
  .url('Website must be a valid http(s) URL (e.g. https://example.com)')
  .optional()
  .nullable();

export const CreateCommunityInput = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be 120 characters or fewer'),
  city: z.string().max(80, 'City must be 80 characters or fewer').optional().nullable(),
  state: z.string().length(2, 'State must be a 2-letter code (e.g. GA)').default('GA'),
  description: z
    .string()
    .max(2000, 'Description must be 2000 characters or fewer')
    .optional()
    .nullable(),
});
export type CreateCommunityInput = z.infer<typeof CreateCommunityInput>;

export const UpdateCommunityInput = z.object({
  name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(120, 'Name must be 120 characters or fewer'),
  city: z.string().max(80, 'City must be 80 characters or fewer').nullable(),
  state: z.string().length(2, 'State must be a 2-letter code (e.g. GA)'),
  description: z.string().max(2000, 'Description must be 2000 characters or fewer').nullable(),

  // Phase 50.4 — all optional, all nullable. Server-side normalization
  // (empty string → null, empty array → null) lives in updateCommunity().
  zip: optionalText(10, 'ZIP'),
  county: optionalText(80, 'County'),
  hoa_fee_text: optionalText(80, 'HOA fee'),
  year_built_text: optionalText(40, 'Year built'),
  price_range_text: optionalText(80, 'Price range'),
  property_types: z
    .array(z.enum(COMMUNITY_PROPERTY_TYPES))
    .max(COMMUNITY_PROPERTY_TYPES.length, 'Too many property types selected')
    .optional()
    .nullable(),
  highlights: z
    .array(z.string().min(1).max(80, 'Each highlight must be 80 characters or fewer'))
    .max(8, 'You can add up to 8 highlights')
    .optional()
    .nullable(),
  builder: optionalText(120, 'Builder'),
  website: optionalUrl,
  tagline: optionalText(120, 'Tagline'),
});
export type UpdateCommunityInput = z.infer<typeof UpdateCommunityInput>;

// Source URL is the fair-housing guard. Must be a real http(s) URL.
const SourceUrl = z
  .string()
  .min(1, 'data source URL is required for fair-housing compliance')
  .max(500)
  .url('must be a valid http(s) URL');

export const AddSchoolInput = z.object({
  community_id: z.string().uuid(),
  name: z.string().min(1).max(160),
  grades: z.string().max(40).optional().nullable(),
  rating: z.number().min(0).max(10).optional().nullable(),
  source_url: SourceUrl,
});
export type AddSchoolInput = z.infer<typeof AddSchoolInput>;

export const AddPoiInput = z.object({
  community_id: z.string().uuid(),
  name: z.string().min(1).max(160),
  poi_type: z.string().min(1).max(40),
  distance_text: z.string().max(40).optional().nullable(),
  source_url: SourceUrl,
});
export type AddPoiInput = z.infer<typeof AddPoiInput>;
