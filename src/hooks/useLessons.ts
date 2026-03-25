import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Lesson, LessonType, LessonContent } from '@/types/database'

export function useLessons(courseId?: string) {
  return useQuery({
    queryKey: ['lessons', courseId],
    queryFn: async () => {
      if (!courseId) return []
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('order_num')
      if (error) throw error
      return data as Lesson[]
    },
    enabled: !!courseId,
  })
}

export function useLesson(lessonId?: string) {
  return useQuery({
    queryKey: ['lesson', lessonId],
    queryFn: async () => {
      if (!lessonId) return null
      const { data, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', lessonId)
        .single()
      if (error) throw error
      return data as Lesson
    },
    enabled: !!lessonId,
  })
}

export function useCreateLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (lesson: { course_id: string; title: string; type: LessonType; order_num: number }) => {
      const content_json: LessonContent = lesson.type === 'slide'
        ? { slides: [{ title: 'Slide 1', body: 'Content here...', image_url: '' }] }
        : { slides: [] }

      const { data, error } = await supabase
        .from('lessons')
        .insert({
          course_id: lesson.course_id,
          title: lesson.title,
          type: lesson.type,
          order_num: lesson.order_num,
          content_json,
        })
        .select()
        .single()
      if (error) throw error
      return data as Lesson
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['lessons', vars.course_id] })
    },
  })
}

export function useUpdateLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; content_json?: LessonContent; order_num?: number }) => {
      const { data, error } = await supabase
        .from('lessons')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Lesson
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['lessons', data.course_id] })
      qc.invalidateQueries({ queryKey: ['lesson', data.id] })
    },
  })
}

export function useDeleteLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('lessons')
        .delete()
        .eq('id', id)
      if (error) throw error
      return courseId
    },
    onSuccess: (courseId) => {
      qc.invalidateQueries({ queryKey: ['lessons', courseId] })
    },
  })
}

export function useReorderLessons() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ courseId, lessons }: { courseId: string; lessons: { id: string; order_num: number }[] }) => {
      for (const l of lessons) {
        await supabase
          .from('lessons')
          .update({ order_num: l.order_num })
          .eq('id', l.id)
      }
      return courseId
    },
    onSuccess: (courseId) => {
      qc.invalidateQueries({ queryKey: ['lessons', courseId] })
    },
  })
}
