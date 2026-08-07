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
- **Gap kedua, ketemu pas import data real (2026-08-06):** sejumlah kelas ketemu 2x/minggu dengan **tutor dan/atau jam beda di tiap harinya** (mis. kelas "Houstan": Rabu diajar Bu Eni jam 14:30, Sabtu diajar Latifa jam 07:30) — `Class.teacherId`/`scheduleStartTime`/`scheduleEndTime` cuma nampung satu default. Ditambah tabel `class_schedule_overrides` (per class × dayOfWeek: startTime, endTime, teacherId opsional) sebagai pengecualian per-hari, migration `20260806100000_class_schedule_overrides`. `fetchTodayClasses()` & `startClass()` (`src/features/meetings/queries.ts`) sekarang resolve jadwal/teacher efektif hari itu dari override kalau ada, fallback ke default Class kalau enggak. RLS `is_teacher_class()` di-update biar teacher yang cuma punya override (bukan default teacherId) tetap punya akses. Admin CRUD Class sekarang punya UI buat ngedit override ini — panel "Jadwal per Hari" di halaman detail Class (`ScheduleOverridesPanel`, `src/features/classes/schedule-overrides-panel.tsx`), muncul otomatis kalau kelas ketemu 2x+/minggu. Per hari bisa di-set/edit/hapus override (jam + tutor), fallback ke default Class kalau gak di-override. Diverifikasi end-to-end di browser.

**Bug ditemukan & di-fix pas verifikasi (2026-08-06):** parser Excel salah nangkep 9 baris "siswa" palsu (bocoran dari kotak tally kayak "DK 1", "Basic 3", dll di kolom sebelah roster asli) karena kondisi stop-row cuma cek 3 kolom sekaligus harus kosong, padahal baris tally itu kolom NO/NIS-nya kosong tapi kolom NAMA-nya keisi. 9 enrollment + 9 student row palsu itu udah dihapus manual dari DB (gak ada dependency lain, aman).

**Import data real dari `reference-data/KELAS ENGLISH COURSE JULI.xlsx` (2026-08-06):** sheet "KELAS" (SD+SMP/SMA campur, sheet "smp sma" & "PLACEMENT" sengaja di-skip atas arahan user) di-parse & di-seed ke production lewat `scripts/seed-nurul-fajri.ts` (idempotent, aman di-run ulang). Hasil: 1 sekolah (Nurul Fajri), 8 akun teacher baru (email `nama@nufaglobaledu.com`, password random — udah dikasih ke user sekali di output, gak disimpan di kode), 24 kelas (15 di antaranya pakai `class_schedule_overrides`), 311 siswa (NIS yang collide di sumber data di-disambiguasi dengan suffix `-DUP1`/`-DUP2` dst, nama asli dipertahankan), 315 baris enrollment. Kelas dummy lama "Georgetown" (teacher test "John Doe") dihapus bersih sebelum seed karena namanya nabrak & itu bukan bagian dari data referensi.

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
- [x] Submit report → trigger **Progress Update otomatis** (`progress_records`) — `createReport()` di `src/features/reports/queries.ts` sekarang insert satu `progress_records` row per siswa hadir (PRESENT/LATE) × per skill yang diajarkan, note diambil dari `whatWentWell` (fallback ke label `objectivesAchieved`). Diverifikasi jalan end-to-end di browser.

**Status:** Alur inti (check-in → absensi → check-out → report → progress update) udah jalan end-to-end dan ke-verifikasi manual di browser. Exit criteria Phase 4 **selesai**. Yang masih optional/ditahan: capture foto/GPS saat check-in/check-out (Phase 9).

**Bug tambahan ditemukan & di-fix saat review detail (2026-08-06):**
5. `useTodayClasses()` di `src/features/meetings/use-today.ts` melaporkan `isLoading: false` selagi masih nunggu profil teacher (`useCurrentTeacher`) selesai fetch, karena query di-disable duluan (`enabled: Boolean(teacher?.teacherId)`) — React Query gak menghitung itu sebagai "loading". Akibatnya tiap kali halaman `/today` di-refresh, sempet kekilat empty-state "Tidak Ada Kelas Hari Ini" yang salah sebelum data asli muncul. Fixed dengan menggabungkan `isLoading`/`isError`/`error` dari `useCurrentTeacher` dan query kelas.

