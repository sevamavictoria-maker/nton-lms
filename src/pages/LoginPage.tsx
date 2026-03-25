import { useNavigate } from 'react-router-dom'
import { LoginForm } from '@/components/auth/LoginForm'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_HOME } from '@/lib/constants'
import { useEffect } from 'react'
import { GraduationCap } from 'lucide-react'

export function LoginPage() {
  const { signIn, isAuthenticated, role } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated && role) {
      navigate(ROLE_HOME[role], { replace: true })
    }
  }, [isAuthenticated, role, navigate])

  const handleLogin = async (email: string, password: string) => {
    await signIn(email, password)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-brand-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md border border-brand-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-900 rounded-xl mb-4">
            <GraduationCap className="w-8 h-8 text-brand-200" />
          </div>
          <h1 className="text-3xl font-bold text-brand-900" style={{ fontFamily: 'var(--font-heading)' }}>
            Nto<span className="text-brand-500">N</span>
          </h1>
          <p className="text-brand-400 mt-2">Learning Management System</p>
        </div>
        <div className="flex justify-center">
          <LoginForm onSubmit={handleLogin} />
        </div>
      </div>
    </div>
  )
}
