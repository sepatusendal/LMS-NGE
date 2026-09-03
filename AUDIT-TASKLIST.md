# Audit Tasklist — Hasil Deep Audit 2026-09-03

Daftar kerja buat nindaklanjutin temuan dari audit backend/API, frontend UI-UX, dan alur kerja bisnis. Diurutin per prioritas eksekusi, bukan cuma per severity — beberapa item "Rendah" naik urutan karena gampang dan cepat, beberapa "Sedang" turun karena butuh keputusan produk dulu sebelum ngoding.

Checklist ini berdiri sendiri dari `TASKLIST.md` yang udah ada (itu buat roadmap fitur; ini khusus perbaikan dari audit). Hapus/pindahin ke `TASKLIST.md` kalau udah kelar semua.

Legenda: 🔴 Tinggi · 🟠 Sedang · 🟡 Rendah · ⏱️ estimasi kasar

---

## Fase 0 — Verifikasi cepat (gak perlu ngoding, cuma cek)

- [ ] 🔴 **Cek env var `TZ` di Vercel project settings.** Kalau belum ada, set `TZ=Asia/Jakarta`. Ini paling kritis karena gak keliatan dari repo dan bisa diam-diam ngerusak semua logika jadwal/keterlambatan/hari libur di sekitar tengah malam WIB. ⏱️ 5 menit
  - Setelah di-set: redeploy, terus tes manual satu kelas yang jadwalnya deket jam 00:00 WIB buat mastiin hari-nya kehitung bener.
  - File terkait: `src/lib/date.ts`, `src/features/meetings/queries.ts` (`startClass()`)

---

## Fase 1 — Perbaikan berdampak tinggi, effort rendah-sedang

- [ ] 🔴 **Tambahin `isAdminUser()` check di route DELETE modul kurikulum.**
  Samain pola sama `init/route.ts` dan `complete/route.ts` di folder yang sama.
  📁 `src/app/api/curriculum/[id]/module/route.ts` ⏱️ 15 menit

- [ ] 🟠 **Tambahin self-lockout guard di `setTeacherActiveAction`**, samain kayak `setAppUserActiveAction` yang udah nyegah admin nonaktifin akun sendiri.
  📁 `src/features/teachers/actions.ts:47-65` ⏱️ 15 menit

- [ ] 🟠 **Validasi password baru pakai schema zod `min(6)` di kedua aksi reset password**, jangan cuma ngandelin Supabase Auth.
  📁 `src/features/users/actions.ts:57-63`, `src/features/teachers/actions.ts:67-73` ⏱️ 20 menit

- [ ] 🟡 **Ganti pesan error Drive yang dikirim ke client jadi pesan generik**, jangan interpolasi `driveError` mentah ke response JSON.
  📁 `src/app/api/parent-reports/[id]/generate/route.ts:91` ⏱️ 10 menit

- [ ] 🟡 **Tambahin `CRON_SECRET` ke `.env.example`** biar onboarding developer baru gak bingung.
  📁 `.env.example` ⏱️ 5 menit

- [ ] 🟡 **Perbaiki bias modulo di generator password acak** — pakai rejection sampling atau `crypto.getRandomValues` yang div langsung ke ukuran alfabet secara bener.
  📁 `src/components/shared/password-field.tsx:8-17` ⏱️ 20 menit

- [ ] 🟡 **Hapus atau perbaiki `doCheckIn()`/`createMeeting()` dead code** — kalau emang gak dipakai, hapus aja; kalau mau dipertahanin buat fitur masa depan, samain logika `isLate` sama `startClass()`.
  📁 `src/features/meetings/queries.ts:481-514` ⏱️ 15 menit (hapus) / 30 menit (perbaiki)

- [ ] 🟡 **Hapus dua komponen dead code** (`dropdown-menu.tsx`, `skeleton.tsx`) kalau emang gak dipakai, atau mulai pakai `skeleton.tsx` buat loading state (lihat Fase 3).
  📁 `src/components/ui/dropdown-menu.tsx`, `src/components/ui/skeleton.tsx` ⏱️ 10 menit

- [ ] 🟡 **Tambahin `aria-current="page"` ke link navigasi aktif** di sidebar dan bottom nav.
  📁 `src/components/shared/bottom-nav.tsx`, `src/components/shared/app-sidebar.tsx` ⏱️ 20 menit

