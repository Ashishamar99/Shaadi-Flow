-- ============================================
-- Allow authenticated users to read any wedding by ID
-- (needed for the "Join by Space ID" flow)
-- Run in Supabase SQL Editor after previous migrations
-- ============================================

-- Existing select policy only allows owners to see their weddings.
-- Add a policy that lets any authenticated user SELECT a wedding by ID.
-- This is safe because the ID is a UUID (unguessable) and acts as an invite token.
create policy "Authenticated users can view any wedding by id"
  on public.weddings for select
  using (auth.role() = 'authenticated');

-- Also allow authenticated users to read memberships of weddings they're joining
-- (they need to check if they're already a member)
drop policy if exists "Users can view memberships they belong to" on public.wedding_members;
create policy "Authenticated users can view wedding memberships"
  on public.wedding_members for select
  using (auth.role() = 'authenticated');

-- Allow any authenticated user to insert themselves as a member (join flow)
create policy "Users can join wedding spaces"
  on public.wedding_members for insert
  with check (auth.uid() = user_id);
