import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Course, CourseStatus } from '@/types/database'

export function useAllCourses() {
  return useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, instructor:profiles!courses_created_by_fkey(*)')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Course[]
    },
  })
}

export function useMyCourses(instructorId?: string) {
  return useQuery({
    queryKey: ['my-courses', instructorId],
    queryFn: async () => {
      if (!instructorId) return []
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('created_by', instructorId)
        .order('created_at', { ascending: false })
      if (error) throw error

      // Get enrollment counts
      const courseIds = data.map((c: Course) => c.id)
      if (courseIds.length > 0) {
        const { data: enrollments } = await supabase
          .from('enrollments')
          .select('course_id')
          .in('course_id', courseIds)

        const countMap: Record<string, number> = {}
        for (const e of enrollments || []) {
          countMap[e.course_id] = (countMap[e.course_id] || 0) + 1
        }
        return data.map((c: Course) => ({ ...c, enrollment_count: countMap[c.id] || 0 })) as Course[]
      }

      return data as Course[]
    },
    enabled: !!instructorId,
  })
}

export function usePublishedCourses() {
  return useQuery({
    queryKey: ['published-courses'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('*, instructor:profiles!courses_created_by_fkey(id, full_name)')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as Course[]
    },
  })
}

export function useCourse(courseId?: string) {
  return useQuery({
    queryKey: ['course', courseId],
    queryFn: async () => {
      if (!courseId) return null
      const { data, error } = await supabase
        .from('courses')
        .select('*, instructor:profiles!courses_created_by_fkey(*)')
        .eq('id', courseId)
        .single()
      if (error) throw error
      return data as Course
    },
    enabled: !!courseId,
  })
}

export function useCreateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (course: { title: string; description?: string; category?: string; cover_url?: string; created_by: string }) => {
      const { data, error } = await supabase
        .from('courses')
        .insert({
          title: course.title,
          description: course.description || null,
          category: course.category || null,
          cover_url: course.cover_url || null,
          created_by: course.created_by,
          status: 'draft',
        })
        .select()
        .single()
      if (error) throw error
      return data as Course
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['courses'] })
      qc.invalidateQueries({ queryKey: ['my-courses'] })
    },
  })
}

export function useUpdateCourse() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; title?: string; description?: string; category?: string; cover_url?: string; status?: CourseStatus }) => {
      const { data, error } = await supabase
        .from('courses')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Course
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['courses'] })
      qc.invalidateQueries({ queryKey: ['my-courses'] })
      qc.invalidateQueries({ queryKey: ['course', vars.id] })
      qc.invalidateQueries({ queryKey: ['published-courses'] })
    },
  })
}
