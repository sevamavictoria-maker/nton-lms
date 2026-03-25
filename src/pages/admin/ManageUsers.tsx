import { useState, useMemo } from 'react'
import { useAllUsers, useCreateUser, useUpdateUser } from '@/hooks/useUsers'
import { UserPlus, X, Pencil } from 'lucide-react'
import type { UserRole, Profile } from '@/types/database'

export function ManageUsers() {
  const { data: users = [], isLoading } = useAllUsers()
  const createUser = useCreateUser()
  const updateUser = useUpdateUser()
  const [showModal, setShowModal] = useState(false)
  const [editUser, setEditUser] = useState<Profile | null>(null)
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', role: 'learner' as UserRole,
    department: '', job_role: '', team_coordinator_id: '',
  })
  const [error, setError] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all')
  const [departmentFilter, setDepartmentFilter] = useState<string>('all')

  // Get unique departments from users
  const departments = useMemo(() => {
    const depts = new Set<string>()
    users.forEach((u) => { if (u.department) depts.add(u.department) })
    return Array.from(depts).sort()
  }, [users])

  // Admin/instructor users for team coordinator dropdown
  const coordinators = useMemo(() => {
    return users.filter((u) => u.role === 'admin' || u.role === 'instructor')
  }, [users])

  const filtered = users.filter((u) => {
    if (roleFilter !== 'all' && u.role !== roleFilter) return false
    if (departmentFilter !== 'all' && (u.department || '') !== departmentFilter) return false
    return true
  })

  const openCreateModal = () => {
    setEditUser(null)
    setForm({ email: '', password: '', fullName: '', role: 'learner', department: '', job_role: '', team_coordinator_id: '' })
    setError('')
    setShowModal(true)
  }

  const openEditModal = (user: Profile) => {
    setEditUser(user)
    setForm({
      email: user.email,
      password: '',
      fullName: user.full_name || '',
      role: user.role,
      department: user.department || '',
      job_role: user.job_role || '',
      team_coordinator_id: user.team_coordinator_id || '',
    })
    setError('')
    setShowModal(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      if (editUser) {
        // Update existing user
        await updateUser.mutateAsync({
          id: editUser.id,
          full_name: form.fullName,
          role: form.role,
          department: form.department || null,
          job_role: form.job_role || null,
          team_coordinator_id: form.team_coordinator_id || null,
        })
      } else {
        // Create new user
        await createUser.mutateAsync({
          email: form.email,
          password: form.password,
          fullName: form.fullName,
          role: form.role,
          department: form.department || undefined,
          job_role: form.job_role || undefined,
          team_coordinator_id: form.team_coordinator_id || undefined,
        })
      }
      setShowModal(false)
      setEditUser(null)
      setForm({ email: '', password: '', fullName: '', role: 'learner', department: '', job_role: '', team_coordinator_id: '' })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : editUser ? 'Failed to update user' : 'Failed to create user')
    }
  }

  const roleColors: Record<UserRole, string> = {
    admin: 'bg-red-100 text-red-700',
    instructor: 'bg-blue-100 text-blue-700',
    learner: 'bg-green-100 text-green-700',
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Manage Users</h1>
        <button
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 text-sm font-medium"
        >
          <UserPlus size={16} />
          Add User
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex gap-2">
          {(['all', 'admin', 'instructor', 'learner'] as const).map((role) => (
            <button
              key={role}
              onClick={() => setRoleFilter(role)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                roleFilter === role
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {role === 'all' ? 'All Roles' : role.charAt(0).toUpperCase() + role.slice(1) + 's'}
            </button>
          ))}
        </div>
        <select
          value={departmentFilter}
          onChange={(e) => setDepartmentFilter(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500"
        >
          <option value="all">All Departments</option>
          {departments.map((dept) => (
            <option key={dept} value={dept}>{dept}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No users found.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Department</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Job Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Coordinator</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{user.full_name || '--'}</td>
                  <td className="px-4 py-3 text-gray-600">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium capitalize ${roleColors[user.role]}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{user.department || '--'}</td>
                  <td className="px-4 py-3 text-gray-600">{user.job_role || '--'}</td>
                  <td className="px-4 py-3 text-gray-600">
                    {user.team_coordinator?.full_name || user.team_coordinator?.email || '--'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500">{new Date(user.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openEditModal(user)}
                      className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-lg"
                      title="Edit user"
                    >
                      <Pencil size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create/Edit User Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">{editUser ? 'Edit User' : 'Add User'}</h2>
              <button onClick={() => { setShowModal(false); setEditUser(null) }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input type="text" required value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
              </div>
              {!editUser && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                    <input type="email" required value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                    <input type="password" required minLength={6} value={form.password}
                      onChange={(e) => setForm({ ...form, password: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                <select value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="learner">Learner</option>
                  <option value="instructor">Instructor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <input type="text" value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Engineering, Marketing" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Role</label>
                <input type="text" value={form.job_role}
                  onChange={(e) => setForm({ ...form, job_role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Software Engineer, Designer" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Team Coordinator</label>
                <select value={form.team_coordinator_id}
                  onChange={(e) => setForm({ ...form, team_coordinator_id: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500">
                  <option value="">None</option>
                  {coordinators.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.full_name || c.email} ({c.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setEditUser(null) }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                  Cancel
                </button>
                <button type="submit" disabled={createUser.isPending || updateUser.isPending}
                  className="flex-1 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50">
                  {editUser
                    ? (updateUser.isPending ? 'Saving...' : 'Save Changes')
                    : (createUser.isPending ? 'Creating...' : 'Create User')
                  }
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
