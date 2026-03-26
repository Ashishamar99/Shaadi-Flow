-- ============================================
-- Helper function: look up a user's ID by email
-- Used by the member invite flow
-- Run this in Supabase SQL Editor after 001
-- ============================================

create or replace function public.get_user_id_by_email(email_input text)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select id from auth.users where email = email_input limit 1;
$$;

-- Allow authenticated users to call this function
grant execute on function public.get_user_id_by_email(text) to authenticated;

-- ============================================
-- Update RLS: members can also access wedding data
-- (extends the existing policies to include members)
-- ============================================

-- Drop and recreate the invitees policy to include members
drop policy if exists "Users can manage invitees of own weddings" on public.invitees;
create policy "Users can manage invitees of own or member weddings"
  on public.invitees for all
  using (
    wedding_id in (
      select id from public.weddings where user_id = auth.uid()
      union
      select wedding_id from public.wedding_members where user_id = auth.uid()
    )
  );

-- Drop and recreate the events policy
drop policy if exists "Users can manage events of own weddings" on public.events;
create policy "Users can manage events of own or member weddings"
  on public.events for all
  using (
    wedding_id in (
      select id from public.weddings where user_id = auth.uid()
      union
      select wedding_id from public.wedding_members where user_id = auth.uid()
    )
  );

-- Drop and recreate the vendors policy
drop policy if exists "Users can manage vendors of own weddings" on public.vendors;
create policy "Users can manage vendors of own or member weddings"
  on public.vendors for all
  using (
    wedding_id in (
      select id from public.weddings where user_id = auth.uid()
      union
      select wedding_id from public.wedding_members where user_id = auth.uid()
    )
  );

-- Drop and recreate the budget_items policy
drop policy if exists "Users can manage budget items of own weddings" on public.budget_items;
create policy "Users can manage budget items of own or member weddings"
  on public.budget_items for all
  using (
    wedding_id in (
      select id from public.weddings where user_id = auth.uid()
      union
      select wedding_id from public.wedding_members where user_id = auth.uid()
    )
  );

-- Drop and recreate the tasks policy
drop policy if exists "Users can manage tasks of own weddings" on public.tasks;
create policy "Users can manage tasks of own or member weddings"
  on public.tasks for all
  using (
    wedding_id in (
      select id from public.weddings where user_id = auth.uid()
      union
      select wedding_id from public.wedding_members where user_id = auth.uid()
    )
  );
