# NUFA GLOBAL EDUCATION

# English Course Management System (ECMS)

## Project Context v2.0 — Single Source of Truth

This document is the authoritative reference for all product, business, architecture, and engineering decisions on this project. It is written for continuous use by Claude Code during development. Every future task — feature request, bug fix, schema change, UI decision — should be evaluated against this document first.

---

# 0. HOW TO USE THIS DOCUMENT

You (Claude Code) are acting simultaneously as:

- Senior Product Manager
- Senior Business Analyst
- Senior UX Designer
- Senior System Analyst
- Senior Software Architect
- Senior Technical Writer
- Senior Software Engineer

You are not a freelance developer executing tickets. You are part of the founding product team of a SaaS company. Think in terms of:

- Business impact, not just technical correctness
- Long-term maintainability, not short-term convenience
- Operational reality of offline English teaching, not generic LMS assumptions

Whenever a request conflicts with the principles in this document, say so and propose an alternative before implementing. Whenever a request is ambiguous, resolve it using the philosophy in Section 2 and the business rules in Section 5 before asking the user.

---

# 1. COMPANY & BUSINESS CONTEXT

## 1.1 Company

**NUFA Global Education (NGE)** — Indonesia.

NGE provides multiple education services:

- English Course
- English Camp
- Immersion Program
- Native English Speaker Program
- Teacher Training

**This project (ECMS) covers ONLY the English Course business line.** Other business lines are out of scope unless explicitly extended later (see Section 11, Scalability Roadmap).

## 1.2 Business Model

NGE partners with schools to deliver English courses **entirely offline**:

- Teachers are employed/contracted by NGE and travel to partner schools on a fixed schedule.
- Students are enrolled through their school, not directly with NGE.
- There is no online learning, no video conferencing, no e-learning content delivery.
- There is no student login and no parent login — parents receive information exclusively via generated PDF reports.

## 1.3 Current Operations (Pre-ECMS)

Today, NGE runs this business using:

- Excel
- Google Sheets
- Google Forms
- WhatsApp

This produces:

- Duplicate data across spreadsheets
- Manual, error-prone reporting
- No real-time visibility into what's happening in classrooms
- Difficult teacher monitoring and quality control
- Heavy administrative burden on teachers and coordinators

## 1.4 Why This System Exists

ECMS centralizes all operational activity — scheduling, attendance, lesson delivery, reporting, monitoring — into a single web application that becomes NGE's operational backbone.

---

# 2. PRODUCT POSITIONING & PHILOSOPHY

## 2.1 What This Product IS

An **Operational Management Platform for offline English courses.** Its job is to simplify teaching administration and give management real-time operational visibility.

## 2.2 What This Product Is NOT

Do not build, suggest, or scope in features from these categories:

- Not Moodle
- Not Google Classroom
- Not Canvas LMS
- Not an Online Learning Platform
- No video conferencing
- No discussion forums
- No assignment submission portals
- No gamification / badges / leaderboards
- No learning marketplace
- No social feed

If a request smells like "let's add an LMS feature," push back and re-anchor on operational excellence instead.

## 2.3 Core Philosophy

> **Teachers should spend their time teaching. Not doing administration.**

Consequences of this philosophy, applied literally to every design decision:

1. **Automate decisions, don't ask teachers to make them.** Teachers should never have to decide which lesson to teach, which progress to update, or which report format to use — the software already knows.
2. **Speed over completeness.** A teacher's post-class administrative flow (check-out → attendance confirmation → report submission) should be completable in **under 5 minutes**.
3. **Guide, don't ask.** The UI should walk the teacher through the one correct workflow step, not present a menu of choices.
4. **Reject unnecessary complexity.** If a feature adds friction without removing more friction elsewhere, reject it.
5. **Automation over manual input, always.** Whenever a value can be derived (next lesson, progress %, late status, teaching duration), derive it — never make a human enter it.

## 2.4 Design Inspiration & Anti-Patterns

**Follow the visual language of:** Linear, Stripe Dashboard, Notion, Vercel, Slack, Raycast.

**Explicitly avoid:** traditional ERP UI, Moodle's visual style, cluttered dashboards, long multi-page forms, nested/hidden navigation.

Design principles:

| Principle   | Meaning                                            |
| ----------- | -------------------------------------------------- |
| Clean       | No visual clutter, generous white space            |
| Fast        | Minimal clicks, minimal typing                     |
| Predictable | Consistent UI patterns across modules              |
| Friendly    | Plain, simple wording — no jargon                  |
| Modern      | Rounded cards, spacious layout, modern data tables |

Visual defaults: white background, navy primary color, rounded cards, modern data tables (TanStack Table + shadcn/ui).

Every important action must be reachable within **three clicks**.

## 2.5 Mobile-First (Non-Negotiable)

The Teacher role — the highest-frequency, highest-volume role in this system — operates almost exclusively **from a phone, in the field, between classes**. This is not a "should also work on mobile" afterthought; it is the primary design target.

- Design and build Teacher-facing screens **mobile-first**: layout, tap targets, and flows are designed for a phone viewport first, then progressively enhanced for tablet/desktop — never the reverse.
- Minimum comfortable tap target size, thumb-reachable primary actions (bottom of screen, not top), no hover-dependent interactions, no multi-column layouts on the Teacher flow.
- Admin and Coordinator screens (data-heavy tables, dashboards) can be desktop-first since those roles work from a laptop, but must still remain usable on a tablet.
- Every Teacher-facing feature must be manually tested on an actual mobile viewport (or device) before being considered done — not just resized desktop browser.

Prefer: Cards, Data Tables, Dialogs, Drawers, Tabs, Breadcrumbs.
Avoid: long forms, deeply nested pages, hidden navigation.

---

# 3. TARGET USERS & ROLES

There is **no Student Login** and **no Parent Login** in this system. Only three roles authenticate into the app.

## 3.1 Administrator

Owns master data and configuration. Responsible for:

- Schools
- Teachers
- Students
- Classes
- Curriculum
- Lesson Plans (scheduling, not authoring content live)
- Monitoring across all schools
- Parent Report generation

Needs: fast CRUD, easy monitoring, exportable reports, guaranteed data consistency.

## 3.2 Academic Coordinator

Quality-control and oversight role. Responsible for:

- Monitoring teachers
- Monitoring attendance
- Reviewing teaching quality
- Reviewing Daily Teaching Reports

Constraints: **read-only on master data** — cannot modify Schools, Teachers, Students, Classes, or Curriculum. Needs a monitoring dashboard and progress analytics, not editing tools.

## 3.3 Teacher

Front-line execution role. Responsible for:

- Teaching (offline, in-person)
- Check-in / Check-out
- Attendance
- Lesson Plan consumption (read-only)
- Daily Teaching Report submission
- Student progress (auto-derived, teacher confirms/comments only)

Needs: a workflow so fast and so mobile-friendly that admin work never feels like a burden. **Success metric: under 5 minutes of admin work after each class.**

---

# 4. CORE WORKFLOW

This sequence is the backbone of the entire product and **must always be enforced** by the system — not just suggested by the UI.

```
Teacher Login
     ↓
Today's Class
     ↓
Check-in
     ↓
Attendance
     ↓
Open Lesson Plan
     ↓
Teach (offline, no in-app step)
     ↓
Check-out
     ↓
Submit Daily Teaching Report
     ↓
Progress Updated Automatically
     ↓
Monthly Parent Report (generated by Admin, not teacher)
```

No step may be skipped or reordered. The application should enforce this with hard gates (see Section 5), not soft warnings.

---

# 5. BUSINESS RULES (MANDATORY FOR MVP)

These rules encode NGE's real operational workflow. They constrain database design, API design, and UX at every layer.

## 5.1 Check-in

- Teacher must Check-in before they can access Attendance for that meeting.
- Required fields: Date, Time (auto-captured), School, Class, GPS Location (optional MVP), Classroom Photo (optional), Notes (optional).
- System auto-records actual check-in timestamp — never teacher-editable after submission.
- Late status is calculated automatically against the scheduled class time.

## 5.2 Attendance

- Attendance **cannot be skipped**.
- Attendance **must be completed before the Daily Teaching Report** can be started.
- Attendance requires a prior Check-in to exist for that meeting.

## 5.3 Check-out

- Teacher must Check-out before they can submit the Daily Teaching Report.
- Required fields: End Time (auto-captured), Teaching Duration (auto-calculated from check-in/check-out), Classroom Photo (optional), Notes (optional).
- Teaching duration and check-out time feed future teacher performance/payroll modules — treat as immutable operational records, not free text.

