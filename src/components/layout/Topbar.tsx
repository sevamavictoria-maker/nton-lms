import { Menu } from 'lucide-react'
import { ROLE_LABELS } from '@/lib/constants'
import type { Profile } from '@/types/database'

interface Props {
  profile: Profile | null
  onMenuToggle: () => void
}

export function Topbar({ profile, onMenuToggle }: Props) {
  return (
    <header className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between lg:justify-end">
      <button
        onClick={onMenuToggle}
        className="lg:hidden text-gray-600 hover:text-gray-900"
      >
        <Menu size={24} />
      </button>

      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-gray-900">
            {profile?.full_name || profile?.email}
          </p>
          <p className="text-xs text-gray-500">
            {profile?.role ? ROLE_LABELS[profile.role] : ''}
          </p>
        </div>
        <div className="w-8 h-8 rounded-full bg-brand-900 text-brand-200 flex items-center justify-center text-sm font-medium">
          {(profile?.full_name || profile?.email || '?')[0].toUpperCase()}
        </div>
      </div>
    </header>
  )
}
