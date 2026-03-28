import { useState, useMemo } from 'react'
import { useAllEnrollments } from '@/hooks/useEnrollments'
import { useAllCourses } from '@/hooks/useCourses'
import { useAllUsers } from '@/hooks/useUsers'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts'
import type { Progress } from '@/types/database'
import type { UserRole } from '@/types/database'

const COLORS = ['#10b981', '#059669', '#047857', '#065f46', '#064e3b', '#34d399', '#6ee7b7']

export function ReportsPage() {
  const { data: enrollments = [] } = useAllEnrollments()
  const { data: courses = [] } = useAllCourses()
  const { data: users = [] } = useAllUsers()

  const [departmentFilter, setDepartmentFilter] = useState<string>('all')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')

  const { data: allProgress = [] } = useQuery({
    queryKey: ['all-progress'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('progress')
        .select('*')
      if (error) throw error
      return data as Progress[]
    },
  })

  // Unique departments
  const departments = useMemo(() => {
    const depts = new Set<string>()
    users.forEach((u) => { if (u.department) depts.add(u.department) })
    return Array.from(depts).sort()
  }, [users])

  // Filtered user IDs based on department + role
  const filteredUserIds = useMemo(() => {
    return new Set(
      users
        .filter((u) => {
          if (departmentFilter !== 'all' && (u.department || '') !== departmentFilter) return false
          if (roleFilter !== 'all' && u.role !== roleFilter) return false
          return true
        })
        .map((u) => u.id)
    )
  }, [users, departmentFilter, roleFilter])

  const isFiltered = departmentFilter !== 'all' || roleFilter !== 'all'

  // Filtered enrollments & progress
  const filteredEnrollments = isFiltered
    ? enrollments.filter((e) => filteredUserIds.has(e.user_id))
    : enrollments
  const filteredProgress = isFiltered
    ? allProgress.filter((p) => filteredUserIds.has(p.user_id))
    : allProgress

  // Enrollments over time (last 12 months)
  const enrollmentsByMonth: Record<string, number> = {}
  const now = new Date()
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    enrollmentsByMonth[key] = 0
  }
  for (const e of filteredEnrollments) {
    const d = new Date(e.enrolled_at)
    const key = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    if (key in enrollmentsByMonth) {
      enrollmentsByMonth[key]++
    }
  }
  const enrollmentChartData = Object.entries(enrollmentsByMonth).map(([month, count]) => ({ month, count }))

  // Completion rates per course
  const courseCompletionData = courses
    .filter((c) => c.status === 'published')
    .map((course) => {
      const courseEnrollments = filteredEnrollments.filter((e) => e.course_id === course.id)
      const completed = courseEnrollments.filter((e) => e.completed_at)
      const rate = courseEnrollments.length > 0
        ? Math.round((completed.length / courseEnrollments.length) * 100)
        : 0
      return {
        name: course.title.length > 20 ? course.title.slice(0, 20) + '...' : course.title,
        rate,
        enrolled: courseEnrollments.length,
      }
    })
    .filter((c) => c.enrolled > 0)
    .slice(0, 8)

  // Top learners by avg score, with department
  const learnerStatsMap = new Map<string, { lessons: number; totalScore: number; quizCount: number; totalTime: number }>()
  for (const p of filteredProgress) {
    if (!learnerStatsMap.has(p.user_id)) {
      learnerStatsMap.set(p.user_id, { lessons: 0, totalScore: 0, quizCount: 0, totalTime: 0 })
    }
    const s = learnerStatsMap.get(p.user_id)!
    s.lessons++
    s.totalTime += p.time_spent_minutes || 0
    if (p.score != null) { s.totalScore += p.score; s.quizCount++ }
  }
  const topLearners = Array.from(learnerStatsMap.entries())
    .map(([userId, stats]) => {
      const user = users.find((u) => u.id === userId)
      return {
        name: user?.full_name || user?.email || 'Unknown',
        department: user?.department || 'Unassigned',
        lessons: stats.lessons,
        avgScore: stats.quizCount > 0 ? Math.round(stats.totalScore / stats.quizCount) : null,
        timeHours: Math.round(stats.totalTime / 60 * 10) / 10,
      }
    })
    .sort((a, b) => (b.avgScore ?? 0) - (a.avgScore ?? 0) || b.lessons - a.lessons)
    .slice(0, 10)

  // Top learners per department
  const topByDepartment = useMemo(() => {
    const deptMap = new Map<string, typeof topLearners>()
    for (const l of topLearners) {
      if (!deptMap.has(l.department)) deptMap.set(l.department, [])
      deptMap.get(l.department)!.push(l)
    }
    return Array.from(deptMap.entries()).sort(([a], [b]) => a.localeCompare(b))
  }, [topLearners])

  // User distribution pie chart
  const filteredUsers = isFiltered ? users.filter((u) => filteredUserIds.has(u.id)) : users
  const roleCounts = [
    { name: 'Admins', value: filteredUsers.filter((u) => u.role === 'admin').length },
    { name: 'Instructors', value: filteredUsers.filter((u) => u.role === 'instructor').length },
    { name: 'Learners', value: filteredUsers.filter((u) => u.role === 'learner').length },
  ].filter((r) => r.value > 0)

  // Department breakdown chart
  const departmentData = useMemo(() => {
    const deptMap: Record<string, { enrolled: number; completed: number }> = {}
    for (const u of users) {
      const dept = u.department || 'Unassigned'
      if (roleFilter !== 'all' && u.role !== roleFilter) continue
      if (!deptMap[dept]) deptMap[dept] = { enrolled: 0, completed: 0 }
    }
    for (const e of enrollments) {
      const user = users.find((u) => u.id === e.user_id)
      if (!user) continue
      if (roleFilter !== 'all' && user.role !== roleFilter) continue
      const dept = user.department || 'Unassigned'
      if (!deptMap[dept]) deptMap[dept] = { enrolled: 0, completed: 0 }
      deptMap[dept].enrolled++
      if (e.completed_at) deptMap[dept].completed++
    }
    return Object.entries(deptMap)
      .map(([name, data]) => ({ name, ...data }))
      .filter((d) => d.enrolled > 0)
      .sort((a, b) => b.enrolled - a.enrolled)
      .slice(0, 10)
  }, [users, enrollments, roleFilter])

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Reports</h1>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Roles</option>
          <option value="admin">Admin</option>
          <option value="instructor">Instructor</option>
          <option value="learner">Learner</option>
        </select>
        {isFiltered && (
          <button
            onClick={() => { setDepartmentFilter('all'); setRoleFilter('all') }}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50"
          >
            Clear Filters
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Enrollments Over Time */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Enrollments Over Time</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={enrollmentChartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={12} />
              <YAxis fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} dot={{ fill: '#10b981' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Completion Rates per Course */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Completion Rates</h2>
          {courseCompletionData.length === 0 ? (
            <p className="text-gray-500 text-sm">No published courses with enrollments yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={courseCompletionData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" domain={[0, 100]} fontSize={12} />
                <YAxis type="category" dataKey="name" fontSize={11} width={120} />
                <Tooltip formatter={(value) => `${value}%`} />
                <Bar dataKey="rate" fill="#10b981" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Department Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Department Breakdown</h2>
          {departmentData.length === 0 ? (
            <p className="text-gray-500 text-sm">No department data available.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={departmentData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" fontSize={11} angle={-45} textAnchor="end" height={80} />
                <YAxis fontSize={12} allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="enrolled" fill="#10b981" radius={[4, 4, 0, 0]} name="Enrollments" />
                <Bar dataKey="completed" fill="#059669" radius={[4, 4, 0, 0]} name="Completions" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Top Learners */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Learners</h2>
          {topLearners.length === 0 ? (
            <p className="text-gray-500 text-sm">No progress data yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-left">
                    <th className="py-2 pr-3 font-semibold text-gray-700 w-8">#</th>
                    <th className="py-2 pr-3 font-semibold text-gray-700">Learner</th>
                    <th className="py-2 pr-3 font-semibold text-gray-700">Department</th>
                    <th className="py-2 pr-3 font-semibold text-gray-700 text-right">Avg Score</th>
                    <th className="py-2 pr-3 font-semibold text-gray-700 text-right">Lessons</th>
                    <th className="py-2 font-semibold text-gray-700 text-right">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {topLearners.map((l, i) => (
                    <tr key={l.name} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="py-2 pr-3 font-bold text-gray-400">{i + 1}</td>
                      <td className="py-2 pr-3 font-medium text-gray-900">{l.name}</td>
                      <td className="py-2 pr-3 text-gray-600">{l.department}</td>
                      <td className="py-2 pr-3 text-right">
                        {l.avgScore != null ? (
                          <span className={`font-semibold ${l.avgScore >= 70 ? 'text-green-600' : 'text-amber-600'}`}>{l.avgScore}%</span>
                        ) : <span className="text-gray-400">—</span>}
                      </td>
                      <td className="py-2 pr-3 text-right text-gray-700">{l.lessons}</td>
                      <td className="py-2 text-right text-gray-600">{l.timeHours}h</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Top Learners by Department */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 col-span-full">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Learners by Department</h2>
          {topByDepartment.length === 0 ? (
            <p className="text-gray-500 text-sm">No progress data yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {topByDepartment.map(([dept, learners]) => (
                <div key={dept} className="border border-gray-100 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-brand-700 mb-3">{dept}</h3>
                  <div className="space-y-2">
                    {learners.map((l, i) => (
                      <div key={l.name} className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-500'
                          }`}>{i + 1}</span>
                          <span className="text-sm text-gray-700">{l.name}</span>
                        </div>
                        <span className={`text-sm font-semibold ${(l.avgScore ?? 0) >= 70 ? 'text-green-600' : 'text-amber-600'}`}>
                          {l.avgScore != null ? `${l.avgScore}%` : '—'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* User Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">User Distribution</h2>
          {roleCounts.length === 0 ? (
            <p className="text-gray-500 text-sm">No users yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={roleCounts}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {roleCounts.map((_entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  )
}