**Bug ditemukan & di-fix selama development Phase 3/4 (log biar gak keulang):**
1. RLS `meetings` gak punya policy `INSERT` buat Teacher — bikin "Mulai Kelas" ke-block Supabase pas check-in pertama kali. Fixed via migration `20260806080000_teacher_insert_meetings`.
2. Query `fetchTodayClasses()` pakai `Boolean(meeting?.checkOut)` dkk buat cek status — kalau Supabase balikin relasi to-one sebagai array kosong `[]` (bukan `null`), itu tetap `true` di JS (`Boolean([]) === true`), jadi status meeting langsung keliatan "Selesai" padahal baru check-in. Fixed pakai helper `toOne()` yang handle kedua bentuk.
3. **Bug besar:** semua kolom timestamp di DB tipe `TIMESTAMP` (tanpa timezone) → Supabase REST balikin string tanpa offset `Z` → browser (jalan di WIB/UTC+7) salah interpretasi jadi local time → semua perhitungan durasi/waktu meleset 7 jam (durasi check-out sempet kebaca 426 menit padahal aslinya ~12 menit). Fixed dengan migration `20260806090000_timestamptz_fix` yang convert 41 kolom timestamp di 16 tabel ke `TIMESTAMPTZ`, plus update `schema.prisma` biar konsisten (`@db.Timestamptz(3)`).
4. `isLate` di check-in sempet hardcode `false` selalu — sekarang dihitung dari `scheduleStartTime` kelas + grace period 10 menit.
5. **Dead-end absensi buat kelas 0 siswa** (2026-08-06): `AttendanceForm` dikasih tombol "Lanjutkan" buat kelas yang belum ada siswanya, tapi cuma nutup panel doang — gak pernah nulis row ke `attendances`, jadi `hasAttendance` gak pernah `true`, meeting stuck permanen di status "checked_in" (Check-out gak pernah bisa diakses). Fixed di `fetchTodayClasses()`: `hasAttendance` sekarang juga `true` kalau kelasnya emang belum ada siswa terdaftar sama sekali (dicek dari `class_enrollments`), tapi **cuma berlaku setelah check-in** — percobaan pertama nge-fix ini bablas ngizinin skip check-in juga, ke-tangkep pas testing manual (Check-out muncul sebelum "Mulai Kelas" diklik → `doCheckOut()` bakal error karena belum ada check-in row) dan langsung dikoreksi.

---

## Phase 5 — Substitute Teacher & Handover

- [x] Admin/Coordinator: fitur "Mark Teacher Absent" + assign substitute untuk meeting tertentu — panel "Substitute Teacher" di halaman detail Class (`src/features/substitutes/substitute-panel.tsx`), pilih substitute + alasan (Sick Leave/Emergency/Personal Leave/Official Duty/Schedule Conflict), bisa dibatalkan selama meeting belum di-check-in
- [x] Substitute Teacher login → "Today's Class" nampilin kelas yang di-assign ke dia sebagai substitute — `fetchTodayClasses()` (`src/features/meetings/queries.ts`) sekarang juga narik meeting di mana `actualTeacherId` = teacher yang login (bukan cuma kelas miliknya/override harian), difilter by `lessonPlan.scheduledDate` = hari ini
- [x] Auto-generated **Handover Summary** (Section 7): previous lesson, homework, students requiring follow-up, teacher notes, current & next lesson — `fetchHandoverSummary()` (`src/features/substitutes/queries.ts`), dirakit murni dari lesson_plans + teaching_reports + student_follow_ups yang udah ada, gak ada input baru. Muncul di `/today` sebagai panel expandable begitu ada assignment substitute, bisa dibuka sebelum check-in
- [x] Substitute pakai flow yang SAMA PERSIS kayak Phase 4 (check-in → attendance → report) — gak ada flow terpisah, `startClass()`/`AttendanceForm`/`ReportForm` dipakai identik
- [x] Teaching Report dari substitute: field tambahan `originalTeacherId`, `substituteTeacherId`, `replacementReason`, `actualTeachingDate` — semua udah ada di schema dari awal, `replacementReason` sekarang di-copy otomatis dari `meeting.substituteReason` pas submit report (`src/features/reports/queries.ts`)
- [x] Pastikan Automatic Lesson Continuation (dari Phase 4) jalan identik untuk substitute — reuse resolver yang sama (`resolveCurrentLessonPlan`), gak ada logic duplikat

