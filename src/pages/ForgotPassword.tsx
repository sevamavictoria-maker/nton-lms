import { useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase'
import { ArrowLeft, Mail, GraduationCap } from 'lucide-react'

export function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })
      if (error) throw error
      setSent(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white rounded-2xl shadow-lg p-8 w-full max-w-md">
        <Link to="/login" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-6">
          <ArrowLeft className="w-4 h-4" />
          Back to login
        </Link>

        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-brand-100 rounded-xl mb-4">
            <GraduationCap className="w-8 h-8 text-brand-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            Nto<span className="text-brand-500">N</span>
          </h1>
          <p className="text-gray-500 mt-2">Reset your password</p>
        </div>

        {sent ? (
          <div className="text-center py-4">
            <div className="w-14 h-14 bg-brand-100 rounded-xl flex items-center justify-center mx-auto mb-4">
              <Mail className="w-7 h-7 text-brand-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-500 text-sm">
              We sent a password reset link to <span className="font-medium text-gray-700">{email}</span>.
              Click the link in the email to reset your password.
            </p>
            <Link to="/login" className="inline-block mt-6 text-brand-600 hover:text-brand-700 text-sm font-medium">
              Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-red-50 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>
            )}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email" type="email" required value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                placeholder="you@example.com"
              />
            </div>
            <button type="submit" disabled={loading}
              className="w-full bg-brand-600 text-white py-2 px-4 rounded-lg hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium transition-colors">
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
