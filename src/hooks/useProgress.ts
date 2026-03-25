import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Progress } from '@/types/database'

export function useMyProgress(userId?: string, courseId?: string) {
  return useQuery({
    queryKey: ['my-progress', userId, courseId],
    queryFn: async () => {
      if (!userId || !courseId) return []
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId)
        .eq('course_id', courseId)
      if (error) throw error
      return data as Progress[]
    },
    enabled: !!userId && !!courseId,
  })
}

export function useAllMyProgress(userId?: string) {
  return useQuery({
    queryKey: ['all-my-progress', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('user_id', userId)
      if (error) throw error
      return data as Progress[]
    },
    enabled: !!userId,
  })
}

export function useCourseProgress(courseId?: string) {
  return useQuery({
    queryKey: ['course-progress', courseId],
    queryFn: async () => {
      if (!courseId) return []
      const { data, error } = await supabase
        .from('progress')
        .select('*')
        .eq('course_id', courseId)
      if (error) throw error
      return data as Progress[]
    },
    enabled: !!courseId,
  })
}

export function useMarkComplete() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, lessonId, courseId, score }: { userId: string; lessonId: string; courseId: string; score?: number }) => {
      const { data, error } = await supabase
        .from('progress')
        .upsert(
          {
            user_id: userId,
            lesson_id: lessonId,
            course_id: courseId,
            completed_at: new Date().toISOString(),
            score: score ?? null,
          },
          { onConflict: 'user_id,lesson_id' }
        )
        .select()
        .single()
      if (error) throw error
      return data as Progress
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['my-progress', vars.userId, vars.courseId] })
      qc.invalidateQueries({ queryKey: ['all-my-progress', vars.userId] })
      qc.invalidateQueries({ queryKey: ['course-progress', vars.courseId] })
      qc.invalidateQueries({ queryKey: ['progress'] })
    },
  })
}
