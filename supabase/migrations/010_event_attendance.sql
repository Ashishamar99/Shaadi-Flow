-- ============================================
-- Event attendance tracking on invitees
-- Tracks which events each guest is attending
-- Run in Supabase SQL Editor
-- ============================================

ALTER TABLE public.invitees ADD COLUMN attending_reception boolean DEFAULT true;
ALTER TABLE public.invitees ADD COLUMN attending_muhurtham boolean DEFAULT true;
