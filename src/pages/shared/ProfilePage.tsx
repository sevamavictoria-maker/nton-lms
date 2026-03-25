import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_LABELS } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import { Save } from 'lucide-react'

export function ProfilePage() {
  const { profile } = useAuth()

  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState({
    full_name: '',
    avatar_url: '',
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  if (!profile) return null

  const startEdit = () => {
    setForm({
      full_name: profile.full_name || '',
      avatar_url: profile.avatar_url || '',
    })
    setEditing(true)
    setSaved(false)
  }

  const handleSave = async () => {
    setSaving(true)
    await supabase
      .from('profiles')
      .update({
        full_name: form.full_name || null,
        avatar_url: form.avatar_url || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.id)
    setSaving(false)
    setEditing(false)
    setSaved(true)
    window.location.reload()
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">My Profile</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-lg">
        {!editing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-4 mb-4">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-16 h-16 rounded-full object-cover" />
              ) : (
                <div className="w-16 h-16 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-2xl font-bold">
                  {(profile.full_name || profile.email || '?')[0].toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold text-gray-900">{profile.full_name || 'Not set'}</p>
                <p className="text-sm text-gray-500">{profile.email}</p>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-500">Role</label>
              <p className="text-gray-900">{ROLE_LABELS[profile.role]}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Status</label>
              <p className="text-gray-900">{profile.is_active ? 'Active' : 'Inactive'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Member since</label>
              <p className="text-gray-900">{new Date(profile.created_at).toLocaleDateString()}</p>
            </div>

            <button
              onClick={startEdit}
              className="mt-2 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 text-sm font-medium transition-colors"
            >
              Edit Profile
            </button>
            {saved && <p className="text-green-600 text-sm">Profile saved!</p>}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
              <input type="text" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
              <input type="url" value={form.avatar_url} onChange={(e) => setForm({ ...form, avatar_url: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="https://..." />
            </div>

            <div className="flex gap-2 pt-2">
              <button onClick={handleSave} disabled={saving}
                className="inline-flex items-center gap-1 bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 disabled:opacity-50 text-sm font-medium transition-colors">
                <Save size={16} />
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(false)}
                className="bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 text-sm font-medium transition-colors">
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
