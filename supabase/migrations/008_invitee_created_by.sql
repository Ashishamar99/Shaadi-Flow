-- ============================================
-- Track who created each invitee (for RSVP + filtering)
-- Run in Supabase SQL Editor
-- ============================================

ALTER TABLE public.invitees ADD COLUMN created_by uuid references auth.users(id);
ALTER TABLE public.invitees ADD COLUMN created_by_name text;
