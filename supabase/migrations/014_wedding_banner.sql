-- Wedding banner image for viewer page
-- Run in Supabase SQL Editor
ALTER TABLE public.weddings ADD COLUMN banner_path text;

-- MANUAL STEP: Create a PUBLIC bucket called "wedding-banners" in Supabase Dashboard
-- Go to Storage > New Bucket > Name: "wedding-banners" > Toggle PUBLIC: ON
-- No storage policies needed for public buckets (anyone can read)
-- But add an INSERT + DELETE policy for authenticated users:
--   Target: authenticated
--   Policy: true
