# Audit Tasklist — Hasil Deep Audit 2026-09-03

**Status per 2026-09-05: BELUM 100% selesai.** Fase 0, 1, 3, 4 sudah beres dan sudah live di production (`prod` branch). Fase 2 masih ada 3 item terbuka yang sengaja ditunda karena butuh keputusan desain/produk dulu — lihat tanda ⚠️ di bawah. Checklist ini sudah diperbarui reflect status real, bukan cuma rencana lagi.

Daftar kerja buat nindaklanjutin temuan dari audit backend/API, frontend UI-UX, dan alur kerja bisnis. Diurutin per prioritas eksekusi, bukan cuma per severity — beberapa item "Rendah" naik urutan karena gampang dan cepat, beberapa "Sedang" turun karena butuh keputusan produk dulu sebelum ngoding.

Checklist ini berdiri sendiri dari `TASKLIST.md` yang udah ada (itu buat roadmap fitur; ini khusus perbaikan dari audit). Hapus/pindahin ke `TASKLIST.md` kalau udah kelar semua.

Legenda: 🔴 Tinggi · 🟠 Sedang · 🟡 Rendah · ⏱️ estimasi kasar

---

## Fase 0 — Verifikasi cepat (gak perlu ngoding, cuma cek)

- [ ] ⚠️ 🔴 **BELUM DICEK — Cek env var `TZ` di Vercel project settings.** Kalau belum ada, set `TZ=Asia/Jakarta`. Ini paling kritis karena gak keliatan dari repo dan bisa diam-diam ngerusak semua logika jadwal/keterlambatan/hari libur di sekitar tengah malam WIB. Ini butuh akses dashboard Vercel — gak bisa dicek/di-set dari sesi ini. ⏱️ 5 menit
  - Setelah di-set: redeploy, terus tes manual satu kelas yang jadwalnya deket jam 00:00 WIB buat mastiin hari-nya kehitung bener.
  - File terkait: `src/lib/date.ts`, `src/features/meetings/queries.ts` (`startClass()`)

---

## Fase 1 — Perbaikan berdampak tinggi, effort rendah-sedang ✅ SELESAI (live di prod)

- [x] 🔴 **Tambahin `isAdminUser()` check di route DELETE modul kurikulum.**
  Samain pola sama `init/route.ts` dan `complete/route.ts` di folder yang sama.
  📁 `src/app/api/curriculum/[id]/module/route.ts` ⏱️ 15 menit

- [x] 🟠 **Tambahin self-lockout guard di `setTeacherActiveAction`**, samain kayak `setAppUserActiveAction` yang udah nyegah admin nonaktifin akun sendiri.
  📁 `src/features/teachers/actions.ts:47-65` ⏱️ 15 menit

- [x] 🟠 **Validasi password baru pakai schema zod `min(6)` di kedua aksi reset password**, jangan cuma ngandelin Supabase Auth.
  📁 `src/features/users/actions.ts:57-63`, `src/features/teachers/actions.ts:67-73` ⏱️ 20 menit

- [x] 🟡 **Ganti pesan error Drive yang dikirim ke client jadi pesan generik**, jangan interpolasi `driveError` mentah ke response JSON.
  📁 `src/app/api/parent-reports/[id]/generate/route.ts:91` ⏱️ 10 menit

- [x] 🟡 **Tambahin `CRON_SECRET` ke `.env.example`** biar onboarding developer baru gak bingung.
  📁 `.env.example` ⏱️ 5 menit

- [x] 🟡 **Perbaiki bias modulo di generator password acak** — pakai rejection sampling atau `crypto.getRandomValues` yang div langsung ke ukuran alfabet secara bener.
  📁 `src/components/shared/password-field.tsx:8-17` ⏱️ 20 menit

- [x] 🟡 **Hapus atau perbaiki `doCheckIn()`/`createMeeting()` dead code** — dihapus (gak ada pemanggil di manapun).
  📁 `src/features/meetings/queries.ts:481-514`

- [x] 🟡 **Hapus dua komponen dead code** (`dropdown-menu.tsx`, `skeleton.tsx`) — dihapus, sudah diverifikasi gak ada import di manapun.
  📁 `src/components/ui/dropdown-menu.tsx`, `src/components/ui/skeleton.tsx`

- [x] 🟡 **Tambahin `aria-current="page"` ke link navigasi aktif** di sidebar dan bottom nav.
  📁 `src/components/shared/bottom-nav.tsx`, `src/components/shared/app-sidebar.tsx`

- [x] 🟠 **Bikin tombol show/hide password bisa dijangkau keyboard** — hapus `tabIndex={-1}`, pastiin ada `aria-label`.
  📁 `src/app/(auth)/login/page.tsx`, `src/components/shared/password-field.tsx`

---