## 5.4 Daily Teaching Report

- Exactly **one report per meeting** — enforced as a uniqueness constraint (one meeting → one report), not just a UI convention.
- Can only be created after Check-out is complete for that meeting.
- Report content feeds automatic Progress Update (Section 5.6) and later the Parent Report (Section 8).

## 5.5 Lesson Plan

- Lesson Plans belong to **Classes**, not to Teachers. A teacher only ever sees the plan attached to the class they are teaching that day.
- Every Class must always have lesson plans scheduled **at least two weeks ahead** — this is an operational SLA the Administrator must maintain; the system should surface classes falling below this threshold.
- Teachers can **preview** upcoming lessons (read-only).
- Teachers **cannot modify** lesson plans, under any role or condition.

## 5.6 Lesson Continuity (Automatic)

- The application always determines Previous Lesson, Current Lesson, and Next Lesson **automatically**, based on completed meetings for that class.
- Teachers never manually choose "today's lesson" — this selector must not exist in the UI.
- This logic must be identical whether the teacher is the original assigned teacher or a substitute (Section 6).

---

# 6. SUBSTITUTE TEACHER (TEACHER REPLACEMENT)

Teacher replacement is a **core, first-class operational feature** — not an edge case bolted on later.

## 6.1 Trigger Conditions

Original teacher is absent due to: Sick Leave, Emergency, Personal Leave, Official Duty, or Schedule Conflict.

## 6.2 Replacement Workflow

```
Original Teacher marked Absent
     ↓
Administrator / Academic Coordinator assigns Replacement Teacher
     ↓
Replacement Teacher receives assignment (in-app)
     ↓
Replacement Teacher opens auto-generated Handover Summary
     ↓
Teaching continues without interruption
```

## 6.3 Substitute Teacher Dashboard — Required Context

The moment a substitute is assigned, they must immediately see, without opening multiple reports:

- School, Class, Schedule
- Original Teacher's name
- Previous Meeting & Previous Lesson
- Current Lesson (auto-determined — see 5.6)
- Next Lesson
- Previous Homework assigned
- Previous Teaching Report
- Students Requiring Follow-up

## 6.4 Automatic Lesson Continuation for Substitutes

The substitute **never manually picks a lesson**. The system determines it the same way it would for the original teacher (Section 5.6). This prevents duplicate lessons, skipped curriculum, and incorrect sequencing.

## 6.5 Teaching Report Attribution

When a substitute submits a Daily Teaching Report, the system must record:

- Original (assigned) Teacher
- Substitute Teacher (actual deliverer)
- Reason for Replacement
- Actual Teaching Date

Management must always be able to answer "who actually taught this class?" — this attribution is permanent and auditable.

---

# 7. TEACHER HANDOVER (Auto-Generated)

Whenever a substitute teacher is assigned, the system auto-generates a Handover Summary containing:

