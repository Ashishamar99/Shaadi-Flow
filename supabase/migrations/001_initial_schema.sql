-- ============================================
-- Shaadi Flow - Initial Database Schema
-- Run this in the Supabase SQL Editor
-- ============================================

-- Enable UUID extension (usually enabled by default)
create extension if not exists "uuid-ossp";

-- ==================
-- WEDDINGS
-- ==================
create table public.weddings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null default 'My Wedding',
  wedding_date date,
  total_budget numeric default 0,
  created_at timestamptz default now() not null
);

alter table public.weddings enable row level security;

create policy "Users can view own weddings"
  on public.weddings for select
  using (auth.uid() = user_id);

create policy "Users can create own weddings"
  on public.weddings for insert
  with check (auth.uid() = user_id);

create policy "Users can update own weddings"
  on public.weddings for update
  using (auth.uid() = user_id);

create policy "Users can delete own weddings"
  on public.weddings for delete
  using (auth.uid() = user_id);

-- ==================
-- INVITEES
-- ==================
create table public.invitees (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade not null,
  name text not null,
  address text,
  map_link text,
  lat double precision,
  lng double precision,
  phone text,
  notes text,
  tags text[] default '{}',
  side text check (side in ('bride', 'groom', 'mutual')),
  priority text check (priority in ('vip', 'normal', 'optional')) default 'normal',
  visited boolean default false,
  rsvp_status text check (rsvp_status in ('not_invited', 'invited', 'pending', 'confirmed', 'declined')) default 'not_invited',
  time_constraint text,
  created_at timestamptz default now() not null,
  constraint invitee_needs_location check (address is not null or map_link is not null)
);

alter table public.invitees enable row level security;

create policy "Users can manage invitees of own weddings"
  on public.invitees for all
  using (
    wedding_id in (
      select id from public.weddings where user_id = auth.uid()
    )
  );

-- ==================
-- TIMELINE EVENTS
-- ==================
create table public.events (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade not null,
  title text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  location text,
  owner text,
  day_number integer default 1,
  sort_order integer default 0,
  created_at timestamptz default now() not null
);

alter table public.events enable row level security;

create policy "Users can manage events of own weddings"
  on public.events for all
  using (
    wedding_id in (
      select id from public.weddings where user_id = auth.uid()
    )
  );

-- ==================
-- VENDORS
-- ==================
create table public.vendors (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade not null,
  name text not null,
  category text not null,
  contact_name text,
  phone text,
  email text,
  cost numeric default 0,
  paid_amount numeric default 0,
  payment_status text check (payment_status in ('pending', 'partial', 'paid')) default 'pending',
  notes text,
  created_at timestamptz default now() not null
);

alter table public.vendors enable row level security;

create policy "Users can manage vendors of own weddings"
  on public.vendors for all
  using (
    wedding_id in (
      select id from public.weddings where user_id = auth.uid()
    )
  );

-- ==================
-- BUDGET ITEMS
-- ==================
create table public.budget_items (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade not null,
  category text not null,
  description text,
  estimated numeric default 0,
  actual numeric default 0,
  vendor_id uuid references public.vendors(id) on delete set null,
  created_at timestamptz default now() not null
);

alter table public.budget_items enable row level security;

create policy "Users can manage budget items of own weddings"
  on public.budget_items for all
  using (
    wedding_id in (
      select id from public.weddings where user_id = auth.uid()
    )
  );

-- ==================
-- TASKS
-- ==================
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade not null,
  title text not null,
  description text,
  owner text,
  deadline date,
  completed boolean default false,
  created_at timestamptz default now() not null
);

alter table public.tasks enable row level security;

create policy "Users can manage tasks of own weddings"
  on public.tasks for all
  using (
    wedding_id in (
      select id from public.weddings where user_id = auth.uid()
    )
  );

-- ==================
-- WEDDING MEMBERS (for future multi-user collaboration)
-- ==================
create table public.wedding_members (
  id uuid primary key default gen_random_uuid(),
  wedding_id uuid references public.weddings(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  role text check (role in ('admin', 'editor', 'viewer')) default 'viewer',
  created_at timestamptz default now() not null,
  unique(wedding_id, user_id)
);

alter table public.wedding_members enable row level security;

create policy "Users can view memberships they belong to"
  on public.wedding_members for select
  using (user_id = auth.uid());

create policy "Wedding owners can manage members"
  on public.wedding_members for all
  using (
    wedding_id in (
      select id from public.weddings where user_id = auth.uid()
    )
  );

-- ==================
-- INDEXES
-- ==================
create index idx_invitees_wedding on public.invitees(wedding_id);
create index idx_invitees_rsvp on public.invitees(wedding_id, rsvp_status);
create index idx_events_wedding on public.events(wedding_id);
create index idx_events_day on public.events(wedding_id, day_number);
create index idx_vendors_wedding on public.vendors(wedding_id);
create index idx_tasks_wedding on public.tasks(wedding_id);
create index idx_budget_wedding on public.budget_items(wedding_id);