**Bug RLS ditemukan & di-fix pas build & verifikasi end-to-end (2026-08-06):**
1. `is_teacher_meeting()`/`teacher_read_own_meetings` cuma cek meeting itu sendiri (assignedTeacherId/actualTeacherId), bukan "apakah teacher ini punya akses ke kelasnya". Substitute yang cuma nempel di 1 meeting jadi gak bisa lihat meeting-meeting LAIN di kelas yang sama → Automatic Lesson Continuation salah hitung (semua meeting sebelumnya keanggep "belum selesai", balik ke Meeting 1). Fixed: `is_teacher_meeting()` sekarang delegate ke `is_teacher_class()` (class-wide), migration `20260806110000_teacher_class_wide_meeting_read`.
2. RLS `users` cuma boleh baca row sendiri → nama guru asli/pengganti selalu blank buat teacher lain. Ditambah policy teacher-to-teacher read buat role TEACHER (fullName+email, bukan admin/coordinator), migration `20260806111500_teacher_read_teacher_names`.

**Exit criteria:** Admin assign substitute → substitute login → langsung liat handover context lengkap tanpa buka laporan lain → ngajar → submit report ke-attribute dengan benar ke both original & substitute teacher. **Diverifikasi end-to-end di browser** (bukan cuma review kode): assign, lihat banner + handover, check-in → absensi → check-out → report, attribution ke-cek benar di DB, dan cancel-before-checkin juga ke-tes.

---

## Phase 6 — Class Timeline

- [x] View Class Timeline (Section 8): kronologis semua meeting per kelas — teacher, attendance summary, status report, progress (`src/features/meetings/timeline-queries.ts` + `class-timeline.tsx`)
- [x] Aksesible dari halaman detail Class (Admin & Coordinator)
- [x] Visual: badge status per meeting (Completed / Scheduled), plus badge "Substitute" terpisah di baris teacher

**Bug ditemukan & di-fix pas review (2026-08-06):** `timeline-queries.ts` akses `meeting.checkIn`/`checkOut`/`teachingReport` sebagai objek langsung, padahal Supabase balikin relasi itu sebagai **array** `[{...}]` (diverifikasi manual query ke DB) — persis bug yang sama kayak Phase 4 bug #2. Akibatnya jam check-in/check-out gak pernah muncul, dan `hasReport` selalu `true` (`Boolean([])` di JS). Fixed pakai helper `toOne()` yang sama kayak `meetings/queries.ts`. Juga `isSubstitute` sempet dibandingin pakai **nama** teacher (rapuh), diganti bandingin `assignedTeacherId !== actualTeacherId`. Diverifikasi ulang di browser — check-in/check-out/durasi/status report semua muncul benar sekarang.

**Exit criteria:** buka satu Class, langsung keliatan histori lengkap dari meeting 1 sampai sekarang tanpa perlu buka tabel lain.

---

## Phase 7 — Monitoring Dashboard (Coordinator & Admin)

- [x] Dashboard real-time: kelas hari ini, status check-in/attendance/report per kelas (`StatusBoard`, `src/features/monitoring/status-board.tsx` + `queries.ts`) — dipasang di `/dashboard` (Admin) dan `/monitoring` (Coordinator)
- [x] Alert list: kelas yang belum check-in padahal udah lewat jadwal (badge "Belum check-in" + banner ringkasan), kelas dengan lesson plan mepet (`ComplianceAlert`, udah ada dari Phase 3), report yang belum disubmit (badge "Report belum ada" begitu status `checked_out` tapi belum ada `teaching_reports`)
- [x] Filter by sekolah, teacher, tanggal — date picker (default hari ini, bisa mundur/maju lihat histori/rencana), dropdown sekolah & teacher
- [x] Analytics ringan pakai Recharts: attendance rate trend & teaching completion rate, line chart 14 hari terakhir (`AnalyticsCharts`)

