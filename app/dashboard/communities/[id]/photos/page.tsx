/**
 * Phase 23 (2026-06-14): the per-community /photos page was folded into
 * a unified /upload page. Redirect old links so existing bookmarks and
 * cached search results don't 404.
 */

import { redirect } from 'next/navigation';

export default async function CommunityPhotosRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/dashboard/communities/${id}/upload`);
}
