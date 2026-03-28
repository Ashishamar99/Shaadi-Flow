-- ============================================
-- Vendor payments + file attachments
-- Run in Supabase SQL Editor
-- ============================================

-- Vendor Payments (detailed payment entries per vendor)
CREATE TABLE public.vendor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  type text CHECK (type IN ('advance', 'installment', 'final', 'other')) DEFAULT 'other',
  notes text,
  payment_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.vendor_payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage vendor payments via vendor wedding access"
  ON public.vendor_payments FOR ALL
  USING (
    vendor_id IN (
      SELECT v.id FROM public.vendors v
      WHERE v.wedding_id IN (
        SELECT id FROM public.weddings WHERE user_id = auth.uid()
        UNION
        SELECT wedding_id FROM public.wedding_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE INDEX idx_vendor_payments_vendor ON public.vendor_payments(vendor_id);

-- Vendor Attachments (file metadata, actual files in Supabase Storage)
CREATE TABLE public.vendor_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id uuid REFERENCES public.vendors(id) ON DELETE CASCADE NOT NULL,
  file_name text NOT NULL,
  file_path text NOT NULL,
  file_type text,
  file_size integer DEFAULT 0,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE public.vendor_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage vendor attachments via vendor wedding access"
  ON public.vendor_attachments FOR ALL
  USING (
    vendor_id IN (
      SELECT v.id FROM public.vendors v
      WHERE v.wedding_id IN (
        SELECT id FROM public.weddings WHERE user_id = auth.uid()
        UNION
        SELECT wedding_id FROM public.wedding_members WHERE user_id = auth.uid()
      )
    )
  );

CREATE INDEX idx_vendor_attachments_vendor ON public.vendor_attachments(vendor_id);

-- NOTE: You also need to create a Supabase Storage bucket called "vendor-files"
-- Go to Supabase Dashboard > Storage > New Bucket > Name: "vendor-files" > Public: OFF
-- Then add a storage policy: Allow authenticated users full access