Diverifikasi end-to-end di browser: alert "belum check-in" muncul benar, badge "Substitute" ke-detect, filter teacher beneran nge-filter list & alert banner ikut update. Ketemu & di-fix 1 bug pas verifikasi: key React di list status pakai `classId` (bisa collide kalau 1 kelas punya >1 meeting di tanggal yang sama), diganti `lessonPlanId` yang unik per baris.

**Admin Dashboard diperluas jadi laporan operasional lengkap (2026-08-06, atas request user):** `/dashboard` sekarang bukan cuma StatusBoard + ComplianceAlert, tapi full report — semua dalam bentuk tabel/chart, minim teks panjang (`src/features/dashboard/`):
- **KPI tiles**: Sekolah/Siswa/Teacher/Kelas Aktif, Kelas Hari Ini, % Kepatuhan Lesson Plan, **Estimasi Pendapatan/Bulan** (siswa aktif × asumsi harga/siswa yang bisa diedit langsung di tile — jelas dilabel "estimasi", bukan data finansial asli karena gak ada tabel pricing di schema)
- **Absensi Teacher/Tutor**: tabel per-teacher (jumlah sesi, tepat waktu vs terlambat, % ketepatan) dari `check_ins`, 30 hari terakhir
- **Daily Teaching Report**: tiles (kelas selesai / report masuk / belum ada report) + bar chart submission harian 14 hari + distribusi "tujuan pembelajaran tercapai"
- **Distribusi Jadwal Mingguan**: bar chart jumlah kelas per hari (Senin-Minggu) dari `scheduleDaysOfWeek`
- **Siswa Perlu Follow-up**: tabel `student_follow_ups` yang belum `resolvedAt`, siswa + kelas + catatan
- `ComplianceAlert` (Lesson Plan) dan `StatusBoard` (status kelas hari ini) diubah dari list bertumpuk jadi tabel beneran — sama-sama dipakai di `/dashboard` & `/monitoring`

**Data sample dibersihkan:** sekolah dummy "SMAN 1 Jakarta" (+ kelas "English A" beserta seluruh meeting/report/attendance test) dan "SDN Percobaan 01" dihapus total dari DB — sekarang cuma "Nurul Fajri" yang ada, sesuai data real. Akun login test (`teacher@nufaglobal.id` dkk) dibiarkan karena itu kredensial bukan data sekolah.

**Import histori Daily Teaching Report real (2026-08-06):** `reference-data/NGE Daily Teaching Report (Responses).xlsx` (126 submission asli, 15 Jul–5 Agu 2026, 24 kelas, 6 tutor) di-parse & di-seed lewat `scripts/seed-dtr-history.ts` — rekonstruksi rantai `lesson_plans → meetings → check_ins/check_outs → attendances → teaching_reports` persis kayak alur normal aplikasi. **Approksimasi yang perlu diketahui:** sumber cuma kasih rasio kehadiran ("6/8 siswa"), bukan nama spesifik — dipilih N siswa pertama dari roster kelas buat rekonstruksi tabel `attendances`, **bukan** catatan per-siswa yang terverifikasi. Catatan "students needing follow-up" dari form itu teks bebas (nama campur kalimat), sengaja **tidak** dipaksa jadi row `student_follow_ups` per-siswa (resiko salah atribusi) — disimpan apa adanya di kolom `teaching_reports.summary`, ditampilkan di panel baru "Catatan Terbaru dari Teaching Report".

**Akun "Latifa" & "Latifah" di-merge (2026-08-06):** dikonfirmasi user itu orang yang sama (typo di data sumber). Semua kelas/override/lesson plan/meeting/report yang ke-assign ke "Latifah" dipindah ke akun "Latifa", akun "Latifah" (+ auth user-nya) dihapus. Teacher aktif sekarang 9, bukan 10.

