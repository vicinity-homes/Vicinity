import { describe, expect, it } from 'vitest';
import {
  type ComposeCommunity,
  type ComposeCommunityVideo,
  type ComposeListingVideo,
  type ComposePoi,
  type ComposeSchool,
  composeFeed,
} from './compose';

const lv = (id: string, kind = 'home', title: string | null = null): ComposeListingVideo => ({
  id,
  cf_video_id: `cf-${id}`,
  kind,
  title,
});

const cv = (
  id: string,
  kind: string,
  refs: { school_id?: string; poi_id?: string } = {},
  title: string | null = null,
): ComposeCommunityVideo => ({
  id,
  cf_video_id: `cf-${id}`,
  kind,
  title,
  school_id: refs.school_id ?? null,
  poi_id: refs.poi_id ?? null,
});

const empty = {
  listingVideos: [] as ComposeListingVideo[],
  communityVideos: [] as ComposeCommunityVideo[],
  schools: [] as ComposeSchool[],
  pois: [] as ComposePoi[],
  community: null as ComposeCommunity | null,
};

describe('composeFeed', () => {
  it('returns empty array when nothing is supplied', () => {
    expect(composeFeed(empty)).toEqual([]);
  });

  it('returns listing videos in order when no community videos exist', () => {
    const out = composeFeed({
      ...empty,
      listingVideos: [lv('a'), lv('b'), lv('c')],
    });
    expect(out.map((c) => c.id)).toEqual(['a', 'b', 'c']);
    expect(out.every((c) => c.source === 'listing')).toBe(true);
    expect(out.every((c) => c.overlay === null)).toBe(true);
  });

  it('places hook (first 2 listing videos) before any interleave', () => {
    const out = composeFeed({
      ...empty,
      listingVideos: [lv('L1'), lv('L2'), lv('L3'), lv('L4')],
      communityVideos: [cv('C1', 'neighborhood'), cv('C2', 'neighborhood')],
      community: { id: 'comm', name: 'Buckhead', description: null },
    });
    // Hook = L1, L2; then 1:1 — L3, C1, L4, C2.
    expect(out.map((c) => c.id)).toEqual(['L1', 'L2', 'L3', 'C1', 'L4', 'C2']);
  });

  it('appends listing leftovers when community list runs out first', () => {
    const out = composeFeed({
      ...empty,
      listingVideos: [lv('L1'), lv('L2'), lv('L3'), lv('L4'), lv('L5')],
      communityVideos: [cv('C1', 'neighborhood')],
      community: { id: 'comm', name: 'X', description: null },
    });
    // Hook L1,L2 → interleave L3,C1 → leftover L4,L5.
    expect(out.map((c) => c.id)).toEqual(['L1', 'L2', 'L3', 'C1', 'L4', 'L5']);
  });

  it('appends community leftovers when listing list runs out first', () => {
    const out = composeFeed({
      ...empty,
      listingVideos: [lv('L1'), lv('L2')],
      communityVideos: [
        cv('C1', 'neighborhood'),
        cv('C2', 'neighborhood'),
        cv('C3', 'neighborhood'),
      ],
      community: { id: 'comm', name: 'X', description: null },
    });
    // Hook L1,L2 → no listing left → all community appended.
    expect(out.map((c) => c.id)).toEqual(['L1', 'L2', 'C1', 'C2', 'C3']);
  });

  it('shapes SCHOOL overlay with name + grades and rating/10', () => {
    const school: ComposeSchool = {
      id: 's1',
      name: 'North Springs HS',
      grades: '9-12',
      rating: 9,
    };
    const out = composeFeed({
      ...empty,
      communityVideos: [cv('C1', 'school', { school_id: 's1' })],
      schools: [school],
    });
    expect(out[0]?.overlay).toEqual({ line1: 'North Springs HS 9-12', line2: '9/10' });
  });

  it('shapes SCHOOL overlay without grades or rating gracefully', () => {
    const school: ComposeSchool = { id: 's1', name: 'PS 1', grades: null, rating: null };
    const out = composeFeed({
      ...empty,
      communityVideos: [cv('C1', 'school', { school_id: 's1' })],
      schools: [school],
    });
    expect(out[0]?.overlay).toEqual({ line1: 'PS 1', line2: undefined });
  });

  it('shapes POI overlay with name and distance_text', () => {
    const poi: ComposePoi = {
      id: 'p1',
      name: 'Whole Foods',
      poi_type: 'grocery',
      distance_text: '0.4 mi',
    };
    const out = composeFeed({
      ...empty,
      communityVideos: [cv('C1', 'poi', { poi_id: 'p1' })],
      pois: [poi],
    });
    expect(out[0]?.overlay).toEqual({ line1: 'Whole Foods', line2: '0.4 mi' });
  });

  it('shapes NEIGHBORHOOD overlay from community + truncates description at 80 chars', () => {
    const long = 'a'.repeat(200);
    const out = composeFeed({
      ...empty,
      communityVideos: [cv('C1', 'neighborhood')],
      community: { id: 'comm', name: 'Buckhead', description: long },
    });
    expect(out[0]?.overlay?.line1).toBe('Buckhead');
    const line2 = out[0]?.overlay?.line2 ?? '';
    expect(line2.length).toBeLessThanOrEqual(80);
    expect(line2.endsWith('…')).toBe(true);
  });

  it('leaves overlay null when SCHOOL video references a missing school', () => {
    const out = composeFeed({
      ...empty,
      communityVideos: [cv('C1', 'school', { school_id: 'missing' })],
    });
    expect(out[0]?.overlay).toBeNull();
  });

  it('leaves overlay null when NEIGHBORHOOD video has no community in scope', () => {
    const out = composeFeed({
      ...empty,
      communityVideos: [cv('C1', 'neighborhood')],
      community: null,
    });
    expect(out[0]?.overlay).toBeNull();
  });

  it('marks community-source cards distinctly from listing-source cards', () => {
    const out = composeFeed({
      ...empty,
      listingVideos: [lv('L1')],
      communityVideos: [cv('C1', 'neighborhood')],
      community: { id: 'comm', name: 'X', description: null },
    });
    expect(out.find((c) => c.id === 'L1')?.source).toBe('listing');
    expect(out.find((c) => c.id === 'C1')?.source).toBe('community');
  });
});
