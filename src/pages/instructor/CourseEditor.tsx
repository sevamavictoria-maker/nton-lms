import { useState, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useCourse, useCreateCourse, useUpdateCourse } from '@/hooks/useCourses'
import { useLessons, useCreateLesson, useDeleteLesson, useReorderLessons } from '@/hooks/useLessons'
import { useCourseEnrollments, useAssignCourse, useApproveEnrollment, useRejectEnrollment } from '@/hooks/useEnrollments'
import { useLiveLessons, useCreateLiveLesson, useDeleteLiveLesson } from '@/hooks/useLiveLessons'
import { useCourseProgress } from '@/hooks/useProgress'
import { useCourseFiles, useUploadCourseFile, useDeleteCourseFile } from '@/hooks/useCourseFiles'
import { useAllUsers } from '@/hooks/useUsers'
import { useAuth } from '@/hooks/useAuth'
import { useActiveCategories } from '@/hooks/useCategories'
import { ArrowLeft, Plus, Trash2, GripVertical, FileText, HelpCircle, Save, ChevronUp, ChevronDown, Users, AlertCircle, Download, CheckCircle, XCircle, Hourglass, Video, Calendar, Clock, Link as LinkIcon, BarChart3, Upload, File, Loader2 } from 'lucide-react'
import { exportCoursePdf } from '@/lib/exportPdf'
import { ImageUpload } from '@/components/ImageUpload'
import type { LessonType, CourseStatus } from '@/types/database'