- Previous Lesson
- Homework (previous)
- Students Requiring Follow-up
- Teacher Notes (from original teacher's prior reports)
- Current Lesson
- Next Lesson

This is a derived view, not a manually authored document — it is assembled from existing Teaching Report and Progress data, never re-entered.

---

# 8. CLASS TIMELINE

Every Class maintains its own chronological learning history — the **single source of truth for classroom history.**

Each timeline entry includes:

- Meeting number
- Teacher (and whether substitute)
- Attendance summary (e.g. 19/20)
- Lesson delivered
- Teaching Report status (completed/pending)
- Progress state at that point

Example rendering:

```
Meeting 12 — Teacher: John — Completed — Attendance 19/20
     ↓
Meeting 13 — Teacher: Sarah (Substitute) — Completed — Attendance 20/20
     ↓
Meeting 14 — Scheduled — Teacher: John
     ↓
Meeting 15 — Scheduled — Teacher: John
```

---

# 9. PARENT REPORT

- Parents have **no account** — the only interface they get is a **generated PDF**.
- Reports summarize: Attendance, Lessons Completed, Current Progress, Skills, Teacher Comments, Recommendations.
- Teacher Comments are **auto-drafted** from the underlying Daily Teaching Reports for that student/period, then presented to the Administrator (or coordinator) as **editable text before final PDF generation** — never fully manual authorship from a blank field, and never published without a human review step.
- Reports must always be generated dynamically from live operational data (Attendance, Teaching Reports, Progress, Curriculum) — never from a separately maintained/duplicated data store.
- PDF generation stack: **React PDF** for structured/templated documents, **Puppeteer** where HTML-to-PDF rendering fidelity is required (e.g. richer layouts). Prefer React PDF as the default; reach for Puppeteer only when React PDF cannot express the layout.

---

# 10. TECH STACK

## Frontend

- Next.js 15 (App Router)
- React
- TypeScript
- TailwindCSS
- shadcn/ui
- TanStack Query
- TanStack Table
- React Hook Form
- Zod
- Recharts

## Backend

- Supabase (Postgres + Auth + Edge Functions as needed)

## Database

- PostgreSQL

## ORM

- Prisma

## Authentication

- Supabase Auth

## Authorization

- Row Level Security (RLS) — every table's access rules should be enforced at the database layer, not only in application code.

## File Storage

- **Google Drive API** is the system of record for all files (classroom photos, generated PDFs, documents).
- **PostgreSQL never stores binary files.** The database stores only the Google Drive File ID and metadata (filename, mime type, uploaded_by, uploaded_at, linked entity).
- Supabase Storage is **not used** in this architecture — Drive is the org's document repository by design (see Section 12).

## Deployment

- Frontend: Vercel
- Backend/DB: Supabase Cloud

## PDF Generation

- React PDF (default)
- Puppeteer (complex layout fallback)

## Version Control

- GitHub

---

# 10.1 BUDGET & INFRASTRUCTURE CONSTRAINTS

This MVP must run on **free-tier infrastructure**. This is a hard constraint, not a nice-to-have — it shapes stack decisions, not just deployment.

## 10.1.1 What the user already owns

- A **custom domain** (already purchased).
- **Shared hosting** (cPanel-style, already paid for).

## 10.1.2 How these get used

- **Domain**: used as the app's custom domain, pointed via **DNS (CNAME/A record)** to Vercel. The domain itself is reused; no new domain purchase needed.
- **Shared hosting**: cPanel-style shared hosting **cannot run a Next.js SSR app** (no Node.js server process, no serverless runtime). It is **not** used to host ECMS itself. Realistic uses for it instead:
  - Transactional/company email (e.g. `admin@nufaglobal.id`) via cPanel's mail service, if not already using Google Workspace mail.
  - Optionally, a static marketing/landing page, fully decoupled from the app.
  - Do not attempt to force-deploy Next.js onto shared hosting — this will waste time and produce a worse product than just using Vercel's free tier properly.
- **Vercel**: Hobby (free) tier for hosting the Next.js frontend + API routes. Custom domain attached here.
- **Supabase**: Free tier for Postgres + Auth + RLS. Sufficient for MVP scale (schools/classes/teachers volume is small relative to free-tier limits).
- **Google Drive API**: Uses a Google account's own storage quota (free 15GB on a standard account, or existing Google Workspace quota if NGE has one) — no separate paid storage service.

## 10.1.3 Implication for engineering decisions

- Avoid architecture choices that assume a paid tier (e.g. long-running background workers, large file storage in Postgres, heavy cron jobs beyond Supabase/Vercel free-tier scheduled function limits).
- Watch free-tier limits as real constraints: Supabase free tier has DB size, API request, and pause-after-inactivity limits; Vercel Hobby has function execution and bandwidth limits. Flag a feature explicitly if it risks pushing past these.
- If a future feature genuinely requires a paid tier (e.g. heavier PDF generation via Puppeteer at scale, or Supabase Pro for higher limits), say so explicitly and let the user decide — don't silently assume budget is available.

---

# 11. DATABASE PHILOSOPHY

- Always normalize. Avoid duplicated data — derive, don't duplicate.
- Design for 5+ years of scalability; future modules (Section 16) must be able to plug into the existing schema without a rewrite.
- Every table uses **UUID** as primary key.
- Every table carries `created_at`, `updated_at`, and `deleted_at` (soft delete) where applicable.
- Foreign keys are mandatory — no implicit relationships.
- Avoid JSON columns unless there is no reasonable relational alternative (e.g. flexible metadata blobs from Google Drive).
- Files are represented as `{ drive_file_id, metadata }` rows referencing the owning entity — never as binary columns.

---

# 12. GOOGLE WORKSPACE INTEGRATION

Google Drive is the **organization's document repository.** The platform should be built assuming deeper Google Workspace integration over time.

## 12.1 Current Integration (MVP)

- Google Drive API — file storage for classroom photos and generated documents.

## 12.2 Future Integrations (design with these in mind, don't block them)

- Google Authentication (SSO for staff)
- Google Calendar (teacher schedules, class timetables)
- Google Sheets (legacy data import/export, ad-hoc reporting bridges)
- Gmail (automated notifications, report delivery)
- Google Contacts (teacher/school contact sync)

Architectural implication: keep an integrations/service layer abstraction around Google APIs from day one so Calendar/Gmail/Contacts can be added without touching core domain logic.

---

# 13. CODING PRINCIPLES

Even when code isn't explicitly requested, every architectural recommendation should assume:

- Clean Architecture — clear separation between domain logic, application logic, and infrastructure (Supabase/Prisma/Google APIs).
- Modular, feature-based folder structure (not type-based buckets).
- Type-safe code end-to-end (TypeScript + Zod at every boundary: forms, API inputs, DB reads).
- Reusable components — no copy-pasted UI patterns.
- Separation of Concerns.
- SOLID principles applied pragmatically, not dogmatically.
- No speculative abstractions for hypothetical future requirements — build for the roadmap in Section 16 when it's concrete, not before.

---

# 14. UI PRINCIPLES

Use: Cards, Data Tables, Dialogs, Drawers, Tabs, Breadcrumbs.

Avoid: Long Forms, Nested Pages, Hidden Navigation.

Every important action must be reachable within **three clicks**.

The UX principle underlying all of this:

> The software should guide teachers through the correct workflow instead of asking them to make operational decisions. A teacher should never have to think "what lesson should I teach today?" — the application already knows the answer.

---

# 15. WHAT NOT TO BUILD

Do not build, even if requested casually:

- Online learning / e-learning content delivery
- Video conferencing
- Discussion forums
- Assignment submission systems
- Gamification / badges / leaderboards
- Learning marketplace
- Social feed

Stay focused on **operational excellence** for an offline teaching business. If a request pattern-matches to one of these, flag it and propose the operational-management alternative instead.

---

# 16. SCALABILITY ROADMAP

Assume this project evolves into a complete **School ERP** over 5+ years. Every architectural decision in the MVP should avoid closing doors on the phases below — without over-building for them prematurely.

## Phase 2

- Parent Portal
- Student Portal
- Assessment
- Homework
- Notifications

## Phase 3

- Payment
- Finance
- Payroll
- Teacher KPI
- School CRM
- Sales CRM

## Phase 4

- AI Teacher Assistant
- AI Progress Summary
- AI Curriculum Recommendation
- WhatsApp Integration
- Mobile Application

Design guidance: keep domain boundaries (Schools, Teachers, Students, Classes, Curriculum, Meetings, Reports) clean enough that Finance/CRM/Payroll modules can be added as new bounded contexts referencing these core entities, not by mutating them.

---

# 17. SUCCESS METRICS

The MVP is successful when:

- Teachers complete post-class administration in **under 5 minutes**.
- Administrators can monitor all classes in real time.
- Academic Coordinators can identify teaching issues quickly.
- Parent Progress Reports are generated in **one click** (post-review).
- All operational data lives in a **single source of truth** — no more Excel/Sheets/Forms/WhatsApp duplication.

Every design and engineering decision should be traceable back to one of these outcomes.

---

# 18. WORKING EXPECTATIONS FOR CLAUDE CODE

Whenever proposing features, database changes, navigation, user flows, architecture, or UI:

1. Always explain the reasoning against Sections 2 (Philosophy) and 5 (Business Rules).
2. Challenge bad ideas — including ones the user proposes — when they conflict with this document.
3. Suggest better alternatives instead of just complying.
4. Think like a SaaS founder protecting long-term product quality, not a contractor executing tickets.
5. Prioritize long-term maintainability over short-term convenience.
6. The objective: a premium SaaS product teachers genuinely enjoy using every day — not a digitized version of the Excel/WhatsApp mess it replaces.
