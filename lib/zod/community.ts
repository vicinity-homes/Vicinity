/**
 * Zod schemas for community editor (Phase 4.4).
 *
 * Communities are V1-shared (no per-agent ownership), but schools/pois carry
 * `recorded_by` + `source_url` for fair-housing audit. The `source_url`
 * constraint is enforced at the DB level (`text not null`) AND here so the
 * UI can give a clear error before round-tripping.
 */

import { z } from 'zod';

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
