-- ============================================================
-- NtoN LMS — Full Database Migration
-- Run this entire file in the Supabase SQL Editor
-- ============================================================

-- ─── ENUMS ───

CREATE TYPE public.user_role AS ENUM ('admin', 'instructor', 'learner');
CREATE TYPE public.course_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.lesson_type AS ENUM ('slide', 'quiz');
CREATE TYPE public.question_type AS ENUM ('multiple_choice', 'true_false', 'short_answer');


-- ─── PROFILES ───

CREATE TABLE public.profiles (
  id            uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         text NOT NULL,
  full_name     text,
  role          public.user_role NOT NULL DEFAULT 'learner',
  avatar_url    text,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);


-- ─── COURSES ───

CREATE TABLE public.courses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  description   text,
  cover_url     text,
  category      text,
  status        public.course_status NOT NULL DEFAULT 'draft',
  created_by    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX courses_created_by_idx ON public.courses(created_by);
CREATE INDEX courses_status_idx ON public.courses(status);


-- ─── LESSONS ───

CREATE TABLE public.lessons (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title         text NOT NULL,
  order_num     integer NOT NULL DEFAULT 0,
  type          public.lesson_type NOT NULL DEFAULT 'slide',
  content_json  jsonb DEFAULT '{"slides": []}'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX lessons_course_idx ON public.lessons(course_id);


-- ─── QUIZ QUESTIONS ───

CREATE TABLE public.quiz_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id       uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  question        text NOT NULL,
  type            public.question_type NOT NULL DEFAULT 'multiple_choice',
  options         text[] NOT NULL DEFAULT '{}',
  correct_answer  text NOT NULL,
  order_num       integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX quiz_questions_lesson_idx ON public.quiz_questions(lesson_id);


-- ─── ENROLLMENTS ───

CREATE TABLE public.enrollments (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  enrolled_at   timestamptz NOT NULL DEFAULT now(),
  completed_at  timestamptz,
  UNIQUE(user_id, course_id)
);

CREATE INDEX enrollments_user_idx ON public.enrollments(user_id);
CREATE INDEX enrollments_course_idx ON public.enrollments(course_id);


-- ─── PROGRESS ───

CREATE TABLE public.progress (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id     uuid NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  completed_at  timestamptz NOT NULL DEFAULT now(),
  score         integer,
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX progress_user_idx ON public.progress(user_id);
CREATE INDEX progress_course_idx ON public.progress(course_id);


-- ─── CERTIFICATES ───

CREATE TABLE public.certificates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id     uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  issued_at     timestamptz NOT NULL DEFAULT now(),
  cert_url      text,
  UNIQUE(user_id, course_id)
);

CREATE INDEX certificates_user_idx ON public.certificates(user_id);


-- ─── SETTINGS ───

CREATE TABLE public.settings (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key         text UNIQUE NOT NULL,
  value       jsonb NOT NULL DEFAULT '{}',
  updated_at  timestamptz NOT NULL DEFAULT now()
);


-- ─── SEED SETTINGS ───

INSERT INTO public.settings (key, value) VALUES
  ('general', '{"app_name": "NtoN LMS", "allow_self_enrollment": true}');


-- ─── AUTO-CREATE PROFILE ON SIGNUP ───

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email)
  VALUES (new.id, new.email);
  RETURN new;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();


-- ─── HELPER FUNCTIONS ───

CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS public.user_role
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_instructor()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'instructor'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_instructor_or_admin()
RETURNS boolean
LANGUAGE sql SECURITY DEFINER STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'instructor')
  );
$$;


-- ─── ROW LEVEL SECURITY ───

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read profiles"
  ON public.profiles FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins update any profile"
  ON public.profiles FOR UPDATE
  USING (public.is_admin());

CREATE POLICY "Admins insert profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (public.is_admin() OR auth.uid() = id);


-- COURSES
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated reads published courses"
  ON public.courses FOR SELECT
  USING (
    auth.role() = 'authenticated'
    AND (
      status = 'published'
      OR created_by = auth.uid()
      OR public.is_admin()
    )
  );

CREATE POLICY "Instructors and admins insert courses"
  ON public.courses FOR INSERT
  WITH CHECK (public.is_instructor_or_admin());

CREATE POLICY "Course owner or admin updates courses"
  ON public.courses FOR UPDATE
  USING (created_by = auth.uid() OR public.is_admin());

CREATE POLICY "Admins delete courses"
  ON public.courses FOR DELETE
  USING (public.is_admin());


-- LESSONS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read lessons"
  ON public.lessons FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Instructors and admins manage lessons"
  ON public.lessons FOR INSERT
  WITH CHECK (public.is_instructor_or_admin());

CREATE POLICY "Instructors and admins update lessons"
  ON public.lessons FOR UPDATE
  USING (public.is_instructor_or_admin());

CREATE POLICY "Instructors and admins delete lessons"
  ON public.lessons FOR DELETE
  USING (public.is_instructor_or_admin());


-- QUIZ QUESTIONS
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read questions"
  ON public.quiz_questions FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Instructors and admins manage questions"
  ON public.quiz_questions FOR INSERT
  WITH CHECK (public.is_instructor_or_admin());

CREATE POLICY "Instructors and admins update questions"
  ON public.quiz_questions FOR UPDATE
  USING (public.is_instructor_or_admin());

CREATE POLICY "Instructors and admins delete questions"
  ON public.quiz_questions FOR DELETE
  USING (public.is_instructor_or_admin());


-- ENROLLMENTS
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own enrollments"
  ON public.enrollments FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin() OR public.is_instructor());

CREATE POLICY "Users enroll themselves"
  ON public.enrollments FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Admins update enrollments"
  ON public.enrollments FOR UPDATE
  USING (public.is_admin() OR user_id = auth.uid());


-- PROGRESS
ALTER TABLE public.progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own progress or admin reads all"
  ON public.progress FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin() OR public.is_instructor());

CREATE POLICY "Users insert own progress"
  ON public.progress FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users update own progress"
  ON public.progress FOR UPDATE
  USING (user_id = auth.uid());


-- CERTIFICATES
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own certs or admin reads all"
  ON public.certificates FOR SELECT
  USING (user_id = auth.uid() OR public.is_admin());

CREATE POLICY "Users or admins insert certificates"
  ON public.certificates FOR INSERT
  WITH CHECK (user_id = auth.uid() OR public.is_admin());


-- SETTINGS
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to settings"
  ON public.settings FOR ALL
  USING (public.is_admin());

CREATE POLICY "Authenticated users read settings"
  ON public.settings FOR SELECT
  USING (auth.role() = 'authenticated');
