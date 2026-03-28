export type UserRole = 'admin' | 'instructor' | 'learner'
export type CourseStatus = 'draft' | 'published' | 'archived'
export type LessonType = 'slide' | 'quiz'
export type QuestionType = 'multiple_choice' | 'true_false' | 'short_answer'
export type EnrollmentStatus = 'pending' | 'approved' | 'rejected'

export interface Profile {
  id: string
  email: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  is_active: boolean
  department: string | null
  job_role: string | null
  team_coordinator_id: string | null
  team_coordinator?: Profile
  created_at: string
  updated_at: string
}

export interface Course {
  id: string
  title: string
  description: string | null
  cover_url: string | null
  category: string | null
  status: CourseStatus
  created_by: string
  created_at: string
  updated_at: string
  // Joined
  instructor?: Profile
  enrollment_count?: number
  lesson_count?: number
}

export interface Slide {
  title: string
  body: string
  transcript?: string
  image_url?: string
  image_url_2?: string
  image_url_3?: string
  background_url?: string
  background_opacity?: number
  video_url?: string
}

export interface LessonContent {
  slides: Slide[]
}

export interface Lesson {
  id: string
  course_id: string
  title: string
  order_num: number
  type: LessonType
  content_json: LessonContent | null
  created_at: string
  updated_at: string
}

export interface QuizQuestion {
  id: string
  lesson_id: string
  question: string
  type: QuestionType
  options: string[]
  correct_answer: string
  order_num: number
  created_at: string
}

export interface Enrollment {
  id: string
  user_id: string
  course_id: string
  status: EnrollmentStatus
  enrolled_at: string
  completed_at: string | null
  deadline?: string | null
  is_mandatory?: boolean
  assigned_by?: string | null
  // Joined
  course?: Course
  user?: Profile
  assigner?: Profile
}

export interface Progress {
  id: string
  user_id: string
  lesson_id: string
  course_id: string
  completed_at: string
  score: number | null
  time_spent_minutes: number
  attempt_count: number
}

export interface LiveLesson {
  id: string
  course_id: string
  title: string
  description: string | null
  scheduled_at: string
  duration_minutes: number
  meeting_url: string | null
  created_by: string
  created_at: string
}

export interface CourseFile {
  id: string
  course_id: string
  file_name: string
  file_url: string
  file_size: number | null
  uploaded_by: string
  created_at: string
}

export interface Certificate {
  id: string
  user_id: string
  course_id: string
  issued_at: string
  cert_url: string | null
  // Joined
  user?: Profile
  course?: Course
}
