import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useLesson, useUpdateLesson } from '@/hooks/useLessons'
import { useQuestions, useCreateQuestion, useUpdateQuestion, useDeleteQuestion } from '@/hooks/useQuiz'
import { useAuth } from '@/hooks/useAuth'
import { ArrowLeft, Save, Plus, Trash2, Eye, Edit3, X, Pencil, Check, Download } from 'lucide-react'
import { RichTextEditor } from '@/components/RichTextEditor'
import { ImageUpload } from '@/components/ImageUpload'
import { VideoUpload } from '@/components/VideoUpload'
import { PdfUpload } from '@/components/PdfUpload'
import type { Slide, LessonContent, QuestionType, QuizQuestion } from '@/types/database'

export function LessonEditor() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const { role } = useAuth()
  const basePath = role === 'admin' ? '/admin' : '/instructor'
  const { data: lesson, isLoading } = useLesson(lessonId)
  const updateLesson = useUpdateLesson()

  // Editable title state
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')

  // Slide state
  const [slides, setSlides] = useState<Slide[]>([])
  const [previewMode, setPreviewMode] = useState(false)

  // Quiz state
  const { data: questions = [] } = useQuestions(lesson?.type === 'quiz' ? lessonId : undefined)
  const createQuestion = useCreateQuestion()
  const updateQuestion = useUpdateQuestion()
  const deleteQuestion = useDeleteQuestion()
  const [showQuestionForm, setShowQuestionForm] = useState(false)
  const [editingQuestion, setEditingQuestion] = useState<QuizQuestion | null>(null)
  const [qForm, setQForm] = useState({
    question: '',
    type: 'multiple_choice' as QuestionType,
    options: ['', '', '', ''],
    correct_answer: '',
  })

  useEffect(() => {
    if (lesson?.type === 'slide' && lesson.content_json?.slides) {
      setSlides(lesson.content_json.slides)
    }
  }, [lesson])

  const handleSaveSlides = async () => {
    if (!lessonId) return
    const content_json: LessonContent = { slides }
    await updateLesson.mutateAsync({ id: lessonId, content_json })
  }

  const addSlide = () => {
    setSlides([...slides, { title: `Slide ${slides.length + 1}`, body: '', image_url: '', image_url_2: '', image_url_3: '', background_url: '', video_url: '' }])
  }

  const handleSaveTitle = async () => {
    if (!lessonId || !titleDraft.trim()) return
    await updateLesson.mutateAsync({ id: lessonId, title: titleDraft.trim() })
    setEditingTitle(false)
  }

  const updateSlide = (index: number, field: keyof Slide, value: string) => {
    const updated = [...slides]
    updated[index] = { ...updated[index], [field]: value }
    setSlides(updated)
  }

  const removeSlide = (index: number) => {
    if (slides.length <= 1) return
    setSlides(slides.filter((_, i) => i !== index))
  }

  // Quiz handlers
  const resetQForm = () => {
    setQForm({ question: '', type: 'multiple_choice', options: ['', '', '', ''], correct_answer: '' })
    setEditingQuestion(null)
    setShowQuestionForm(false)
  }

  const startEditQuestion = (q: QuizQuestion) => {
    setEditingQuestion(q)
    setQForm({
      question: q.question,
      type: q.type,
      options: q.type === 'true_false' ? ['True', 'False'] : [...q.options],
      correct_answer: q.correct_answer,
    })
    setShowQuestionForm(true)
  }

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!lessonId) return

    const opts = qForm.type === 'true_false'
      ? ['True', 'False']
      : qForm.type === 'short_answer'
        ? []
        : qForm.options.filter((o) => o.trim())

    if (editingQuestion) {
      await updateQuestion.mutateAsync({
        id: editingQuestion.id,
        question: qForm.question,
        type: qForm.type,
        options: opts,
        correct_answer: qForm.correct_answer,
      })
    } else {
      await createQuestion.mutateAsync({
        lesson_id: lessonId,
        question: qForm.question,
        type: qForm.type,
        options: opts,
        correct_answer: qForm.correct_answer,
        order_num: questions.length + 1,
      })
    }
    resetQForm()
  }

  const handleDeleteQuestion = async (qId: string) => {
    if (!lessonId) return
    if (!confirm('Delete this question?')) return
    await deleteQuestion.mutateAsync({ id: qId, lessonId })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!lesson) {
    return <p className="text-gray-500 text-center py-12">Lesson not found.</p>
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Link to={`${basePath}/courses/${courseId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          {editingTitle ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                autoFocus
                className="text-2xl font-bold text-gray-900 border border-gray-300 rounded-lg px-2 py-1 focus:outline-none focus:ring-2 focus:ring-brand-500 flex-1"
              />
              <button onClick={handleSaveTitle} disabled={updateLesson.isPending} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg">
                <Check size={18} />
              </button>
              <button onClick={() => setEditingTitle(false)} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg">
                <X size={18} />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
              <button onClick={() => { setTitleDraft(lesson.title); setEditingTitle(true) }} className="p-1 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg">
                <Pencil size={16} />
              </button>
            </div>
          )}
          <p className="text-sm text-gray-500 capitalize">{lesson.type} lesson</p>
        </div>
      </div>

      {/* SLIDE EDITOR */}
      {lesson.type === 'slide' && (
        <div>
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
            <div className="flex gap-2">
              <button
                onClick={() => setPreviewMode(false)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  !previewMode ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <span className="flex items-center gap-1"><Edit3 size={14} /> Edit</span>
              </button>
              <button
                onClick={() => setPreviewMode(true)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  previewMode ? 'bg-brand-600 text-white' : 'bg-white text-gray-600 border border-gray-200'
                }`}
              >
                <span className="flex items-center gap-1"><Eye size={14} /> Preview</span>
              </button>
            </div>
            <div className="flex gap-2">
              <button onClick={addSlide}
                className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                <Plus size={14} /> <span className="hidden sm:inline">Add Slide</span><span className="sm:hidden">Add</span>
              </button>
              <PdfUpload onImport={(pdfSlides) => {
                if (slides.length === 1 && slides[0].body === 'Content here...' && slides[0].title === 'Slide 1') {
                  setSlides(pdfSlides)
                } else {
                  setSlides([...slides, ...pdfSlides])
                }
              }} />
              <button onClick={handleSaveSlides} disabled={updateLesson.isPending}
                className="flex items-center gap-1 bg-brand-600 text-white px-3 sm:px-4 py-1.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium">
                <Save size={14} />
                {updateLesson.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          {previewMode ? (
            // Preview mode - slide viewer
            <SlidePreview slides={slides} />
          ) : (
            // Edit mode
            <div className="space-y-4">
              {slides.map((slide, index) => (
                <div key={index} className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">Slide {index + 1}</span>
                    <button onClick={() => removeSlide(index)} disabled={slides.length <= 1}
                      className="text-red-400 hover:text-red-600 disabled:opacity-30">
                      <Trash2 size={16} />
                    </button>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input type="text" value={slide.title}
                        onChange={(e) => updateSlide(index, 'title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Body</label>
                      <RichTextEditor
                        content={slide.body}
                        onChange={(html) => updateSlide(index, 'body', html)}
                        placeholder="Write your slide content here..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Transcript (for AI voice narration)</label>
                      <textarea
                        value={slide.transcript || ''}
                        onChange={(e) => updateSlide(index, 'transcript', e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                        placeholder="Write what the AI voice should read for this slide..."
                      />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <ImageUpload
                        value={slide.image_url || ''}
                        onChange={(url) => updateSlide(index, 'image_url', url)}
                        label="Image 1 (optional)"
                        placeholder="Paste URL or upload"
                      />
                      <ImageUpload
                        value={slide.image_url_2 || ''}
                        onChange={(url) => updateSlide(index, 'image_url_2', url)}
                        label="Image 2 (optional)"
                        placeholder="Paste URL or upload"
                      />
                      <ImageUpload
                        value={slide.image_url_3 || ''}
                        onChange={(url) => updateSlide(index, 'image_url_3', url)}
                        label="Image 3 (optional)"
                        placeholder="Paste URL or upload"
                      />
                      <ImageUpload
                        value={slide.background_url || ''}
                        onChange={(url) => updateSlide(index, 'background_url', url)}
                        label="Background Image (optional)"
                        placeholder="Paste URL or upload"
                      />
                    </div>
                    {slide.background_url && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Background Overlay Opacity: {slide.background_opacity ?? 85}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={slide.background_opacity ?? 85}
                          onChange={(e) => {
                            const updated = [...slides]
                            updated[index] = { ...updated[index], background_opacity: parseInt(e.target.value) }
                            setSlides(updated)
                          }}
                          className="w-full accent-brand-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                          <span>0% (full image)</span>
                          <span>100% (hidden)</span>
                        </div>
                      </div>
                    )}
                    <VideoUpload
                      value={slide.video_url || ''}
                      onChange={(url) => updateSlide(index, 'video_url', url)}
                      label="Video (optional)"
                      placeholder="Paste video URL or upload"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* QUIZ EDITOR */}
      {lesson.type === 'quiz' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Questions ({questions.length})</h2>
            <button
              onClick={() => { resetQForm(); setShowQuestionForm(true) }}
              className="flex items-center gap-2 bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 text-sm font-medium"
            >
              <Plus size={16} /> Add Question
            </button>
          </div>

          {/* Question Form */}
          {showQuestionForm && (
            <div className="bg-brand-50 rounded-xl border border-brand-200 p-5 mb-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-medium text-gray-900">
                  {editingQuestion ? 'Edit Question' : 'New Question'}
                </h3>
                <button onClick={resetQForm} className="text-gray-400 hover:text-gray-600">
                  <X size={18} />
                </button>
              </div>
              <form onSubmit={handleSaveQuestion} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Question</label>
                  <textarea value={qForm.question} rows={2} required
                    onChange={(e) => setQForm({ ...qForm, question: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={qForm.type}
                    onChange={(e) => {
                      const type = e.target.value as QuestionType
                      setQForm({
                        ...qForm,
                        type,
                        options: type === 'true_false' ? ['True', 'False'] : type === 'short_answer' ? [] : ['', '', '', ''],
                        correct_answer: '',
                      })
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="multiple_choice">Multiple Choice</option>
                    <option value="true_false">True / False</option>
                    <option value="short_answer">Short Answer</option>
                  </select>
                </div>

                {qForm.type === 'multiple_choice' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Options</label>
                    <div className="space-y-2">
                      {qForm.options.map((opt, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="correct"
                            checked={qForm.correct_answer === opt && opt !== ''}
                            onChange={() => setQForm({ ...qForm, correct_answer: opt })}
                            className="text-brand-600"
                          />
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => {
                              const newOpts = [...qForm.options]
                              newOpts[i] = e.target.value
                              setQForm({ ...qForm, options: newOpts })
                            }}
                            className="flex-1 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
                            placeholder={`Option ${i + 1}`}
                          />
                        </div>
                      ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Select the radio button next to the correct answer.</p>
                  </div>
                )}

                {qForm.type === 'true_false' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                    <select value={qForm.correct_answer}
                      onChange={(e) => setQForm({ ...qForm, correct_answer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                      <option value="">Select...</option>
                      <option value="True">True</option>
                      <option value="False">False</option>
                    </select>
                  </div>
                )}

                {qForm.type === 'short_answer' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Correct Answer</label>
                    <input type="text" value={qForm.correct_answer} required
                      onChange={(e) => setQForm({ ...qForm, correct_answer: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                      placeholder="Enter the correct answer" />
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <button type="submit"
                    disabled={createQuestion.isPending || updateQuestion.isPending}
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium">
                    {editingQuestion ? 'Update Question' : 'Add Question'}
                  </button>
                  <button type="button" onClick={resetQForm}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Questions List */}
          {questions.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <p className="text-gray-500">No questions yet. Add your first question above.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, index) => (
                <div key={q.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">
                        <span className="text-gray-400 mr-2">Q{index + 1}.</span>
                        {q.question}
                      </p>
                      <p className="text-xs text-gray-500 mt-1 capitalize">{q.type.replace('_', ' ')}</p>
                      {q.options.length > 0 && (
                        <div className="mt-2 space-y-1">
                          {q.options.map((opt, i) => (
                            <p key={i} className={`text-xs px-2 py-1 rounded ${
                              opt === q.correct_answer ? 'bg-green-50 text-green-700 font-medium' : 'text-gray-600'
                            }`}>
                              {String.fromCharCode(65 + i)}. {opt}
                              {opt === q.correct_answer && ' (correct)'}
                            </p>
                          ))}
                        </div>
                      )}
                      {q.type === 'short_answer' && (
                        <p className="text-xs text-green-600 mt-1">Answer: {q.correct_answer}</p>
                      )}
                    </div>
                    <div className="flex gap-1 ml-3">
                      <button onClick={() => startEditQuestion(q)}
                        className="p-1.5 text-gray-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => handleDeleteQuestion(q.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Slide Preview Component
function SlidePreview({ slides }: { slides: Slide[] }) {
  const [current, setCurrent] = useState(0)
  if (slides.length === 0) return <p className="text-gray-500">No slides to preview.</p>
  const slide = slides[current]

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="bg-brand-800 text-white px-6 py-4">
        <h3 className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>{slide.title}</h3>
        <p className="text-brand-200 text-sm">Slide {current + 1} of {slides.length}</p>
      </div>
      <div
        className="p-6 min-h-[400px] sm:min-h-[600px] bg-contain bg-center bg-no-repeat relative"
        style={slide.background_url ? { backgroundImage: `url(${slide.background_url})` } : undefined}
      >
        {slide.background_url && <div className="absolute inset-0 bg-white" style={{ opacity: (slide.background_opacity ?? 85) / 100 }} />}
        <div className="relative">
          {slide.video_url && (
            <video src={slide.video_url} controls playsInline preload="metadata" className="w-full rounded-lg mb-4 bg-black" />
          )}
          {(slide.image_url || slide.image_url_2 || slide.image_url_3) && (
            <div className={`mb-4 gap-3 ${
              [slide.image_url, slide.image_url_2, slide.image_url_3].filter(Boolean).length > 1
                ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                : 'flex justify-center'
            }`}>
              {slide.image_url && (
                <div className="relative group">
                  <img src={slide.image_url} alt="" className="max-h-48 rounded-lg object-contain mx-auto block" />
                  <a href={slide.image_url} download target="_blank" rel="noopener noreferrer"
                    className="absolute top-2 right-2 p-1.5 bg-brand-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Download image">
                    <Download size={14} />
                  </a>
                </div>
              )}
              {slide.image_url_2 && (
                <div className="relative group">
                  <img src={slide.image_url_2} alt="" className="max-h-48 rounded-lg object-contain mx-auto block" />
                  <a href={slide.image_url_2} download target="_blank" rel="noopener noreferrer"
                    className="absolute top-2 right-2 p-1.5 bg-brand-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Download image">
                    <Download size={14} />
                  </a>
                </div>
              )}
              {slide.image_url_3 && (
                <div className="relative group">
                  <img src={slide.image_url_3} alt="" className="max-h-48 rounded-lg object-contain mx-auto block" />
                  <a href={slide.image_url_3} download target="_blank" rel="noopener noreferrer"
                    className="absolute top-2 right-2 p-1.5 bg-brand-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Download image">
                    <Download size={14} />
                  </a>
                </div>
              )}
            </div>
          )}
          <div className="prose prose-sm max-w-none text-gray-700" dangerouslySetInnerHTML={{ __html: slide.body }} />
        </div>
      </div>
      <div className="px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-200 flex items-center justify-between gap-2">
        <button
          onClick={() => setCurrent(Math.max(0, current - 1))}
          disabled={current === 0}
          className="px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm disabled:opacity-30 hover:bg-gray-50"
        >
          Prev
        </button>
        <div className="flex gap-1 sm:gap-1.5 flex-wrap justify-center">
          {slides.map((_, i) => (
            <button key={i} onClick={() => setCurrent(i)}
              className={`w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full transition-colors ${
                i === current ? 'bg-brand-600' : 'bg-gray-300'
              }`} />
          ))}
        </div>
        <button
          onClick={() => setCurrent(Math.min(slides.length - 1, current + 1))}
          disabled={current === slides.length - 1}
          className="px-3 py-1.5 sm:px-4 sm:py-2 bg-brand-600 text-white rounded-lg text-xs sm:text-sm disabled:opacity-30 hover:bg-brand-700"
        >
          Next
        </button>
      </div>
    </div>
  )
}
