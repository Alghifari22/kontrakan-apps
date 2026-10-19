# Implementation Plan

## Tahap 0: Putuskan aturan produk
- Sepakati apakah semua anggota boleh melihat total kelompok atau hanya tagihan sendiri.
- Sepakati apakah pembayaran parsial diperlukan. Rekomendasi MVP: belum.
- Tentukan siapa yang boleh membuat akun dan berapa admin.
- Sepakati aturan sisa pembagian rupiah.
- Sepakati aturan perubahan tagihan yang sudah diterbitkan.
- Tetapkan interval giliran air minum.

**Selesai jika:** aturan bisnis di PRD tidak lagi ambigu.

## Tahap 1: Setup proyek
- Buat repository Git dan branch kerja.
- Buat aplikasi Next.js dengan TypeScript.
- Pasang Tailwind CSS dan shadcn/ui.
- Buat proyek Supabase dan environment lokal.
- Siapkan layout responsif dan halaman login.
- Tambahkan `.env.example` dan pastikan secret tidak masuk Git.

**Selesai jika:** aplikasi dapat dijalankan lokal dan login terhubung ke Supabase Auth.

## Tahap 2: Database dan keamanan
- Buat migration untuk tabel inti.
- Buat relasi, constraint, indeks, dan RLS.
- Buat fungsi aman untuk penerbitan tagihan dan review pembayaran.
- Siapkan Storage privat untuk bukti.
- Buat data dummy hanya untuk development.

**Selesai jika:** pengujian akses user/admin lolos, termasuk percobaan akses lintas anggota.

## Tahap 3: Anggota dan dashboard
- Tampilkan dashboard berbeda berdasarkan role.
- Admin dapat melihat anggota dan ringkasan periode.
- User dapat melihat tagihan pribadi.
- Tambahkan loading, error, dan empty states.

**Selesai jika:** data dashboard berasal dari database, bukan data mock production.

## Tahap 4: Pengeluaran dan tagihan
- Admin membuat periode draf.
- Tambahkan, edit, dan hapus pengeluaran pada draf.
- Pilih peserta tiap pengeluaran.
- Hitung pembagian dan tampilkan rincian.
- Buat proses terbitkan periode.
- Simpan snapshot pembagian saat diterbitkan.

**Selesai jika:** hasil hitung sesuai contoh manual dan tagihan terbit tidak berubah saat keanggotaan berubah.

## Tahap 5: Pembayaran dan bukti
- User mengunggah bukti.
- Validasi nominal, tanggal, tipe, dan ukuran file.
- Admin membuka antrean review.
- Admin menyetujui atau menolak dengan alasan.
- Catat riwayat setiap pengiriman dan keputusan.
- Cegah persetujuan ganda.

**Selesai jika:** user tidak dapat membuat status lunas sendiri dan bukti hanya terlihat oleh pihak berwenang.

## Tahap 6: Jadwal giliran
- Admin mengatur urutan anggota dan tanggal mulai.
- Buat jadwal giliran.
- Tampilkan giliran berikutnya dan riwayat.
- Tambahkan pengingat dalam aplikasi.
- Uji perubahan jadwal dan zona waktu.

**Selesai jika:** jadwal selanjutnya akurat dan dapat dilihat semua anggota yang berhak.

## Tahap 7: PWA dan rilis
- Tambahkan manifest, ikon, dan konfigurasi instalasi yang sesuai.
- Uji layout di desktop, Android, dan iOS.
- Deploy ke Vercel.
- Terapkan migration production.
- Buat akun anggota.
- Uji URL tanpa login, login user, login admin, upload, dan alur review.
- Siapkan backup dan cara menangani kesalahan.

**Selesai jika:** enam penghuni dapat memakai aplikasi melalui URL dan semua tes akses penting lolos.

## Urutan prioritas
1. Aturan bisnis dan keamanan.
2. Login dan database.
3. Pengeluaran, pembagian, dan tagihan.
4. Bukti transfer dan verifikasi.
5. Jadwal giliran.
6. PWA dan penyempurnaan visual.
7. Push notification, ekspor, dan fitur tambahan setelah MVP stabil.
