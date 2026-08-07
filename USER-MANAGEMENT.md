# Panduan: Menambah User & Mengatur Role

Berlaku untuk production maupun staging — bedanya cuma Supabase project mana
yang lo buka di dashboard. Jangan pernah kerjain langkah manual (bikin user
lewat Supabase dashboard) di project yang salah — cek dulu nama project-nya
di kiri atas dashboard sebelum mulai.

## 1. Tiga role di aplikasi ini

| Role | Landing page | Bisa apa |
|---|---|---|
| `ADMIN` | `/dashboard` | Akses penuh — kelola sekolah, siswa, kelas, kurikulum, teacher, lihat semua report, generate laporan orang tua, pengaturan. |
| `COORDINATOR` | `/monitoring` | Read-only — pantau status kelas & lesson plan semua sekolah, tidak bisa mengubah data. |
| `TEACHER` | `/today` | Cuma kelas yang di-assign ke dirinya — check-in, absensi, check-out, Daily Teaching Report, lesson plan. |

Role disimpan di kolom `role` tabel `public.users`, dan otomatis dibaca dari
metadata `role` yang dikirim saat akun Supabase Auth dibuat (lihat trigger
`handle_new_user` di
`prisma/migrations/20260806060000_auth_trigger_and_rls/migration.sql`).

## 2. Menambah akun Teacher (lewat UI — cara yang didukung)

Ini satu-satunya role yang punya form di aplikasi:

1. Login sebagai Admin → **Teacher** (sidebar) → **Tambah Teacher**.
2. Isi nama, email, nomor HP (opsional).
3. Submit → password sementara di-generate otomatis dan ditampilkan **sekali**
   di dialog. Catat dan sampaikan ke teacher secara langsung — tidak bisa
   dilihat ulang setelah dialog ditutup.
4. Di balik layar ini memanggil `createTeacherAccount`
   (`src/features/teachers/actions.ts`): bikin user di Supabase Auth dengan
   `role: TEACHER`, lalu insert row ke tabel `teachers`.

Teacher yang baru dibuat belum punya kelas — assign lewat **Sekolah → Kelas**
(set `teacherId` kelas ke teacher ini).

## 3. Menambah akun Admin atau Coordinator (manual — belum ada UI)

Belum ada form di aplikasi untuk role ini, jadi lewat Supabase dashboard
langsung:

1. Buka **Supabase Dashboard** → pilih project yang benar (prod atau
   staging) → **Authentication → Users → Add user → Create new user**.
2. Isi email + password, **centang "Auto Confirm User"** (biar tidak perlu
   verifikasi email).
3. Di field **User Metadata** (JSON), isi:
   ```json
   { "full_name": "Nama Lengkap", "role": "ADMIN" }
   ```
   (ganti `"ADMIN"` jadi `"COORDINATOR"` sesuai kebutuhan)
4. Klik **Create user**. Trigger `handle_new_user` otomatis bikin row yang
   sesuai di `public.users` dengan role itu — tidak perlu insert manual.
5. Kalau lupa isi metadata saat create, role default-nya jatuh ke `TEACHER`
   (lihat `COALESCE(..., 'TEACHER')` di trigger). Perbaiki dengan update
   manual: **Table Editor → users** → cari row user itu → ubah kolom `role`
   jadi `ADMIN` / `COORDINATOR` langsung di situ.

## 4. Reset password

- **Teacher**: ada tombolnya di app — Admin → **Teacher** → **Edit** baris
  teacher yang dimaksud → **Reset Password**. Password baru di-generate
  otomatis dan ditampilkan **sekali** di dialog (`resetTeacherPassword` di
  `src/features/teachers/actions.ts`, lewat `admin.auth.admin.updateUserById`)
  — catat dan sampaikan langsung, tidak bisa dilihat ulang.
- **Admin/Coordinator**: belum ada tombolnya di app, reset lewat Supabase
  dashboard project yang sesuai → **Authentication → Users** → klik user →
  **Reset Password** (kirim email reset), atau **"..." menu → Reset Password**
  kalau usernya alamat testing yang tidak bisa terima email.

## 5. Menonaktifkan user

- **Teacher**: ada toggle **Aktif/Nonaktif** di kolom Status halaman Admin →
  Teacher. Ini bukan cuma flag kosmetik — `setTeacherActiveAction` di
  `src/features/teachers/actions.ts` sekaligus **mem-ban akun itu di Supabase
  Auth** (`admin.auth.admin.updateUserById(..., { ban_duration })`), jadi
  begitu dinonaktifkan, teacher itu langsung tidak bisa login sama sekali —
  bukan cuma hilang dari tampilan. Toggle balik ke Aktif untuk mencabut ban.
  Row `teachers`/`users` tidak pernah dihapus, cuma di-nonaktifkan, supaya
  histori lesson plan/report/check-in yang sudah terkait tetap utuh (banyak
  foreign key nunjuk ke `teachers.id`).
- **Admin/Coordinator**: belum ada tombol nonaktifkan di app. Kalau perlu
  cabut akses, hapus langsung dari **Authentication → Users** di Supabase
  dashboard — role ini tidak punya data yang bergantung ke `users.id` selain
  kepemilikan record, jadi lebih aman dihapus dibanding Teacher.

## 6. Cepat: kredensial yang sudah ada

- Production: lihat `CREDENTIALS.md`
- Staging: lihat `CREDENTIALS.staging.md`

Keduanya gitignored — jangan pernah commit ke git.