**Halaman "Daily Teaching Report" buat Admin (2026-08-06, atas request user — sebelumnya cuma keliatan agregat di dashboard, gak bisa lihat 1 report detail):** `/reports` (list, filter sekolah & kelas, klik row buat detail) dan `/reports/[id]` (detail lengkap: ringkasan kelas, what went well, needs improvement, students needing follow-up, next lesson, link foto Drive) — field-nya persis ngikutin struktur file referensi. `src/features/reports/admin-queries.ts` + `use-admin-reports.ts`.

**Visual dashboard di-iterasi (2026-08-06, atas request user — awalnya flat/monoton & kebanyakan card polos):**
- Palet chart diganti dari grayscale (`--chart-1..5` semua `oklch(_ 0 _)`, chroma 0) ke palet kategorikal tervalidasi (biru/oranye/aqua/kuning/magenta) + warna status (good/warning/critical) — divalidasi pakai `dataviz` skill validator (`scripts/validate_palette.js`), lolos semua hard gate CVD/lightness
- Stat strip KPI diubah dari 7 `Card` terpisah jadi 1 grid tabel (`bg-border` + `gap-px`) — sebelumnya pakai `flex flex-wrap divide-x` yang break kalau wrap ke baris baru (ketauan dari screenshot user, divider-nya berantakan)
- Semua card report dikasih border kiri berwarna + icon berwarna sesuai konteksnya (bukan putih polos semua), tiles DTR dikasih background tint per kategori (biru/hijau/merah)
- Ditambah data pembanding real: delta "Report Masuk" vs periode sebelumnya (trending up/down icon + %), highlight "hari ini" di chart distribusi jadwal, headline angka current di 2 chart trend

**Exit criteria:** Coordinator bisa lihat "ada masalah di kelas mana hari ini" tanpa nanya WhatsApp.

---

## Phase 8 — Parent Report (PDF)

- [x] Service yang narik data dari Attendance + Teaching Reports + Progress + Curriculum untuk rentang waktu tertentu (bulanan) per siswa — `src/features/parent-reports/period-data.ts` (`getStudentPeriodData`), query flat + join di JS (ikutin pola `toOne()`/multi-query dari HANDOFF, bukan nested select 3+ level)
- [x] Auto-draft "Teacher Comments" dari kumpulan Teaching Report di periode itu (template + summary logic) — `draftTeacherComments()` di file yang sama
- [x] UI review: Admin bisa edit draft comment sebelum generate final PDF — `/parent-reports` (list + dialog pilih sekolah/siswa/bulan/tahun) & `/parent-reports/review` (kartu ringkasan + textarea comment + tombol Generate)
- [x] Generate PDF pakai React PDF — `@react-pdf/renderer` diinstall, template `src/features/parent-reports/parent-report-pdf.tsx` (tema sekolah: header navy, stat card biru, badge status hijau/kuning/merah, kotak komentar amber)
- [ ] Fallback Puppeteer — belum perlu, React PDF udah cukup buat layout saat ini
- [x] Simpan PDF hasil generate ke Google Drive (best-effort), simpan `pdfDriveFileId` di DB kalau berhasil — `POST /api/parent-reports/[id]/generate` render server-side (`renderToBuffer`) lalu `uploadFile()`, update row `parent_reports` (status GENERATED, pdfDriveFileId, pdfFileName, generatedByUserId, generatedAt) **terlepas dari sukses/gagalnya upload Drive** — lihat catatan Google account di bawah
- [x] Tombol "Generate Report" one-click setelah review comment — auto-save comment kalau berubah, lalu generate, sekali klik
- [x] **(Di luar rencana awal, ditambah karena Drive gak reliable — lihat di bawah)** Portal publik buat orang tua ambil PDF sendiri tanpa akun: `/parent-report` (form input NIS) → `GET /api/parent-report/lookup?nis=...` (cari siswa + list laporan berstatus GENERATED) → `GET /api/parent-reports/[id]/download` (generate PDF on-the-fly & serve inline, gak bergantung Drive sama sekali). Ini jalur utama parent akses laporan sekarang, bukan link Drive.

