# Kontrakan Bersama: Blueprint Proyek

Kumpulan dokumen awal untuk aplikasi pencatat pengeluaran kontrakan yang digunakan oleh enam penghuni melalui PC, Android, dan iOS tanpa publikasi ke Play Store/App Store.

## Isi dokumen
1. `PRD.md` — tujuan, ruang lingkup, fitur, dan kriteria penerimaan.
2. `USER_FLOW.md` — alur admin dan user.
3. `DATABASE_SCHEMA.md` — rancangan tabel dan relasi.
4. `DESIGN_SYSTEM.md` — panduan tampilan dan komponen UI.
5. `SECURITY_RULES.md` — batas akses dan keamanan.
6. `TECH_STACK.md` — teknologi dan struktur proyek.
7. `IMPLEMENTATION_PLAN.md` — urutan pengerjaan.

## Keputusan awal
- Aplikasi berupa Progressive Web App (PWA), responsif untuk desktop dan ponsel.
- Frontend: Next.js App Router, TypeScript, Tailwind CSS, shadcn/ui.
- Backend/data: Supabase Auth, PostgreSQL, Storage, dan Row Level Security (RLS).
- Hosting: Vercel untuk frontend dan Supabase untuk backend.
- Penggunaan melalui tautan terbatas; bukan aplikasi publik yang harus dicari di toko aplikasi.
- Tidak ada fitur kas bersama. Sistem hanya mencatat patungan dan kewajiban masing-masing.

## Cara menggunakan blueprint
Baca PRD dan USER_FLOW terlebih dahulu. Sepakati aturan bisnis, kemudian sesuaikan skema database dan keamanan sebelum membuat halaman. Dokumen ini merupakan rancangan awal, bukan pengganti pengujian keamanan.
