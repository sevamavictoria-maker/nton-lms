import { useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMyEnrollments } from '@/hooks/useEnrollments'
import { useAllMyProgress } from '@/hooks/useProgress'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { GraduationCap, Clock, Trophy, RotateCcw, BookOpen, CheckCircle } from 'lucide-react'
import type { Progress } from '@/types/database'

interface Lesson {
  id: string
  course_id: string
  title: string
  type: string
  order_num: number
}

export function MyGradesPage() {
  const { profile } = useAuth()
  const { data: enrollments = [] } = useMyEnrollments(profile?.id)
  const { data: progress = [], isLoading } = useAllMyProgress(profile?.id)

  const approvedEnrollments = enrollments.filter((e) => e.status === 'approved')
  const courseIds = approvedEnrollments.map((e) => e.course_id)

  // Fetch all lessons for enrolled courses
  const { data: allLessons = [] } = useQuery({
    queryKey: ['my-course-lessons', courseIds],
    queryFn: async () => {
      if (courseIds.length === 0) return []
      const { data, error } = await supabase
        .from('lessons')
        .select('id, course_id, title, type, order_num')
        .in('course_id', courseIds)
        .order('order_num')
      if (error) throw error
      return data as Lesson[]
    },
    enabled: courseIds.length > 0,
  })

  // Build course grade cards
  const courseGrades = useMemo(() => {
    return approvedEnrollments.map((enrollment) => {
      const course = enrollment.course
      if (!course) return null

      const courseLessons = allLessons.filter((l) => l.course_id === course.id)
      const courseProgress = progress.filter((p) => p.course_id === course.id)

      const completedCount = courseProgress.length
      const totalCount = courseLessons.length
      const progressPct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

      // Quiz stats
      const quizProgress = courseProgress.filter((p) => p.score != null)
      const avgScore = quizProgress.length > 0
        ? Math.round(quizProgress.reduce((s, p) => s + (p.score ?? 0), 0) / quizProgress.length)
        : null

      const totalTime = courseProgress.reduce((s, p) => s + (p.time_spent_minutes || 0), 0)
      const totalAttempts = courseProgress.reduce((s, p) => s + (p.attempt_count || 0), 0)

      // Per-lesson details
      const lessonDetails = courseLessons.map((lesson) => {
        const lp = courseProgress.find((p) => p.lesson_id === lesson.id)
        return {
          id: lesson.id,
          title: lesson.title,
          type: lesson.type,
          orderNum: lesson.order_num,
          completed: !!lp,
          score: lp?.score ?? null,
          timeMinutes: lp?.time_spent_minutes ?? 0,
          attempts: lp?.attempt_count ?? 0,
          completedAt: lp?.completed_at ?? null,
        }
      })

      return {
        courseId: course.id,
        courseTitle: course.title,
        category: course.category,
        completedCount,
        totalCount,
        progressPct,
        avgScore,
        totalTime,
        totalAttempts,
        isCompleted: !!enrollment.completed_at,
        lessons: lessonDetails,
      }
    }).filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.map>[number]>[]
  }, [approvedEnrollments, allLessons, progress])

  // Overall stats
  const overallAvgScore = useMemo(() => {
    const allQuiz = progress.filter((p: Progress) => p.score != null)
    return allQuiz.length > 0
      ? Math.round(allQuiz.reduce((s: number, p: Progress) => s + (p.score ?? 0), 0) / allQuiz.length)
      : 0
  }, [progress])

  const totalTimeHours = useMemo(() => {
    return Math.round(progress.reduce((s: number, p: Progress) => s + (p.time_spent_minutes || 0), 0) / 60 * 10) / 10
  }, [progress])

  const totalLessonsCompleted = progress.length
  const totalAttempts = progress.reduce((s: number, p: Progress) => s + (p.attempt_count || 0), 0)

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
        <GraduationCap className="text-brand-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">My Grades</h1>
      </div>

      {/* Overall stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Score</p>
              <p className={`text-2xl font-bold mt-1 ${overallAvgScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                {overallAvgScore > 0 ? `${overallAvgScore}%` : '--'}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100 text-green-600">
              <Trophy size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Lessons Done</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalLessonsCompleted}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-100 text-brand-600">
              <BookOpen size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Total Time</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalTimeHours}h</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600">
              <Clock size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Quiz Attempts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalAttempts}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600">
              <RotateCcw size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Course grades */}
      {courseGrades.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <GraduationCap className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 mb-2">No grades yet.</p>
          <p className="text-gray-400 text-sm">Complete lessons and quizzes to see your grades here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {courseGrades.map((cg) => (
            <div key={cg.courseId} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Course header */}
              <div className="px-6 py-4 border-b border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-gray-900">{cg.courseTitle}</h2>
                      {cg.isCompleted && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-green-100 text-green-700">
                          <CheckCircle size={10} />
                          Completed
                        </span>
                      )}
                    </div>
                    {cg.category && (
                      <span className="text-xs text-gray-500">{cg.category}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-sm shrink-0">
                    {cg.avgScore != null && (
                      <div className="text-center">
                        <p className="text-xs text-gray-400">Avg Score</p>
                        <p className={`font-bold ${cg.avgScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                          {cg.avgScore}%
                        </p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Progress</p>
                      <p className="font-bold text-brand-600">{cg.progressPct}%</p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-gray-400">Time</p>
                      <p className="font-bold text-gray-700">{cg.totalTime}m</p>
                    </div>
                  </div>
                </div>
                {/* Progress bar */}
                <div className="mt-3">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-brand-500 h-2 rounded-full transition-all duration-500"
                      style={{ width: `${cg.progressPct}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{cg.completedCount} of {cg.totalCount} lessons</p>
                </div>
              </div>

              {/* Lesson details table */}
              <div className="px-6 py-3">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left text-xs text-gray-400">
                      <th className="py-2 pr-3">#</th>
                      <th className="py-2 pr-3">Lesson</th>
                      <th className="py-2 pr-3">Type</th>
                      <th className="py-2 pr-3 text-right">Score</th>
                      <th className="py-2 pr-3 text-right">Time</th>
                      <th className="py-2 pr-3 text-right">Attempts</th>
                      <th className="py-2 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cg.lessons.map((lesson, i) => (
                      <tr key={lesson.id} className="border-b border-gray-50">
                        <td className="py-2 pr-3 text-gray-400">{i + 1}</td>
                        <td className="py-2 pr-3 font-medium text-gray-900">{lesson.title}</td>
                        <td className="py-2 pr-3">
                          <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                            lesson.type === 'quiz' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {lesson.type}
                          </span>
                        </td>
                        <td className="py-2 pr-3 text-right">
                          {lesson.score != null ? (
                            <span className={`font-semibold ${lesson.score >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                              {lesson.score}%
                            </span>
                          ) : (
                            <span className="text-gray-300">--</span>
                          )}
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-600">
                          {lesson.timeMinutes > 0 ? `${lesson.timeMinutes}m` : '--'}
                        </td>
                        <td className="py-2 pr-3 text-right text-gray-600">
                          {lesson.attempts > 0 ? lesson.attempts : '--'}
                        </td>
                        <td className="py-2 text-right">
                          {lesson.completed ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-600 font-medium">
                              <CheckCircle size={12} />
                              Done
                            </span>
                          ) : (
                            <span className="text-xs text-gray-400">Pending</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
