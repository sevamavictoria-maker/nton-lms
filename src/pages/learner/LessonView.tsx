import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { useLesson } from '@/hooks/useLessons'
import { useQuestions, useSubmitQuiz } from '@/hooks/useQuiz'
import { useMarkComplete } from '@/hooks/useProgress'
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle, FileText, ChevronDown, Download, RotateCcw } from 'lucide-react'
import DOMPurify from 'dompurify'
import { TextToSpeech } from '@/components/TextToSpeech'
import type { Slide, QuizQuestion } from '@/types/database'

export function LessonView() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { data: lesson, isLoading } = useLesson(lessonId)
  const { data: questions = [] } = useQuestions(lesson?.type === 'quiz' ? lessonId : undefined)
  const markComplete = useMarkComplete()
  const submitQuiz = useSubmitQuiz()

  // Slide viewer state
  const [currentSlide, setCurrentSlide] = useState(0)
  const [slideCompleted, setSlideCompleted] = useState(false)
  const [fadeIn, setFadeIn] = useState(true)
  const [showTranscript, setShowTranscript] = useState(false)

  const goToSlide = (index: number) => {
    setFadeIn(false)
    setTimeout(() => {
      setCurrentSlide(index)
      setFadeIn(true)
    }, 250)
  }

  // Quiz state
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [quizSubmitted, setQuizSubmitted] = useState(false)
  const [quizResult, setQuizResult] = useState<{ score: number; correct: number; total: number; attemptCount: number } | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  // Time tracking — start timer when page mounts
  const startTimeRef = useRef(Date.now())

  const slides: Slide[] = lesson?.type === 'slide' && lesson.content_json?.slides ? lesson.content_json.slides : []

  // Mark slide complete when reaching last slide
  useEffect(() => {
    if (lesson?.type === 'slide' && slides.length > 0 && currentSlide === slides.length - 1) {
      setSlideCompleted(true)
    }
  }, [currentSlide, slides.length, lesson?.type])

  const handleMarkSlideComplete = async () => {
    if (!profile || !lessonId || !courseId) return
    const timeSpentMinutes = Math.round((Date.now() - startTimeRef.current) / 60000)
    await markComplete.mutateAsync({ userId: profile.id, lessonId, courseId, timeSpentMinutes })
    navigate(`/learner/courses/${courseId}`)
  }

  const handleSubmitQuiz = async () => {
    if (!profile || !lessonId || !courseId) return
    const timeSpentMinutes = Math.round((Date.now() - startTimeRef.current) / 60000)
    const result = await submitQuiz.mutateAsync({
      userId: profile.id,
      lessonId,
      courseId,
      answers,
      questions,
      timeSpentMinutes,
    })
    setQuizResult(result)
    setQuizSubmitted(true)
    setShowFeedback(true)
  }

  const handleRetakeQuiz = () => {
    setQuizSubmitted(false)
    setQuizResult(null)
    setShowFeedback(false)
    setCurrentQuestion(0)
    setAnswers({})
    startTimeRef.current = Date.now()
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
        <Link to={`/learner/courses/${courseId}`} className="text-gray-400 hover:text-gray-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{lesson.title}</h1>
          <p className="text-sm text-gray-500 capitalize">{lesson.type} lesson</p>
        </div>
      </div>

      {/* SLIDE VIEWER */}
      {lesson.type === 'slide' && slides.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Slide content with transition */}
          <div className="relative">
            <div
              className={`transition-all duration-500 ease-in-out ${fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
            >
              <div className="bg-gradient-to-r from-brand-800 to-brand-900 text-white px-4 py-4 sm:px-8 sm:py-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg sm:text-2xl font-bold truncate" style={{ fontFamily: 'var(--font-heading)' }}>{slides[currentSlide].title}</h2>
                    <p className="text-brand-300 text-xs sm:text-sm mt-1">Slide {currentSlide + 1} of {slides.length}</p>
                  </div>
                  <div className="relative shrink-0 ml-2">
                    <TextToSpeech
                      text={slides[currentSlide].transcript || `${slides[currentSlide].title}. ${slides[currentSlide].body}`}
                      autoStop
                    />
                  </div>
                </div>
              </div>
              <div
                className="p-4 sm:p-8 min-h-[400px] sm:min-h-[600px] bg-contain bg-center bg-no-repeat relative"
                style={slides[currentSlide].background_url ? { backgroundImage: `url(${slides[currentSlide].background_url})` } : undefined}
              >
                {slides[currentSlide].background_url && <div className="absolute inset-0 bg-white" style={{ opacity: (slides[currentSlide].background_opacity ?? 85) / 100 }} />}
                <div className="relative">
                  {slides[currentSlide].video_url && (
                    <div className="mb-6">
                      <video
                        src={slides[currentSlide].video_url}
                        controls
                        playsInline
                        preload="metadata"
                        className="w-full rounded-lg bg-black"
                      />
                      <p className="text-xs text-gray-400 mt-1">Supported formats: MP4 (H.264), WebM. If video does not play, try re-uploading in MP4 format.</p>
                    </div>
                  )}
                  {(slides[currentSlide].image_url || slides[currentSlide].image_url_2 || slides[currentSlide].image_url_3) && (
                    <div className={`mb-6 gap-3 ${
                      [slides[currentSlide].image_url, slides[currentSlide].image_url_2, slides[currentSlide].image_url_3].filter(Boolean).length > 1
                        ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
                        : 'flex justify-center'
                    }`}>
                      {slides[currentSlide].image_url && (
                        <div className="relative group">
                          <img src={slides[currentSlide].image_url} alt="" className="max-h-56 rounded-lg object-contain mx-auto block" />
                          <a href={slides[currentSlide].image_url} download target="_blank" rel="noopener noreferrer"
                            className="absolute top-2 right-2 p-1.5 bg-brand-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Download image">
                            <Download size={14} />
                          </a>
                        </div>
                      )}
                      {slides[currentSlide].image_url_2 && (
                        <div className="relative group">
                          <img src={slides[currentSlide].image_url_2} alt="" className="max-h-56 rounded-lg object-contain mx-auto block" />
                          <a href={slides[currentSlide].image_url_2} download target="_blank" rel="noopener noreferrer"
                            className="absolute top-2 right-2 p-1.5 bg-brand-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Download image">
                            <Download size={14} />
                          </a>
                        </div>
                      )}
                      {slides[currentSlide].image_url_3 && (
                        <div className="relative group">
                          <img src={slides[currentSlide].image_url_3} alt="" className="max-h-56 rounded-lg object-contain mx-auto block" />
                          <a href={slides[currentSlide].image_url_3} download target="_blank" rel="noopener noreferrer"
                            className="absolute top-2 right-2 p-1.5 bg-brand-600 text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" title="Download image">
                            <Download size={14} />
                          </a>
                        </div>
                      )}
                    </div>
                  )}
                  <div className="prose prose-sm max-w-none text-brand-800 leading-relaxed text-base"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(slides[currentSlide].body || '') }} />

                </div>
              </div>
            </div>
          </div>

          {/* Progress dots */}
          <div className="px-4 sm:px-8 py-2 flex justify-center gap-1.5 sm:gap-2 flex-wrap">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => goToSlide(i)}
                className={`w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full transition-all duration-300 ${
                  i === currentSlide ? 'bg-brand-600 scale-110' : i < currentSlide ? 'bg-brand-300' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>

          {/* Navigation */}
          <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-gray-200 flex items-center justify-between gap-2">
            <button
              onClick={() => goToSlide(Math.max(0, currentSlide - 1))}
              disabled={currentSlide === 0}
              className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft size={14} /> <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
            </button>

            {slideCompleted && currentSlide === slides.length - 1 ? (
              <button
                onClick={handleMarkSlideComplete}
                disabled={markComplete.isPending}
                className="flex items-center gap-1 bg-brand-600 text-white px-3 py-1.5 sm:px-6 sm:py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-xs sm:text-sm font-medium transition-colors"
              >
                <CheckCircle size={14} />
                {markComplete.isPending ? 'Saving...' : 'Complete'}
              </button>
            ) : (
              <button
                onClick={() => goToSlide(Math.min(slides.length - 1, currentSlide + 1))}
                disabled={currentSlide === slides.length - 1}
                className="flex items-center gap-1 bg-brand-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm disabled:opacity-30 hover:bg-brand-700 transition-colors"
              >
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>

          {/* Transcript Accordion — pinned to bottom */}
          {slides[currentSlide].transcript && (
            <div className="border-t border-gray-200">
              <button
                onClick={() => setShowTranscript(!showTranscript)}
                className="w-full flex items-center justify-between px-4 sm:px-8 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <span className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <FileText size={14} />
                  Transcript
                </span>
                <ChevronDown size={16} className={`text-gray-400 transition-transform duration-200 ${showTranscript ? 'rotate-180' : ''}`} />
              </button>
              {showTranscript && (
                <div className="px-4 sm:px-8 py-3 bg-white border-t border-gray-200">
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{slides[currentSlide].transcript}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {lesson.type === 'slide' && slides.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No slides in this lesson yet.</p>
        </div>
      )}

      {/* QUIZ VIEWER */}
      {lesson.type === 'quiz' && questions.length > 0 && !quizSubmitted && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-brand-700 to-brand-800 text-white px-4 py-4 sm:px-8 sm:py-6">
            <h2 className="text-lg sm:text-xl font-bold">Question {currentQuestion + 1} of {questions.length}</h2>
            <div className="flex gap-1 sm:gap-1.5 mt-3">
              {questions.map((_, i) => (
                <div key={i} className={`h-1.5 flex-1 rounded-full ${
                  answers[questions[i].id] ? 'bg-brand-300' : i === currentQuestion ? 'bg-white' : 'bg-brand-600'
                }`} />
              ))}
            </div>
          </div>

          <div className="p-4 sm:p-8 min-h-[250px] sm:min-h-[300px]">
            <QuestionCard
              question={questions[currentQuestion]}
              answer={answers[questions[currentQuestion].id] || ''}
              onAnswer={(val) => setAnswers({ ...answers, [questions[currentQuestion].id]: val })}
            />
          </div>

          <div className="px-4 sm:px-8 py-3 sm:py-4 border-t border-gray-200 flex items-center justify-between gap-2">
            <button
              onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
              disabled={currentQuestion === 0}
              className="flex items-center gap-1 px-3 py-1.5 sm:px-4 sm:py-2 border border-gray-300 rounded-lg text-xs sm:text-sm disabled:opacity-30 hover:bg-gray-50"
            >
              <ChevronLeft size={14} /> <span className="hidden sm:inline">Previous</span><span className="sm:hidden">Prev</span>
            </button>

            {currentQuestion === questions.length - 1 ? (
              <button
                onClick={handleSubmitQuiz}
                disabled={submitQuiz.isPending || Object.keys(answers).length < questions.length}
                className="bg-brand-600 text-white px-3 py-1.5 sm:px-6 sm:py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-xs sm:text-sm font-medium"
              >
                {submitQuiz.isPending ? 'Submitting...' : 'Submit Quiz'}
              </button>
            ) : (
              <button
                onClick={() => setCurrentQuestion(Math.min(questions.length - 1, currentQuestion + 1))}
                className="flex items-center gap-1 bg-brand-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm hover:bg-brand-700"
              >
                Next <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Quiz Results */}
      {quizSubmitted && quizResult && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className={`px-8 py-8 text-center ${quizResult.score >= 70 ? 'bg-green-50' : 'bg-amber-50'}`}>
            <div className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4 ${
              quizResult.score >= 70 ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
            }`}>
              <span className="text-2xl font-bold">{quizResult.score}%</span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {quizResult.score >= 70 ? 'Great job!' : 'Keep practicing!'}
            </h2>
            <p className="text-gray-600">
              You got {quizResult.correct} out of {quizResult.total} questions correct.
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Attempt #{quizResult.attemptCount}
            </p>
          </div>

          {/* Show feedback for each question */}
          {showFeedback && (
            <div className="p-6 space-y-4">
              {questions.map((q, i) => {
                const userAnswer = (answers[q.id] || '').trim().toLowerCase()
                const isCorrect = userAnswer === q.correct_answer.trim().toLowerCase()
                return (
                  <div key={q.id} className={`p-4 rounded-lg border ${isCorrect ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}>
                    <div className="flex items-start gap-2">
                      {isCorrect ? (
                        <CheckCircle className="text-green-500 shrink-0 mt-0.5" size={18} />
                      ) : (
                        <XCircle className="text-red-500 shrink-0 mt-0.5" size={18} />
                      )}
                      <div>
                        <p className="text-sm font-medium text-gray-900">Q{i + 1}. {q.question}</p>
                        <p className="text-xs mt-1">
                          <span className="text-gray-500">Your answer: </span>
                          <span className={isCorrect ? 'text-green-600' : 'text-red-600'}>{answers[q.id] || '(no answer)'}</span>
                        </p>
                        {!isCorrect && (
                          <p className="text-xs mt-0.5">
                            <span className="text-gray-500">Correct answer: </span>
                            <span className="text-green-600">{q.correct_answer}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          <div className="px-8 py-4 border-t border-gray-200 flex items-center justify-center gap-3">
            <button
              onClick={handleRetakeQuiz}
              className="flex items-center gap-1.5 border border-brand-300 text-brand-600 px-5 py-2 rounded-lg hover:bg-brand-50 text-sm font-medium"
            >
              <RotateCcw size={14} />
              Retake Quiz
            </button>
            <Link
              to={`/learner/courses/${courseId}`}
              className="bg-brand-600 text-white px-6 py-2 rounded-lg hover:bg-brand-700 text-sm font-medium"
            >
              Back to Course
            </Link>
          </div>
        </div>
      )}

      {lesson.type === 'quiz' && questions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No questions in this quiz yet.</p>
        </div>
      )}
    </div>
  )
}

// Question Card Component
function QuestionCard({
  question,
  answer,
  onAnswer,
}: {
  question: QuizQuestion
  answer: string
  onAnswer: (val: string) => void
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-6">{question.question}</h3>

      {question.type === 'multiple_choice' && (
        <div className="space-y-3">
          {question.options.map((opt, i) => (
            <button
              key={i}
              onClick={() => onAnswer(opt)}
              className={`w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all ${
                answer === opt
                  ? 'border-brand-500 bg-brand-50 text-brand-700 font-medium'
                  : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              <span className="inline-flex items-center gap-3">
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  answer === opt ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-500'
                }`}>
                  {String.fromCharCode(65 + i)}
                </span>
                {opt}
              </span>
            </button>
          ))}
        </div>
      )}

      {question.type === 'true_false' && (
        <div className="flex gap-4">
          {['True', 'False'].map((opt) => (
            <button
              key={opt}
              onClick={() => onAnswer(opt)}
              className={`flex-1 px-6 py-4 rounded-xl border-2 text-sm font-medium transition-all ${
                answer === opt
                  ? 'border-brand-500 bg-brand-50 text-brand-700'
                  : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50 text-gray-700'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}

      {question.type === 'short_answer' && (
        <input
          type="text"
          value={answer}
          onChange={(e) => onAnswer(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent text-sm"
          placeholder="Type your answer here..."
        />
      )}
    </div>
  )
}
