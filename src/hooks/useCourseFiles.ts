import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { CourseFile } from '@/types/database'

export function useCourseFiles(courseId?: string) {
  return useQuery({
    queryKey: ['course-files', courseId],
    queryFn: async () => {
      if (!courseId) return []
      const { data, error } = await supabase
        .from('course_files')
        .select('*')
        .eq('course_id', courseId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data as CourseFile[]
    },
    enabled: !!courseId,
  })
}

export function useUploadCourseFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ courseId, file, uploadedBy }: { courseId: string; file: File; uploadedBy: string }) => {
      // Upload to Supabase storage
      const ext = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${ext}`
      const filePath = `course-files/${courseId}/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(filePath, file, { contentType: file.type })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('media')
        .getPublicUrl(filePath)

      // Insert record
      const { data, error } = await supabase
        .from('course_files')
        .insert({
          course_id: courseId,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          uploaded_by: uploadedBy,
        })
        .select()
        .single()

      if (error) throw error
      return data as CourseFile
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['course-files', vars.courseId] })
    },
  })
}

export function useDeleteCourseFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, courseId }: { id: string; courseId: string }) => {
      const { error } = await supabase
        .from('course_files')
        .delete()
        .eq('id', id)
      if (error) throw error
      return courseId
    },
    onSuccess: (courseId) => {
      qc.invalidateQueries({ queryKey: ['course-files', courseId] })
    },
  })
}
