import jsPDF from 'jspdf'

export function exportCoursePdf(
  course: { title: string; description?: string | null },
  lessons: Array<{ title: string; type: string; content_json?: { slides?: Array<{ title?: string; body?: string }> } | null }>
) {
  const doc = new jsPDF()
  let y = 20

  // Title
  doc.setFontSize(24)
  doc.setFont('helvetica', 'bold')
  doc.text(course.title, 20, y)
  y += 10

  if (course.description) {
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    const descLines = doc.splitTextToSize(course.description, 170)
    doc.text(descLines, 20, y)
    y += descLines.length * 6 + 5
  }

  doc.setDrawColor(200)
  doc.line(20, y, 190, y)
  y += 10

  for (const lesson of lessons) {
    if (y > 260) { doc.addPage(); y = 20 }

    doc.setFontSize(16)
    doc.setFont('helvetica', 'bold')
    doc.text(lesson.title, 20, y)
    y += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'italic')
    doc.text(`Type: ${lesson.type}`, 20, y)
    y += 6

    if (lesson.type === 'slide' && lesson.content_json?.slides) {
      for (const slide of lesson.content_json.slides) {
        if (y > 250) { doc.addPage(); y = 20 }

        doc.setFontSize(13)
        doc.setFont('helvetica', 'bold')
        doc.text(slide.title || 'Untitled Slide', 25, y)
        y += 6

        if (slide.body) {
          doc.setFontSize(10)
          doc.setFont('helvetica', 'normal')
          // Strip HTML tags
          const cleanBody = slide.body.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
          const bodyLines = doc.splitTextToSize(cleanBody, 160)
          doc.text(bodyLines, 25, y)
          y += bodyLines.length * 5 + 4
        }
      }
    }

    y += 5
  }

  doc.save(`${course.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`)
}
