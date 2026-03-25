import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { Profile, UserRole } from '@/types/database'

interface AuthState {
  session: Session | null
  profile: Profile | null
  isLoading: boolean
  isAuthenticated: boolean
  role: UserRole | null
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    session: null,
    profile: null,
    isLoading: true,
    isAuthenticated: false,
    role: null,
  })

  const fetchProfile = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()
    return data as Profile | null
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setState({
          session,
          profile,
          isLoading: false,
          isAuthenticated: true,
          role: profile?.role ?? null,
        })
      } else {
        setState((s) => ({ ...s, isLoading: false }))
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const profile = await fetchProfile(session.user.id)
        setState({
          session,
          profile,
          isLoading: false,
          isAuthenticated: true,
          role: profile?.role ?? null,
        })
      } else {
        setState({
          session: null,
          profile: null,
          isLoading: false,
          isAuthenticated: false,
          role: null,
        })
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchProfile])

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return { ...state, signIn, signOut }
}