- [ ] 🟠 **Bikin tombol show/hide password bisa dijangkau keyboard** — hapus `tabIndex={-1}`, pastiin ada `aria-label`.
  📁 `src/app/(auth)/login/page.tsx:175-185`, `src/components/shared/password-field.tsx:41-49` ⏱️ 20 menit

---

## Fase 2 — Butuh keputusan produk dulu, baru ngoding

- [ ] 🔴 **Desain ulang alur generate laporan orang tua biar gak fail-closed pas Drive error.**
  Opsi: (a) tetep set status `GENERATED` begitu PDF selesai dirender, upload Drive jalan async/retry di background dengan status terpisah (`DRIVE_SYNCED`/`DRIVE_PENDING`); atau (b) simpen PDF-nya di storage lain (Supabase Storage?) sebagai sumber utama, Drive cuma arsip sekunder. Diskusiin sama tim dulu sebelum ngoding — ini nyentuh desain data model.
  📁 `src/app/api/parent-reports/[id]/generate/route.ts:66-94` ⏱️ 2-4 jam (setelah keputusan diambil)

- [ ] 🔴 **Tambahin deteksi bentrok jadwal buat penugasan guru pengganti.**
  Minimal: pas milih guru pengganti di `SubstitutePanel`/`ReassignTutorDialog`/`TeacherAbsenceDialog`, query jadwal guru itu di hari yang sama dan warning (atau block) kalau ada overlap waktu. Tentuin dulu: warning yang bisa di-override, atau hard block?
  📁 `src/features/substitutes/queries.ts:159-228`, `substitute-panel.tsx`, `teacher-absence-dialog.tsx`, `reassign-tutor-dialog.tsx` ⏱️ 3-5 jam

- [ ] 🟠 **Tambahin deteksi bentrok jadwal yang sama buat edit jadwal default kelas** (bukan cuma substitusi). Bisa reuse logic dari item di atas.
  📁 `src/features/classes/queries.ts:109-134` ⏱️ 2-3 jam

- [ ] 🟠 **Perbaiki role-gating middleware buat route download laporan orang tua** biar Tutor/Coordinator yang login juga bisa akses link publiknya sendiri. Cek ulang seluruh tabel `role-routes.ts` — kemungkinan butuh entri terpisah buat path yang sengaja publik.
  📁 `src/features/auth/role-routes.ts:31`, `src/middleware.ts:100-103` ⏱️ 1 jam

- [ ] 🟠 **Perkuat proteksi lookup NIS** — tambahin CAPTCHA (misal Cloudflare Turnstile) atau lockout per-NIS setelah beberapa kali gagal, jangan cuma rate-limit per-IP.
  📁 `src/app/api/parent-report/lookup/route.ts:8,17-23` ⏱️ 2-3 jam

- [ ] 🟠 **Tambahin field target audiens/role di pengumuman** (`targetRoles` di schema), filter di `fetchAnnouncementsForCurrentUser` sesuai role user yang login.
  📁 `src/features/announcements/queries.ts:52-77`, `schema.ts:15-21` ⏱️ 2-3 jam (termasuk migration + update form admin)

- [ ] 🟠 **Ganti Drive file sharing dari "siapapun yang punya link" jadi lebih terbatas**, khususnya buat PDF laporan orang tua dan foto check-in/out anak. Opsi: domain-restricted sharing, atau proxy signed-URL lewat aplikasi sendiri. Butuh diskusi karena nyentuh cara semua fitur Drive kerja.
  📁 `src/lib/google-drive/drive-client.ts:84-91,130` ⏱️ 3-6 jam tergantung opsi

- [ ] 🟡 **Pisahin peserta pelatihan guru dari tabel `students`** kalau ke depannya bakal ada dashboard yang agregat jumlah murid — bisa tambah kolom `studentType` atau tabel terpisah. Kalau belum ada urgensi, cukup dicatat sebagai known limitation.
  📁 `scripts/seed-teacher-training.ts:183-188`, `prisma/schema.prisma`

---

## Fase 3 — Frontend: error state & konsistensi UX

- [ ] 🔴 **Tambahin `error.tsx` per route group** (`(admin)`, `(teacher)`, `(coordinator)`, `(auth)`) minimal versi generik dulu (ikon + pesan + tombol reload).
  📁 `src/app/(admin)/error.tsx`, dst. ⏱️ 1-2 jam

