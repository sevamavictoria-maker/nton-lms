import { useState } from 'react'
import { useAllCourses, useCreateCourse, useUpdateCourse } from '@/hooks/useCourses'
import { useAuth } from '@/hooks/useAuth'
import { useActiveCategories } from '@/hooks/useCategories'
import { Plus, X, Archive, Eye, EyeOff, Download } from 'lucide-react'
import { ImageUpload } from '@/components/ImageUpload'
import { Link } from 'react-router-dom'
import type { CourseStatus, Lesson } from '@/types/database'
import { supabase } from '@/lib/supabase'
import { exportCoursePdf } from '@/lib/exportPdf'

export function ManageCourses() {
  const { profile } = useAuth()
  const { data: courses = [], isLoading } = useAllCourses()
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState({ title: '', description: '', category: '', cover_url: '' })
  const { data: categories = [] } = useActiveCategories()
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState<CourseStatus | 'all'>('all')

  const filtered = statusFilter === 'all' ? courses : courses.filter((c) => c.status === statusFilter)

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await createCourse.mutateAsync({
        title: form.title,
        description: form.description || undefined,
        category: form.category || undefined,
        cover_url: form.cover_url || undefined,
        created_by: profile!.id,
      })
      setShowModal(false)
      setForm({ title: '', description: '', category: '', cover_url: '' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create course')
    }
  }

  const handleStatusChange = async (courseId: string, newStatus: CourseStatus) => {
    await updateCourse.mutateAsync({ id: courseId, status: newStatus })
  }

  const handleExportPdf = async (course: { id: string; title: string; description: string | null }) => {
    const { data: lessons } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', course.id)
      .order('order_num')
    exportCoursePdf(course, (lessons as Lesson[]) || [])
  }

  const statusColors: Record<CourseStatus, string> = {
    draft: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Courses</h1>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 text-sm font-medium"
        >
          <Plus size={16} />
          Create Course
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        {(['all', 'draft', 'published', 'archived'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              statusFilter === status
                ? 'bg-brand-600 text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No courses found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Title</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Instructor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((course) => (
                <tr key={course.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    <Link to={`/admin/courses/${course.id}`} className="text-brand-600 hover:underline">
                      {course.title}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{course.category || '--'}</td>
                  <td className="px-4 py-3 text-gray-700">{course.instructor?.full_name || '--'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[course.status]}`}>
                      {course.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(course.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleExportPdf(course)}
                        className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg"
                        title="Export PDF"
                      >
                        <Download size={16} />
                      </button>
                      {course.status === 'draft' && (
                        <button
                          onClick={() => handleStatusChange(course.id, 'published')}
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                          title="Publish"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                      {course.status === 'published' && (
                        <button
                          onClick={() => handleStatusChange(course.id, 'draft')}
                          className="p-1.5 text-yellow-600 hover:bg-yellow-50 rounded-lg"
                          title="Unpublish"
                        >
                          <EyeOff size={16} />
                        </button>
                      )}
                      {course.status !== 'archived' && (
                        <button
                          onClick={() => handleStatusChange(course.id, 'archived')}
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="Archive"
                        >
                          <Archive size={16} />
                        </button>
                      )}
                      {course.status === 'archived' && (
                        <button
                          onClick={() => handleStatusChange(course.id, 'draft')}
                          className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg"
                          title="Restore to Draft"
                        >
                          <Eye size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Course Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Create Course</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>
            )}

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" required value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} rows={3}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <ImageUpload
                value={form.cover_url}
                onChange={(url) => setForm({ ...form, cover_url: url })}
                label="Cover Image (optional)"
                placeholder="Paste URL or upload"
              />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={createCourse.isPending}
                  className="flex-1 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {createCourse.isPending ? 'Creating...' : 'Create Course'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
