import { useState, useRef } from 'react'
import { FileUp, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { Slide } from '@/types/database'

interface Props {
  onImport: (slides: Slide[]) => void
}

export function PdfUpload({ onImport }: Props) {
  const [processing, setProcessing] = useState(false)
  const [progress, setProgress] = useState('')
  const [error, setError] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const ext = (file.name.split('.').pop() || '').toLowerCase()
    if (file.type !== 'application/pdf' || ext !== 'pdf') {
      setError('Please select a PDF file')
      return
    }

    if (file.size > 50 * 1024 * 1024) {
      setError('PDF must be under 50MB')
      return
    }

    setError('')
    setProcessing(true)
    setProgress('Loading PDF...')

    try {
      // Dynamically import pdfjs-dist so it's not in the main bundle
      const pdfjsLib = await import('pdfjs-dist')
      pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
        'pdfjs-dist/build/pdf.worker.mjs',
        import.meta.url
      ).toString()

      const arrayBuffer = await file.arrayBuffer()
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise
      const totalPages = pdf.numPages
      const slides: Slide[] = []

      for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
        setProgress(`Processing page ${pageNum} of ${totalPages}...`)
        const page = await pdf.getPage(pageNum)

        // Render page to canvas at 2x scale for good quality
        const scale = 2
        const viewport = page.getViewport({ scale })
        const canvas = document.createElement('canvas')
        canvas.width = viewport.width
        canvas.height = viewport.height
        const ctx = canvas.getContext('2d')!

        await page.render({ canvasContext: ctx, viewport, canvas } as any).promise

        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png', 0.9)
        })

        // Upload to Supabase storage
        setProgress(`Uploading page ${pageNum} of ${totalPages}...`)
        const fileName = `${Date.now()}-pdf-p${pageNum}-${Math.random().toString(36).substring(2)}.png`
        const filePath = `slides/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('media')
          .upload(filePath, blob, { contentType: 'image/png' })

        if (uploadError) throw uploadError

        const { data: { publicUrl } } = supabase.storage
          .from('media')
          .getPublicUrl(filePath)

        // Extract text content from the page
        const textContent = await page.getTextContent()
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .trim()

        slides.push({
          title: `Page ${pageNum}`,
          body: '',
          transcript: pageText || '',
          background_url: publicUrl,
          background_opacity: 85,
        })
      }

      onImport(slides)
      setProgress('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process PDF')
    } finally {
      setProcessing(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <div className="inline-flex flex-col items-start">
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={processing}
        className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
      >
        {processing ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <FileUp size={14} />
        )}
        {processing ? progress : 'Import PDF'}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="application/pdf"
        onChange={handleFile}
        className="hidden"
      />

      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
