import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Enrollment } from '@/types/database'

export function useMyEnrollments(userId?: string) {
  return useQuery({
    queryKey: ['my-enrollments', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, course:courses(id, title, description, cover_url, category, status, created_by, instructor:profiles!courses_created_by_fkey(id, full_name))')
        .eq('user_id', userId)
        .order('enrolled_at', { ascending: false })
      if (error) throw error
      return data as Enrollment[]
    },
    enabled: !!userId,
  })
}

export function useCourseEnrollments(courseId?: string) {
  return useQuery({
    queryKey: ['course-enrollments', courseId],
    queryFn: async () => {
      if (!courseId) return []
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, user:profiles(id, full_name, email)')
        .eq('course_id', courseId)
        .order('enrolled_at', { ascending: false })
      if (error) throw error
      return data as Enrollment[]
    },
    enabled: !!courseId,
  })
}

export function useAllEnrollments() {
  return useQuery({
    queryKey: ['all-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, user:profiles(id, full_name, email), course:courses(id, title)')
        .order('enrolled_at', { ascending: false })
        .limit(200)
      if (error) throw error
      return data as Enrollment[]
    },
  })
}

// Pending enrollments across all courses for the current instructor
export function usePendingEnrollments(instructorId?: string) {
  return useQuery({
    queryKey: ['pending-enrollments', instructorId],
    queryFn: async () => {
      if (!instructorId) return []
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, user:profiles(id, full_name, email), course:courses(id, title, created_by)')
        .eq('status', 'pending')
        .order('enrolled_at', { ascending: false })
      if (error) throw error
      // Filter to only courses this instructor owns (or return all for admin)
      return data as Enrollment[]
    },
    enabled: !!instructorId,
  })
}

// All pending enrollments (for admin)
export function useAllPendingEnrollments() {
  return useQuery({
    queryKey: ['all-pending-enrollments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('enrollments')
        .select('*, user:profiles(id, full_name, email), course:courses(id, title)')
        .eq('status', 'pending')
        .order('enrolled_at', { ascending: false })
      if (error) throw error
      return data as Enrollment[]
    },
  })
}

// Self-enrollment (status = pending, needs approval)
export function useEnroll() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ userId, courseId }: { userId: string; courseId: string }) => {
      const { data, error } = await supabase
        .from('enrollments')
        .insert({ user_id: userId, course_id: courseId, status: 'pending' })
        .select()
        .single()
      if (error) throw error
      return data as Enrollment
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
      qc.invalidateQueries({ queryKey: ['course-enrollments'] })
      qc.invalidateQueries({ queryKey: ['all-enrollments'] })
      qc.invalidateQueries({ queryKey: ['pending-enrollments'] })
      qc.invalidateQueries({ queryKey: ['all-pending-enrollments'] })
    },
  })
}

// Admin/instructor assignment (status = approved, no approval needed)
export function useAssignCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { user_id: string; course_id: string; deadline?: string; is_mandatory?: boolean; assigned_by?: string }) => {
      const { data, error } = await supabase
        .from('enrollments')
        .insert({ ...input, status: 'approved' })
        .select()
        .single()
      if (error) throw error
      return data
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['enrollments'] })
      qc.invalidateQueries({ queryKey: ['course-enrollments'] })
      qc.invalidateQueries({ queryKey: ['all-enrollments'] })
    },
  })
}

// Approve a pending enrollment
export function useApproveEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data, error } = await supabase
        .from('enrollments')
        .update({ status: 'approved' })
        .eq('id', enrollmentId)
        .select()
        .single()
      if (error) throw error
      return data as Enrollment
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-enrollments'] })
      qc.invalidateQueries({ queryKey: ['all-enrollments'] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
      qc.invalidateQueries({ queryKey: ['pending-enrollments'] })
      qc.invalidateQueries({ queryKey: ['all-pending-enrollments'] })
    },
  })
}

// Reject a pending enrollment
export function useRejectEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { data, error } = await supabase
        .from('enrollments')
        .update({ status: 'rejected' })
        .eq('id', enrollmentId)
        .select()
        .single()
      if (error) throw error
      return data as Enrollment
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['course-enrollments'] })
      qc.invalidateQueries({ queryKey: ['all-enrollments'] })
      qc.invalidateQueries({ queryKey: ['my-enrollments'] })
      qc.invalidateQueries({ queryKey: ['pending-enrollments'] })
      qc.invalidateQueries({ queryKey: ['all-pending-enrollments'] })
    },
  })
}
