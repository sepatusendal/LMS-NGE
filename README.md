<p align="center">
  <img src="docs/assets/logo.png" alt="NUFA Global Education" width="180" />
</p>

<h1 align="center">ECMS — English Course Management System</h1>

<p align="center">
  <i>Portal internal NUFA Global Education buat ngatur guru ngajar offline —<br/>
  biar absen, lesson plan, dan laporan ortu nggak lagi hidup di spreadsheet yang entah versi keberapa.</i>
</p>

<p align="center">
  <a href="#-fitur">Fitur</a> ·
  <a href="#-tech-stack">Tech Stack</a> ·
  <a href="#-cara-jalanin-di-lokal">Cara Jalanin</a> ·
  <a href="#-struktur-proyek">Struktur</a> ·
  <a href="#-deploy">Deploy</a>
</p>

---

## Ini proyek apaan?

NUFA Global Education punya beberapa lini bisnis (English Course, English Camp,
Immersion Program, Native Speaker Program, Teacher Training). **ECMS ini khusus
ngurusin lini English Course** — kelas bahasa Inggris yang diajar guru NGE
langsung ke sekolah-sekolah partner, sepenuhnya offline.

Jadi ini **bukan** platform e-learning dengan video call atau siswa login
sendiri. Nggak ada murid yang buka portal, nggak ada orang tua yang bikin
akun. Yang pakai sistem ini cuma tiga: **Tutor** (guru), **Coordinator**, dan
**Admin**. Orang tua tetap terima laporan — tapi dalam bentuk PDF yang
di-generate dari sini, bukan lewat login.

Singkatnya: ganti proses manual (absen kertas, lesson plan di WA, rekap gaji
di Excel yang formula-nya cuma satu orang yang ngerti) jadi satu portal yang
rapi, bisa diaudit, dan nggak bikin admin pusing tiap akhir bulan.

## Fitur

**Buat Tutor**
- 📅 **Jadwal & Kelas Hari Ini** — langsung tahu ngajar apa, di mana, jam berapa, tanpa buka grup WA
- ✅ **Absensi** — check-in, check-out, sekaligus isi Daily Teaching Report per pertemuan
- 📝 **Lesson Plan** — susun rencana ajar per skill (Vocabulary, Grammar, dll), dengan learning objectives yang auto-grow
- 👤 **Profil & ganti password sendiri** — nggak perlu WA admin cuma buat reset password

**Buat Coordinator & Admin**
- 📊 **Dashboard** — kepatuhan lesson plan, beban gaji tutor (fee × jumlah pertemuan), semuanya dengan chart, bukan tabel mentah
- 🏫 **Master Data** — sekolah, kelas, kurikulum, siswa, tutor — CRUD lengkap
- 🧾 **Laporan Orang Tua** — generate & kirim PDF laporan progres anak, tanpa orang tua perlu login apa pun
- 📤 **Export Excel** — semua laporan bisa diunduh, buat yang masih sayang sama spreadsheet
- 🔔 **Pengumuman in-app** — banner/pop-up buat broadcast info ke tutor, dismissible
- 🔁 **Guru pengganti (substitute)** — atur kelas kalau tutor reguler berhalangan

**Yang bikin hidup lebih enak**
- 🌐 **Dwibahasa (ID/EN)** — tinggal klik, semua portal ganti bahasa
- 🌗 **Dark mode** — buat yang kerja lembur rekap gaji jam 11 malam
- ☁️ **Integrasi Google Drive** — modul ajar diambil langsung dari Drive
- ⏰ **Timezone-aware** — semua jadwal & laporan konsisten di WIB, nggak ada cerita "jam server beda sama jam Jakarta"

## Tech Stack

| Layer | Pakai |
|---|---|
| Framework | [Next.js 15](https://nextjs.org) (App Router, Turbopack) |
| Bahasa | TypeScript, React 19 |
| Database & Auth | [Supabase](https://supabase.com) + [Prisma](https://www.prisma.io) |
| UI | Tailwind CSS v4, shadcn/ui, Base UI |
| i18n | next-intl |
| Form & validasi | React Hook Form + Zod |
| Laporan | @react-pdf/renderer, ExcelJS |
| Hosting | Vercel |

## Cara jalanin di lokal

```bash
npm install
cp .env.example .env.local   # isi kredensial Supabase & Google Drive kamu
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Ada juga env terpisah
buat staging kalau kamu mau tes tanpa nyentuh data production:

```bash
npm run dev:staging   # jalan di :3100, pakai .env.staging
```

Perintah lain yang lumayan sering dipakai:

```bash
npm run lint           # ESLint
npm run format         # Prettier
npm run db:studio:staging   # buka Prisma Studio ke DB staging
```

> Kredensial akun demo (admin/coordinator/tutor) ada di `CREDENTIALS.staging.md`
> — file lokal, sengaja nggak ikut ke-commit.

## Struktur proyek

```
src/app/
├── (auth)/login         # halaman login, satu pintu buat semua role
├── (admin)/             # dashboard, master data, laporan — khusus Admin
├── (coordinator)/       # monitoring lintas tutor — khusus Coordinator
├── (teacher)/           # today, absensi, lesson plan, jadwal — khusus Tutor
└── api/                 # cron keep-alive, integrasi Drive, generator laporan
```

Role-based access diatur lewat middleware + route groups — jadi Tutor nggak
bakal nyasar liat dashboard gaji, dan sebaliknya.

## Deploy

Tiga environment, tiga branch:

| Branch | Environment | Domain |
|---|---|---|
| `main` | development terbaru | — |
| `dev` | staging | *(protected, internal only)* |
| `prod` | **production** | `ecms.nufaglobaledu.com` |

Deploy jalan otomatis lewat Vercel begitu branch `prod` di-push. Detail
lengkap setup staging & migrasi database ada di [`STAGING.md`](STAGING.md).

---

<p align="center">
  <sub>Dibangun buat NUFA Global Education — biar guru fokus ngajar,<br/>bukan ribet urusan rekap manual. 🎓</sub>
</p>
