import { useState } from 'react'
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '@/hooks/useCategories'
import { useAllCourses } from '@/hooks/useCourses'
import { Plus, X, Trash2, Edit3, Check, GripVertical, BookOpen, Eye, EyeOff } from 'lucide-react'
import { ImageUpload } from '@/components/ImageUpload'

export function CollectionsPage() {
  const { data: categories = [], isLoading } = useCategories()
  const { data: courses = [] } = useAllCourses()
  const createCategory = useCreateCategory()
  const updateCategory = useUpdateCategory()
  const deleteCategory = useDeleteCategory()

  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', cover_url: '' })
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ name: '', description: '', cover_url: '' })
  const [error, setError] = useState('')

  const getCourseCount = (categoryName: string) =>
    courses.filter((c) => c.category === categoryName).length

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      await createCategory.mutateAsync({
        name: form.name,
        description: form.description || undefined,
        cover_url: form.cover_url || undefined,
      })
      setForm({ name: '', description: '', cover_url: '' })
      setShowCreate(false)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create category')
    }
  }

  const startEdit = (cat: typeof categories[0]) => {
    setEditingId(cat.id)
    setEditForm({ name: cat.name, description: cat.description || '', cover_url: cat.cover_url || '' })
  }

  const handleSaveEdit = async () => {
    if (!editingId) return
    await updateCategory.mutateAsync({
      id: editingId,
      name: editForm.name,
      description: editForm.description || null,
      cover_url: editForm.cover_url || null,
    })
    setEditingId(null)
  }

  const handleDelete = async (id: string, name: string) => {
    const count = getCourseCount(name)
    if (count > 0) {
      alert(`Cannot delete "${name}" — it has ${count} course(s) assigned. Remove or reassign them first.`)
      return
    }
    if (!confirm(`Delete category "${name}"?`)) return
    await deleteCategory.mutateAsync(id)
  }

  const handleToggleActive = async (id: string, isActive: boolean) => {
    await updateCategory.mutateAsync({ id, is_active: !isActive })
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-brand-900" style={{ fontFamily: 'var(--font-heading)' }}>Collections</h1>
          <p className="text-sm text-brand-400 mt-1">Organize courses into categories</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-brand-700 text-white px-4 py-2 rounded-lg hover:bg-brand-800 text-sm font-medium self-start sm:self-auto"
        >
          <Plus size={16} />
          Add Category
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="bg-brand-50 rounded-xl border border-brand-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-brand-900">New Category</h2>
            <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
              <X size={20} />
            </button>
          </div>
          {error && <div className="bg-red-50 text-red-700 px-4 py-2 rounded-lg text-sm mb-4">{error}</div>}
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="e.g. Leadership" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
                <input type="text" value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500"
                  placeholder="Short description" />
              </div>
            </div>
            <ImageUpload
              value={form.cover_url}
              onChange={(url) => setForm({ ...form, cover_url: url })}
              label="Cover Image (optional)"
              placeholder="Category cover image"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setShowCreate(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
                Cancel
              </button>
              <button type="submit" disabled={createCategory.isPending}
                className="bg-brand-700 text-white px-4 py-2 rounded-lg hover:bg-brand-800 disabled:opacity-50 text-sm font-medium">
                {createCategory.isPending ? 'Creating...' : 'Create Category'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Categories List */}
      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      ) : categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No categories yet. Create your first one above.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => (
            <div key={cat.id} className={`bg-white rounded-xl border overflow-hidden transition-shadow hover:shadow-md ${
              cat.is_active ? 'border-gray-200' : 'border-gray-100 opacity-60'
            }`}>
              {/* Cover */}
              {editingId === cat.id ? (
                <div className="p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Name</label>
                    <input type="text" value={editForm.name}
                      onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
                    <input type="text" value={editForm.description}
                      onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                      className="w-full px-2 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
                  </div>
                  <ImageUpload
                    value={editForm.cover_url}
                    onChange={(url) => setEditForm({ ...editForm, cover_url: url })}
                    label="Cover Image"
                  />
                  <div className="flex gap-2">
                    <button onClick={handleSaveEdit} className="flex items-center gap-1 px-3 py-1.5 bg-brand-700 text-white rounded-lg text-sm hover:bg-brand-800">
                      <Check size={14} /> Save
                    </button>
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {cat.cover_url ? (
                    <div className="h-32 bg-cover bg-center" style={{ backgroundImage: `url(${cat.cover_url})` }}>
                      <div className="h-full bg-brand-900/40 flex items-end p-4">
                        <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{cat.name}</h3>
                      </div>
                    </div>
                  ) : (
                    <div className="h-32 bg-gradient-to-br from-brand-700 to-brand-900 flex items-end p-4">
                      <h3 className="text-white font-bold text-lg" style={{ fontFamily: 'var(--font-heading)' }}>{cat.name}</h3>
                    </div>
                  )}

                  <div className="p-4">
                    {cat.description && (
                      <p className="text-sm text-gray-500 mb-3">{cat.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1 text-sm text-brand-600">
                        <BookOpen size={14} />
                        <span>{getCourseCount(cat.name)} course{getCourseCount(cat.name) !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleToggleActive(cat.id, cat.is_active)}
                          className={`p-1.5 rounded-lg ${cat.is_active ? 'text-green-600 hover:bg-green-50' : 'text-gray-400 hover:bg-gray-100'}`}
                          title={cat.is_active ? 'Active — click to hide' : 'Hidden — click to show'}>
                          {cat.is_active ? <Eye size={16} /> : <EyeOff size={16} />}
                        </button>
                        <button onClick={() => startEdit(cat)}
                          className="p-1.5 text-brand-500 hover:bg-brand-50 rounded-lg" title="Edit">
                          <Edit3 size={16} />
                        </button>
                        <button onClick={() => handleDelete(cat.id, cat.name)}
                          className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg" title="Delete">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
