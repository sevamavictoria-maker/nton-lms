# NtoN LMS — Security & Tech Stack Documentation

## Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend | React | 19.2.4 |
| Routing | React Router | 7.13.2 |
| Language | TypeScript | 5.9.3 |
| Build Tool | Vite | 8.0.1 |
| Styling | Tailwind CSS | 4.2.2 |
| State Management | TanStack React Query | 5.95.2 |
| Backend / Database | Supabase (PostgreSQL) | 2.100.0 |
| Authentication | Supabase Auth (email/password) | — |
| File Storage | Supabase Storage | — |
| Rich Text Editor | TipTap | 3.20.5 |
| PDF Processing | pdfjs-dist | 5.5.207 |
| PDF Generation | jsPDF | 4.2.1 |
| Charts | Recharts | 3.8.0 |
| Icons | Lucide React | 1.6.0 |
| AI Voice | ElevenLabs API + Web Speech API | — |
| Hosting | Vercel | — |

## Architecture

- **Single Page Application (SPA)** with client-side routing
- **Serverless backend** — all data operations go through Supabase client SDK
- **No custom server** — authentication, database, and storage are fully managed by Supabase
- **Lazy-loaded pages** — all routes are code-split for fast initial load
- **Environment variables** — Supabase credentials stored in `.env` (excluded from version control)

## Authentication & Authorization

### Authentication
- Email/password login via Supabase Auth
- Password recovery via email reset links
- Session persistence with automatic token refresh
- Separate Supabase client for admin user creation (prevents session conflicts)

### Role-Based Access Control
Three roles: **Admin**, **Instructor**, **Learner**

| Action | Admin | Instructor | Learner |
|--------|-------|------------|---------|
| Manage users | Yes | No | No |
| Create/edit courses | Yes | Own courses | No |
| Create/edit lessons | Yes | Own courses | No |
| Publish/archive courses | Yes | Own courses | No |
| Approve enrollments | Yes | Own courses | No |
| View all reports | Yes | No | No |
| View student scores | Yes | Own courses | No |
| Enroll in courses | No | No | Request (needs approval) |
| Take lessons/quizzes | No | No | Enrolled courses only |
| Earn certificates | No | No | Yes |

### Route Protection
- All routes are wrapped in `ProtectedRoute` component
- Unauthenticated users are redirected to `/login`
- Role mismatches redirect to role-specific home page
- Loading state shown while session is being verified

## Database Security

### Row-Level Security (RLS)
Every table has RLS enabled with policies that enforce access control at the database level:

| Table | Read | Insert | Update | Delete |
|-------|------|--------|--------|--------|
| profiles | Authenticated users | Admin or self | Self or admin | — |
| courses | Published (all), draft (owner/admin) | Instructor/admin | Owner/admin | Admin |
| lessons | Authenticated users | Instructor/admin | Instructor/admin | Instructor/admin |
| quiz_questions | Authenticated users | Instructor/admin | Instructor/admin | Instructor/admin |
| enrollments | Self or instructor/admin | Self or admin | Admin or self | — |
| progress | Self or instructor/admin | Self | Self | — |
| certificates | Self or admin | Self or admin | — | — |
| settings | Authenticated (read), admin (write) | Admin | Admin | Admin |
| live_lessons | Authenticated users | Instructor/admin | Instructor/admin | Instructor/admin |
| course_files | Authenticated users | Instructor/admin | — | Instructor/admin |

### Helper Functions
Database functions used in RLS policies (all `SECURITY DEFINER`):
- `get_user_role()` — returns current user's role
- `is_admin()` — checks admin role
- `is_instructor()` — checks instructor role
- `is_instructor_or_admin()` — checks either role

### Auto-Profile Creation
A database trigger (`on_auth_user_created`) automatically creates a profile row when a new user signs up, ensuring data consistency.

## Data Protection

- **Supabase anonymous key** is used client-side (designed to be public; all security enforced via RLS)
- **No service role key** is exposed in client code
- **Environment variables** (`.env`) are excluded from git via `.gitignore`
- **File uploads** go to Supabase Storage with public bucket access (for serving media to authenticated users)
- **Enrollment gating** — learners cannot access course content until their enrollment is approved

## Client-Side Security

- **No `eval()` or dynamic code execution**
- **HTML sanitization** — slide body content rendered via `dangerouslySetInnerHTML` is authored only by instructors/admins (not user-generated from learners)
- **TypeScript** provides compile-time type safety across the entire codebase
- **Input validation** — file size limits enforced on uploads (images: 5MB, videos: 100MB, PDFs: 50MB, course files: 50MB)

## Infrastructure

- **Vercel** — serves the static SPA with automatic HTTPS, global CDN, and DDoS protection
- **Supabase** — managed PostgreSQL with automatic backups, HTTPS-only API, and JWT-based auth
- **No custom API server** — reduces attack surface since all data access is through Supabase's authenticated SDK

## Deployment

- Source code hosted on **GitHub** (private repository)
- Automatic deployments triggered on `git push` to `main` branch
- Build process: TypeScript compilation → Vite production build
- Environment variables configured in Vercel dashboard (not in source code)
