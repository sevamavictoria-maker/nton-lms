import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CustomAssessment, AssessmentGrade } from '@/types/database'

export function useCourseAssessments(courseId?: string) {
  return useQuery({
    queryKey: ['assessments', courseId],
    queryFn: async () => {
      if (!courseId) return []
      const { data, error } = await supabase
        .from('custom_assessments')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at')
      if (error) throw error
      return data as CustomAssessment[]
    },
    enabled: !!courseId,
  })
}

export function useAssessmentGrades(assessmentId?: string) {
  return useQuery({
    queryKey: ['assessment-grades', assessmentId],
    queryFn: async () => {
      if (!assessmentId) return []
      const { data, error } = await supabase
        .from('assessment_grades')
        .select('*, user:profiles(id, full_name, email)')
        .eq('assessment_id', assessmentId)
        .order('graded_at', { ascending: false })
      if (error) throw error
      return data as AssessmentGrade[]
    },
    enabled: !!assessmentId,
  })
}

export function useCourseAssessmentGrades(courseId?: string) {
  return useQuery({
    queryKey: ['course-assessment-grades', courseId],
    queryFn: async () => {
      if (!courseId) return []
      const { data, error } = await supabase
        .from('assessment_grades')
        .select('*, assessment:custom_assessments(id, title, max_score), user:profiles(id, full_name, email)')
        .eq('assessment:custom_assessments.course_id' as string, courseId)
      if (error) {
        // Fallback: fetch assessments first, then grades
        const { data: assessments } = await supabase
          .from('custom_assessments')
          .select('id')
          .eq('course_id', courseId)
        if (!assessments?.length) return []
        const ids = assessments.map((a) => a.id)
        const { data: grades, error: err2 } = await supabase
          .from('assessment_grades')
          .select('*, assessment:custom_assessments(id, title, max_score), user:profiles(id, full_name, email)')
          .in('assessment_id', ids)
        if (err2) throw err2
        return grades as AssessmentGrade[]
      }
      return data as AssessmentGrade[]
    },
    enabled: !!courseId,
  })
}

export function useMyAssessmentGrades(userId?: string) {
  return useQuery({
    queryKey: ['my-assessment-grades', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('assessment_grades')
        .select('*, assessment:custom_assessments(id, title, max_score, course_id)')
        .eq('user_id', userId)
        .order('graded_at', { ascending: false })
      if (error) throw error
      return data as AssessmentGrade[]
    },
    enabled: !!userId,
  })
}

export function useCreateAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { course_id: string; title: string; description?: string; max_score: number; created_by: string }) => {
      const { data, error } = await supabase
        .from('custom_assessments')
        .insert(input)
        .select()
        .single()
      if (error) throw error
      return data as CustomAssessment
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['assessments', vars.course_id] })
    },
  })
}

export function useDeleteAssessment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('custom_assessments')
        .delete()
        .eq('id', id)
      if (error) throw error
      return courseId
    },
    onSuccess: (courseId) => {
      qc.invalidateQueries({ queryKey: ['assessments', courseId] })
    },
  })
}

export function useGradeStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { assessment_id: string; user_id: string; score: number; feedback?: string; graded_by: string }) => {
      const { data, error } = await supabase
        .from('assessment_grades')
        .upsert(
          { ...input, graded_at: new Date().toISOString() },
          { onConflict: 'assessment_id,user_id' }
        )
        .select('*, user:profiles(id, full_name, email)')
        .single()
      if (error) throw error
      return data as AssessmentGrade
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['assessment-grades', vars.assessment_id] })
      qc.invalidateQueries({ queryKey: ['course-assessment-grades'] })
      qc.invalidateQueries({ queryKey: ['my-assessment-grades'] })
    },
  })
}
