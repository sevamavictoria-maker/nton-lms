import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { QuizQuestion, QuestionType } from '@/types/database'

export function useQuestions(lessonId?: string) {
  return useQuery({
    queryKey: ['questions', lessonId],
    queryFn: async () => {
      if (!lessonId) return []
      const { data, error } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('lesson_id', lessonId)
        .order('order_num')
      if (error) throw error
      return data as QuizQuestion[]
    },
    enabled: !!lessonId,
  })
}

export function useCreateQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (q: {
      lesson_id: string
      question: string
      type: QuestionType
      options: string[]
      correct_answer: string
      order_num: number
    }) => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .insert(q)
        .select()
        .single()
      if (error) throw error
      return data as QuizQuestion
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['questions', vars.lesson_id] })
    },
  })
}

export function useUpdateQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string
      question?: string
      type?: QuestionType
      options?: string[]
      correct_answer?: string
      order_num?: number
    }) => {
      const { data, error } = await supabase
        .from('quiz_questions')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as QuizQuestion
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['questions', data.lesson_id] })
    },
  })
}

export function useDeleteQuestion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, lessonId }: { id: string; lessonId: string }) => {
      const { error } = await supabase
        .from('quiz_questions')
        .delete()
        .eq('id', id)
      if (error) throw error
      return lessonId
    },
    onSuccess: (lessonId) => {
      qc.invalidateQueries({ queryKey: ['questions', lessonId] })
    },
  })
}

export function useSubmitQuiz() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      userId,
      lessonId,
      courseId,
      answers,
      questions,
    }: {
      userId: string
      lessonId: string
      courseId: string
      answers: Record<string, string>
      questions: QuizQuestion[]
    }) => {
      let correct = 0
      for (const q of questions) {
        const userAnswer = (answers[q.id] || '').trim().toLowerCase()
        const correctAnswer = q.correct_answer.trim().toLowerCase()
        if (userAnswer === correctAnswer) correct++
      }
      const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0

      // Upsert progress
      const { error } = await supabase
        .from('progress')
        .upsert(
          {
            user_id: userId,
            lesson_id: lessonId,
            course_id: courseId,
            completed_at: new Date().toISOString(),
            score,
          },
          { onConflict: 'user_id,lesson_id' }
        )
      if (error) throw error

      return { score, correct, total: questions.length }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['progress'] })
      qc.invalidateQueries({ queryKey: ['my-progress'] })
    },
  })
}
