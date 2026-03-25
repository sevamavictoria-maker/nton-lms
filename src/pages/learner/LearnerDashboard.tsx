import { useAuth } from '@/hooks/useAuth'
import { useMyEnrollments, useEnroll } from '@/hooks/useEnrollments'
import { usePublishedCourses } from '@/hooks/useCourses'
import { useAllMyProgress } from '@/hooks/useProgress'
import { Link } from 'react-router-dom'
import { BookOpen, CheckCircle, Clock, Plus, AlertCircle, Hourglass } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'

export function LearnerDashboard() {
  const { profile } = useAuth()
  const { data: enrollments = [], isLoading } = useMyEnrollments(profile?.id)
  const { data: allCourses = [] } = usePublishedCourses()
  const { data: myProgress = [] } = useAllMyProgress(profile?.id)
  const enroll = useEnroll()

  // Split enrollments by status
  const approvedEnrollments = enrollments.filter((e) => e.status === 'approved')
  const pendingEnrollments = enrollments.filter((e) => e.status === 'pending')

  // Get lesson counts per course for progress calculation
  const courseIds = approvedEnrollments.map((e) => e.course_id)
  const { data: lessonCounts = [] } = useQuery({
    queryKey: ['lesson-counts', courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return []
      const { data, error } = await supabase
        .from('lessons')
        .select('course_id')
        .in('course_id', courseIds)
      if (error) throw error
      return data as { course_id: string }[]
    },
    enabled: courseIds.length > 0,
  })

  const lessonCountMap: Record<string, number> = {}
  for (const l of lessonCounts) {
    lessonCountMap[l.course_id] = (lessonCountMap[l.course_id] || 0) + 1
  }

  const progressMap: Record<string, number> = {}
  for (const p of myProgress) {
    progressMap[p.course_id] = (progressMap[p.course_id] || 0) + 1
  }

  // Exclude courses the user already has any enrollment for (approved, pending, or rejected)
  const enrolledIds = new Set(enrollments.map((e) => e.course_id))
  const availableCourses = allCourses.filter((c) => !enrolledIds.has(c.id))

  const handleEnroll = async (courseId: string) => {
    if (!profile) return
    await enroll.mutateAsync({ userId: profile.id, courseId })
  }

  const completedCount = approvedEnrollments.filter((e) => e.completed_at).length
  const inProgressCount = approvedEnrollments.length - completedCount

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Learning</h1>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Enrolled</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{approvedEnrollments.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-100 text-brand-700">
              <BookOpen size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">In Progress</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{inProgressCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-amber-100 text-amber-700">
              <Clock size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{completedCount}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-green-100 text-green-700">
              <CheckCircle size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{pendingEnrollments.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-100 text-orange-700">
              <Hourglass size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Enrollment Requests */}
      {pendingEnrollments.length > 0 && (
        <>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pending Approval</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
            {pendingEnrollments.map((enrollment) => {
              const course = enrollment.course
              if (!course) return null
              return (
                <div
                  key={enrollment.id}
                  className="bg-white rounded-xl border border-orange-200 p-5 opacity-80"
                >
                  {course.cover_url && (
                    <img src={course.cover_url} alt={course.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                  )}
                  <h3 className="font-semibold text-gray-900 text-sm mb-1">{course.title}</h3>
                  {course.instructor && (
                    <p className="text-xs text-gray-500 mb-2">by {course.instructor.full_name}</p>
                  )}
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                    <Hourglass size={12} />
                    Awaiting Approval
                  </span>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* My Courses (approved only) */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">My Courses</h2>
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ) : approvedEnrollments.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center mb-8">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">You haven't been enrolled in any courses yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {approvedEnrollments.map((enrollment) => {
            const course = enrollment.course
            if (!course) return null
            const totalLessons = lessonCountMap[course.id] || 0
            const completedLessons = progressMap[course.id] || 0
            const progressPct = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0

            return (
              <Link
                key={enrollment.id}
                to={`/learner/courses/${course.id}`}
                className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
              >
                {course.cover_url && (
                  <img src={course.cover_url} alt={course.title} className="w-full h-32 object-cover rounded-lg mb-3" />
                )}
                <div className="flex items-start justify-between gap-2 mb-1">
                  <h3 className="font-semibold text-gray-900 text-sm">{course.title}</h3>
                  {enrollment.is_mandatory && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-red-100 text-red-700">
                      <AlertCircle size={10} />
                      Mandatory
                    </span>
                  )}
                </div>
                {course.instructor && (
                  <p className="text-xs text-gray-500 mb-1">by {course.instructor.full_name}</p>
                )}
                {enrollment.deadline && (() => {
                  const deadlineDate = new Date(enrollment.deadline)
                  const now = new Date()
                  const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                  return (
                    <p className={`text-xs mb-2 font-medium ${
                      daysLeft <= 0 ? 'text-red-600' : daysLeft <= 7 ? 'text-orange-600' : 'text-gray-500'
                    }`}>
                      Due: {deadlineDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      {daysLeft <= 0 ? ' (overdue)' : daysLeft <= 7 ? ` (${daysLeft}d left)` : ''}
                    </p>
                  )
                })()}
                <div className="mb-2">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-500">{completedLessons}/{totalLessons} lessons</span>
                    <span className="font-medium text-brand-600">{progressPct}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
                {enrollment.completed_at && (
                  <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                    <CheckCircle size={12} /> Completed
                  </span>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Browse Courses */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Browse Available Courses</h2>
      {availableCourses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No additional courses available right now.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableCourses.map((course) => (
            <div key={course.id} className="bg-white rounded-xl border border-gray-200 p-5">
              {course.cover_url && (
                <img src={course.cover_url} alt={course.title} className="w-full h-32 object-cover rounded-lg mb-3" />
              )}
              <h3 className="font-semibold text-gray-900 text-sm mb-1">{course.title}</h3>
              {course.description && (
                <p className="text-xs text-gray-500 line-clamp-2 mb-2">{course.description}</p>
              )}
              <div className="flex items-center justify-between">
                {course.category && (
                  <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">{course.category}</span>
                )}
                <button
                  onClick={() => handleEnroll(course.id)}
                  disabled={enroll.isPending}
                  className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium disabled:opacity-50"
                >
                  <Plus size={14} />
                  Request Enrollment
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