**Bug ditemukan & di-fix (2026-08-07):**
1. `src/lib/google-drive/drive-client.ts` awalnya pakai `googleapis` SDK yang ngirim `Buffer` mentah ke `media.body` — gak jalan (butuh stream). **User re-tulis ulang** pakai `fetch()` langsung ke Drive REST API (multipart upload, token di-cache 55 menit) — desain ini juga lebih ringan dependency-nya.
2. Setelah pindah ke `fetch`, ketemu error baru: `Buffer` juga gak bisa langsung masuk ke `Blob`/`NextResponse` body di runtime Node — fixed dengan wrap `new Uint8Array(buffer)` di `drive-client.ts` (`uploadFile`) dan `download/route.ts`.
3. **Bug fungsional serius** (ketemu pas review manual): route `/api/parent-report/lookup` dan `/api/parent-reports/[id]/download` pakai `createClient()` biasa (`@/lib/supabase/server`, respect RLS/cookie session) — padahal ini rute PUBLIK tanpa login. RLS gak punya policy buat role `anon` di tabel `students`/`parent_reports`, jadi kedua rute ini **selalu return "tidak ditemukan" buat parent beneran** (cuma "kelihatan jalan" kalau dites dari browser yang lagi login Admin, karena RLS admin policy nempel ke cookie session itu). Fixed: pakai `createAdminClient()` (service-role, `src/lib/supabase/admin.ts`) di kedua rute — akses digate oleh kecocokan NIS (lookup) / UUID `parent_reports.id` (download), bukan session, sesuai desain "parent gak punya akun" di context.md Section 9. Diverifikasi ulang pakai `curl` tanpa cookie sama sekali, sekarang beneran return data.
4. Duplicate entry `/parent-reports` di `ROUTE_PREFIX_ROLES` (`src/features/auth/role-routes.ts`) — dibersihkan.
5. Literal `•`/`—` di teks JSX (bukan di dalam template literal) di `parent-report-pdf.tsx` gak akan ke-render jadi simbol • / — (browser/PDF renderer baca apa adanya sebagai teks `•`) — diganti pakai konstanta `BULLET`/`DASH` yang di-render lewat JS string, bukan JSX text literal.
6. Type mismatch di `useGenerateParentReport()` — return type gak match response API asli (`driveError` gak ada di type lama, `webViewLink` yang gak pernah dikirim API tetap ada di type). Fixed.
7. **Bug lama gak berhubungan, ketemu pas full type-check:** `src/features/monitoring/queries.ts` select buat `class_schedule_overrides` gak narik `teachers.id` (cuma `users(fullName)`), padahal dipakai di `overrideTeacher?.id`. Efeknya: kelas yang override teacher-nya beda dari default per hari, `teacherId` di status board selalu `undefined` → filter "by teacher" di `/monitoring` & `/dashboard` gak match buat kelas beroverride. Fixed nambah `id` ke select + type.

**Batasan penting soal Google Drive (dikonfirmasi user 2026-08-07): akun Google yang dipakai personal, bukan Google Workspace.** Upload ke Drive lewat service account **butuh Shared Drive** (fitur Workspace-only) karena service account gak punya kuota storage sendiri di My Drive biasa — jadi upload PDF ke Drive **gak akan pernah jalan** di setup ini, bukan cuma soal config folder ID. Makanya generate PDF didesain **gak bergantung ke Drive**: kalau upload Drive gagal, laporan tetap ke-generate & tersimpan (status GENERATED, `pdfDriveFileId: null`), dan orang tua tetap bisa akses via portal `/parent-report` (generate-on-demand langsung dari data, gak butuh file tersimpan). Link Drive di UI admin cuma muncul kalau `pdfDriveFileId` ada isinya.

