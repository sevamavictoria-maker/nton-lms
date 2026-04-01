# NtoN LMS — Security & Tech Stack Documentation

Last updated: April 2, 2026

---

## 1. Tech Stack

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
| HTML Sanitization | DOMPurify | 3.3.3 |
| Rich Text Editor | TipTap | 3.20.5 |
| PDF Processing | pdfjs-dist | 5.5.207 |
| PDF Generation | jsPDF | 4.2.1 |
| Charts | Recharts | 3.8.0 |
| Icons | Lucide React | 1.6.0 |
| AI Voice | ElevenLabs API + Web Speech API | — |
| Hosting | Vercel | — |

---

## 2. Architecture

- **Single Page Application (SPA)** with client-side routing
- **Serverless backend** — all data operations go through Supabase client SDK with parameterized queries
- **No custom server** — authentication, database, and storage are fully managed by Supabase
- **No raw SQL** — all database interactions use the Supabase SDK, eliminating SQL injection vectors
- **Lazy-loaded pages** — all routes are code-split for fast initial load and reduced attack surface per page
- **Environment variables** — all secrets and credentials stored in environment variables, excluded from version control

---

## 3. Authentication & Authorization

### 3.1 Authentication
- Email/password login via Supabase Auth
- Password recovery via email reset links
- JWT-based session persistence with automatic token refresh
- Separate Supabase client instance for admin user creation (prevents session lock conflicts)
- 5-second session timeout fallback prevents infinite loading on auth lock contention

### 3.2 Role-Based Access Control (RBAC)
Three roles enforced at both application and database level: **Admin**, **Instructor**, **Learner**

| Action | Admin | Instructor | Learner |
|--------|-------|------------|---------|
| Manage users | Yes | No | No |
| Create/edit courses | Yes | Own courses | No |
| Create/edit lessons | Yes | Own courses | No |
| Publish/archive courses | Yes | Own courses | No |
| Approve/reject enrollments | Yes | Own courses | No |
| View all reports & grades | Yes | Own courses | No |
| Create custom assessments | Yes | Own courses | No |
| Grade students | Yes | Own courses | No |
| Enroll in courses | No | No | Request (requires approval) |
| Take lessons/quizzes | No | No | Enrolled courses only |
| View own grades | No | No | Yes |
| Earn certificates | No | No | Yes |
| Toggle client invoice view | Yes | No | No |

### 3.3 Route Protection
- All authenticated routes wrapped in `ProtectedRoute` component
- Unauthenticated users are redirected to `/login`
- Role mismatches redirect to role-specific home page
- Loading state shown while session is being verified
- Public routes limited to: `/login`, `/forgot-password`

---

## 4. Database Security

### 4.1 Row-Level Security (RLS)
Every table has RLS enabled. Policies enforce access control at the database level — even if the client-side code is bypassed, the database rejects unauthorized operations.

| Table | Read | Insert | Update | Delete |
|-------|------|--------|--------|--------|
| profiles | Authenticated users | Admin or self | Self or admin | — |
| courses | Published (all), draft (owner/admin) | Instructor/admin | Owner/admin | Admin |
| lessons | Authenticated users | Instructor/admin | Instructor/admin | Instructor/admin |
| quiz_questions | Authenticated users | Instructor/admin | Instructor/admin | Instructor/admin |
| enrollments | Self or instructor/admin | Self or admin | Admin or self | — |
| progress | Self or instructor/admin | Self | Self | — |
| certificates | Self or admin | Self or admin | — | — |
| settings | Authenticated (read) | Admin | Admin | Admin |
| live_lessons | Authenticated users | Instructor/admin | Instructor/admin | Instructor/admin |
| course_files | Authenticated users | Instructor/admin | — | Instructor/admin |
| custom_assessments | Authenticated users | Instructor/admin | Instructor/admin | Instructor/admin |
| assessment_grades | Authenticated users | Instructor/admin | Instructor/admin | Instructor/admin |

### 4.2 Security Definer Functions
Database helper functions used in RLS policies (all `SECURITY DEFINER` with restricted `search_path`):
- `get_user_role()` — returns current user's role
- `is_admin()` — checks admin role
- `is_instructor()` — checks instructor role
- `is_instructor_or_admin()` — checks either role

### 4.3 Triggers
- `on_auth_user_created` — automatically creates a profile row when a new user signs up, ensuring referential integrity

### 4.4 Constraints
- Unique constraints on `enrollments(user_id, course_id)` prevent duplicate enrollments
- Unique constraints on `progress(user_id, lesson_id)` prevent duplicate progress records
- Unique constraints on `assessment_grades(assessment_id, user_id)` prevent duplicate grades
- Foreign key constraints with `ON DELETE CASCADE` ensure data cleanup

---

## 5. Data Protection

### 5.1 Credential Management
- **No hardcoded credentials** in source code — all API keys and secrets are stored as environment variables
- **Supabase anonymous key** is used client-side (designed to be public; all security enforced via RLS)
- **No service role key** is exposed in client code
- **ElevenLabs API key** stored as `VITE_ELEVENLABS_API_KEY` environment variable
- **Environment variables** (`.env`) are excluded from git via `.gitignore`
- **Vercel environment variables** configured in the deployment dashboard, not in source code

