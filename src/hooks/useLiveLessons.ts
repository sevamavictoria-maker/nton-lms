import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { LiveLesson } from '@/types/database'

export function useLiveLessons(courseId?: string) {
  return useQuery({
    queryKey: ['live-lessons', courseId],
    queryFn: async () => {
      if (!courseId) return []
      const { data, error } = await supabase
        .from('live_lessons')
        .select('*')
        .eq('course_id', courseId)
        .order('scheduled_at', { ascending: true })
      if (error) throw error
      return data as LiveLesson[]
    },
    enabled: !!courseId,
  })
}

export function useCreateLiveLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      course_id: string
      title: string
      description?: string
      scheduled_at: string
      duration_minutes: number
      meeting_url?: string
      created_by: string
    }) => {
      const { data, error } = await supabase
        .from('live_lessons')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as LiveLesson
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['live-lessons', vars.course_id] })
    },
  })
}

export function useDeleteLiveLesson() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('live_lessons')
        .delete()
        .eq('id', id)
      if (error) throw error
      return courseId
    },
    onSuccess: (courseId) => {
      qc.invalidateQueries({ queryKey: ['live-lessons', courseId] })
    },
  })
}
