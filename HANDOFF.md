# Session Handoff — ECMS (NGE English Course)

Ditulis 2026-08-07 buat lanjut di session baru. Baca ini duluan, baru `TASKLIST.md`
(log detail per-phase, termasuk semua bug yang ketemu & fix-nya — itu source of
truth utama) dan `context.md` (spec produk asli).

## Status sekarang

**Phase 0–8 selesai** (lihat checklist di `TASKLIST.md`). Yang jalan:
- Auth 3 role (Admin/Coordinator/Teacher) + RLS penuh
- Master data CRUD (Sekolah, Teacher, Siswa, Kelas, Kurikulum) — **cuma 1 sekolah: Nurul Fajri**, 24 kelas real, 302 siswa real, 9 teacher real (semua dari `reference-data/`)
- Lesson Plan authoring by teacher
- Teacher core workflow: check-in → absensi → check-out → Daily Teaching Report → auto progress update
- Substitute Teacher & Handover Summary
- Class Timeline
- Monitoring Dashboard (Admin `/dashboard`, Coordinator `/monitoring`) — laporan operasional lengkap (tabel/chart), termasuk estimasi pendapatan, absensi tutor, distribusi jadwal, dan `/reports` buat browse Daily Teaching Report satu-satu
- **126 Daily Teaching Report ASLI** ter-import dari `reference-data/NGE Daily Teaching Report (Responses).xlsx` (15 Jul–5 Agu 2026)
- **Parent Report (PDF)** — Admin generate laporan bulanan per siswa (attendance + teaching report + progress + curriculum), auto-draft komentar guru yang bisa diedit, generate PDF bertema playful/ilustratif. Orang tua akses **tanpa akun** lewat `/parent-report` (cari by NIS) — PDF di-generate on-demand, gak bergantung ke Google Drive (lihat catatan Drive di bawah, penting).

**Belum dikerjain:** Phase 9 sisa (upload PDF laporan orang tua ke folder terstruktur di Drive — ditahan karena akun Google yang dipakai personal, bukan Workspace, lihat di bawah), Phase 10 (hardening/launch, termasuk rate limiting buat portal parent).

## ⚠️ Google Drive: akun personal, bukan Workspace — Shared Drive gak bisa dipakai

User cuma punya akun Google biasa. Upload file lewat service account **butuh Shared
Drive** (fitur Google Workspace) karena service account gak punya kuota storage
sendiri di My Drive biasa — request `drive.files.create` ke folder biasa selalu
gagal 403 `"Service Accounts do not have storage quota"`, **bukan soal salah
config folder ID**. Ini gak bisa difix dari kode.

Konsekuensinya, cara akses file didesain **gak bergantung Drive**:
- Foto check-in/check-out & Parent Report PDF tetap **dicoba** upload ke Drive
  (best-effort, `driveError` di-catch, gak bikin request gagal keseluruhan).
- Parent Report bisa diakses langsung tanpa Drive lewat `/parent-report` (portal
  publik, cari by NIS) → `GET /api/parent-reports/[id]/download` yang generate
  PDF on-the-fly dari data live, gak butuh file tersimpan di mana pun.
- Kalau ke depannya user dapet akses Workspace, tinggal: (1) bikin Shared Drive,
  (2) share ke email service account, (3) isi `GOOGLE_DRIVE_ROOT_FOLDER_ID` ke
  folder di dalam Shared Drive itu — kode `drive-client.ts` udah siap pakai.

## Kredensial

Semua login test/production ada di **`CREDENTIALS.md`** (gitignored, lokal doang).
Admin: `admin@nufaglobaledu.com`. 8 teacher real + akun dummy test lama
(`teacher@nufaglobal.id` dkk, password `password123`).

## Pola/gotcha penting buat diikutin

1. **Supabase embed to-one relation kadang balik array, bukan object** — SELALU
   pakai helper `toOne()` (ada di `meetings/queries.ts`, `monitoring/queries.ts`,
   `parent-reports/period-data.ts`, dll) buat handle relasi kayak
   `check_ins(...)`, `teaching_reports(...)` dari tabel yang FK-nya di sisi lain.
