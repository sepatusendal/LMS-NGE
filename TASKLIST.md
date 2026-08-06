# ECMS — MVP Task List

Breakdown fitur MVP jadi urutan kerja yang bisa langsung dieksekusi. Urutannya sengaja dependency-first — jangan loncat ke Phase N+1 sebelum Phase N kelar, karena semuanya numpuk di atas schema & auth.

Referensi utama: [context.md](context.md). Setiap task di bawah harus konsisten sama business rules di Section 5, dan gak boleh nabrak "What Not To Build" (Section 15).

---

## Phase 0 — Project Setup & Infra

- [x] Init repo Next.js 15 (App Router) + TypeScript + TailwindCSS
- [x] Install & konfigurasi shadcn/ui
- [ ] Setup Supabase project (free tier) — catat project URL & anon/service key **(butuh akun Supabase milik user)**
- [x] Setup Prisma schema siap konek ke Supabase Postgres (pooled `DATABASE_URL` + `DIRECT_URL`) — tinggal isi credential asli
- [ ] Setup Supabase Auth (email/password minimal buat MVP; Google SSO nanti di Phase Google Workspace) — nunggu project Supabase dibuat
- [ ] Setup Vercel project, connect ke repo, deploy "hello world" **(butuh akun Vercel + repo di GitHub)**
- [ ] Arahkan domain custom (punya sendiri) ke Vercel via DNS (CNAME/A record) **(butuh akses DNS management domain)**
- [x] Setup ENV template (`.env.example` + `.env` lokal kosong): Supabase URL/keys, `DATABASE_URL`, `DIRECT_URL`, Google Drive creds
- [x] Setup folder structure feature-based (route groups `(auth)/(teacher)/(admin)/(coordinator)` + `lib/supabase`, `features/`) — lihat Section 13 context.md
- [x] Setup ESLint + Prettier baseline (+ `prettier-plugin-tailwindcss` buat auto-sort class)

**Exit criteria:** app kosong ter-deploy di domain sendiri, konek ke Supabase, siap terima migration pertama.

---

## Phase 1 — Database Schema & Auth Foundation

- [x] Design ERD inti: `schools`, `teachers`, `students`, `classes`, `class_enrollments`, `curriculums`, `lesson_plans`, `meetings`, `attendances`, `check_ins`, `check_outs`, `teaching_reports`, `progress_records`, `parent_reports`, `student_follow_ups`, `users` (role mapping) — 17 tabel total
- [x] Semua tabel: UUID PK, `created_at`, `updated_at`, `deleted_at` (soft delete where applicable)
- [x] Prisma schema + migration pertama (Prisma downgrade 7→6 karena v7 buang dukungan `url`/`directUrl` di schema.prisma)
- [x] Setup `users` table terhubung ke Supabase Auth (trigger `on_auth_user_created` sync role dari `user_metadata`, FK cascade ke `auth.users`)
- [x] Row Level Security (RLS) policy per role — semua 17 tabel:
  - Admin: full CRUD semua tabel
  - Coordinator: read-only semua, no write ke master data
  - Teacher: read-only ke data miliknya sendiri (kelas yang di-assign, termasuk saat jadi substitute), write terbatas ke check-in/attendance/check-out/report miliknya
- [x] Middleware Next.js buat proteksi route by role (`src/middleware.ts`)
- [x] Login page + session handling (Supabase Auth, RHF + Zod)
- [x] Role-based redirect setelah login (Admin → `/dashboard`, Teacher → `/today`, Coordinator → `/monitoring`)

**Exit criteria:** 3 role bisa login, masing-masing landing di halaman yang benar, RLS block akses lintas-role di level DB (coba manual via API, bukan cuma UI).

---

## Phase 2 — Master Data (Admin)

