import { useState } from 'react'
import { MessageCircle, Send, BookOpen, X, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Lesson, Slide } from '@/types/database'

interface Props {
  courseTitle: string
  lessons: Lesson[]
  onGoToSlide?: (lessonId: string, slideIndex: number) => void
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  slideRefs?: { lessonId: string; lessonTitle: string; slideIndex: number; slideTitle: string }[]
}

export function CourseQA({ courseTitle, lessons, onGoToSlide }: Props) {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(false)

  // Build context from all slides
  const buildContext = () => {
    const slides: { lessonId: string; lessonTitle: string; slideIndex: number; slideTitle: string; body: string }[] = []
    for (const lesson of lessons) {
      if (lesson.type !== 'slide') continue
      const content = lesson.content_json as { slides?: Slide[] }
      if (!content?.slides) continue
      content.slides.forEach((slide, i) => {
        // Strip HTML tags for clean text
        const cleanBody = slide.body.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
        slides.push({
          lessonId: lesson.id,
          lessonTitle: lesson.title,
          slideIndex: i,
          slideTitle: slide.title,
          body: cleanBody,
        })
      })
    }
    return slides
  }

  const handleAsk = async () => {
    if (!input.trim() || loading) return
    const question = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: question }])
    setLoading(true)

    try {
      const allSlides = buildContext()
      const slideContext = allSlides.map((s, i) =>
        `[Slide ${i + 1} - Lesson: "${s.lessonTitle}", Slide: "${s.slideTitle}"]\n${s.body}`
      ).join('\n\n')

      const { data, error } = await supabase.functions.invoke('ask-ai', {
        body: {
          question,
          courseTitle,
          slideContext,
          slideMap: allSlides.map((s, i) => ({
            index: i + 1,
            lessonId: s.lessonId,
            lessonTitle: s.lessonTitle,
            slideIndex: s.slideIndex,
            slideTitle: s.slideTitle,
          })),
        },
      })

      if (error) throw error

      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.answer || 'Sorry, I could not find an answer.',
        slideRefs: data.slideRefs || [],
      }])
    } catch {
      // Fallback to local search if Edge Function not available
      const allSlides = buildContext()
      const words = question.toLowerCase().split(/\s+/)
      const matches = allSlides
        .map((slide) => {
          const text = `${slide.slideTitle} ${slide.body}`.toLowerCase()
          const score = words.filter((w) => text.includes(w)).length
          return { ...slide, score }
        })
        .filter((s) => s.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)

      if (matches.length > 0) {
        const answer = matches.map((m) =>
          `Found in **${m.lessonTitle}** → Slide: "${m.slideTitle}":\n${m.body.substring(0, 200)}...`
        ).join('\n\n')

        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: answer,
          slideRefs: matches.map((m) => ({
            lessonId: m.lessonId,
            lessonTitle: m.lessonTitle,
            slideIndex: m.slideIndex,
            slideTitle: m.slideTitle,
          })),
        }])
      } else {
        setMessages((prev) => [...prev, {
          role: 'assistant',
          content: 'I couldn\'t find relevant information in the course materials for your question. Try rephrasing or asking about a specific topic covered in the lessons.',
        }])
      }
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-brand-900 text-white rounded-full shadow-lg hover:bg-brand-800 transition-colors flex items-center justify-center z-50"
        title="Ask a question"
      >
        <MessageCircle size={24} />
      </button>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 w-96 max-h-[600px] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col z-50">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-brand-900 text-white rounded-t-xl">
        <div className="flex items-center gap-2">
          <MessageCircle size={18} />
          <span className="font-medium text-sm" style={{ fontFamily: 'var(--font-heading)' }}>Course Assistant</span>
        </div>
        <button onClick={() => setOpen(false)} className="text-brand-300 hover:text-white">
          <X size={18} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[400px]">
        {messages.length === 0 && (
          <div className="text-center py-6">
            <MessageCircle size={32} className="mx-auto text-brand-300 mb-2" />
            <p className="text-sm text-brand-400">Ask anything about this course.</p>
            <p className="text-xs text-gray-400 mt-1">I'll find the answer and tell you which slide it's on.</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
              msg.role === 'user'
                ? 'bg-brand-900 text-white'
                : 'bg-brand-50 text-brand-800 border border-brand-100'
            }`}>
              <div className="whitespace-pre-wrap">{msg.content}</div>
              {msg.slideRefs && msg.slideRefs.length > 0 && (
                <div className="mt-2 space-y-1">
                  {msg.slideRefs.map((ref, j) => (
                    <button
                      key={j}
                      onClick={() => onGoToSlide?.(ref.lessonId, ref.slideIndex)}
                      className="flex items-center gap-1 text-xs text-brand-600 hover:text-brand-800 hover:underline"
                    >
                      <BookOpen size={12} />
                      {ref.lessonTitle} → Slide {ref.slideIndex + 1}: {ref.slideTitle}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-brand-50 border border-brand-100 rounded-lg px-3 py-2">
              <Loader2 size={16} className="animate-spin text-brand-500" />
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-gray-200">
        <form onSubmit={(e) => { e.preventDefault(); handleAsk() }} className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about this course..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="p-2 bg-brand-900 text-white rounded-lg hover:bg-brand-800 disabled:opacity-30 transition-colors"
          >
            <Send size={16} />
          </button>
        </form>
      </div>
    </div>
  )
}
