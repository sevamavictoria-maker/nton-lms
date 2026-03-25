import { useAuth } from '@/hooks/useAuth'
import { useMyCourses } from '@/hooks/useCourses'
import { usePendingEnrollments } from '@/hooks/useEnrollments'
import { Link } from 'react-router-dom'
import { BookOpen, Users, PlusCircle, Hourglass } from 'lucide-react'
import type { CourseStatus } from '@/types/database'

export function InstructorDashboard() {
  const { profile } = useAuth()
  const { data: courses = [], isLoading } = useMyCourses(profile?.id)
  const { data: pendingEnrollments = [] } = usePendingEnrollments(profile?.id)

  // Filter pending enrollments to only this instructor's courses
  const myCourseIds = new Set(courses.map((c) => c.id))
  const myPending = pendingEnrollments.filter((e) => myCourseIds.has(e.course_id))

  const totalEnrollments = courses.reduce((sum, c) => sum + (c.enrollment_count || 0), 0)

  const statusColors: Record<CourseStatus, string> = {
    draft: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Instructor Dashboard</h1>
        <Link
          to="/instructor/create"
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 text-sm font-medium"
        >
          <PlusCircle size={16} />
          New Course
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">My Courses</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{courses.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-brand-100 text-brand-700">
              <BookOpen size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Enrollments</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalEnrollments}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-blue-100 text-blue-700">
              <Users size={24} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Pending Requests</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{myPending.length}</p>
            </div>
            <div className="w-12 h-12 rounded-xl flex items-center justify-center bg-orange-100 text-orange-700">
              <Hourglass size={24} />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Requests */}
      {myPending.length > 0 && (
        <div className="mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Hourglass size={20} className="text-orange-500" />
            Pending Enrollment Requests
          </h2>
          <div className="bg-white rounded-xl border border-orange-200 divide-y divide-gray-100">
            {myPending.map((en) => (
              <div key={en.id} className="flex items-center justify-between px-5 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{en.user?.full_name || en.user?.email || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{en.course?.title || 'Unknown course'}</p>
                </div>
                <Link
                  to={`/instructor/courses/${en.course_id}`}
                  className="text-xs text-brand-600 hover:text-brand-700 font-medium"
                >
                  Review
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Courses List */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">My Courses</h2>
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 mb-4">You haven't created any courses yet.</p>
          <Link to="/instructor/create" className="text-brand-600 hover:text-brand-700 text-sm font-medium">
            Create your first course
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.map((course) => (
            <Link
              key={course.id}
              to={`/instructor/courses/${course.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              {course.cover_url && (
                <img
                  src={course.cover_url}
                  alt={course.title}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-gray-900 text-sm">{course.title}</h3>
                <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium capitalize ml-2 shrink-0 ${statusColors[course.status]}`}>
                  {course.status}
                </span>
              </div>
              {course.description && (
                <p className="text-gray-500 text-xs line-clamp-2 mb-3">{course.description}</p>
              )}
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Users size={14} />
                  {course.enrollment_count || 0} enrolled
                </span>
                {course.category && <span>{course.category}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
