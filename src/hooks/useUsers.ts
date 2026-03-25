import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase, signupClient } from '@/lib/supabase'
import type { Profile, UserRole } from '@/types/database'

export function useAllUsers() {
  return useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, team_coordinator:profiles!team_coordinator_id(id, full_name, email, role)')
        .order('full_name')
      if (error) throw error
      return data as Profile[]
    },
  })
}

export function useCreateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ email, password, fullName, role, department, job_role, team_coordinator_id }: {
      email: string
      password: string
      fullName: string
      role: UserRole
      department?: string
      job_role?: string
      team_coordinator_id?: string
    }) => {
      // Use separate client so admin session is not affected
      const { data: authData, error: authError } = await signupClient.auth.signUp({
        email,
        password,
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create user')

      // Update the profile using admin's session
      const updates: Record<string, unknown> = { full_name: fullName, role }
      if (department) updates.department = department
      if (job_role) updates.job_role = job_role
      if (team_coordinator_id) updates.team_coordinator_id = team_coordinator_id

      const { error: profileError } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', authData.user.id)
      if (profileError) throw profileError

      return authData.user
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}

export function useUpdateUser() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({ id, ...updates }: {
      id: string
      full_name?: string
      role?: UserRole
      department?: string | null
      job_role?: string | null
      team_coordinator_id?: string | null
    }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
    },
  })
}