export function CourseEditor() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { profile, role } = useAuth()
  const { data: categories = [] } = useActiveCategories()
  const isCreateMode = !courseId
  const basePath = role === 'admin' ? '/admin' : '/instructor'
  const { data: course, isLoading: courseLoading } = useCourse(courseId)
  const { data: lessons = [], isLoading: lessonsLoading } = useLessons(courseId)
  const createCourse = useCreateCourse()
  const updateCourse = useUpdateCourse()
  const createLesson = useCreateLesson()
  const deleteLesson = useDeleteLesson()
  const reorderLessons = useReorderLessons()

  const [editingInfo, setEditingInfo] = useState(false)
  const [courseForm, setCourseForm] = useState({ title: '', description: '', category: '', cover_url: '' })
  const [newLesson, setNewLesson] = useState({ title: '', type: 'slide' as LessonType })
  const [showNewLesson, setShowNewLesson] = useState(false)
  const [createError, setCreateError] = useState('')

  // Assignments
  const { data: enrollments = [] } = useCourseEnrollments(courseId)
  const { data: allUsers = [] } = useAllUsers()
  const assignCourse = useAssignCourse()
  const [showAssignForm, setShowAssignForm] = useState(false)
  const [assignForm, setAssignForm] = useState({ user_id: '', deadline: '', is_mandatory: false })
  const [assignError, setAssignError] = useState('')
  const approveEnrollment = useApproveEnrollment()
  const rejectEnrollment = useRejectEnrollment()

  // Live lessons
  const { data: liveLessons = [] } = useLiveLessons(courseId)
  const createLiveLesson = useCreateLiveLesson()
  const deleteLiveLesson = useDeleteLiveLesson()
  const [showLiveForm, setShowLiveForm] = useState(false)
  const [liveForm, setLiveForm] = useState({ title: '', description: '', scheduled_at: '', duration_minutes: '60', meeting_url: '' })

  // Quiz scores
  const { data: courseProgress = [] } = useCourseProgress(courseId)

  // Course files
  const { data: courseFiles = [] } = useCourseFiles(courseId)
  const uploadCourseFile = useUploadCourseFile()
  const deleteCourseFile = useDeleteCourseFile()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const startEditInfo = () => {
    if (!course) return
    setCourseForm({
      title: course.title,
      description: course.description || '',
      category: course.category || '',
      cover_url: course.cover_url || '',
    })
    setEditingInfo(true)
  }

  const handleSaveInfo = async () => {
    if (!courseId) return
    await updateCourse.mutateAsync({
      id: courseId,
      title: courseForm.title,
      description: courseForm.description || undefined,
      category: courseForm.category || undefined,
      cover_url: courseForm.cover_url || undefined,
    })
    setEditingInfo(false)
  }

  const handleAddLesson = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!courseId) return
    const order = lessons.length + 1
    await createLesson.mutateAsync({
      course_id: courseId,
      title: newLesson.title,
      type: newLesson.type,
      order_num: order,
    })
    setNewLesson({ title: '', type: 'slide' })
    setShowNewLesson(false)
  }

  const handleDeleteLesson = async (lessonId: string) => {
    if (!courseId) return
    if (!confirm('Delete this lesson? This cannot be undone.')) return
    await deleteLesson.mutateAsync({ id: lessonId, courseId })
  }

  const handleMoveLesson = async (index: number, direction: 'up' | 'down') => {
    if (!courseId) return
    const newLessons = [...lessons]
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= newLessons.length) return

    // Swap order_num values
    const temp = newLessons[index].order_num
    newLessons[index] = { ...newLessons[index], order_num: newLessons[swapIndex].order_num }
    newLessons[swapIndex] = { ...newLessons[swapIndex], order_num: temp }

    await reorderLessons.mutateAsync({
      courseId,
      lessons: newLessons.map((l) => ({ id: l.id, order_num: l.order_num })),
    })
  }

  const handlePublish = async () => {
    if (!courseId) return
    await updateCourse.mutateAsync({ id: courseId, status: 'published' as CourseStatus })
  }

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreateError('')
    if (!profile) return
    try {
      const newCourse = await createCourse.mutateAsync({
        title: courseForm.title,
        description: courseForm.description || undefined,
        category: courseForm.category || undefined,
        cover_url: courseForm.cover_url || undefined,
        created_by: profile.id,
      })
      navigate(`${basePath}/courses/${newCourse.id}`, { replace: true })
    } catch (err: unknown) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create course')
    }
  }

  // CREATE MODE
  if (isCreateMode) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Link to={`${basePath}/courses`} className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create New Course</h1>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
          {createError && (
            <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{createError}</div>
          )}
          <form onSubmit={handleCreateCourse} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" required value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Enter course title" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={courseForm.description} rows={3}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="What will students learn?" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select value={courseForm.category}
                onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Select category</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </div>
            <ImageUpload
              value={courseForm.cover_url}
              onChange={(url) => setCourseForm({ ...courseForm, cover_url: url })}
              label="Cover Image (optional)"
              placeholder="Paste URL or upload"
            />
            <div className="flex gap-3 pt-2">
              <Link to="/instructor"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-center text-sm">
                Cancel
              </Link>
              <button type="submit" disabled={createCourse.isPending}
                className="flex-1 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium">
                {createCourse.isPending ? 'Creating...' : 'Create Course'}
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  if (courseLoading || lessonsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Course not found.</p>
        <button onClick={() => navigate(`${basePath}/courses`)} className="text-brand-600 mt-2 text-sm">Go back</button>
      </div>
    )
  }

  const statusColors: Record<CourseStatus, string> = {
    draft: 'bg-yellow-100 text-yellow-700',
    published: 'bg-green-100 text-green-700',
    archived: 'bg-gray-100 text-gray-700',
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to={`${basePath}/courses`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Course Editor</h1>
        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${statusColors[course.status]}`}>
          {course.status}
        </span>
      </div>

      {/* Course Info */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        {!editingInfo ? (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{course.title}</h2>
                {course.category && (
                  <span className="text-sm text-gray-500">{course.category}</span>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => exportCoursePdf(course, lessons)}
                  className="inline-flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  <Download size={16} /> Export PDF
                </button>
                <button onClick={startEditInfo}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Edit Info
                </button>
                {course.status === 'draft' && (
                  <button onClick={handlePublish}
                    className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-700">
                    Publish
                  </button>
                )}
              </div>
            </div>
            {course.description && <p className="text-gray-600 text-sm">{course.description}</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input type="text" value={courseForm.title}
                onChange={(e) => setCourseForm({ ...courseForm, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
              <textarea value={courseForm.description} rows={3}
                onChange={(e) => setCourseForm({ ...courseForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select value={courseForm.category}
                  onChange={(e) => setCourseForm({ ...courseForm, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <ImageUpload
                  value={courseForm.cover_url}
                  onChange={(url) => setCourseForm({ ...courseForm, cover_url: url })}
                  label="Cover Image"
                  placeholder="Paste URL or upload"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSaveInfo} disabled={updateCourse.isPending}
                className="inline-flex items-center gap-1 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium">
                <Save size={16} />
                {updateCourse.isPending ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditingInfo(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lessons */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Lessons ({lessons.length})</h2>
        <button
          onClick={() => setShowNewLesson(true)}
          className="flex items-center gap-2 bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 text-sm font-medium"
        >
          <Plus size={16} />
          Add Lesson
        </button>
      </div>

      {/* New Lesson Form */}
      {showNewLesson && (
        <div className="bg-brand-50 rounded-xl border border-brand-200 p-4 mb-4">
          <form onSubmit={handleAddLesson} className="flex flex-col sm:flex-row sm:items-end gap-3">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Lesson Title</label>
              <input type="text" required value={newLesson.title}
                onChange={(e) => setNewLesson({ ...newLesson, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="Enter lesson title" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={newLesson.type}
                onChange={(e) => setNewLesson({ ...newLesson, type: e.target.value as LessonType })}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="slide">Slides</option>
                <option value="quiz">Quiz</option>
              </select>
            </div>
            <div className="flex gap-2">
              <button type="submit" disabled={createLesson.isPending}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium">
                {createLesson.isPending ? 'Adding...' : 'Add'}
              </button>
              <button type="button" onClick={() => setShowNewLesson(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {lessons.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No lessons yet. Add your first lesson above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson, index) => (
            <div key={lesson.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
              <div className="flex flex-col gap-0.5">
                <button
                  onClick={() => handleMoveLesson(index, 'up')}
                  disabled={index === 0}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronUp size={14} />
                </button>
                <GripVertical size={14} className="text-gray-300" />
                <button
                  onClick={() => handleMoveLesson(index, 'down')}
                  disabled={index === lessons.length - 1}
                  className="text-gray-400 hover:text-gray-600 disabled:opacity-30"
                >
                  <ChevronDown size={14} />
                </button>
              </div>
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                lesson.type === 'slide' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'
              }`}>
                {lesson.type === 'slide' ? <FileText size={16} /> : <HelpCircle size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{lesson.title}</p>
                <p className="text-xs text-gray-500 capitalize">{lesson.type} lesson</p>
              </div>
              <Link
                to={`${basePath}/courses/${courseId}/lessons/${lesson.id}`}
                className="px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 rounded-lg font-medium"
              >
                Edit
              </Link>
              <button
                onClick={() => handleDeleteLesson(lesson.id)}
                className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Course Files Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <File size={20} />
            Downloadable Files ({courseFiles.length})
          </h2>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadCourseFile.isPending}
            className="flex items-center gap-2 bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 text-sm font-medium disabled:opacity-50"
          >
            {uploadCourseFile.isPending ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
            {uploadCourseFile.isPending ? 'Uploading...' : 'Upload File'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0]
              if (!file || !courseId || !profile) return
              if (file.size > 50 * 1024 * 1024) {
                alert('File must be under 50MB')
                return
              }
              await uploadCourseFile.mutateAsync({ courseId, file, uploadedBy: profile.id })
              if (fileInputRef.current) fileInputRef.current.value = ''
            }}
          />
        </div>

        {courseFiles.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No files uploaded yet. Upload PDFs, documents, or other resources for learners.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {courseFiles.map((cf) => (
              <div key={cf.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 shrink-0">
                  <File size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{cf.file_name}</p>
                  <p className="text-xs text-gray-500">
                    {cf.file_size ? `${(cf.file_size / 1024).toFixed(0)} KB` : ''} — {new Date(cf.created_at).toLocaleDateString()}
                  </p>
                </div>
                <a
                  href={cf.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 text-sm text-brand-600 hover:bg-brand-50 rounded-lg font-medium"
                >
                  <Download size={16} />
                </a>
                <button
                  onClick={async () => {
                    if (!courseId) return
                    if (!confirm(`Delete "${cf.file_name}"?`)) return
                    await deleteCourseFile.mutateAsync({ id: cf.id, courseId })
                  }}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Live Lessons Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Video size={20} />
            Live Sessions ({liveLessons.length})
          </h2>
          <button
            onClick={() => setShowLiveForm(true)}
            className="flex items-center gap-2 bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 text-sm font-medium"
          >
            <Plus size={16} />
            Schedule Session
          </button>
        </div>

        {showLiveForm && (
          <div className="bg-brand-50 rounded-xl border border-brand-200 p-4 mb-4">
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!courseId || !profile) return
                await createLiveLesson.mutateAsync({
                  course_id: courseId,
                  title: liveForm.title,
                  description: liveForm.description || undefined,
                  scheduled_at: new Date(liveForm.scheduled_at).toISOString(),
                  duration_minutes: parseInt(liveForm.duration_minutes) || 60,
                  meeting_url: liveForm.meeting_url || undefined,
                  created_by: profile.id,
                })
                setLiveForm({ title: '', description: '', scheduled_at: '', duration_minutes: '60', meeting_url: '' })
                setShowLiveForm(false)
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Session Title</label>
                <input
                  type="text"
                  required
                  value={liveForm.title}
                  onChange={(e) => setLiveForm({ ...liveForm, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Week 3 — Q&A Session"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <textarea
                  value={liveForm.description}
                  onChange={(e) => setLiveForm({ ...liveForm, description: e.target.value })}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="What will this session cover?"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={liveForm.scheduled_at}
                    onChange={(e) => setLiveForm({ ...liveForm, scheduled_at: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                  <input
                    type="number"
                    min="15"
                    max="480"
                    value={liveForm.duration_minutes}
                    onChange={(e) => setLiveForm({ ...liveForm, duration_minutes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Meeting Link (optional)</label>
                  <input
                    type="url"
                    value={liveForm.meeting_url}
                    onChange={(e) => setLiveForm({ ...liveForm, meeting_url: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                    placeholder="https://zoom.us/j/..."
                  />
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={createLiveLesson.isPending}
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium"
                >
                  {createLiveLesson.isPending ? 'Scheduling...' : 'Schedule'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowLiveForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {liveLessons.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No live sessions scheduled yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {liveLessons.map((ll) => {
              const dt = new Date(ll.scheduled_at)
              const now = new Date()
              const isPast = dt < now
              return (
                <div key={ll.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${isPast ? 'border-gray-200 opacity-60' : 'border-brand-200'}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isPast ? 'bg-gray-100 text-gray-400' : 'bg-brand-100 text-brand-600'}`}>
                    <Video size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{ll.title}</p>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <Calendar size={12} />
                        {dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock size={12} />
                        {dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({ll.duration_minutes}min)
                      </span>
                    </div>
                    {ll.description && <p className="text-xs text-gray-500 mt-1 truncate">{ll.description}</p>}
                  </div>
                  {ll.meeting_url && (
                    <a
                      href={ll.meeting_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-brand-50 text-brand-700 hover:bg-brand-100"
                    >
                      <LinkIcon size={12} />
                      Join
                    </a>
                  )}
                  <button
                    onClick={async () => {
                      if (!courseId) return
                      if (!confirm('Delete this live session?')) return
                      await deleteLiveLesson.mutateAsync({ id: ll.id, courseId })
                    }}
                    className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quiz Scores Section */}
      {lessons.filter((l) => l.type === 'quiz').length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <BarChart3 size={20} />
            Student Quiz Scores
          </h2>
          {lessons.filter((l) => l.type === 'quiz').map((quiz) => {
            const quizProgress = courseProgress.filter((p) => p.lesson_id === quiz.id && p.score != null)
            const approvedStudents = enrollments.filter((e) => e.status === 'approved')
            const avgScore = quizProgress.length > 0
              ? Math.round(quizProgress.reduce((sum, p) => sum + (p.score || 0), 0) / quizProgress.length)
              : null

            return (
              <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle size={16} className="text-amber-500" />
                    <span className="text-sm font-medium text-gray-900">{quiz.title}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>{quizProgress.length}/{approvedStudents.length} submitted</span>
                    {avgScore != null && (
                      <span className="font-medium text-brand-600">Avg: {avgScore}%</span>
                    )}
                  </div>
                </div>
                {quizProgress.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-sm text-gray-500">No students have taken this quiz yet.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="border-b border-gray-100">
                        <tr>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Student</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Score</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-600">Completed</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {quizProgress.map((p) => {
                          const student = approvedStudents.find((e) => e.user_id === p.user_id)?.user
                          const score = p.score || 0
                          return (
                            <tr key={p.id} className="hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-900">{student?.full_name || student?.email || p.user_id.slice(0, 8)}</td>
                              <td className="px-4 py-2">
                                <div className="flex items-center gap-2">
                                  <div className="w-20 bg-gray-200 rounded-full h-2">
                                    <div
                                      className={`h-2 rounded-full ${score >= 70 ? 'bg-green-500' : score >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                                      style={{ width: `${score}%` }}
                                    />
                                  </div>
                                  <span className={`text-xs font-medium ${score >= 70 ? 'text-green-600' : score >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                                    {score}%
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-2 text-gray-500 text-xs">{new Date(p.completed_at).toLocaleDateString()}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Pending Enrollment Requests */}
      {enrollments.filter((e) => e.status === 'pending').length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Hourglass size={20} className="text-orange-500" />
            Pending Requests ({enrollments.filter((e) => e.status === 'pending').length})
          </h2>
          <div className="bg-white rounded-xl border border-orange-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-orange-50 border-b border-orange-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Requested</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {enrollments.filter((e) => e.status === 'pending').map((en) => (
                    <tr key={en.id} className="hover:bg-orange-50/50">
                      <td className="px-4 py-3 text-gray-900">{en.user?.full_name || '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{en.user?.email || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs">{new Date(en.enrolled_at).toLocaleDateString()}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => approveEnrollment.mutate(en.id)}
                            disabled={approveEnrollment.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle size={14} />
                            Approve
                          </button>
                          <button
                            onClick={() => rejectEnrollment.mutate(en.id)}
                            disabled={rejectEnrollment.isPending}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
                          >
                            <XCircle size={14} />
                            Reject
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Assignments Section */}
      <div className="mt-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Users size={20} />
            Assignments ({enrollments.filter((e) => e.status === 'approved').length})
          </h2>
          <button
            onClick={() => { setShowAssignForm(true); setAssignError('') }}
            className="flex items-center gap-2 bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 text-sm font-medium"
          >
            <Plus size={16} />
            Assign User
          </button>
        </div>

        {/* Assign User Form */}
        {showAssignForm && (
          <div className="bg-brand-50 rounded-xl border border-brand-200 p-4 mb-4">
            {assignError && (
              <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">
                <AlertCircle size={14} />
                {assignError}
              </div>
            )}
            <form
              onSubmit={async (e) => {
                e.preventDefault()
                if (!courseId || !assignForm.user_id || !profile) return
                setAssignError('')
                try {
                  await assignCourse.mutateAsync({
                    user_id: assignForm.user_id,
                    course_id: courseId,
                    deadline: assignForm.deadline || undefined,
                    is_mandatory: assignForm.is_mandatory,
                    assigned_by: profile.id,
                  })
                  setAssignForm({ user_id: '', deadline: '', is_mandatory: false })
                  setShowAssignForm(false)
                } catch (err: unknown) {
                  setAssignError(err instanceof Error ? err.message : 'Failed to assign user')
                }
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
                <select
                  required
                  value={assignForm.user_id}
                  onChange={(e) => setAssignForm({ ...assignForm, user_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select a user...</option>
                  {allUsers
                    .filter((u) => !enrollments.some((en) => en.user_id === u.id))
                    .map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.full_name || u.email} ({u.email})
                      </option>
                    ))}
                </select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deadline (optional)</label>
                  <input
                    type="date"
                    value={assignForm.deadline}
                    onChange={(e) => setAssignForm({ ...assignForm, deadline: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={assignForm.is_mandatory}
                      onChange={(e) => setAssignForm({ ...assignForm, is_mandatory: e.target.checked })}
                      className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    Mandatory
                  </label>
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={assignCourse.isPending}
                  className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium"
                >
                  {assignCourse.isPending ? 'Assigning...' : 'Assign'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAssignForm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Enrollments Table (approved only) */}
        {enrollments.filter((e) => e.status === 'approved').length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
            <p className="text-gray-500">No users assigned to this course yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Deadline</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Enrolled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {enrollments.filter((e) => e.status === 'approved').map((en) => {
                    const deadlineDate = en.deadline ? new Date(en.deadline) : null
                    const now = new Date()
                    const daysUntilDeadline = deadlineDate ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null
                    return (
                      <tr key={en.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-gray-900">{en.user?.full_name || '—'}</td>
                        <td className="px-4 py-3 text-gray-600">{en.user?.email || '—'}</td>
                        <td className="px-4 py-3">
                          {deadlineDate ? (
                            <span className={
                              daysUntilDeadline !== null && daysUntilDeadline <= 0
                                ? 'text-red-600 font-medium'
                                : daysUntilDeadline !== null && daysUntilDeadline <= 7
                                  ? 'text-orange-600 font-medium'
                                  : 'text-gray-700'
                            }>
                              {deadlineDate.toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {en.is_mandatory ? (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Mandatory</span>
                          ) : (
                            <span className="text-gray-400 text-xs">Optional</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">{new Date(en.enrolled_at).toLocaleDateString()}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
