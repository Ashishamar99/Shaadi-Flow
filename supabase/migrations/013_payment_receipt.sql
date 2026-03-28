-- Add receipt screenshot to vendor payments
-- Run in Supabase SQL Editor
ALTER TABLE public.vendor_payments ADD COLUMN receipt_path text;
