import { useState, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useMyCourses } from '@/hooks/useCourses'
import { useLessons } from '@/hooks/useLessons'
import { useCourseEnrollments } from '@/hooks/useEnrollments'
import { useCourseProgress } from '@/hooks/useProgress'
import { useCourseAssessments, useAssessmentGrades, useCreateAssessment, useDeleteAssessment, useGradeStudent } from '@/hooks/useAssessments'
import { GraduationCap, Plus, Trash2, CheckCircle, Clock, Trophy, ClipboardList, X } from 'lucide-react'
import type { CustomAssessment } from '@/types/database'

export function StudentProgressPage() {
  const { profile } = useAuth()
  const { data: myCourses = [] } = useMyCourses(profile?.id)
  const [selectedCourseId, setSelectedCourseId] = useState('')

  const publishedCourses = myCourses.filter((c) => c.status === 'published')

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <GraduationCap className="text-brand-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Student Progress</h1>
      </div>

      <div className="mb-6">
        <select
          value={selectedCourseId}
          onChange={(e) => setSelectedCourseId(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="">Select a course...</option>
          {publishedCourses.map((c) => (
            <option key={c.id} value={c.id}>{c.title}</option>
          ))}
        </select>
      </div>

      {!selectedCourseId ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <GraduationCap className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">Select a course to view student progress and assessments.</p>
        </div>
      ) : (
        <CourseProgressView courseId={selectedCourseId} instructorId={profile?.id ?? ''} />
      )}
    </div>
  )
}