- [ ] 🔴 **Thread `isError`/`error` ke `DataTable`** dan tambahin state error yang beda dari state kosong (ikon + pesan + tombol retry). Ini yang paling berdampak karena dipakai di hampir semua halaman admin.
  📁 `src/components/shared/data-table.tsx` ⏱️ 1-2 jam untuk komponennya

- [ ] 🔴 **Update semua halaman list admin/coordinator buat destructure dan pass `isError`** ke `DataTable` (setelah komponennya siap nerima prop itu).
  📁 Semua `src/app/(admin)/*/page.tsx`, `src/app/(coordinator)/monitoring/page.tsx` ⏱️ 2-3 jam total (mekanis, banyak file kecil)

- [ ] 🟠 **Contek pola loading/error/empty dari `absensi/page.tsx` ke `OverviewStats` dan widget dashboard lain**, jangan cuma fallback ke `0`/string kosong pas gagal fetch.
  📁 `src/features/dashboard/overview-stats.tsx:56-59`, widget dashboard lainnya ⏱️ 1-2 jam

- [ ] 🟠 **Perbaiki navigasi mobile admin** — tambahin drawer/hamburger buat sidebar penuh di mobile, atau minimal tambahin 5 halaman yang sekarang gak keakses (Pengumuman, Hari Libur, Laporan, Laporan Orang Tua, Pelatihan Guru) ke suatu tempat yang kejangkau dari HP.
  📁 `src/app/(admin)/layout.tsx` (`buildMobileNav`), `src/components/shared/mobile-topbar.tsx` ⏱️ 2-4 jam

- [ ] 🟡 **Perbaiki N+1 di `fetchHandoverSummary`** — gabungin jadi 1-2 query pakai embedded select, samain pola yang udah dipakai di `resolveEffectiveTeacherForDate` di file yang sama.
  📁 `src/features/substitutes/queries.ts:252-344` ⏱️ 1 jam

---

## Fase 4 — i18n & konsistensi visual (lebih besar, rencanain sebagai proyek sendiri)

- [ ] 🔴 **Putusin scope rollout i18n ke admin/coordinator/login.** Kalau iya: tambahin namespace baru di `messages/en.json`/`id.json` per halaman admin, ganti semua string hardcode pakai `useTranslations`. Kalau nggak buat semua sekaligus, urutin: `DataTable` dulu (dipakai semua tabel admin) → login → dashboard → sisanya.
  📁 `messages/en.json`, `messages/id.json`, `src/components/shared/data-table.tsx`, semua `src/app/(admin)/**`, `src/app/(coordinator)/**`, `src/app/(auth)/login/page.tsx` ⏱️ 1-2 hari kerja, tergantung scope

- [ ] 🟡 **Rapiin 12 file yang hardcode warna hex** jadi pakai CSS variable/design token yang ada di `globals.css`.
  📁 lihat daftar di laporan audit ⏱️ 2-3 jam

- [ ] 🟡 **Putusin: aktifin dark mode beneran, atau hapus infrastruktur yang gak kepake.** Kalau aktifin: tambah `ThemeProvider` dari `next-themes` + toggle UI. Kalau hapus: bersihin blok `.dark` di `globals.css` biar gak nyesatin developer lain.
  📁 `globals.css`, `src/app/providers.tsx` ⏱️ 30 menit (hapus) / 3-4 jam (aktifin beneran, termasuk perbaikan Fase 4 warna hex dulu)

---

## Ringkasan urutan yang disaranin

1. **Hari ini:** Fase 0 (cek `TZ`) + item-item cepat di Fase 1 yang ≤ 20 menit.
2. **Minggu ini:** Sisa Fase 1, plus dua item paling kritis di Fase 2 (fix Drive-blocking parent report, cek bentrok substitusi) — keduanya butuh diskusi desain singkat sebelum ngoding.
3. **Sprint berikutnya:** Fase 3 (error state) — ini yang paling kerasa buat pengguna admin sehari-hari.
4. **Rencanain terpisah:** Fase 4 (i18n admin) — ukurannya cukup besar buat jadi proyek sendiri, jangan diselipin di sprint yang udah padat.

Item yang sengaja **gak** dimasukin tasklist ini (dicatat di laporan audit sebagai desain yang disengaja, bukan bug):
- Lesson plan gak punya versioning/approval workflow — sesuai spek produk.
- Admin/Coordinator gak punya alur manajemen akun in-app — didokumentasiin di `USER-MANAGEMENT.md` sebagai keputusan sadar.
- Substitute gak dapet notifikasi push — di luar scope MVP per `context.md`.
