import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { useAllCourses } from '@/hooks/useCourses'
import { useAllUsers } from '@/hooks/useUsers'
import { useLessons } from '@/hooks/useLessons'
import { GraduationCap, Clock, Trophy, RotateCcw } from 'lucide-react'
import type { Progress } from '@/types/database'

export function GradesPage() {
  const { data: courses = [] } = useAllCourses()
  const { data: users = [] } = useAllUsers()
  const [selectedCourse, setSelectedCourse] = useState<string>('')

  const { data: allProgress = [] } = useQuery({
    queryKey: ['all-progress-grades'],
    queryFn: async () => {
      const { data, error } = await supabase.from('progress').select('*')
      if (error) throw error
      return data as Progress[]
    },
  })

  const { data: lessons = [] } = useLessons(selectedCourse || undefined)

  // Filter progress by selected course
  const courseProgress = useMemo(() => {
    if (!selectedCourse) return allProgress
    return allProgress.filter((p) => p.course_id === selectedCourse)
  }, [allProgress, selectedCourse])

  // Build learner rows
  const learnerRows = useMemo(() => {
    const map = new Map<string, {
      userId: string
      name: string
      email: string
      department: string
      lessonsCompleted: number
      totalScore: number
      quizCount: number
      totalTime: number
      totalAttempts: number
    }>()

    for (const p of courseProgress) {
      const user = users.find((u) => u.id === p.user_id)
      if (!user || user.role !== 'learner') continue

      if (!map.has(user.id)) {
        map.set(user.id, {
          userId: user.id,
          name: user.full_name || user.email,
          email: user.email,
          department: user.department || 'Unassigned',
          lessonsCompleted: 0,
          totalScore: 0,
          quizCount: 0,
          totalTime: 0,
          totalAttempts: 0,
        })
      }

      const row = map.get(user.id)!
      row.lessonsCompleted++
      row.totalTime += p.time_spent_minutes || 0
      row.totalAttempts += p.attempt_count || 0
      if (p.score != null) {
        row.totalScore += p.score
        row.quizCount++
      }
    }

    return Array.from(map.values())
      .map((r) => ({
        ...r,
        avgScore: r.quizCount > 0 ? Math.round(r.totalScore / r.quizCount) : null,
      }))
      .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0))
  }, [courseProgress, users])

  // Per-lesson detail for selected course
  const lessonGrades = useMemo(() => {
    if (!selectedCourse) return []
    return lessons.map((lesson) => {
      const lessonProgress = courseProgress.filter((p) => p.lesson_id === lesson.id)
      return {
        lessonId: lesson.id,
        title: lesson.title,
        type: lesson.type,
        submissions: lessonProgress.map((p) => {
          const user = users.find((u) => u.id === p.user_id)
          return {
            userId: p.user_id,
            name: user?.full_name || user?.email || 'Unknown',
            score: p.score,
            attempts: p.attempt_count || 0,
            timeMinutes: p.time_spent_minutes || 0,
            completedAt: p.completed_at,
          }
        }).sort((a, b) => (b.score ?? 0) - (a.score ?? 0)),
      }
    }).filter((l) => l.submissions.length > 0)
  }, [selectedCourse, lessons, courseProgress, users])

  // Stats
  const totalLearners = learnerRows.length
  const avgScore = learnerRows.filter((r) => r.avgScore != null).length > 0
    ? Math.round(learnerRows.filter((r) => r.avgScore != null).reduce((s, r) => s + r.avgScore!, 0) / learnerRows.filter((r) => r.avgScore != null).length)
    : 0
  const totalTimeHours = Math.round(learnerRows.reduce((s, r) => s + r.totalTime, 0) / 60 * 10) / 10
  const totalAttempts = learnerRows.reduce((s, r) => s + r.totalAttempts, 0)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <GraduationCap className="text-brand-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Grades & Progress</h1>
      </div>

      {/* Course filter */}
      <div className="mb-6">
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">All Courses</option>
          {courses.filter((c) => c.status === 'published').map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Learners</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalLearners}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-brand-100 text-brand-600">
              <GraduationCap size={20} />
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Avg Score</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{avgScore}%</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-green-100 text-green-600">
              <Trophy size={20} />
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
              <p className="text-sm text-gray-500">Total Attempts</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{totalAttempts}</p>
            </div>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-100 text-amber-600">
              <RotateCcw size={20} />
            </div>
          </div>
        </div>
      </div>

      {/* Learner table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Learner Overview</h2>
        {learnerRows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No progress data yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-4 font-semibold text-gray-700">Learner</th>
                  <th className="py-2 pr-4 font-semibold text-gray-700">Department</th>
                  <th className="py-2 pr-4 font-semibold text-gray-700 text-right">Lessons</th>
                  <th className="py-2 pr-4 font-semibold text-gray-700 text-right">Avg Score</th>
                  <th className="py-2 pr-4 font-semibold text-gray-700 text-right">Time</th>
                  <th className="py-2 font-semibold text-gray-700 text-right">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {learnerRows.map((row) => (
                  <tr key={row.userId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <p className="text-xs text-gray-400">{row.email}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-gray-600">{row.department}</td>
                    <td className="py-2.5 pr-4 text-right text-gray-700">{row.lessonsCompleted}</td>
                    <td className="py-2.5 pr-4 text-right">
                      {row.avgScore != null ? (
                        <span className={`font-semibold ${row.avgScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                          {row.avgScore}%
                        </span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="py-2.5 pr-4 text-right text-gray-600">{row.totalTime}m</td>
                    <td className="py-2.5 text-right text-gray-600">{row.totalAttempts}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-lesson breakdown (only when a course is selected) */}
      {selectedCourse && lessonGrades.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Lesson Breakdown</h2>
          <div className="space-y-4">
            {lessonGrades.map((lesson) => (
              <div key={lesson.lessonId} className="border border-gray-100 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-3">
                  <h3 className="text-sm font-semibold text-gray-900">{lesson.title}</h3>
                  <span className={`px-2 py-0.5 text-[10px] font-semibold rounded-full ${
                    lesson.type === 'quiz' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {lesson.type}
                  </span>
                  <span className="text-xs text-gray-400">{lesson.submissions.length} submissions</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-gray-100 text-left text-gray-500">
                        <th className="py-1.5 pr-3">Learner</th>
                        <th className="py-1.5 pr-3 text-right">Score</th>
                        <th className="py-1.5 pr-3 text-right">Attempts</th>
                        <th className="py-1.5 pr-3 text-right">Time</th>
                        <th className="py-1.5 text-right">Completed</th>
                      </tr>
                    </thead>
                    <tbody>
                      {lesson.submissions.map((sub) => (
                        <tr key={sub.userId} className="border-b border-gray-50">
                          <td className="py-1.5 pr-3 text-gray-700">{sub.name}</td>
                          <td className="py-1.5 pr-3 text-right">
                            {sub.score != null ? (
                              <span className={`font-semibold ${sub.score >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                                {sub.score}%
                              </span>
                            ) : '—'}
                          </td>
                          <td className="py-1.5 pr-3 text-right text-gray-600">{sub.attempts}</td>
                          <td className="py-1.5 pr-3 text-right text-gray-600">{sub.timeMinutes}m</td>
                          <td className="py-1.5 text-right text-gray-400">
                            {new Date(sub.completedAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