function CourseProgressView({ courseId, instructorId }: { courseId: string; instructorId: string }) {
  const { data: lessons = [] } = useLessons(courseId)
  const { data: enrollments = [] } = useCourseEnrollments(courseId)
  const { data: progress = [] } = useCourseProgress(courseId)
  const { data: assessments = [] } = useCourseAssessments(courseId)
  const createAssessment = useCreateAssessment()
  const deleteAssessment = useDeleteAssessment()

  const [showCreateAssessment, setShowCreateAssessment] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newMaxScore, setNewMaxScore] = useState(100)
  const [gradingAssessment, setGradingAssessment] = useState<CustomAssessment | null>(null)

  const approvedEnrollments = enrollments.filter((e) => e.status === 'approved')

  // Build student rows
  const studentRows = useMemo(() => {
    return approvedEnrollments.map((enrollment) => {
      const user = enrollment.user
      if (!user) return null

      const studentProgress = progress.filter((p) => p.user_id === user.id)
      const completedCount = studentProgress.length
      const totalLessons = lessons.length
      const progressPct = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0

      const quizProgress = studentProgress.filter((p) => p.score != null)
      const avgScore = quizProgress.length > 0
        ? Math.round(quizProgress.reduce((s, p) => s + (p.score ?? 0), 0) / quizProgress.length)
        : null

      const totalTime = studentProgress.reduce((s, p) => s + (p.time_spent_minutes || 0), 0)
      const totalAttempts = studentProgress.reduce((s, p) => s + (p.attempt_count || 0), 0)

      return {
        userId: user.id,
        name: user.full_name || user.email,
        email: user.email,
        completedCount,
        totalLessons,
        progressPct,
        avgScore,
        totalTime,
        totalAttempts,
        isCompleted: !!enrollment.completed_at,
      }
    }).filter(Boolean) as NonNullable<ReturnType<typeof Array.prototype.map>[number]>[]
  }, [approvedEnrollments, progress, lessons])

  async function handleCreateAssessment(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return
    await createAssessment.mutateAsync({
      course_id: courseId,
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
      max_score: newMaxScore,
      created_by: instructorId,
    })
    setNewTitle('')
    setNewDescription('')
    setNewMaxScore(100)
    setShowCreateAssessment(false)
  }

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard icon={<GraduationCap size={20} />} label="Students" value={studentRows.length} color="brand" />
        <StatCard icon={<CheckCircle size={20} />} label="Avg Progress" value={`${studentRows.length > 0 ? Math.round(studentRows.reduce((s, r) => s + r.progressPct, 0) / studentRows.length) : 0}%`} color="green" />
        <StatCard icon={<Trophy size={20} />} label="Avg Score" value={`${studentRows.filter(r => r.avgScore != null).length > 0 ? Math.round(studentRows.filter(r => r.avgScore != null).reduce((s, r) => s + r.avgScore!, 0) / studentRows.filter(r => r.avgScore != null).length) : 0}%`} color="amber" />
        <StatCard icon={<Clock size={20} />} label="Total Time" value={`${Math.round(studentRows.reduce((s, r) => s + r.totalTime, 0) / 60 * 10) / 10}h`} color="blue" />
      </div>

      {/* Student Progress Table */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Student Progress</h2>
        {studentRows.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-8">No enrolled students yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-left">
                  <th className="py-2 pr-4 font-semibold text-gray-700">Student</th>
                  <th className="py-2 pr-4 font-semibold text-gray-700 text-right">Progress</th>
                  <th className="py-2 pr-4 font-semibold text-gray-700 text-right">Avg Score</th>
                  <th className="py-2 pr-4 font-semibold text-gray-700 text-right">Time</th>
                  <th className="py-2 font-semibold text-gray-700 text-right">Attempts</th>
                </tr>
              </thead>
              <tbody>
                {studentRows.map((row) => (
                  <tr key={row.userId} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2.5 pr-4">
                      <p className="font-medium text-gray-900">{row.name}</p>
                      <p className="text-xs text-gray-400">{row.email}</p>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 rounded-full bg-gray-200 overflow-hidden">
                          <div className="h-full rounded-full bg-brand-600" style={{ width: `${row.progressPct}%` }} />
                        </div>
                        <span className="text-xs font-medium text-gray-600">{row.progressPct}%</span>
                      </div>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      {row.avgScore != null ? (
                        <span className={`font-semibold ${row.avgScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>{row.avgScore}%</span>
                      ) : <span className="text-gray-400">--</span>}
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

      {/* Custom Assessments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <ClipboardList size={20} />
            Custom Assessments
          </h2>
          <button
            onClick={() => setShowCreateAssessment(true)}
            className="inline-flex items-center gap-1.5 bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
          >
            <Plus size={14} />
            New Assessment
          </button>
        </div>

        {/* Create Assessment Form */}
        {showCreateAssessment && (
          <form onSubmit={handleCreateAssessment} className="bg-brand-50 rounded-lg border border-brand-200 p-4 mb-4 space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Assessment Title *</label>
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="e.g. Teach-back, Presentation, Practical Assessment"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Optional description"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Max Score</label>
                <input
                  type="number"
                  step="any"
                  min="1"
                  value={newMaxScore}
                  onChange={(e) => setNewMaxScore(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createAssessment.isPending} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50">
                {createAssessment.isPending ? 'Creating...' : 'Create'}
              </button>
              <button type="button" onClick={() => setShowCreateAssessment(false)} className="text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-100">
                Cancel
              </button>
            </div>
          </form>
        )}

        {/* Assessment List */}
        {assessments.length === 0 && !showCreateAssessment ? (
          <p className="text-gray-500 text-sm text-center py-6">No custom assessments yet. Create one to grade students on activities like teach-backs, presentations, or practicals.</p>
        ) : (
          <div className="space-y-3">
            {assessments.map((assessment) => (
              <AssessmentCard
                key={assessment.id}
                assessment={assessment}
                courseId={courseId}
                students={studentRows}
                instructorId={instructorId}
                onDelete={() => deleteAssessment.mutate({ id: assessment.id, courseId })}
                onGrade={() => setGradingAssessment(assessment)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Grading Modal */}
      {gradingAssessment && (
        <GradingModal
          assessment={gradingAssessment}
          students={studentRows}
          instructorId={instructorId}
          onClose={() => setGradingAssessment(null)}
        />
      )}
    </div>
  )
}

function AssessmentCard({ assessment, courseId, students, instructorId, onDelete, onGrade }: {
  assessment: CustomAssessment
  courseId: string
  students: { userId: string; name: string }[]
  instructorId: string
  onDelete: () => void
  onGrade: () => void
}) {
  const { data: grades = [] } = useAssessmentGrades(assessment.id)
  const gradedCount = grades.length
  const avgScore = grades.length > 0
    ? Math.round(grades.reduce((s, g) => s + g.score, 0) / grades.length)
    : null

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{assessment.title}</h3>
          {assessment.description && <p className="text-xs text-gray-500 mt-0.5">{assessment.description}</p>}
          <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
            <span>Max: {assessment.max_score}</span>
            <span>{gradedCount}/{students.length} graded</span>
            {avgScore != null && <span>Avg: {avgScore}/{assessment.max_score}</span>}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={onGrade} className="px-3 py-1.5 text-xs font-medium text-brand-600 bg-brand-50 rounded-lg hover:bg-brand-100">
            Grade Students
          </button>
          <button onClick={onDelete} className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  )
}

function GradingModal({ assessment, students, instructorId, onClose }: {
  assessment: CustomAssessment
  students: { userId: string; name: string; email: string }[]
  instructorId: string
  onClose: () => void
}) {
  const { data: existingGrades = [] } = useAssessmentGrades(assessment.id)
  const gradeStudent = useGradeStudent()
  const [scores, setScores] = useState<Record<string, { score: string; feedback: string }>>(() => {
    const init: Record<string, { score: string; feedback: string }> = {}
    for (const s of students) {
      const existing = existingGrades.find((g) => g.user_id === s.userId)
      init[s.userId] = {
        score: existing?.score?.toString() ?? '',
        feedback: existing?.feedback ?? '',
      }
    }
    return init
  })

  async function handleSave(userId: string) {
    const entry = scores[userId]
    if (!entry?.score) return
    await gradeStudent.mutateAsync({
      assessment_id: assessment.id,
      user_id: userId,
      score: Number(entry.score),
      feedback: entry.feedback || undefined,
      graded_by: instructorId,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[6vh]">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl slide-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{assessment.title}</h2>
            <p className="text-xs text-gray-500">Max score: {assessment.max_score}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {students.length === 0 ? (
            <p className="text-gray-500 text-sm text-center py-8">No enrolled students to grade.</p>
          ) : (
            <div className="space-y-3">
              {students.map((student) => {
                const entry = scores[student.userId] ?? { score: '', feedback: '' }
                const existing = existingGrades.find((g) => g.user_id === student.userId)
                return (
                  <div key={student.userId} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{student.name}</p>
                        <p className="text-xs text-gray-400">{student.email}</p>
                      </div>
                      {existing && (
                        <span className="text-xs text-green-600 font-medium">Graded: {existing.score}/{assessment.max_score}</span>
                      )}
                    </div>
                    <div className="flex items-end gap-2">
                      <div className="flex-1">
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Score</label>
                        <input
                          type="number"
                          step="any"
                          min="0"
                          max={assessment.max_score}
                          value={entry.score}
                          onChange={(e) => setScores({ ...scores, [student.userId]: { ...entry, score: e.target.value } })}
                          placeholder={`0-${assessment.max_score}`}
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <div className="flex-[2]">
                        <label className="block text-[10px] font-medium text-gray-500 mb-0.5">Feedback (optional)</label>
                        <input
                          type="text"
                          value={entry.feedback}
                          onChange={(e) => setScores({ ...scores, [student.userId]: { ...entry, feedback: e.target.value } })}
                          placeholder="Optional feedback"
                          className="w-full px-2 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                        />
                      </div>
                      <button
                        onClick={() => handleSave(student.userId)}
                        disabled={!entry.score || gradeStudent.isPending}
                        className="px-3 py-1.5 bg-brand-600 text-white rounded text-xs font-medium hover:bg-brand-700 disabled:opacity-50 shrink-0"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-200 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string | number; color: string }) {
  const colors: Record<string, string> = {
    brand: 'bg-brand-100 text-brand-600',
    green: 'bg-green-100 text-green-600',
    amber: 'bg-amber-100 text-amber-600',
    blue: 'bg-blue-100 text-blue-600',
  }
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}