### 5.2 Data Access Controls
- **Enrollment gating** — learners cannot access course content until their enrollment is approved
- **Invoice client view** — admin-only toggle hides overhead breakdown from non-admin users; non-admins cannot toggle it
- **Instructor isolation** — instructors can only manage their own courses and view their own students' progress

### 5.3 File Storage
- File uploads go to Supabase Storage with public bucket access (for serving media to authenticated users)
- Upload paths use randomized filenames (`timestamp-random.ext`) to prevent directory traversal and filename guessing

---

## 6. Client-Side Security

### 6.1 XSS Prevention
- **HTML sanitization** — all user-generated HTML content (slide bodies from TipTap editor) is sanitized using **DOMPurify** before rendering via `dangerouslySetInnerHTML`
- **No `eval()`** or `Function()` — no dynamic code execution anywhere in the codebase
- **No `innerHTML` assignment** — all HTML rendering goes through React or DOMPurify

### 6.2 Input Validation
- **File size limits**: Images (5MB), Videos (100MB), PDFs (50MB), Course files (50MB)
- **File extension whitelist**: Images (jpg, jpeg, png, gif, webp, svg), Videos (mp4, webm, mov, avi), PDFs (pdf only)
- **MIME type validation**: Checked in addition to file extension
- **TypeScript** provides compile-time type safety across the entire codebase, preventing type-related runtime errors

### 6.3 SQL Injection Prevention
- **All database queries** use the Supabase SDK with parameterized queries
- **No raw SQL** is executed from client code
- **No string concatenation** in query construction

---

## 7. HTTP Security Headers

Configured via `vercel.json` and applied to all routes:

| Header | Value | Purpose |
|--------|-------|---------|
| X-Content-Type-Options | nosniff | Prevents MIME type sniffing |
| X-Frame-Options | SAMEORIGIN | Prevents clickjacking |
| Referrer-Policy | strict-origin-when-cross-origin | Controls referrer information |
| Permissions-Policy | camera=(), microphone=(), geolocation=() | Disables unnecessary browser APIs |

Additional security provided by infrastructure:
- **HTTPS enforced** by Vercel (automatic SSL/TLS)
- **HSTS** managed by Vercel's CDN
- **DDoS protection** via Vercel's global edge network

---

## 8. Infrastructure Security

### 8.1 Hosting (Vercel)
- Static SPA served from global CDN
- Automatic HTTPS with managed SSL certificates
- DDoS protection and rate limiting at the edge
- Automatic deployments from GitHub (no manual file uploads)
- Environment variables stored securely in Vercel dashboard
- No server-side code or custom API endpoints to attack

### 8.2 Database (Supabase)
- Managed PostgreSQL with automatic daily backups
- HTTPS-only API access
- JWT-based authentication for all API calls
- Row-Level Security enforced on every table
- Connection pooling via Supabase's PgBouncer
- Database hosted in isolated cloud environment

### 8.3 Authentication (Supabase Auth)
- Industry-standard JWT token management
- Secure password hashing (bcrypt)
- Email confirmation and password reset flows
- Session token refresh handled automatically
- Rate limiting on auth endpoints (managed by Supabase)

---

## 9. Deployment Pipeline

1. Source code hosted on **GitHub** (private repository)
2. Developers push to `main` branch
3. Vercel automatically builds and deploys
4. Build process: Vite production build (minified, tree-shaken, code-split)
5. Environment variables injected at build time from Vercel dashboard
6. No secrets in build output — only public anon key is embedded (secured by RLS)

---

## 10. OWASP Top 10 Coverage

| OWASP Risk | Status | How It's Addressed |
|------------|--------|-------------------|
| A01: Broken Access Control | Mitigated | RLS on all tables, role-based route protection, enrollment gating |
| A02: Cryptographic Failures | Mitigated | HTTPS enforced, passwords hashed by Supabase Auth (bcrypt), no sensitive data in localStorage |
| A03: Injection | Mitigated | Parameterized queries via Supabase SDK, no raw SQL, DOMPurify for HTML |
| A04: Insecure Design | Mitigated | Defense-in-depth (client + database access control), principle of least privilege |
| A05: Security Misconfiguration | Mitigated | Security headers configured, no default credentials, .env excluded from git |
| A06: Vulnerable Components | Monitored | Dependencies regularly auditable via `npm audit`, no known critical vulnerabilities |
| A07: Authentication Failures | Mitigated | Supabase Auth with bcrypt hashing, session management, rate limiting |
| A08: Data Integrity Failures | Mitigated | Database constraints, foreign keys, unique indexes, cascading deletes |
| A09: Logging & Monitoring | Partial | Supabase logs API requests, Vercel logs deployments; application-level audit logging not yet implemented |
| A10: Server-Side Request Forgery | N/A | No server-side code; all API calls are client-to-Supabase direct |

---

## 11. Compliance Notes

- **Data isolation** — each client instance uses a separate Supabase project with its own database, ensuring complete data isolation between tenants
- **Data residency** — Supabase project region can be configured per client to meet data residency requirements
- **Access audit** — all data access is controlled by RLS policies; database logs are available in Supabase dashboard
- **Password policy** — managed by Supabase Auth; configurable minimum length and complexity requirements
- **Session management** — JWT tokens with configurable expiry; automatic refresh; secure cookie handling

---

## 12. Contact

For security inquiries or to report vulnerabilities:
**admin@blucruph.com**
