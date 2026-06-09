-- 0004: Set REPLICA IDENTITY FULL on video tables for Realtime RLS.
--
-- Why: Realtime evaluates RLS on every event. Our listing_videos / community_videos
-- policies join through listings → agents → user_id, requiring listing_id to be
-- present in BOTH old and new row images. Postgres default (REPLICA IDENTITY DEFAULT)
-- only writes the PK + changed columns to WAL, so listing_id is NULL in the OLD row
-- of UPDATE events → join fails → Realtime silently drops the event.
--
-- FULL writes the entire row to WAL on every change. Tradeoff: slightly larger WAL
-- volume. Acceptable at V1 video volume (handful of rows/agent).

alter table public.listing_videos replica identity full;
alter table public.community_videos replica identity full;
