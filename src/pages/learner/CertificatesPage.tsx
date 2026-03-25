import { useAuth } from '@/hooks/useAuth'
import { useMyCertificates } from '@/hooks/useCertificates'
import { Award, Download } from 'lucide-react'
import { jsPDF } from 'jspdf'
import type { Certificate } from '@/types/database'

function generateCertificatePDF(cert: Certificate) {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' })
  const w = doc.internal.pageSize.getWidth()
  const h = doc.internal.pageSize.getHeight()

  // Background
  doc.setFillColor(249, 250, 251)
  doc.rect(0, 0, w, h, 'F')

  // Border design - outer border
  doc.setDrawColor(16, 185, 129)
  doc.setLineWidth(3)
  doc.rect(10, 10, w - 20, h - 20)

  // Inner border
  doc.setLineWidth(0.5)
  doc.setDrawColor(5, 150, 105)
  doc.rect(15, 15, w - 30, h - 30)

  // Corner decorations
  const corners = [
    [18, 18], [w - 28, 18], [18, h - 28], [w - 28, h - 28]
  ]
  doc.setFillColor(16, 185, 129)
  for (const [cx, cy] of corners) {
    doc.circle(cx, cy, 2, 'F')
    doc.circle(cx + 10, cy, 1.5, 'F')
    doc.circle(cx, cy + 10, 1.5, 'F')
  }

  // Top decorative line
  doc.setDrawColor(16, 185, 129)
  doc.setLineWidth(1)
  doc.line(w / 2 - 50, 35, w / 2 + 50, 35)

  // Title
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(14)
  doc.setTextColor(107, 114, 128)
  doc.text('CERTIFICATE OF COMPLETION', w / 2, 48, { align: 'center' })

  // Decorative line below title
  doc.setLineWidth(0.5)
  doc.line(w / 2 - 40, 52, w / 2 + 40, 52)

  // "This is to certify that"
  doc.setFontSize(11)
  doc.setTextColor(107, 114, 128)
  doc.text('This is to certify that', w / 2, 68, { align: 'center' })

  // Learner name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(28)
  doc.setTextColor(17, 24, 39)
  const learnerName = cert.user?.full_name || cert.user?.email || 'Learner'
  doc.text(learnerName, w / 2, 84, { align: 'center' })

  // Underline the name
  const nameWidth = doc.getTextWidth(learnerName)
  doc.setDrawColor(16, 185, 129)
  doc.setLineWidth(0.8)
  doc.line(w / 2 - nameWidth / 2, 87, w / 2 + nameWidth / 2, 87)

  // "has successfully completed"
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(107, 114, 128)
  doc.text('has successfully completed the course', w / 2, 100, { align: 'center' })

  // Course name
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(5, 150, 105)
  const courseName = cert.course?.title || 'Course'
  doc.text(courseName, w / 2, 116, { align: 'center' })

  // Date
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.setTextColor(107, 114, 128)
  const dateStr = new Date(cert.issued_at).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  doc.text(`Issued on ${dateStr}`, w / 2, 132, { align: 'center' })

  // Bottom decorative line
  doc.setDrawColor(16, 185, 129)
  doc.setLineWidth(1)
  doc.line(w / 2 - 50, 145, w / 2 + 50, 145)

  // Brand name at bottom
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(16, 185, 129)
  doc.text('NtoN', w / 2 - 5, 158, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(156, 163, 175)
  doc.text('Learning Management System', w / 2, 164, { align: 'center' })

  // Certificate ID
  doc.setFontSize(7)
  doc.setTextColor(209, 213, 219)
  doc.text(`Certificate ID: ${cert.id}`, w / 2, h - 18, { align: 'center' })

  doc.save(`NtoN-Certificate-${courseName.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`)
}

export function CertificatesPage() {
  const { profile } = useAuth()
  const { data: certificates = [], isLoading } = useMyCertificates(profile?.id)

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Award className="text-brand-600" size={28} />
        <h1 className="text-2xl font-bold text-gray-900">My Certificates</h1>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-1/3" />
          </div>
        </div>
      ) : certificates.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <Award className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500 mb-2">No certificates yet.</p>
          <p className="text-gray-400 text-sm">Complete courses to earn certificates.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificates.map((cert) => (
            <div key={cert.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-brand-100 text-brand-600 flex items-center justify-center">
                    <Award size={24} />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{cert.course?.title || 'Course'}</h3>
                    {cert.course?.category && (
                      <span className="text-xs text-gray-500">{cert.course.category}</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-sm text-gray-500">
                  Earned {new Date(cert.issued_at).toLocaleDateString()}
                </span>
                <button
                  onClick={() => generateCertificatePDF(cert)}
                  className="flex items-center gap-1 text-sm text-brand-600 hover:text-brand-700 font-medium"
                >
                  <Download size={14} />
                  Download PDF
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
