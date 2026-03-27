-- ============================================
-- Allow admins (not just owners) to manage members
-- Run in Supabase SQL Editor after previous migrations
-- ============================================

-- Drop the old owner-only policy
drop policy if exists "Wedding owners can manage members" on public.wedding_members;

-- New policy: owners AND admins can insert/update/delete members
create policy "Owners and admins can manage members"
  on public.wedding_members for all
  using (
    wedding_id in (
      -- User owns the wedding
      select id from public.weddings where user_id = auth.uid()
      union
      -- User is an admin member of the wedding
      select wm.wedding_id from public.wedding_members wm
        where wm.user_id = auth.uid() and wm.role = 'admin'
    )
  );