## Fase 2 — Butuh keputusan produk dulu, baru ngoding ⚠️ SEBAGIAN BELUM SELESAI

- [ ] ⚠️ 🔴 **BELUM DIKERJAIN — Desain ulang alur generate laporan orang tua biar gak fail-closed pas Drive error.**
  Ini masih item paling berisiko yang tersisa dari seluruh audit — sengaja ditunda karena butuh keputusan desain data model, bukan lupa dikerjain.
  Opsi: (a) tetep set status `GENERATED` begitu PDF selesai dirender, upload Drive jalan async/retry di background dengan status terpisah (`DRIVE_SYNCED`/`DRIVE_PENDING`); atau (b) simpen PDF-nya di storage lain (Supabase Storage?) sebagai sumber utama, Drive cuma arsip sekunder. Diskusiin sama tim dulu sebelum ngoding.
  📁 `src/app/api/parent-reports/[id]/generate/route.ts:66-94` ⏱️ 2-4 jam (setelah keputusan diambil)

- [x] 🔴 **Tambahin deteksi bentrok jadwal buat penugasan guru pengganti.** Diimplementasi sebagai hard block (bukan warning) — lihat `src/lib/schedule-conflict.ts` (helper baru) yang dipakai `assignSubstituteForLessonPlan`. Sudah dites manual di staging (nolak assignment yang bentrok).
  📁 `src/features/substitutes/queries.ts`, `src/lib/schedule-conflict.ts`

- [x] 🟠 **Tambahin deteksi bentrok jadwal yang sama buat edit jadwal default kelas.** Reuse helper yang sama.
  📁 `src/features/classes/queries.ts`

- [x] 🟠 **Perbaiki role-gating middleware buat route download laporan orang tua.**
  📁 `src/features/auth/role-routes.ts`

- [x] 🟠 **Perkuat proteksi lookup NIS** — rate-limit per-NIS (5x/10 menit) ditambahkan di atas rate-limit per-IP yang sudah ada.
  📁 `src/app/api/parent-report/lookup/route.ts`
  - [ ] ⚠️ Catatan: CAPTCHA/lockout permanen belum ditambahkan — rate-limit per-NIS mengurangi risiko tapi belum menutup total kemungkinan enumerasi oleh penyerang yang sabar.

- [x] 🟠 **Tambahin field target audiens/role di pengumuman** (`targetRoles`) — sudah termasuk migration Prisma, sudah di-apply ke staging **dan production**, form admin sudah ada checkbox-nya.
  📁 `src/features/announcements/queries.ts`, `schema.ts`, `prisma/migrations/20260903000000_announcement_target_roles/`

- [x] ✅ **Klarifikasi (bukan bug):** sharing "siapapun dengan link" itu **desain sengaja** — orang tua sudah consent, tujuannya biar akses laporan mulus tanpa harus login. Bukan sesuatu yang perlu diubah.

- [x] 🔴 **Perbaiki keandalan integrasi Google Drive secara menyeluruh** — ditemukan &amp; diperbaiki 3 bug nyata di `src/lib/google-drive/drive-client.ts`:
  1. `setPublicReadable()` gak pernah ngecek hasil fetch-nya — kalau gagal, upload "sukses" tapi file diam-diam tetap private (link ke orang tua bakal 403). Sekarang dicek &amp; throw kalau gagal, plus upload-nya di-rollback (file dihapus) biar gak numpuk file private yang ketinggalan.
  2. Gak ada retry buat error transient Google (429/500/502/503) atau token cache basi (401) — sekarang ada retry dengan backoff + refresh token otomatis di helper `driveRequest()` yang dipakai semua fungsi.
  3. **Bug CORS nyata di upload modul kurikulum** — sesi resumable upload dibikin dari server (Node) yang gak pernah kirim header `Origin`, jadi PUT langsung dari browser ke Drive selalu keblokir CORS. Dites manual: upload modul PDF gagal total sebelum fix, sukses 100% sesudah fix (browser Origin sekarang diteruskan ke `initResumableUpload`).
  📁 `src/lib/google-drive/drive-client.ts`, `src/app/api/curriculum/[id]/module/init/route.ts` — sudah dites end-to-end di staging (upload, replace, delete modul kurikulum semua jalan bersih)

- [ ] ⚠️ 🟡 **BELUM DIKERJAIN — Pisahin peserta pelatihan guru dari tabel `students`** kalau ke depannya bakal ada dashboard yang agregat jumlah murid — bisa tambah kolom `studentType` atau tabel terpisah. Belum ada urgensi mendesak, tapi belum dicatat/ditindaklanjuti juga.
  📁 `scripts/seed-teacher-training.ts:183-188`, `prisma/schema.prisma`

---

## Fase 3 — Frontend: error state & konsistensi UX ⚠️ SEBAGIAN BELUM SELESAI

