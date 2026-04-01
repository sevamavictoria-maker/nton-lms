import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  BookOpen,
  Users,
  Award,
  BarChart3,
  PlusCircle,
  GraduationCap,
  UserCircle,
  LogOut,
  X,
  FolderOpen,
  HelpCircle,
} from 'lucide-react'
import type { UserRole } from '@/types/database'

interface Props {
  role: UserRole
  onSignOut: () => void
  onClose?: () => void
}

interface NavItem {
  to: string
  label: string
  icon: React.ReactNode
}

const adminNav: NavItem[] = [
  { to: '/admin', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/admin/collections', label: 'Categories', icon: <FolderOpen size={20} /> },
  { to: '/admin/courses', label: 'Courses', icon: <BookOpen size={20} /> },
  { to: '/admin/users', label: 'Users', icon: <Users size={20} /> },
  { to: '/admin/grades', label: 'Grades', icon: <GraduationCap size={20} /> },
  { to: '/admin/certificates', label: 'Certificates', icon: <Award size={20} /> },
  { to: '/admin/reports', label: 'Reports', icon: <BarChart3 size={20} /> },
]

const instructorNav: NavItem[] = [
  { to: '/instructor', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/instructor/courses', label: 'My Courses', icon: <BookOpen size={20} /> },
  { to: '/instructor/create', label: 'Create Course', icon: <PlusCircle size={20} /> },
  { to: '/instructor/progress', label: 'Student Progress', icon: <GraduationCap size={20} /> },
]

const learnerNav: NavItem[] = [
  { to: '/learner', label: 'Dashboard', icon: <LayoutDashboard size={20} /> },
  { to: '/learner/browse', label: 'All Courses', icon: <BookOpen size={20} /> },
  { to: '/learner/categories', label: 'Categories', icon: <FolderOpen size={20} /> },
  { to: '/learner/courses', label: 'My Courses', icon: <GraduationCap size={20} /> },
  { to: '/learner/grades', label: 'My Grades', icon: <BarChart3 size={20} /> },
  { to: '/learner/certificates', label: 'Certificates', icon: <Award size={20} /> },
]

const navByRole: Record<UserRole, NavItem[]> = {
  admin: adminNav,
  instructor: instructorNav,
  learner: learnerNav,
}

export function Sidebar({ role, onSignOut, onClose }: Props) {
  const items = navByRole[role]

  return (
    <aside className="w-64 bg-brand-900 text-white flex flex-col h-screen sticky top-0 overflow-y-auto">
      <div className="p-4 border-b border-brand-800 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight" style={{ fontFamily: 'var(--font-heading)' }}>
          Nto<span className="text-brand-300">N</span>
        </h1>
        {onClose && (
          <button onClick={onClose} className="lg:hidden text-brand-300 hover:text-white">
            <X size={20} />
          </button>
        )}
      </div>

      <nav className="flex-1 py-4 space-y-1 px-2">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === `/${role}`}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-brand-600 text-white'
                  : 'text-brand-200 hover:bg-brand-800 hover:text-white'
              }`
            }
          >
            {item.icon}
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-2 border-t border-brand-800 space-y-1">
        <NavLink
          to="/faq"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-600 text-white'
                : 'text-brand-200 hover:bg-brand-800 hover:text-white'
            }`
          }
        >
          <HelpCircle size={20} />
          FAQ
        </NavLink>
        <NavLink
          to="/profile"
          onClick={onClose}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive
                ? 'bg-brand-600 text-white'
                : 'text-brand-200 hover:bg-brand-800 hover:text-white'
            }`
          }
        >
          <UserCircle size={20} />
          Profile
        </NavLink>
        <button
          onClick={onSignOut}
          className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-brand-200 hover:bg-brand-800 hover:text-white w-full transition-colors"
        >
          <LogOut size={20} />
          Sign Out
        </button>
      </div>
    </aside>
  )
}
