-- Half and half: guest attends both events but headcount split 50/50
-- Run in Supabase SQL Editor
ALTER TABLE public.invitees ADD COLUMN half_and_half boolean DEFAULT false;