2. **Nested Supabase select 3+ level itu fragile** — mending pecah jadi beberapa
   query + join manual di JS (liat pola di `dashboard/queries.ts` /
   `parent-reports/period-data.ts`) daripada nested select yang butuh banyak
   `as never`.
3. **RLS baru selalu perlu di-test end-to-end**, bukan cuma baca policy-nya —
   dan buat rute yang **sengaja publik/tanpa login** (kayak `/api/parent-report/
   lookup`, `/api/parent-reports/[id]/download`), inget RLS gak punya policy
   buat role `anon` sama sekali, jadi `createClient()` biasa (`@/lib/supabase/
   server`, respect cookie session) **selalu return kosong** buat visitor
   beneran — ketipu kalau ngetes sambil login sebagai Admin karena policy Admin
   nempel ke cookie session-nya, bukan ke rute-nya. Buat rute publik-by-design,
   pakai `createAdminClient()` (`@/lib/supabase/admin.ts`, service-role, bypass
   RLS) dan gate akses lewat parameter yang gak gampang ditebak (NIS/UUID),
   bukan lewat auth. **Selalu tes pakai `curl` tanpa cookie** buat mastiin rute
   publik beneran publik, jangan cuma tes dari browser yang lagi login.
4. **Middleware (`src/middleware.ts`) block semua rute buat unauthenticated
   user by default** — kalau nambah rute publik baru, harus ditambahin exception
   eksplisit di situ (liat pola `/parent-report`, `/api/parent-report`,
   `/api/parent-reports/*/download`), bukan cuma di RLS.
5. **Semua kolom timestamp harus `TIMESTAMPTZ`**, bukan `TIMESTAMP`.
6. **react-pdf (`@react-pdf/renderer`) gak reliably respect `zIndex`/stacking
   buat elemen `position:"absolute"` di atas sibling normal-flow** — kalau
   nge-overlay dekorasi (gradient/shape) di atas teks/konten penting, resikonya
   dekorasi itu malah nutupin konten (teks tetap ke-extract di text layer PDF,
   tapi invisible secara visual — gampang ke-miss kalau cuma baca text
   extraction, HARUS dicek visual). Aman kalau background solid + semua
   konten di normal flexbox flow tanpa overlap absolute.
7. **`Buffer` node.js gak selalu bisa langsung dipassing ke Web API** kayak
   `Blob`/`NextResponse` body di runtime edge-ish Next.js — wrap dengan
   `new Uint8Array(buffer)` kalau ketemu type error `BlobPart`/`BodyInit`.
8. Kalau perlu render/test komponen JSX (`.tsx`) langsung lewat `tsx` CLI di
   luar Next.js build (misal script one-off di `scripts/`), tsconfig root
   (`"jsx": "preserve"`) gak dipahami esbuild — bikin `scripts/tsconfig.json`
   sementara yang extend root tapi override `"jsx": "react-jsx"`, **hapus lagi
   setelah selesai**, jangan commit.
9. **Dev server port**: kalau 3000 kepake proses lama, otomatis pindah ke 3001 —
   cek log-nya, jangan asumsi port.
10. Palet warna chart udah divalidasi pakai `dataviz` skill
    (`--chart-1..5`, `--status-good/warning/critical` di `globals.css`) — pakai
    token itu buat chart/badge baru, jangan bikin warna sendiri.

## Next step yang paling masuk akal

Phase 10 — Hardening: yang paling konkret & belum dikerjain adalah **rate
limiting/anti-enumeration buat portal `/parent-report`** (NIS formatnya
predictable, `SD2501130`/`SMP2601920`/dst, dan lookup-nya sekarang bypass RLS
lewat service-role — kalau data 302 siswa real udah dipakai serius, orang lain
bisa nebak-nebak NIS dan narik data siswa lain). Selain itu audit RLS
lintas-role, mobile responsiveness check khusus flow Teacher, dan smoke test
end-to-end sebelum deploy ke domain production.
