import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useCourse } from '@/hooks/useCourses'
import { useLessons } from '@/hooks/useLessons'
import { useMyProgress } from '@/hooks/useProgress'
import { useMyCertificates, useIssueCertificate } from '@/hooks/useCertificates'
import { useMyEnrollments, useEnroll } from '@/hooks/useEnrollments'
import { useLiveLessons } from '@/hooks/useLiveLessons'
import { useCourseFiles } from '@/hooks/useCourseFiles'
import { ArrowLeft, CheckCircle, FileText, HelpCircle, Award, Lock, Hourglass, Plus, Video, Calendar, Clock, Link as LinkIcon, Download, File } from 'lucide-react'
import { CourseQA } from '@/components/CourseQA'

export function CourseView() {
  const { courseId } = useParams<{ courseId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { data: course, isLoading: courseLoading } = useCourse(courseId)
  const { data: lessons = [], isLoading: lessonsLoading } = useLessons(courseId)
  const { data: progress = [] } = useMyProgress(profile?.id, courseId)
  const { data: myCerts = [] } = useMyCertificates(profile?.id)
  const { data: enrollments = [] } = useMyEnrollments(profile?.id)
  const issueCertificate = useIssueCertificate()
  const enroll = useEnroll()
  const { data: liveLessons = [] } = useLiveLessons(courseId)
  const { data: courseFiles = [] } = useCourseFiles(courseId)

  // Find enrollment for this course
  const enrollment = enrollments.find((e) => e.course_id === courseId)
  const isPending = enrollment?.status === 'pending'
  const isRejected = enrollment?.status === 'rejected'

  const completedLessonIds = new Set(progress.map((p) => p.lesson_id))
  const allCompleted = lessons.length > 0 && lessons.every((l) => completedLessonIds.has(l.id))
  const hasCert = myCerts.some((c) => c.course_id === courseId)
  const progressPct = lessons.length > 0 ? Math.round((completedLessonIds.size / lessons.length) * 100) : 0

  const handleGetCertificate = async () => {
    if (!profile || !courseId) return
    await issueCertificate.mutateAsync({ userId: profile.id, courseId })
  }

  const handleRequestEnrollment = async () => {
    if (!profile || !courseId) return
    await enroll.mutateAsync({ userId: profile.id, courseId })
  }

  if (courseLoading || lessonsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!course) {
    return <p className="text-gray-500 text-center py-12">Course not found.</p>
  }

  // Not enrolled — show course info + request enrollment button
  if (!enrollment || isRejected) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Link to="/learner" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            {course.instructor && (
              <p className="text-sm text-gray-500">by {course.instructor.full_name}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {course.cover_url && (
              <img src={course.cover_url} alt={course.title} className="w-full md:w-48 h-32 object-cover rounded-lg" />
            )}
            <div className="flex-1">
              {course.description && <p className="text-gray-600 text-sm mb-4">{course.description}</p>}
              <div className="flex items-center gap-4 mb-4">
                {course.category && (
                  <span className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full">{course.category}</span>
                )}
                <span className="text-xs text-gray-500">{lessons.length} lessons</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200 text-center">
            <Lock className="mx-auto text-gray-400 mb-2" size={32} />
            <p className="text-sm font-medium text-gray-700 mb-1">Enrollment required</p>
            <p className="text-xs text-gray-500 mb-4">You need to be enrolled and approved to access the lessons in this course.</p>
            {isRejected ? (
              <p className="text-sm text-red-600 font-medium">Your enrollment request was declined.</p>
            ) : (
              <button
                onClick={handleRequestEnrollment}
                disabled={enroll.isPending}
                className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium"
              >
                <Plus size={16} />
                {enroll.isPending ? 'Requesting...' : 'Request Enrollment'}
              </button>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Pending — show course info + waiting message
  if (isPending) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-6">
          <Link to="/learner" className="text-gray-400 hover:text-gray-600">
            <ArrowLeft size={20} />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
            {course.instructor && (
              <p className="text-sm text-gray-500">by {course.instructor.full_name}</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex flex-col md:flex-row gap-6">
            {course.cover_url && (
              <img src={course.cover_url} alt={course.title} className="w-full md:w-48 h-32 object-cover rounded-lg" />
            )}
            <div className="flex-1">
              {course.description && <p className="text-gray-600 text-sm mb-4">{course.description}</p>}
              <div className="flex items-center gap-4 mb-4">
                {course.category && (
                  <span className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full">{course.category}</span>
                )}
                <span className="text-xs text-gray-500">{lessons.length} lessons</span>
              </div>
            </div>
          </div>

          <div className="mt-6 p-4 bg-orange-50 rounded-lg border border-orange-200 text-center">
            <Hourglass className="mx-auto text-orange-500 mb-2" size={32} />
            <p className="text-sm font-medium text-orange-800 mb-1">Enrollment Pending</p>
            <p className="text-xs text-orange-600">Your enrollment request is awaiting approval from the instructor or admin.</p>
          </div>
        </div>
      </div>
    )
  }

  // Approved — show full course with lessons
  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to="/learner" className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{course.title}</h1>
          {course.instructor && (
            <p className="text-sm text-gray-500">by {course.instructor.full_name}</p>
          )}
        </div>
      </div>

      {/* Course Info Card */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex flex-col md:flex-row gap-6">
          {course.cover_url && (
            <img src={course.cover_url} alt={course.title} className="w-full md:w-48 h-32 object-cover rounded-lg" />
          )}
          <div className="flex-1">
            {course.description && <p className="text-gray-600 text-sm mb-4">{course.description}</p>}
            <div className="flex items-center gap-4 mb-4">
              {course.category && (
                <span className="text-xs bg-brand-50 text-brand-700 px-2 py-1 rounded-full">{course.category}</span>
              )}
              <span className="text-xs text-gray-500">{lessons.length} lessons</span>
            </div>
            <div className="mb-2">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-gray-600">Progress</span>
                <span className="font-medium text-brand-600">{progressPct}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-brand-500 h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Certificate */}
        {allCompleted && !hasCert && (
          <div className="mt-4 p-4 bg-brand-50 rounded-lg border border-brand-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="text-brand-600" size={20} />
                <p className="text-sm font-medium text-brand-800">
                  Congratulations! You've completed all lessons.
                </p>
              </div>
              <button
                onClick={handleGetCertificate}
                disabled={issueCertificate.isPending}
                className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium"
              >
                {issueCertificate.isPending ? 'Issuing...' : 'Get Certificate'}
              </button>
            </div>
          </div>
        )}

        {hasCert && (
          <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
            <div className="flex items-center gap-2">
              <Award className="text-green-600" size={20} />
              <p className="text-sm font-medium text-green-800">Certificate earned!</p>
              <Link to="/learner/certificates" className="text-sm text-green-600 hover:text-green-700 ml-auto">
                View Certificates
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Lessons List */}
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Lessons</h2>
      {lessons.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No lessons available yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {lessons.map((lesson, index) => {
            const isCompleted = completedLessonIds.has(lesson.id)
            const lessonProgress = progress.find((p) => p.lesson_id === lesson.id)

            return (
              <Link
                key={lesson.id}
                to={`/learner/courses/${courseId}/lessons/${lesson.id}`}
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow block"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                  isCompleted
                    ? 'bg-green-100 text-green-600'
                    : lesson.type === 'slide'
                      ? 'bg-blue-100 text-blue-600'
                      : 'bg-amber-100 text-amber-600'
                }`}>
                  {isCompleted ? (
                    <CheckCircle size={20} />
                  ) : lesson.type === 'slide' ? (
                    <FileText size={20} />
                  ) : (
                    <HelpCircle size={20} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{index + 1}. {lesson.title}</p>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-gray-500 capitalize">{lesson.type}</p>
                    {lessonProgress?.score != null && (
                      <span className="text-xs bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full">
                        Score: {lessonProgress.score}%
                      </span>
                    )}
                  </div>
                </div>
                {isCompleted && (
                  <span className="text-xs text-green-600 font-medium shrink-0">Completed</span>
                )}
              </Link>
            )
          })}
        </div>
      )}

      {/* Upcoming Live Sessions */}
      {liveLessons.filter((ll) => new Date(ll.scheduled_at) >= new Date()).length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Video size={20} className="text-brand-600" />
            Upcoming Live Sessions
          </h2>
          <div className="space-y-2">
            {liveLessons
              .filter((ll) => new Date(ll.scheduled_at) >= new Date())
              .map((ll) => {
                const dt = new Date(ll.scheduled_at)
                return (
                  <div key={ll.id} className="bg-white rounded-xl border border-brand-200 p-4 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-brand-100 text-brand-600">
                      <Video size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{ll.title}</p>
                      <div className="flex items-center gap-3 text-xs text-gray-500">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {dt.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock size={12} />
                          {dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })} ({ll.duration_minutes}min)
                        </span>
                      </div>
                      {ll.description && <p className="text-xs text-gray-500 mt-1">{ll.description}</p>}
                    </div>
                    {ll.meeting_url && (
                      <a
                        href={ll.meeting_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700"
                      >
                        <LinkIcon size={14} />
                        Join
                      </a>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      )}

      {/* Downloadable Files */}
      {courseFiles.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Download size={20} className="text-brand-600" />
            Downloads
          </h2>
          <div className="space-y-2">
            {courseFiles.map((cf) => (
              <a
                key={cf.id}
                href={cf.file_url}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-white rounded-xl border border-gray-200 p-4 flex items-center gap-4 hover:shadow-sm transition-shadow block"
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-100 text-blue-600 shrink-0">
                  <File size={20} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{cf.file_name}</p>
                  <p className="text-xs text-gray-500">
                    {cf.file_size ? `${(cf.file_size / 1024).toFixed(0)} KB` : ''}
                  </p>
                </div>
                <span className="text-brand-600 shrink-0">
                  <Download size={18} />
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Course Q&A Chat */}
      <CourseQA
        courseTitle={course.title}
        lessons={lessons}
        onGoToSlide={(lessonId, _slideIndex) => {
          navigate(`/learner/courses/${courseId}/lessons/${lessonId}`)
        }}
      />
    </div>
  )
}
