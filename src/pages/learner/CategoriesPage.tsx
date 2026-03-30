import { Link } from 'react-router-dom'
import { useActiveCategories } from '@/hooks/useCategories'
import { usePublishedCourses } from '@/hooks/useCourses'
import { FolderOpen, BookOpen } from 'lucide-react'

export function CategoriesPage() {
  const { data: categories = [], isLoading } = useActiveCategories()
  const { data: courses = [] } = usePublishedCourses()

  function getCoursesByCategory(categoryName: string) {
    return courses.filter((c) => c.category === categoryName)
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
            const catCourses = getCoursesByCategory(cat.name)
            return (
              <div key={cat.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                {cat.cover_url && (
                  <img src={cat.cover_url} alt={cat.name} className="w-full h-36 object-cover" />
                )}
                <div className="p-5">
                  <h3 className="font-bold text-gray-900 text-base mb-1">{cat.name}</h3>
                  {cat.description && (
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">{cat.description}</p>
                  )}
                  <div className="flex items-center gap-1.5 text-xs text-gray-400 mb-3">
                    <BookOpen size={14} />
                    <span>{catCourses.length} course{catCourses.length !== 1 ? 's' : ''}</span>
                  </div>

                  {catCourses.length > 0 && (
                    <div className="space-y-2">
                      {catCourses.map((course) => (
                        <Link
                          key={course.id}
                          to={`/learner/courses/${course.id}`}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          {course.cover_url ? (
                            <img src={course.cover_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center shrink-0">
                              <BookOpen size={16} className="text-brand-600" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{course.title}</p>
                            {course.instructor && (
                              <p className="text-xs text-gray-400">by {course.instructor.full_name}</p>
                            )}
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