- [x] CRUD Schools (nama, alamat, PIC sekolah, status aktif)
- [x] CRUD Teachers (data diri, status aktif — provisioning akun Supabase Auth otomatis via server action)
- [x] CRUD Students (data diri, NIS, sekolah)
- [x] CRUD Classes (nama kelas, sekolah, teacher, kurikulum, ruang, jadwal multi-hari)
- [x] CRUD Curriculum (nama, grade level, deskripsi)
- [x] Semua list pakai TanStack Table: search, pagination
- [x] Semua form pakai React Hook Form + Zod validation
- [x] Halaman detail Class: nampilin roster siswa (enroll/unenroll), teacher assigned, jadwal, ruang, kurikulum

**Gap ketemu dari review reference data (`reference-data/`) yang bikin schema Phase 2 di-adjust:**
- Class butuh field `room` + jadwal multi-hari (`scheduleDaysOfWeek`, bukan 1 hari doang — kelas ketemu 2x/minggu)
- Student butuh field `nis`
- Lesson Plan didesain ulang total di Phase 3 (lihat catatan di situ) berdasarkan template asli

**Exit criteria:** Admin bisa setup 1 sekolah lengkap dari nol — sekolah, teacher, kelas, siswa — tanpa nyentuh database manual.

---

## Phase 3 — Lesson Plan

**Koreksi dari plan awal (dikonfirmasi user):** Lesson Plan diisi **Teacher end-to-end** (jadwal + konten pedagogis), bukan di-scheduling Admin. Admin/Coordinator cuma monitor kepatuhan. Field lengkap & rasional udah didokumentasikan di context.md Section 5.5, schema-nya (`lesson_plans` table + RLS Teacher insert/update) udah dibuat di Phase 2 lanjutan. Sisa kerjaan di sini murni UI.

- [x] Halaman Teacher: form Lesson Plan lengkap (level, topic, objectives, skills, method, procedure, materials, vocabulary focus, stage-by-stage table, questions to ask, differentiation) — scoped ke kelas yang di-assign ke teacher itu (`/lesson-plan/new`, `/lesson-plan/[id]`)
- [x] List Lesson Plan per kelas milik teacher, sorted by tanggal, dengan badge "Aman" / "Perlu Lesson Plan" (`/lesson-plan`)
- [x] Validasi/warning: kalau sebuah Class punya lesson plan kurang dari 2 minggu ke depan → flag di dashboard Admin/Coordinator (`ComplianceAlert` component, dipasang di `/dashboard` & `/monitoring`)
- [x] View "Lihat Lesson Plan" read-only buat teacher yang bukan pemilik kelas itu (`readOnly` prop di `LessonPlanForm`, dicek via `useMyClasses`)
- [x] RLS + UI guard: teacher cuma bisa insert/edit lesson plan buat kelas yang dia pegang — **catatan:** sempet ketinggalan policy INSERT buat `meetings` (lihat log bug di bawah), udah di-fix
- [ ] (Opsional) Import data lesson plan dari `reference-data/contoh lesson plan.xlsx` sebagai referensi/starting data — belum dikerjain

**Exit criteria:** Teacher bisa isi lesson plan lengkap buat kelasnya sendiri 2+ minggu ke depan; Admin/Coordinator liat alert otomatis kalau ada kelas yang plan-nya mepet.

---

## Phase 4 — Teacher Core Workflow (Jantung Produk)

Ini yang paling kritis — harus persis ikutin sequence di Section 4 & business rules Section 5.1–5.4.

