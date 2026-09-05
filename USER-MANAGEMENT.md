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

## 3. Menambah akun Admin atau Coordinator (lewat UI)

Sekarang sudah ada form di aplikasi untuk role ini juga (sebelumnya harus
manual lewat Supabase dashboard — itu sudah tidak berlaku):

1. Login sebagai Admin → **Admin & Coordinator** (sidebar) → **Tambah Akun**.
2. Isi nama, email, pilih role (`ADMIN` atau `COORDINATOR`), dan password —
   field password ini **prefilled otomatis** (`generateRandomPassword()`)
   tapi bisa diedit/diganti manual kalau mau set password sendiri, beda
   dengan alur Teacher yang selalu auto-generate.
3. Submit → di balik layar memanggil `createAppUser`
   (`src/features/users/actions.ts`): bikin user di Supabase Auth langsung
   dengan `role` yang dipilih (`email_confirm: true`, tidak perlu verifikasi
   email) — trigger `handle_new_user` otomatis bikin row yang sesuai di
   `public.users`, tidak perlu insert manual.
4. Kalau mau ubah nama atau reset password belakangan, klik **Edit** pada
   baris user itu — form Edit punya dua bagian terpisah (ganti nama, dan
   reset password) yang bisa disubmit independen.

Manual lewat Supabase dashboard (cara lama di bawah) masih bisa dipakai
sebagai fallback kalau UI aplikasi lagi bermasalah, tapi bukan lagi
satu-satunya cara:

<details>
<summary>Cara manual (fallback)</summary>

1. Buka **Supabase Dashboard** → pilih project yang benar (prod atau
   staging) → **Authentication → Users → Add user → Create new user**.
2. Isi email + password, **centang "Auto Confirm User"**.
3. Di field **User Metadata** (JSON), isi:
   ```json
   { "full_name": "Nama Lengkap", "role": "ADMIN" }
   ```
   (ganti `"ADMIN"` jadi `"COORDINATOR"` sesuai kebutuhan)
4. Klik **Create user**. Trigger `handle_new_user` otomatis bikin row yang
   sesuai di `public.users`.
5. Kalau lupa isi metadata saat create, role default-nya jatuh ke `TEACHER`
   (lihat `COALESCE(..., 'TEACHER')` di trigger). Perbaiki dengan update
   manual: **Table Editor → users** → cari row user itu → ubah kolom `role`.

</details>

## 4. Reset password

- **Teacher (oleh diri sendiri)**: teacher bisa ganti password sendiri lewat
  **Profil → Ganti Password** di aplikasi mobile-nya. Diminta masukin
  password lama dulu (di-verifikasi lewat `signInWithPassword`, muncul error
  "Password saat ini salah" kalau keliru), baru boleh set password baru lewat
  `supabase.auth.updateUser`. Komponennya di
  `src/features/auth/change-password-card.tsx`, dipasang di
  `src/app/(teacher)/profile/page.tsx` — tidak butuh admin/server action
  karena cuma mengubah sesi milik sendiri.
- **Teacher (oleh Admin)**: ada tombolnya di app — Admin → **Teacher** →
  **Edit** baris teacher yang dimaksud → **Reset Password**. Password baru
  di-generate otomatis dan ditampilkan **sekali** di dialog
  (`resetTeacherPassword` di `src/features/teachers/actions.ts`, lewat
  `admin.auth.admin.updateUserById`) — catat dan sampaikan langsung, tidak
  bisa dilihat ulang. Pakai ini kalau teacher lupa password lamanya (karena
  cara self-service di atas butuh password lama).
- **Admin/Coordinator**: sekarang ada tombolnya juga — Admin → **Admin &
  Coordinator** → **Edit** baris user itu → bagian **Reset Password** di
  dalam dialog Edit (field-nya prefilled password acak, bisa diedit manual)
  → **Save**. Lewat `resetAppUserPassword` di `src/features/users/actions.ts`,
  pakai `admin.auth.admin.updateUserById` — sama seperti alur reset Teacher,
  bedanya field password-nya visible/editable langsung di form (bukan
  digenerate-lalu-ditampilkan-sekali).
  Reset lewat Supabase dashboard (kirim email reset, atau **"..." menu →
  Reset Password**) masih bisa jadi fallback kalau UI aplikasi bermasalah.

## 5. Menonaktifkan user

- **Teacher**: ada toggle **Aktif/Nonaktif** di kolom Status halaman Admin →
  Teacher. Ini bukan cuma flag kosmetik — `setTeacherActiveAction` di
  `src/features/teachers/actions.ts` sekaligus **mem-ban akun itu di Supabase
  Auth** (`admin.auth.admin.updateUserById(..., { ban_duration })`), jadi
  begitu dinonaktifkan, teacher itu langsung tidak bisa login sama sekali —
  bukan cuma hilang dari tampilan. Toggle balik ke Aktif untuk mencabut ban.
  Row `teachers`/`users` tidak pernah dihapus, cuma di-nonaktifkan, supaya
  histori lesson plan/report/check-in yang sudah terkait tetap utuh (banyak
  foreign key nunjuk ke `teachers.id`). Sama seperti Admin/Coordinator, aksi
  ini juga menolak kalau `userId` yang dituju sama dengan sesi yang login —
  jaga-jaga untuk kasus tidak umum di mana satu akun punya row `teachers`
  sendiri.
- **Admin/Coordinator**: sekarang ada toggle **Aktif/Nonaktif** juga di
  kolom Status halaman Admin → **Admin & Coordinator**, sama persis cara
  kerjanya dengan Teacher — `setAppUserActiveAction` di
  `src/features/users/actions.ts` mem-ban akun itu di Supabase Auth
  (`ban_duration`), bukan cuma flag kosmetik. Satu pengaman tambahan: **admin
  tidak bisa menonaktifkan akunnya sendiri** — aksi ini akan ditolak dengan
  error kalau `userId` yang dituju sama dengan sesi yang sedang login, supaya
  tidak ada admin yang keterkunci dari app-nya sendiri secara tidak sengaja.
  Hapus langsung dari Supabase dashboard masih bisa jadi opsi kalau memang
  mau menghilangkan row-nya sepenuhnya (bukan cuma nonaktifkan).

## 6. Cepat: kredensial yang sudah ada

- Production: lihat `CREDENTIALS.md`
- Staging: lihat `CREDENTIALS.staging.md`

Keduanya gitignored — jangan pernah commit ke git.
