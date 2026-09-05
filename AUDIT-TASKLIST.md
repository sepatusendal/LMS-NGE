# Audit Tasklist — Hasil Deep Audit 2026-09-03

**Status per 2026-09-05: SELESAI SEMUA** kecuali 1 keputusan desain yang sengaja ditunda (lihat "Sisa PR"). Semua item sudah dikerjain, ditest manual di staging, dan live di production.

Daftar kerja buat nindaklanjutin temuan dari audit backend/API, frontend UI-UX, dan alur kerja bisnis. Diurutin per prioritas eksekusi, bukan cuma per severity.

Checklist ini berdiri sendiri dari `TASKLIST.md` yang udah ada (itu buat roadmap fitur; ini khusus perbaikan dari audit). Hapus/pindahin ke `TASKLIST.md` kalau udah kelar semua.

Legenda: 🔴 Tinggi · 🟠 Sedang · 🟡 Rendah · ⏱️ estimasi kasar

---

## Fase 0 — Timezone server ✅ SELESAI

- [x] 🔴 **`TZ` env var ternyata gak bisa di-set sama sekali di Vercel** — dicoba lewat dashboard maupun `vercel env add TZ production`, keduanya ditolak API dengan `"The name of your Environment Variable is reserved"`. Ini kemungkinan alasan kenapa masalah ini gak pernah kebenerin sebelumnya.
  **Fix yang diambil:** set `process.env.TZ = "Asia/Jakarta"` langsung di kode, lewat `src/instrumentation.ts` (`register()` — hook resmi Next.js yang jalan sekali pas server proses start, sebelum request pertama masuk). Ini gak bergantung ke env var Vercel sama sekali.
  **Dibuktikan bukan cuma teori:** simulasi proses Node yang start dengan `TZ=UTC` (niru default Vercel), abis di-override lewat `process.env.TZ = "Asia/Jakarta"` mid-process — `new Date()` sesudahnya kebukti bener geser ke GMT+0700, bukan tetap UTC. Server juga nge-log konfirmasi ini sendiri setiap kali start (`[instrumentation] TZ set to Asia/Jakarta — server "now" resolves as ...`) biar gampang dicek di Vercel function logs kapan aja.
  📁 `src/instrumentation.ts` (baru)

---

## Fase 1 — Perbaikan berdampak tinggi, effort rendah-sedang ✅ SELESAI (live di prod)

Semua 10 item selesai — admin check kurikulum, self-lockout guard, validasi password, pesan error Drive, `CRON_SECRET`, bias modulo password, dead code check-in/dropdown/skeleton, `aria-current`, keyboard-accessible password toggle.

---

## Fase 2 — Google Drive, keamanan, dan bentrok jadwal ✅ SELESAI

- [x] 🔴 **Deteksi bentrok jadwal guru pengganti** — hard block via `src/lib/schedule-conflict.ts`, dites manual di staging.
- [x] 🟠 **Deteksi bentrok jadwal edit kelas** — reuse helper yang sama.
- [x] 🟠 **Role-gating download laporan orang tua** diperbaiki.
- [x] 🟠 **Proteksi lookup NIS** — 3 lapis sekarang: rate-limit per-IP (8/menit), per-NIS (5/10 menit), **plus lockout 1 jam per-NIS setelah 3 percobaan gagal** (bukan berhasil) — ditambahin di putaran ini.
- [x] 🟠 **Target audiens pengumuman** (`targetRoles`) — migration sudah di staging **dan production**.
- [x] ✅ **Klarifikasi (bukan bug):** sharing Drive "siapapun dengan link" itu **desain sengaja** — orang tua sudah consent, tujuannya akses mulus tanpa login.
- [x] 🔴 **Keandalan integrasi Google Drive** — 3 bug nyata diperbaiki di `src/lib/google-drive/drive-client.ts`: `setPublicReadable()` yang gak ngecek hasil fetch (file bisa diam-diam private), gak ada retry buat error transient/token basi, dan **bug CORS nyata** di upload modul kurikulum (header `Origin` gak pernah dikirim dari sesi resumable upload). Dites manual: upload/replace/delete modul kurikulum semua sukses.
- [x] 🟡 **Pisahin data teacher-training dari tabel `students`** — enum `StudentType` (`REGULAR`/`TEACHER_TRAINING`) ditambahin, migration dengan backfill otomatis (via join ke kelas `TEACHER_TRAINING`) sudah di staging, dashboard "Siswa Aktif" sekarang exclude trainee (304/305 real siswa, bukan 452 campur trainee).