- [x] Halaman "Today's Class" (`/today`) — Teacher login langsung liat kelas hari ini aja, difilter dari `scheduleDaysOfWeek`
- [x] **Check-in**: sekalian pas tap "Mulai Kelas" (waktu auto-capture, `isLate` auto-dihitung dari jadwal + grace period 10 menit). GPS/foto belum ada input UI-nya — ditahan sampai Phase 9 (Google Drive) buat foto; GPS belum diprioritaskan, keduanya opsional per spec jadi gak blocking
- [x] Guard: Attendance cuma muncul kalau meeting udah `checked_in`
- [x] **Attendance**: list siswa di kelas (bulk upsert), default "Hadir", gak bisa lanjut check-out sebelum submit
- [x] Logika **Automatic Lesson Continuation**: `fetchTodayClasses()` di `src/features/meetings/queries.ts` — cari lesson plan pertama yang belum `COMPLETED` per kelas, teacher gak pernah milih manual
- [x] Lesson Plan (read-only preview) muncul otomatis pas status `attendance_done`, link ke detail lengkap
- [x] **Check-out**: satu tap, durasi auto-calculated dari selisih check-in/check-out (`durationMinutes`)
- [x] Guard: Report form cuma muncul kalau meeting udah `checked_out`
- [x] **Daily Teaching Report** form: skills, objectives achieved, what went well/needs improvement, next lesson notes, homework, students needing follow-up — field-nya udah sesuai template asli. Satu report per meeting di-enforce lewat unique constraint `meetingId` di DB
- [ ] Submit report → trigger **Progress Update otomatis** (`progress_records`) — **BELUM dikerjain**, `createReport()` sekarang cuma insert `teaching_reports` + `student_follow_ups`, gak nyentuh `progress_records` sama sekali. Ini exit-criteria item yang masih bolong.

**Status:** Alur inti (check-in → absensi → check-out → report) udah jalan end-to-end dan ke-verifikasi manual di browser (bukan cuma review kode). Yang masih kurang: auto Progress Update, dan capture foto/GPS opsional.

**Bug ditemukan & di-fix selama development Phase 3/4 (log biar gak keulang):**
1. RLS `meetings` gak punya policy `INSERT` buat Teacher — bikin "Mulai Kelas" ke-block Supabase pas check-in pertama kali. Fixed via migration `20260806080000_teacher_insert_meetings`.
2. Query `fetchTodayClasses()` pakai `Boolean(meeting?.checkOut)` dkk buat cek status — kalau Supabase balikin relasi to-one sebagai array kosong `[]` (bukan `null`), itu tetap `true` di JS (`Boolean([]) === true`), jadi status meeting langsung keliatan "Selesai" padahal baru check-in. Fixed pakai helper `toOne()` yang handle kedua bentuk.
3. **Bug besar:** semua kolom timestamp di DB tipe `TIMESTAMP` (tanpa timezone) → Supabase REST balikin string tanpa offset `Z` → browser (jalan di WIB/UTC+7) salah interpretasi jadi local time → semua perhitungan durasi/waktu meleset 7 jam (durasi check-out sempet kebaca 426 menit padahal aslinya ~12 menit). Fixed dengan migration `20260806090000_timestamptz_fix` yang convert 41 kolom timestamp di 16 tabel ke `TIMESTAMPTZ`, plus update `schema.prisma` biar konsisten (`@db.Timestamptz(3)`).
4. `isLate` di check-in sempet hardcode `false` selalu — sekarang dihitung dari `scheduleStartTime` kelas + grace period 10 menit.

---

## Phase 5 — Substitute Teacher & Handover

- [ ] Admin/Coordinator: fitur "Mark Teacher Absent" + assign substitute untuk meeting tertentu
- [ ] Substitute Teacher login → "Today's Class" nampilin kelas yang di-assign ke dia sebagai substitute
- [ ] Auto-generated **Handover Summary** (Section 7): previous lesson, homework, students requiring follow-up, teacher notes, current & next lesson — dirakit dari data existing, bukan input baru
- [ ] Substitute pakai flow yang SAMA PERSIS kayak Phase 4 (check-in → attendance → report) — jangan bikin flow terpisah
- [ ] Teaching Report dari substitute: field tambahan `original_teacher_id`, `substitute_teacher_id`, `replacement_reason`, `actual_teaching_date`
- [ ] Pastikan Automatic Lesson Continuation (dari Phase 4) jalan identik untuk substitute — reuse service yang sama, jangan duplikat logic

**Exit criteria:** Admin assign substitute → substitute login → langsung liat handover context lengkap tanpa buka laporan lain → ngajar → submit report ke-attribute dengan benar ke both original & substitute teacher.

---

## Phase 6 — Class Timeline

- [ ] View Class Timeline (Section 8): kronologis semua meeting per kelas — teacher, attendance summary, status report, progress
- [ ] Aksesible dari halaman detail Class (Admin & Coordinator)
- [ ] Visual: badge status per meeting (Completed / Scheduled / Substitute)

