-- ============================================================
-- Add live lessons (scheduled sessions)
-- Run this in the Supabase SQL Editor
-- ============================================================

CREATE TABLE public.live_lessons (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id       uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title           text NOT NULL,
  description     text,
  scheduled_at    timestamptz NOT NULL,
  duration_minutes integer NOT NULL DEFAULT 60,
  meeting_url     text,
  created_by      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX live_lessons_course_idx ON public.live_lessons(course_id);
CREATE INDEX live_lessons_scheduled_idx ON public.live_lessons(scheduled_at);

-- RLS
ALTER TABLE public.live_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read live lessons"
  ON public.live_lessons FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Instructors and admins create live lessons"
  ON public.live_lessons FOR INSERT
  WITH CHECK (public.is_instructor_or_admin());

CREATE POLICY "Instructors and admins update live lessons"
  ON public.live_lessons FOR UPDATE
  USING (public.is_instructor_or_admin());

CREATE POLICY "Instructors and admins delete live lessons"
  ON public.live_lessons FOR DELETE
  USING (public.is_instructor_or_admin());
