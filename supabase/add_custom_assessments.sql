-- Custom Assessments (instructor-created grading)
-- Run this in the NtoN Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.custom_assessments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id   uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title       text NOT NULL,
  description text,
  max_score   integer NOT NULL DEFAULT 100,
  created_by  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_custom_assessments_course ON public.custom_assessments(course_id);

CREATE TABLE IF NOT EXISTS public.assessment_grades (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   uuid NOT NULL REFERENCES custom_assessments(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  score           integer NOT NULL,
  feedback        text,
  graded_by       uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  graded_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE(assessment_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_assessment_grades_assessment ON public.assessment_grades(assessment_id);
CREATE INDEX IF NOT EXISTS idx_assessment_grades_user ON public.assessment_grades(user_id);

-- RLS
ALTER TABLE public.custom_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assessment_grades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read assessments"
  ON public.custom_assessments FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Instructors and admins manage assessments"
  ON public.custom_assessments FOR ALL
  USING (public.is_instructor_or_admin());

CREATE POLICY "Authenticated users read grades"
  ON public.assessment_grades FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Instructors and admins manage grades"
  ON public.assessment_grades FOR ALL
  USING (public.is_instructor_or_admin());