**Exit criteria:** buka satu Class, langsung keliatan histori lengkap dari meeting 1 sampai sekarang tanpa perlu buka tabel lain.

---

## Phase 7 — Monitoring Dashboard (Coordinator & Admin)

- [ ] Dashboard real-time: kelas hari ini, status check-in/attendance/report per kelas
- [ ] Alert list: kelas yang belum check-in padahal udah lewat jadwal, kelas dengan lesson plan mepet (dari Phase 3), report yang belum disubmit
- [ ] Filter by sekolah, teacher, tanggal
- [ ] Analytics ringan pakai Recharts: attendance rate trend, teaching completion rate

**Exit criteria:** Coordinator bisa lihat "ada masalah di kelas mana hari ini" tanpa nanya WhatsApp.

---

## Phase 8 — Parent Report (PDF)

- [ ] Service yang narik data dari Attendance + Teaching Reports + Progress + Curriculum untuk rentang waktu tertentu (bulanan) per siswa
- [ ] Auto-draft "Teacher Comments" dari kumpulan Teaching Report di periode itu (template + summary logic)
- [ ] UI review: Admin/Coordinator bisa edit draft comment sebelum generate final PDF
- [ ] Generate PDF pakai React PDF (default template)
- [ ] Fallback Puppeteer kalau ada layout yang gak bisa di-handle React PDF
- [ ] Simpan PDF hasil generate ke Google Drive (lihat Phase 9), simpan `drive_file_id` di DB — bukan simpan binary di Postgres
- [ ] Tombol "Generate Report" targetnya beneran one-click setelah review comment (Success Metric Section 17)

**Exit criteria:** pilih 1 siswa, 1 bulan → preview draft comment → edit dikit → generate PDF → PDF muncul di Drive & linked di app.

---

## Phase 9 — Google Drive Integration

- [ ] Setup Google Cloud project + Drive API credentials (service account atau OAuth, sesuaikan siapa yang punya akun Drive-nya)
- [ ] Service layer abstraksi `DriveService` (upload, get, delete) — biar gampang extend ke Calendar/Gmail nanti (Section 12)
- [ ] Upload classroom photo (dari check-in/check-out) langsung ke Drive, simpan `drive_file_id` + metadata di DB
- [ ] Upload generated Parent Report PDF ke folder terstruktur di Drive (per sekolah/per siswa)
- [ ] Pastikan TIDAK ADA binary file yang nyasar ke kolom Postgres — audit semua upload path

**Exit criteria:** foto check-in dan PDF report kelihatan di Google Drive folder yang rapi, DB cuma nyimpen reference-nya.

---

## Phase 10 — Hardening & Launch Prep

- [ ] Audit RLS policy ulang — coba akses lintas-role manual lewat API/Postgrest, pastikan ke-block
- [ ] Cek semua free-tier limit (Supabase DB size/API calls, Vercel function execution) — dokumentasiin kalau ada risiko kepepet limit
- [ ] Mobile responsiveness check khusus untuk flow Teacher (ini yang paling sering dipakai dari HP)
- [ ] Error handling & empty states di semua halaman utama
- [ ] Seed data / onboarding script buat 1 sekolah percobaan (dummy data realistis)
- [ ] Manual QA end-to-end: jalanin Core Workflow (Section 4) dari awal sampai Parent Report, sebagai satu skenario utuh
- [ ] Deploy final ke domain custom, smoke test di production

**Exit criteria:** semua 5 Success Metrics di Section 17 context.md bisa didemoin langsung ke stakeholder NGE.

---

## Urutan Kerja yang Disarankan

Phase 0 → 1 → 2 → 3 → 4 (paling kritis, alokasikan waktu paling banyak) → 5 → 6 → 7 → 8 → 9 → 10.

Phase 4 adalah jantung produk — kalau ini gak solid & cepat dipakai, seluruh value proposition ECMS runtuh. Jangan buru-buru ke Phase 5+ sebelum flow Teacher beneran kerasa cepat dan intuitif.