**Desain ulang tampilan PDF (2026-08-07, atas request user — "lebih playful, ada ilustrasi, tapi masih educational"):** `parent-report-pdf.tsx` full rewrite — mascot matahari (custom SVG, react-pdf `Svg`/`Path`/`Circle` primitives, gak ada asset eksternal), badge medali reward yang berubah teks sesuai attendance rate ("LUAR BIASA!"/"KERJA BAGUS!"/dst), icon custom per section (kalender-centang, trofi, bohlam, target, buku, chat bubble), warna section rotasi (biru/coral/hijau/amber/ungu, status color tetap reserved buat makna status doang). **Gotcha ketemu:** background gradient/dekorasi yang di-overlay pakai `position:"absolute"` + `zIndex` di atas konten normal-flow (mascot, teks, badge) — react-pdf gak reliably respect `zIndex` buat stacking order antar sibling absolute vs normal-flow, hasilnya SVG background nutupin semua konten di baliknya (teks tetap ke-extract di PDF text layer, tapi invisible secara visual). Fixed: hero card sekarang background solid (bukan overlay absolute terpisah), semua konten normal flexbox flow — aman dari isu stacking. Kalau mau nambah dekorasi absolute lagi di masa depan, hindari nge-overlay di atas konten teks/gambar penting.

**Exit criteria:** pilih 1 siswa, 1 bulan → preview draft comment → edit dikit → generate PDF → **PDF bisa diakses parent tanpa akun** (lewat `/parent-report`, cari by NIS). **Tercapai** — link Drive optional/best-effort mengikuti keterbatasan akun Google personal di atas.

**Catatan keamanan buat Phase 10 (belum di-hardening, sengaja ditahan — bukan blocker buat MVP tapi perlu diperhatikan sebelum data siswa banyak/publik beneran):** akses portal `/parent-report` cuma digate oleh NIS yang formatnya cukup predictable (`SD2501130`, `SMP2601920`, dst) tanpa rate limiting/captcha — orang lain bisa nebak NIS siswa lain dan narik nama+sekolah+laporan (attendance, komentar guru, progress) siswa itu. Belum jadi masalah selama akses ke app masih terbatas/internal, tapi kalau data 302 siswa real udah dipakai serius, ini perlu rate limiting minimal (misal per-IP) sebelum dianggap aman buat production.

---

## Phase 9 — Google Drive Integration

- [x] Setup Google Cloud project + Drive API credentials (service account atau OAuth, sesuaikan siapa yang punya akun Drive-nya)
- [x] Service layer abstraksi (`src/lib/google-drive/drive-client.ts`: uploadFile/deleteFile/getFileUrl) — biar gampang extend ke Calendar/Gmail nanti (Section 12)
- [x] Upload classroom photo dari **Daily Teaching Report** langsung ke Drive, simpan `drive_file_id` + metadata di DB (`FileUpload` component + `/api/drive/upload`) — foto check-in juga ada UI-nya, foto check-out belum
- [x] Upload generated Parent Report PDF ke folder terstruktur di Drive (per sekolah/per siswa) — `findOrCreateFolder()` di `drive-client.ts`, layout: root / {sekolah} / {siswa} / Laporan-....pdf
- [x] Pastikan TIDAK ADA binary file yang nyasar ke kolom Postgres — audit semua upload path (cuma `photoDriveFileId`/`photoFileName` string yang kesimpen)

**Security & bug ditemukan & di-fix pas review (2026-08-06):**
1. **Kritis:** file credential service account Google (`nge-lms-504705-*.json`, private key asli) ke-taro di root repo, gak ke-cover `.gitignore` — resiko bocor ke git history. Ditambah pattern ke `.gitignore` buat semua file key service-account-style; file-nya sendiri disaranin dihapus dari disk / key di-rotate kalau sempat ke-share ke luar.
2. `/api/drive/upload` gak validasi tipe file di server (`accept="image/*"` di client cuma UI hint, gampang dilewatin) — ditambah cek `file.type.startsWith("image/")`.
3. **Foto check-in ke-upload ke Drive tapi link-nya gak pernah kesimpen ke DB:** `updateCheckInPhoto()` nge-`UPDATE` tabel `check_ins`, tapi RLS `check_ins` sengaja gak punya policy UPDATE buat Teacher (by design, immutable). Postgrest gak nge-throw error buat update yang di-block RLS (cuma 0 row affected diam-diam), jadi teacher lihat toast "berhasil" padahal link foto gak pernah nyimpen. Ditambah migration `20260806120000_teacher_update_check_in_photo` (scoped ke teacher pemilik meeting).

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
