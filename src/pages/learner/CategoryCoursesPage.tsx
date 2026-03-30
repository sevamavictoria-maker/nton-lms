import { useParams, Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePublishedCourses } from '@/hooks/useCourses'
import { useMyEnrollments, useEnroll } from '@/hooks/useEnrollments'
import { ArrowLeft, BookOpen, Plus, Hourglass, CheckCircle } from 'lucide-react'

export function CategoryCoursesPage() {
  const { categoryName } = useParams<{ categoryName: string }>()
  const decoded = decodeURIComponent(categoryName || '')
  const { profile } = useAuth()
  const { data: courses = [], isLoading } = usePublishedCourses()
  const { data: enrollments = [] } = useMyEnrollments(profile?.id)
  const enroll = useEnroll()

  const filtered = courses.filter((c) => c.category === decoded)
  const enrolledIds = new Set(enrollments.map((e) => e.course_id))
  const pendingIds = new Set(enrollments.filter((e) => e.status === 'pending').map((e) => e.course_id))

  const handleEnroll = async (courseId: string) => {
    if (!profile) return
    await enroll.mutateAsync({ userId: profile.id, courseId })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/learner/categories" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{decoded}</h1>
          <p className="text-sm text-gray-500">{filtered.length} course{filtered.length !== 1 ? 's' : ''}</p>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No courses in this category yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => {
            const isEnrolled = enrolledIds.has(course.id)
            const isPending = pendingIds.has(course.id)

            return (
              <div key={course.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {course.cover_url && (
                  <img src={course.cover_url} alt={course.title} className="w-full h-36 object-cover" />
                )}
                <div className="p-5">
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{course.title}</h3>
                  {course.instructor && (
                    <p className="text-xs text-gray-500 mb-1">by {course.instructor.full_name}</p>
                  )}
                  {course.description && (
                    <p className="text-xs text-gray-500 line-clamp-2 mb-3">{course.description}</p>
                  )}

                  {isEnrolled && !isPending ? (
                    <Link
                      to={`/learner/courses/${course.id}`}
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      <CheckCircle size={14} />
                      Go to Course
                    </Link>
                  ) : isPending ? (
                    <span className="inline-flex items-center gap-1 text-sm text-orange-600 font-medium">
                      <Hourglass size={14} />
                      Pending Approval
                    </span>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enroll.isPending}
                      className="inline-flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
                    >
                      <Plus size={14} />
                      Request Enrollment
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
