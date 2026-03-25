import { Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_HOME } from '@/lib/constants'
import type { UserRole } from '@/types/database'

interface Props {
  children: React.ReactNode
  allowedRoles: UserRole[]
}

export function ProtectedRoute({ children, allowedRoles }: Props) {
  const { isLoading, isAuthenticated, role } = useAuth()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (role && !allowedRoles.includes(role)) {
    return <Navigate to={ROLE_HOME[role]} replace />
  }

  return <>{children}</>
}
