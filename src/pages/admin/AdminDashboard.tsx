import { useAllPendingEnrollments, useApproveEnrollment, useRejectEnrollment } from '@/hooks/useEnrollments'
import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { BookOpen, Users, GraduationCap, Award, Hourglass, CheckCircle, XCircle } from 'lucide-react'

export function AdminDashboard() {
  // Lightweight count queries instead of fetching all records
  const { data: courseCount = 0 } = useQuery({
    queryKey: ['course-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('courses').select('*', { count: 'exact', head: true })
      if (error) throw error
      return count || 0
    },
  })

  const { data: userCount = 0 } = useQuery({
    queryKey: ['user-count'],
    queryFn: async () => {
      const { count, error } = await supabase.from('profiles').select('*', { count: 'exact', head: true })
      if (error) throw error
      return count || 0
    },
  })

  const { data: enrollmentStats = { total: 0, completed: 0 } } = useQuery({
    queryKey: ['enrollment-stats'],
    queryFn: async () => {
      const { count: total, error: e1 } = await supabase.from('enrollments').select('*', { count: 'exact', head: true })
      if (e1) throw e1
      const { count: completed, error: e2 } = await supabase.from('enrollments').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null)
      if (e2) throw e2
      return { total: total || 0, completed: completed || 0 }
    },
  })

  const { data: courseCounts = { draft: 0, published: 0, archived: 0 } } = useQuery({
    queryKey: ['course-status-counts'],
    queryFn: async () => {
      const [d, p, a] = await Promise.all([
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'published'),
        supabase.from('courses').select('*', { count: 'exact', head: true }).eq('status', 'archived'),
      ])
      return { draft: d.count || 0, published: p.count || 0, archived: a.count || 0 }
    },
  })

  const { data: roleCounts = { admin: 0, instructor: 0, learner: 0 } } = useQuery({
    queryKey: ['user-role-counts'],
    queryFn: async () => {
      const [a, i, l] = await Promise.all([
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'admin'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'instructor'),
        supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'learner'),
      ])
      return { admin: a.count || 0, instructor: i.count || 0, learner: l.count || 0 }
    },
  })

  // Only fetch the data we actually display as lists
  const { data: pendingEnrollments = [] } = useAllPendingEnrollments()
  const approveEnrollment = useApproveEnrollment()
  const rejectEnrollment = useRejectEnrollment()

  // Recent enrollments — just 10
  const { data: recentEnrollments = [] } = useQuery({
    queryKey: ['recent-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('id, enrolled_at, status, user:profiles(id, full_name, email), course:courses(id, title)')
        .eq('status', 'approved')
        .order('enrolled_at', { ascending: false })
        .limit(10)
      if (error) throw error
      return data
    },
  })

  const completionRate = enrollmentStats.total > 0
    ? Math.round((enrollmentStats.completed / enrollmentStats.total) * 100)
    : 0

  const stats = [
    { label: 'Total Courses', value: courseCount, icon: <BookOpen size={24} />, color: 'bg-brand-100 text-brand-700' },
    { label: 'Total Users', value: userCount, icon: <Users size={24} />, color: 'bg-blue-100 text-blue-700' },
    { label: 'Total Enrollments', value: enrollmentStats.total, icon: <GraduationCap size={24} />, color: 'bg-amber-100 text-amber-700' },
    { label: 'Completion Rate', value: `${completionRate}%`, icon: <Award size={24} />, color: 'bg-purple-100 text-purple-700' },
    { label: 'Pending Requests', value: pendingEnrollments.length, icon: <Hourglass size={24} />, color: 'bg-orange-100 text-orange-700' },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${stat.color}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Enrollment Requests */}
      {pendingEnrollments.length > 0 && (
        <div className="bg-white rounded-xl border border-orange-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Hourglass size={20} className="text-orange-500" />
            Pending Enrollment Requests ({pendingEnrollments.length})
          </h2>
          <div className="space-y-3">
            {pendingEnrollments.map((e) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-900">{e.user?.full_name || e.user?.email || 'Unknown'}</p>
                  <p className="text-xs text-gray-500">{e.course?.title || 'Unknown course'}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 mr-2">
                    {new Date(e.enrolled_at).toLocaleDateString()}
                  </span>
                  <button
                    onClick={() => approveEnrollment.mutate(e.id)}
                    disabled={approveEnrollment.isPending}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    <CheckCircle size={12} />
                    Approve
                  </button>
                  <button
                    onClick={() => rejectEnrollment.mutate(e.id)}
                    disabled={rejectEnrollment.isPending}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    <XCircle size={12} />
                    Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Enrollments */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Enrollments</h2>
          {recentEnrollments.length === 0 ? (
            <p className="text-gray-500 text-sm">No enrollments yet.</p>
          ) : (
            <div className="space-y-3">
              {recentEnrollments.map((e: any) => (
                <div key={e.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{e.user?.full_name || e.user?.email || 'Unknown'}</p>
                    <p className="text-xs text-gray-500">{e.course?.title || 'Unknown course'}</p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {new Date(e.enrolled_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Course Breakdown */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Course Status</h2>
          <div className="space-y-3">
            {(['draft', 'published', 'archived'] as const).map((status) => {
              const colors: Record<string, string> = {
                draft: 'bg-yellow-100 text-yellow-700',
                published: 'bg-green-100 text-green-700',
                archived: 'bg-gray-100 text-gray-700',
              }
              return (
                <div key={status} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${colors[status]}`}>
                      {status}
                    </span>
                  </div>
                  <span className="text-lg font-semibold text-gray-900">{courseCounts[status]}</span>
                </div>
              )
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-medium text-gray-600 mb-3">Users by Role</h3>
            <div className="space-y-2">
              {(['admin', 'instructor', 'learner'] as const).map((role) => (
                <div key={role} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 capitalize">{role}s</span>
                  <span className="text-sm font-medium text-gray-900">{roleCounts[role]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
