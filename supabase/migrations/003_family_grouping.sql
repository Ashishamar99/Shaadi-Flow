-- ============================================
-- Family grouping for invitees
-- Run this in Supabase SQL Editor after 001 + 002
-- ============================================

ALTER TABLE public.invitees ADD COLUMN family_id uuid;
ALTER TABLE public.invitees ADD COLUMN is_family_head boolean DEFAULT true;
ALTER TABLE public.invitees ADD COLUMN extra_members integer DEFAULT 0;

CREATE INDEX idx_invitees_family ON public.invitees(family_id);

-- Remove the address-or-map constraint for non-head family members
-- (they inherit location from the head)
ALTER TABLE public.invitees DROP CONSTRAINT IF EXISTS invitee_needs_location;