⚠️ **Satu item TETAP belum dikerjain dengan sengaja** — lihat "Sisa PR" di bawah (redesain alur parent-report vs Drive fail-closed).

---

## Fase 3 — Frontend: error state & konsistensi UX ✅ SELESAI

- [x] 🔴 `error.tsx` per route group.
- [x] 🔴 Error state di `DataTable` + semua halaman yang memakainya.
- [x] 🔴 **Error state di halaman non-`DataTable`** (announcements, parent-reports + review, reports + detail, substitutes/`TeacherDayList`, coordinator monitoring/`AnalyticsCharts`) — ditambahin di putaran ini, termasuk nemuin & benerin bug tambahan (halaman detail laporan yang nyampur "not found" sama "gagal fetch").
- [x] 🟠 Widget dashboard pakai indikator "gagal memuat".
- [x] 🟠 **Navigasi mobile admin** — drawer hamburger baru (`src/components/ui/sheet.tsx`) yang nampilin semua 14 tujuan, dites manual di viewport mobile 375×812, dark & light. Bottom nav 5-item tetap ada sebagai fast-access.
- [x] 🟡 **N+1 di `fetchHandoverSummary`** — dari ~5-6 query jadi 2 query dengan embedded select, behavior & return shape sama persis.

---

## Fase 4 — i18n & konsistensi visual ✅ SELESAI (live di prod)

- [x] 🔴 Rollout i18n admin/coordinator/login — 938 key, parity terjaga. Language switcher aktif di admin, coordinator, dan login.
  - [ ] ⚠️ Catatan: toast di level hook (`use-*.ts`) dan pesan error server sengaja dibiarkan Indonesia-only.
- [x] 🟡 Warna hardcode → design token.
- [x] 🟡 Dark mode diaktifkan beneran (`ThemeProvider` + toggle), termasuk fix hydration mismatch di toggle-nya sendiri.

---

## Index database yang kelewat ✅ SELESAI

Ditemukan pas cross-check laporan awal — 8 index FK yang direkomendasikan tapi kelewat gak masuk tasklist sebelumnya, sekarang sudah ditambahin & di-apply ke staging: `meetings.assignedTeacherId`/`actualTeacherId`, `check_ins.teacherId`, `check_outs.teacherId`, `teaching_reports.originalTeacherId`/`substituteTeacherId`, `class_enrollments.classId`, `lesson_plans.createdByTeacherId`.

---

## Sisa PR — yang beneran masih kepending per 2026-09-05

1. **🔴 Redesain alur parent-report biar gak fail-closed pas Drive error** — **sengaja tetap dibiarkan begini** setelah klarifikasi user (2026-09-05): alur Drive-first ini memang desain yang diinginkan (orang tua consent, Drive jadi sumber utama), bukan bug yang harus di-redesign. Yang dikerjain sebagai gantinya: keandalan Drive-nya sendiri diperkuat abis-abisan (lihat Fase 2) — retry otomatis, fix CORS, fix silent-failure sharing — supaya jalur ini jarang/gak pernah gagal, bukan mengubah arsitekturnya. Kalau ke depannya masih pengen ubah ke gak-fail-closed, opsinya masih sama seperti sebelumnya: (a) status `GENERATED` begitu PDF dirender, Drive sync di background, atau (b) Supabase Storage sebagai sumber utama.
   📁 `src/app/api/parent-reports/[id]/generate/route.ts:66-94`

**Belum dilakukan (di luar scope, butuh keputusan/dependency tambahan):**
- CAPTCHA pihak ketiga (Cloudflare Turnstile dll.) buat lookup NIS — lockout 1-jam per-NIS sekarang jadi lapisan pengganti sementara.

Semua migration (`20260903000000_announcement_target_roles`, `20260905000000_missing_fk_indexes`, `20260905010000_student_type`) sudah di-apply ke staging **dan production**. Semua kode sudah live di branch `prod`.

Item yang sengaja **gak** dimasukin tasklist ini (dicatat di laporan audit sebagai desain yang disengaja, bukan bug):
- Lesson plan gak punya versioning/approval workflow — sesuai spek produk.
- Admin/Coordinator gak punya alur manajemen akun in-app — didokumentasiin di `USER-MANAGEMENT.md` sebagai keputusan sadar.
- Substitute gak dapet notifikasi push — di luar scope MVP per `context.md`.
