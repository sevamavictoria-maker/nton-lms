export type UserRole = 'admin' | 'instructor' | 'learner'

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  instructor: 'Instructor',
  learner: 'Learner',
}

export const ROLE_HOME: Record<UserRole, string> = {
  admin: '/admin',
  instructor: '/instructor',
  learner: '/learner',
}

export const COURSE_CATEGORIES = [
  'Technology',
  'Business',
  'Design',
  'Marketing',
  'Science',
  'Mathematics',
  'Language',
  'Health',
  'Arts',
  'Other',
] as const

export const COURSE_STATUS = ['draft', 'published', 'archived'] as const

export const LESSON_TYPES = ['slide', 'quiz'] as const

export const QUESTION_TYPES = ['multiple_choice', 'true_false', 'short_answer'] as const
