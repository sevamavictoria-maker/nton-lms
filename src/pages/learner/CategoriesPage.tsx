import { Link } from 'react-router-dom'
import { useActiveCategories } from '@/hooks/useCategories'
import { usePublishedCourses } from '@/hooks/useCourses'
import { FolderOpen, BookOpen, ChevronRight } from 'lucide-react'

export function CategoriesPage() {
  const { data: categories = [], isLoading } = useActiveCategories()
  const { data: courses = [] } = usePublishedCourses()

  function getCourseCount(categoryName: string) {
    return courses.filter((c) => c.category === categoryName).length
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FolderOpen className="text-brand-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
      </div>

      {categories.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <FolderOpen className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">No categories available yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {categories.map((cat) => {
            const count = getCourseCount(cat.name)
            return (
              <Link
                key={cat.id}
                to={`/learner/categories/${encodeURIComponent(cat.name)}`}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow block"
              >
                {cat.cover_url && (
                  <img src={cat.cover_url} alt={cat.name} className="w-full h-36 object-cover" />
                )}
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-gray-900 text-base">{cat.name}</h3>
                    <ChevronRight size={18} className="text-gray-400" />
                  </div>
                  {cat.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">{cat.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mt-3">
                    <BookOpen size={14} />
                    <span>{count} course{count !== 1 ? 's' : ''}</span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
