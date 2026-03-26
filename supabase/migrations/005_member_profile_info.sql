-- ============================================
-- Store profile info on wedding_members
-- so we can display names/avatars without auth.users access
-- ============================================

ALTER TABLE public.wedding_members ADD COLUMN display_name text;
ALTER TABLE public.wedding_members ADD COLUMN email text;
ALTER TABLE public.wedding_members ADD COLUMN avatar_url text;
