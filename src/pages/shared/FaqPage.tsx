import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface FaqItem {
  question: string
  answer: string
}

const faqs: FaqItem[] = [
  {
    question: 'How do I enroll in a course?',
    answer:
      'Navigate to the Learner Dashboard and browse the available courses. Click on a course to view its details, then click the "Enroll" button. Once enrolled, the course will appear in your "My Courses" list and you can start learning immediately.',
  },
  {
    question: 'How do I track my progress?',
    answer:
      'Your progress is tracked automatically as you complete lessons and quizzes. Visit your Learner Dashboard to see an overview of your enrolled courses and completion percentages. Each course page also shows which lessons you have completed.',
  },
  {
    question: 'How do I earn a certificate?',
    answer:
      'Complete all lessons and quizzes in a course to earn your certificate. Once every lesson is marked as complete, a certificate is automatically generated and can be found on the Certificates page accessible from the sidebar.',
  },
  {
    question: 'How do I use the text-to-speech feature?',
    answer:
      'When viewing a slide lesson, look for the speaker icon in the top-right corner of the slide header. Click it to have the slide content read aloud. Click it again to stop playback. This feature uses your browser\'s built-in speech synthesis.',
  },
  {
    question: 'How do I ask questions about course content?',
    answer:
      'If you have questions about a specific course, reach out to the instructor or admin through the support contact listed below. We are working on adding an in-app discussion feature in a future update.',
  },
  {
    question: 'Can I retake a quiz?',
    answer:
      'Yes. You can retake any quiz by navigating back to the lesson and submitting new answers. Your most recent score will be recorded. There is no limit on the number of attempts.',
  },
  {
    question: 'How do I update my profile?',
    answer:
      'Click on "Profile" in the sidebar to access your profile page. From there you can update your full name and other account details. Changes are saved immediately.',
  },
  {
    question: 'Who do I contact for support?',
    answer:
      'For technical issues or general questions, please contact your system administrator or email the support team. If you are an instructor, you can also reach out to an admin through the platform.',
  },
]

function AccordionItem({ item }: { item: FaqItem }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <span className="text-sm sm:text-base font-semibold text-brand-900">{item.question}</span>
        <ChevronDown
          size={20}
          className={`text-brand-500 shrink-0 ml-3 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-5 pb-4 text-sm text-gray-600 leading-relaxed border-t border-gray-100 pt-3">
          {item.answer}
        </div>
      )}
    </div>
  )
}

export function FaqPage() {
  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <h1
          className="text-2xl sm:text-3xl font-bold text-brand-900"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Frequently Asked Questions
        </h1>
        <p className="text-sm text-brand-400 mt-2">
          Find answers to common questions about using the platform.
        </p>
      </div>

      <div className="space-y-3">
        {faqs.map((faq, i) => (
          <AccordionItem key={i} item={faq} />
        ))}
      </div>
    </div>
  )
}
