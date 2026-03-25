-- ============================================================
-- Add downloadable course files
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE public.course_files (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  file_name     text NOT NULL,
  file_url      text NOT NULL,
  file_size     integer,
  uploaded_by   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX course_files_course_idx ON public.course_files(course_id);

-- RLS
ALTER TABLE public.course_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read course files"
  ON public.course_files FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Instructors and admins manage course files"
  ON public.course_files FOR INSERT
  WITH CHECK (public.is_instructor_or_admin());

CREATE POLICY "Instructors and admins delete course files"
  ON public.course_files FOR DELETE
  USING (public.is_instructor_or_admin());
