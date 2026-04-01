import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/lib/queryClient'
import { useAuth } from '@/hooks/useAuth'
import { ROLE_HOME } from '@/lib/constants'
import { lazy, Suspense } from 'react'

import { AppShell } from '@/components/layout/AppShell'
import { ProtectedRoute } from '@/components/auth/ProtectedRoute'

// Lazy load all pages
const LoginPage = lazy(() => import('@/pages/LoginPage').then(m => ({ default: m.LoginPage })))
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })))

// Admin pages
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })))
const ManageCourses = lazy(() => import('@/pages/admin/ManageCourses').then(m => ({ default: m.ManageCourses })))
const ManageUsers = lazy(() => import('@/pages/admin/ManageUsers').then(m => ({ default: m.ManageUsers })))
const AdminCertificates = lazy(() => import('@/pages/admin/CertificatesPage').then(m => ({ default: m.CertificatesPage })))
const ReportsPage = lazy(() => import('@/pages/admin/ReportsPage').then(m => ({ default: m.ReportsPage })))
const GradesPage = lazy(() => import('@/pages/admin/GradesPage').then(m => ({ default: m.GradesPage })))
const CollectionsPage = lazy(() => import('@/pages/admin/CollectionsPage').then(m => ({ default: m.CollectionsPage })))

// Instructor pages
const InstructorDashboard = lazy(() => import('@/pages/instructor/InstructorDashboard').then(m => ({ default: m.InstructorDashboard })))
const CourseEditor = lazy(() => import('@/pages/instructor/CourseEditor').then(m => ({ default: m.CourseEditor })))
const LessonEditor = lazy(() => import('@/pages/instructor/LessonEditor').then(m => ({ default: m.LessonEditor })))
const StudentProgressPage = lazy(() => import('@/pages/instructor/StudentProgressPage').then(m => ({ default: m.StudentProgressPage })))

// Learner pages
const LearnerDashboard = lazy(() => import('@/pages/learner/LearnerDashboard').then(m => ({ default: m.LearnerDashboard })))
const CourseView = lazy(() => import('@/pages/learner/CourseView').then(m => ({ default: m.CourseView })))
const LessonView = lazy(() => import('@/pages/learner/LessonView').then(m => ({ default: m.LessonView })))
const LearnerCertificates = lazy(() => import('@/pages/learner/CertificatesPage').then(m => ({ default: m.CertificatesPage })))
const MyGradesPage = lazy(() => import('@/pages/learner/MyGradesPage').then(m => ({ default: m.MyGradesPage })))
const LearnerCategories = lazy(() => import('@/pages/learner/CategoriesPage').then(m => ({ default: m.CategoriesPage })))
const CategoryCourses = lazy(() => import('@/pages/learner/CategoryCoursesPage').then(m => ({ default: m.CategoryCoursesPage })))
const BrowseCourses = lazy(() => import('@/pages/learner/BrowseCoursesPage').then(m => ({ default: m.BrowseCoursesPage })))

// Shared pages
const ProfilePage = lazy(() => import('@/pages/shared/ProfilePage').then(m => ({ default: m.ProfilePage })))
const FaqPage = lazy(() => import('@/pages/shared/FaqPage').then(m => ({ default: m.FaqPage })))

function Loading() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
    </div>
  )
}

function RoleRedirect() {
  const { isLoading, isAuthenticated, role } = useAuth()

  if (isLoading) return <Loading />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (role) return <Navigate to={ROLE_HOME[role]} replace />
  return <Navigate to="/login" replace />
}

function AppRoutes() {
  return (
    <Suspense fallback={<Loading />}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/" element={<RoleRedirect />} />

        {/* Admin routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/admin" element={<AdminDashboard />} />
          <Route path="/admin/collections" element={<CollectionsPage />} />
          <Route path="/admin/courses" element={<ManageCourses />} />
          <Route path="/admin/courses/create" element={<CourseEditor />} />
          <Route path="/admin/courses/:courseId" element={<CourseEditor />} />
          <Route path="/admin/courses/:courseId/lessons/:lessonId" element={<LessonEditor />} />
          <Route path="/admin/users" element={<ManageUsers />} />
          <Route path="/admin/certificates" element={<AdminCertificates />} />
          <Route path="/admin/grades" element={<GradesPage />} />
          <Route path="/admin/reports" element={<ReportsPage />} />
        </Route>

        {/* Instructor routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['instructor', 'admin']}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/instructor" element={<InstructorDashboard />} />
          <Route path="/instructor/courses" element={<InstructorDashboard />} />
          <Route path="/instructor/create" element={<CourseEditor />} />
          <Route path="/instructor/courses/:courseId" element={<CourseEditor />} />
          <Route path="/instructor/courses/:courseId/lessons/:lessonId" element={<LessonEditor />} />
          <Route path="/instructor/progress" element={<StudentProgressPage />} />
        </Route>

        {/* Learner routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['learner', 'admin']}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/learner" element={<LearnerDashboard />} />
          <Route path="/learner/courses" element={<LearnerDashboard />} />
          <Route path="/learner/courses/:courseId" element={<CourseView />} />
          <Route path="/learner/courses/:courseId/lessons/:lessonId" element={<LessonView />} />
          <Route path="/learner/categories" element={<LearnerCategories />} />
          <Route path="/learner/categories/:categoryName" element={<CategoryCourses />} />
          <Route path="/learner/browse" element={<BrowseCourses />} />
          <Route path="/learner/grades" element={<MyGradesPage />} />
          <Route path="/learner/certificates" element={<LearnerCertificates />} />
        </Route>

        {/* Shared routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['admin', 'instructor', 'learner']}>
              <AppShell />
            </ProtectedRoute>
          }
        >
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/faq" element={<FaqPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  )
}
