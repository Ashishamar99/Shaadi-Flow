-- ============================================
-- Saved routes for route planner
-- Run in Supabase SQL Editor
-- ============================================

CREATE TABLE public.saved_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wedding_id uuid REFERENCES public.weddings(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'My Route',
  route_data jsonb NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  created_by_name text,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.saved_routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage saved routes of own or member weddings"
  ON public.saved_routes FOR ALL
  USING (
    wedding_id IN (
      SELECT id FROM public.weddings WHERE user_id = auth.uid()
      UNION
      SELECT wedding_id FROM public.wedding_members WHERE user_id = auth.uid()
    )
  );

CREATE INDEX idx_saved_routes_wedding ON public.saved_routes(wedding_id);
