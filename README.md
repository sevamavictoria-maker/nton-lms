# NtoN LMS - Learning Management System

A full-featured Learning Management System built with React, TypeScript, Vite, Supabase, and Tailwind CSS.

## Tech Stack

- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **State**: TanStack React Query
- **Charts**: Recharts
- **PDF**: jsPDF + pdfjs-dist
- **Rich Text**: TipTap
- **AI Voice**: ElevenLabs API + Web Speech API

## Features

### Authentication & Roles
- Email/password login with session persistence
- Password recovery via email
- Three roles: **Admin**, **Instructor**, **Learner**
- Role-based dashboards, navigation, and route protection

### Course Management (Admin & Instructor)
- Create, edit, publish, and archive courses
- Course cover images, categories, and descriptions
- Organize courses into **collections/categories**
- Course file attachments (PDFs, documents, resources)

### Lesson Builder
- **Slide-based lessons**: Rich text editor (TipTap), up to 3 images per slide, background images with opacity control, embedded videos (MP4/WebM), slide transcripts
- **Quiz lessons**: Multiple choice, true/false, and short answer question types
- AI text-to-speech for slide content
- Drag-to-reorder lessons within a course

### Quiz System
- Auto-grading with instant score calculation
- Per-question feedback (correct/incorrect with correct answer shown)
- **Quiz retakes** with unlimited attempts
- **Attempt tracking** - shows attempt number on results
- Score color-coding (green >= 70%, amber < 70%)

### Enrollment & Access Control
- **Self-enrollment** with pending approval workflow
- **Admin/instructor assignment** with direct approval
- Enrollment approval/rejection by instructor or admin
- Mandatory course flagging with deadlines
- Enrollment status tracking (pending, approved, rejected)

### Progress & Time Tracking
- Per-lesson completion tracking with timestamps
- **Time spent tracking** in minutes per lesson (accumulated across sessions)
- **Attempt count** per lesson/quiz
- Course-level progress percentage with visual progress bars
- Auto-completion detection for slide lessons (last slide reached)

### Grades & Reporting
- **Grades page** (Admin): View all learner scores, time spent, and attempts
  - Filter by course
  - Learner overview table with avg score, lessons completed, time, attempts
  - Per-lesson breakdown with individual submissions
  - Stats cards: total learners, avg score, total time, total attempts
- **Reports page** (Admin):
  - Enrollments over time (line chart)
  - Course completion rates (bar chart)
  - Department breakdown (bar chart)
  - **Top Learners** table with rank, department, avg score, lessons, time
  - **Top Learners by Department** with per-department rankings
  - User distribution (pie chart)
  - Filterable by department and role

### Certificates
- Auto-issue when all course lessons are completed
- Downloadable PDF certificates with brand-themed design (dark blue/gray palette)
- Certificate details: learner name, course title, issue date, certificate ID
- Admin certificate management view

### Live Sessions
- Schedule live lessons with date, time, and duration
- Meeting URL integration (Zoom, Teams, etc.)
- Upcoming sessions visible on learner dashboard across all enrolled courses
- Past sessions grayed out automatically

### User Management (Admin)
- Create and manage user accounts
- Assign roles (admin, instructor, learner)
- User profiles with: full name, avatar, department, job role
- Team coordinator assignment
- Active/inactive status

### Learner Experience
- Personal dashboard with enrollment stats, progress, and upcoming classes
- Course browsing with enrollment requests
- Slide viewer with transitions, text-to-speech, and transcript accordion
- Image downloads from slides
- Quiz taking with real-time feedback
- Certificate viewing and PDF download

### Additional Features
- **FAQ page** for learners
- **Course Q&A** chat per course
- Responsive design (mobile-friendly)
- Lazy-loaded pages for fast initial load
- Row-Level Security on all database tables

## Database Schema

| Table | Description |
|-------|-------------|
| profiles | User accounts with roles and departments |
| courses | Course content with status and categories |
| lessons | Slide and quiz lessons within courses |
| quiz_questions | Questions with types, options, and answers |
| enrollments | Student enrollment with approval workflow |
| progress | Completion tracking with scores, time, attempts |
| certificates | Issued certificates per user per course |
| live_lessons | Scheduled live sessions with meeting URLs |
| course_files | Uploaded course resources |
| settings | Application configuration |

## Getting Started

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up Supabase project and run migrations in `supabase/`
4. Create `.env` with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
5. Start dev server: `npm run dev`

## Deployment

Deployed on Vercel with automatic builds from GitHub.
