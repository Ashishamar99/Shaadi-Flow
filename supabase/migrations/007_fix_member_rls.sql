-- ============================================
-- Fix circular RLS on wedding_members
-- The previous policy referenced wedding_members inside
-- a policy ON wedding_members, causing circular evaluation.
-- This uses a SECURITY DEFINER function to bypass RLS for the check.
-- Run in Supabase SQL Editor IMMEDIATELY.
-- ============================================

-- Helper function: checks if a user is an admin of a wedding (bypasses RLS)
create or replace function public.is_wedding_admin(p_wedding_id uuid, p_user_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.weddings where id = p_wedding_id and user_id = p_user_id
  )
  or exists (
    select 1 from public.wedding_members where wedding_id = p_wedding_id and user_id = p_user_id and role = 'admin'
  );
$$;

-- Drop the broken circular policy
drop policy if exists "Owners and admins can manage members" on public.wedding_members;

-- Also drop any leftover policies from previous migrations
drop policy if exists "Wedding owners can manage members" on public.wedding_members;
drop policy if exists "Users can view memberships they belong to" on public.wedding_members;
drop policy if exists "Authenticated users can view wedding memberships" on public.wedding_members;
drop policy if exists "Users can join wedding spaces" on public.wedding_members;

-- Recreate clean policies

-- Anyone authenticated can read members (needed for join flow + member list)
create policy "members_select"
  on public.wedding_members for select
  using (auth.role() = 'authenticated');

-- Users can insert themselves (join flow)
create policy "members_insert_self"
  on public.wedding_members for insert
  with check (auth.uid() = user_id);

-- Owners and admins can update members (role changes)
create policy "members_update_admin"
  on public.wedding_members for update
  using (public.is_wedding_admin(wedding_id, auth.uid()));

-- Owners and admins can delete members
create policy "members_delete_admin"
  on public.wedding_members for delete
  using (public.is_wedding_admin(wedding_id, auth.uid()));
