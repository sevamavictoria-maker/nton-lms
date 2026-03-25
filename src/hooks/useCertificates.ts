import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Certificate } from '@/types/database'

export function useMyCertificates(userId?: string) {
  return useQuery({
    queryKey: ['my-certificates', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('certificates')
        .select('*, course:courses(id, title, category), user:profiles(id, full_name, email)')
        .eq('user_id', userId)
        .order('issued_at', { ascending: false })
      if (error) throw error
      return data as Certificate[]
    },
    enabled: !!userId,
  })
}

export function useAllCertificates() {
  return useQuery({
    queryKey: ['all-certificates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('certificates')
        .select('*, course:courses(id, title, category), user:profiles(id, full_name, email)')
        .order('issued_at', { ascending: false })
      if (error) throw error
      return data as Certificate[]
    },
  })
}

export function useIssueCertificate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      // Check if certificate already exists
      const { data: existing } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', courseId)
        .maybeSingle()

      if (existing) return existing as Certificate

      const { data, error } = await supabase
        .from('certificates')
        .insert({
          user_id: userId,
          course_id: courseId,
          issued_at: new Date().toISOString(),
        })
        .select('*, course:courses(id, title, category), user:profiles(id, full_name, email)')
        .single()
      if (error) throw error

      // Mark enrollment as completed
      await supabase
        .from('enrollments')
        .update({ completed_at: new Date().toISOString() })
        .eq('user_id', userId)
        .eq('course_id', courseId)

      return data as Certificate
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-certificates'] })
      qc.invalidateQueries({ queryKey: ['all-certificates'] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
    },
  })
}
