-- Add time tracking and quiz attempt count to progress
-- Run this in the NtoN Supabase SQL Editor

ALTER TABLE public.progress
  ADD COLUMN IF NOT EXISTS time_spent_minutes integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS attempt_count integer NOT NULL DEFAULT 0;
