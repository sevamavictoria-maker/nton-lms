import { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { usePublishedCourses } from '@/hooks/useCourses'
import { useMyEnrollments, useEnroll } from '@/hooks/useEnrollments'
import { useActiveCategories } from '@/hooks/useCategories'
import { useLessons } from '@/hooks/useLessons'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { Compass, BookOpen, Plus, Hourglass, CheckCircle, Search, FileText, HelpCircle } from 'lucide-react'

export function BrowseCoursesPage() {
  const { profile } = useAuth()
  const { data: courses = [], isLoading } = usePublishedCourses()
  const { data: enrollments = [] } = useMyEnrollments(profile?.id)
  const { data: categories = [] } = useActiveCategories()
  const enroll = useEnroll()

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  // Fetch lesson counts for all courses
  const courseIds = courses.map((c) => c.id)
  const { data: lessonCounts = [] } = useQuery({
    queryKey: ['browse-lesson-counts', courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return []
      const { data, error } = await supabase
        .from('lessons')
        .select('course_id, type')
        .in('course_id', courseIds)
      if (error) throw error
      return data as { course_id: string; type: string }[]
    },
    enabled: courseIds.length > 0,
  })

  const enrolledMap = useMemo(() => {
    const map = new Map<string, string>()
    for (const e of enrollments) {
      map.set(e.course_id, e.status)
    }
    return map
  }, [enrollments])

  const lessonCountMap = useMemo(() => {
    const map = new Map<string, { slides: number; quizzes: number }>()
    for (const l of lessonCounts) {
      if (!map.has(l.course_id)) map.set(l.course_id, { slides: 0, quizzes: 0 })
      const entry = map.get(l.course_id)!
      if (l.type === 'quiz') entry.quizzes++
      else entry.slides++
    }
    return map
  }, [lessonCounts])

  const filtered = useMemo(() => {
    let list = courses
    if (categoryFilter) {
      list = list.filter((c) => c.category === categoryFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter((c) =>
        c.title.toLowerCase().includes(q) ||
        (c.description || '').toLowerCase().includes(q) ||
        (c.category || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [courses, categoryFilter, search])

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
        <Compass className="text-brand-600" size={28} />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Browse Courses</h1>
          <p className="text-sm text-gray-500">{courses.length} courses available</p>
        </div>
      </div>

      {/* Search and filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search courses..."
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.name}>{cat.name}</option>
          ))}
        </select>
      </div>

      {/* Course grid */}
      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <BookOpen className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No courses found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((course) => {
            const status = enrolledMap.get(course.id)
            const counts = lessonCountMap.get(course.id)

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

                  {/* Course outline summary */}
                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-3">
                    {course.category && (
                      <span className="px-2 py-0.5 rounded-full bg-brand-50 text-brand-700 font-medium">{course.category}</span>
                    )}
                    {counts && (
                      <>
                        {counts.slides > 0 && (
                          <span className="flex items-center gap-1">
                            <FileText size={12} />
                            {counts.slides} lesson{counts.slides !== 1 ? 's' : ''}
                          </span>
                        )}
                        {counts.quizzes > 0 && (
                          <span className="flex items-center gap-1">
                            <HelpCircle size={12} />
                            {counts.quizzes} quiz{counts.quizzes !== 1 ? 'zes' : ''}
                          </span>
                        )}
                      </>
                    )}
                  </div>

                  {/* Action button */}
                  {status === 'approved' ? (
                    <Link
                      to={`/learner/courses/${course.id}`}
                      className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium"
                    >
                      <CheckCircle size={14} />
                      Go to Course
                    </Link>
                  ) : status === 'pending' ? (
                    <span className="inline-flex items-center gap-1.5 text-sm text-orange-600 font-medium">
                      <Hourglass size={14} />
                      Pending Approval
                    </span>
                  ) : (
                    <button
                      onClick={() => handleEnroll(course.id)}
                      disabled={enroll.isPending}
                      className="inline-flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition-colors"
                    >
                      <Plus size={14} />
                      Enroll
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
