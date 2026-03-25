-- ============================================================
-- Add enrollment approval status
-- Run this in the Supabase SQL Editor
-- ============================================================

-- Create the enum
CREATE TYPE public.enrollment_status AS ENUM ('pending', 'approved', 'rejected');

-- Add status column with default 'approved' so existing enrollments stay approved
ALTER TABLE public.enrollments
  ADD COLUMN status public.enrollment_status NOT NULL DEFAULT 'approved';

-- Now change the default to 'pending' for new self-enrollments
-- (The app code will explicitly set 'approved' for admin/instructor assignments)
ALTER TABLE public.enrollments
  ALTER COLUMN status SET DEFAULT 'pending';

-- Index for fast filtering by status
CREATE INDEX enrollments_status_idx ON public.enrollments(status);
