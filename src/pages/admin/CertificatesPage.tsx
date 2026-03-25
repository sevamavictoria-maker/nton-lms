import { useAllCertificates } from '@/hooks/useCertificates'
import { Award } from 'lucide-react'

export function CertificatesPage() {
  const { data: certificates = [], isLoading } = useAllCertificates()

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Award className="text-brand-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">All Certificates</h1>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
            <div className="h-4 bg-gray-200 rounded w-full" />
          </div>
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-gray-500">No certificates issued yet.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-3 font-medium text-gray-600">Learner</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Course</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Issued</th>
              </tr>
            </thead>
            <tbody>
              {certificates.map((cert) => (
                <tr key={cert.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {cert.user?.full_name || cert.user?.email || '--'}
                  </td>
                  <td className="px-4 py-3 text-gray-700">{cert.course?.title || '--'}</td>
                  <td className="px-4 py-3 text-gray-500">{cert.course?.category || '--'}</td>
                  <td className="px-4 py-3 text-gray-500">
                    {new Date(cert.issued_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
