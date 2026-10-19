# Security Rules

## 1. Prinsip dasar
Anggap semua data dari browser dapat dimanipulasi. Validasi UI membantu pengalaman pengguna, tetapi otorisasi wajib diterapkan di database atau server.

## 2. Autentikasi dan keanggotaan
- Gunakan Supabase Auth.
- Akun dibuat atau diundang oleh admin; jangan mengandalkan pilihan role dari form pendaftaran publik.
- Periksa keanggotaan aktif pada setiap akses data.
- Peran harus berasal dari data yang terlindungi, bukan dari localStorage atau parameter request.
- Jangan membagikan akun bersama. Setiap penghuni sebaiknya memiliki akun sendiri.

## 3. Otorisasi
- User hanya dapat membaca tagihan, pembayaran, dan data personal yang menjadi haknya, sesuai kebijakan privasi kelompok.
- Admin hanya mendapat hak admin jika tercatat sebagai admin aktif di `household_members`.
- Hanya admin yang dapat membuat/mengubah pengeluaran, mengelola anggota, menerbitkan periode, dan memverifikasi pembayaran.
- User tidak boleh mengubah `status`, `reviewed_by`, `reviewed_at`, atau `rejection_reason` secara langsung.
- Validasi bahwa pembayaran yang diajukan benar-benar milik user dan masih bisa dibayar.
- Terapkan Row Level Security (RLS) pada semua tabel yang terekspos melalui Supabase API.

## 4. Bukti transfer
- Bucket Storage harus privat.
- Izinkan upload hanya untuk anggota terautentikasi dan file yang terkait dengan tagihannya sendiri.
- Batasi tipe file yang didukung, misalnya JPEG, PNG, atau PDF, dan tetapkan batas ukuran.
- Gunakan path acak yang tidak berisi informasi sensitif.
- Gunakan signed URL berumur pendek untuk melihat file bila sesuai.
- Admin hanya dapat melihat bukti milik household yang dikelolanya.
- Jangan pernah menaruh service-role key di kode frontend.

## 5. Operasi sensitif
- Penerbitan tagihan dan persetujuan pembayaran dilakukan melalui operasi server/database yang tervalidasi dan atomik.
- Cegah persetujuan ganda untuk tagihan yang sama.
- Catat aktor, waktu, dan hasil untuk tindakan penting.
- Jangan izinkan perubahan pada tagihan terbit tanpa proses koreksi yang tercatat.
- Rate-limit operasi login, upload, dan pengiriman bukti jika tersedia.

## 6. Secrets dan konfigurasi
- Simpan secret di environment variables hosting.
- Hanya key publik Supabase yang memang dirancang untuk frontend boleh digunakan di client.
- Jangan commit `.env.local`.
- Sediakan `.env.example` tanpa nilai rahasia.
- Aktifkan MFA untuk akun admin bila memungkinkan.
- Backup dan uji pemulihan data secara berkala.

## 7. Checklist sebelum rilis
- Uji user A mencoba membaca tagihan user B.
- Uji user biasa mencoba mengubah role menjadi admin.
- Uji user mengubah nominal atau status pembayaran melalui request langsung.
- Uji akses file bukti tanpa login dan dengan akun dari kelompok lain.
- Uji upload file dengan tipe atau ukuran tidak valid.
- Uji dua permintaan persetujuan untuk tagihan yang sama.
- Periksa kebijakan RLS satu per satu, jangan hanya mengandalkan tampilan UI.