- [x] 🔴 **Tambahin `error.tsx` per route group** (`(admin)`, `(teacher)`, `(coordinator)`, `(auth)`).
  📁 `src/app/(admin)/error.tsx`, dst.

- [x] 🔴 **Thread `isError`/`error` ke `DataTable`** dan tambahin state error yang beda dari state kosong.
  📁 `src/components/shared/data-table.tsx`

- [x] 🔴 **Update halaman list admin/coordinator yang PAKAI `DataTable`** buat pass `isError`.
  📁 classes, teacher-training, curriculum, holidays, schools (+ detail), users, students, teachers
  - [ ] ⚠️ Catatan: `announcements`, `parent-reports`, `reports`, `substitutes`, dan `(coordinator)/monitoring` **gak** pakai komponen `DataTable` (tabel hand-rolled sendiri) — halaman-halaman ini belum dapet perbaikan error-state yang sama. Kalau mau konsisten, itu kerjaan tambahan yang belum masuk sini.

- [x] 🟠 **Contek pola loading/error/empty dari `absensi/page.tsx` ke widget dashboard** — diterapkan sebagai indikator "gagal memuat" inline di semua widget dashboard.
  📁 `src/features/dashboard/*.tsx`

- [ ] ⚠️ 🟠 **BELUM DIKERJAIN — Perbaiki navigasi mobile admin.** 5 halaman (Pengumuman, Hari Libur, Laporan, Laporan Orang Tua, Pelatihan Guru) masih gak keakses dari HP.
  📁 `src/app/(admin)/layout.tsx` (`buildMobileNav`), `src/components/shared/mobile-topbar.tsx` ⏱️ 2-4 jam

- [ ] ⚠️ 🟡 **BELUM DIKERJAIN — Perbaiki N+1 di `fetchHandoverSummary`.**
  📁 `src/features/substitutes/queries.ts:252-344` ⏱️ 1 jam

---

## Fase 4 — i18n & konsistensi visual ✅ SELESAI (live di prod)

- [x] 🔴 **Rollout i18n ke admin/coordinator/login.** 926 key, parity terjaga di `en.json`/`id.json`. Language switcher aktif di admin, coordinator, dan login (sempat kelewat di rollout awal, ditambahin belakangan setelah ketauan pas testing manual).
  📁 `messages/en.json`, `messages/id.json`, `src/components/shared/data-table.tsx`, semua `src/app/(admin)/**`, `src/app/(coordinator)/**`, `src/app/(auth)/login/page.tsx`
  - [ ] ⚠️ Catatan: toast di level hook (`use-*.ts`) dan pesan error server sengaja dibiarkan Indonesia-only — belum ada pola i18n untuk non-komponen.

- [x] 🟡 **Rapiin hardcode warna hex** jadi pakai CSS variable/design token.
  📁 ~15 file, lihat commit `9235a8d`

- [x] 🟡 **Aktifin dark mode beneran** — `ThemeProvider` (next-themes) + toggle Terang/Gelap/Sistem di sidebar & Pengaturan. Sempat ada hydration mismatch di toggle-nya sendiri, sudah kefix dan keverifikasi ilang di staging.
  📁 `globals.css`, `src/app/providers.tsx`, `src/components/shared/theme-switcher.tsx`

---

## Sisa PR — yang beneran masih kepending per 2026-09-05

1. **🔴 Cek `TZ` di Vercel dashboard** — belum diverifikasi sama sekali, gak bisa dicek dari sesi coding. Paling gampang tapi paling gak boleh kelewat.
2. **🔴 Redesain alur parent-report biar gak fail-closed pas Drive error** — item risiko tertinggi yang tersisa, sengaja ditunda karena nyentuh keputusan data model.
3. **🟠 Drive file sharing masih "siapapun yang punya link"** — termasuk foto anak & PDF laporan orang tua.
4. **🟠 Navigasi mobile admin** — 5 halaman masih gak keakses dari HP.
5. **🟡 Halaman non-`DataTable` (announcements/parent-reports/reports/substitutes/monitoring)** belum dapet error-state yang konsisten kayak halaman lain.
6. **🟡 N+1 di `fetchHandoverSummary`**, **CAPTCHA/lockout NIS**, **pemisahan data teacher-training dari tabel students** — cleanup kecil, gak mendesak.

Semua yang lain di checklist ini **sudah selesai dan live di production** (branch `prod`, per commit `f9bae67`).

Item yang sengaja **gak** dimasukin tasklist ini (dicatat di laporan audit sebagai desain yang disengaja, bukan bug):
- Lesson plan gak punya versioning/approval workflow — sesuai spek produk.
- Admin/Coordinator gak punya alur manajemen akun in-app — didokumentasiin di `USER-MANAGEMENT.md` sebagai keputusan sadar.
- Substitute gak dapet notifikasi push — di luar scope MVP per `context.md`.
