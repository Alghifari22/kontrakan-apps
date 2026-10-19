# Design System

## 1. Arah visual
Aplikasi keuangan kontrakan yang modern, bersih, tenang, dan mudah dipahami. Prioritaskan kejelasan nominal, status pembayaran, dan tindakan utama. Hindari tampilan yang terlalu ramai atau penuh grafik.

## 2. Palet warna
- Primary: `#2563EB` (biru untuk aksi utama).
- Primary hover: `#1D4ED8`.
- Success: `#15803D` (lunas/berhasil).
- Warning: `#A16207` (menunggu verifikasi).
- Danger: `#B91C1C` (ditolak/kesalahan).
- App background light: `#F8FAFC`.
- Surface light: `#FFFFFF`.
- Text primary: `#0F172A`.
- Text secondary: `#475569`.
- Border: `#E2E8F0`.
- Dark background: `#0B1220`.
- Dark surface: `#111827`.
- Dark text: `#F8FAFC`.
- Dark border: `#334155`.

Jangan mengandalkan warna saja untuk menjelaskan status. Sertakan teks dan, bila sesuai, ikon.

## 3. Tipografi
- Font utama: Inter atau font sans-serif sistem.
- Judul halaman: 24–30 px desktop, 22–26 px mobile.
- Judul kartu: 16–18 px.
- Body: 14–16 px.
- Label dan metadata: minimal 12–14 px.
- Nominal uang menggunakan angka yang mudah dibaca dan konsisten.

## 4. Layout responsif
### Desktop
- Sidebar tetap di kiri.
- Header menampilkan nama halaman, periode aktif, dan menu akun.
- Area utama menggunakan lebar yang nyaman; jangan membuat tabel terlalu melebar.
- Dashboard menampilkan kartu ringkasan lalu daftar tagihan dan aktivitas.

### Mobile
- Navigasi ringkas menggunakan bottom navigation atau menu yang mudah dijangkau.
- Kartu ringkasan disusun satu atau dua kolom sesuai lebar.
- Hindari tabel lebar; ubah daftar tagihan menjadi kartu.
- Tombol utama memiliki area sentuh minimal sekitar 44 x 44 px.
- Form upload bukti mudah digunakan dengan satu tangan.

## 5. Komponen
- `Button`: primary, secondary, outline, destructive, ghost.
- `Card`: ringkasan nominal, daftar pengeluaran, jadwal.
- `StatusBadge`: Belum Dibayar, Menunggu Verifikasi, Perlu Perbaikan, Lunas.
- `ExpenseForm`: nama, kategori, nominal, jenis, peserta, catatan.
- `ProofUpload`: preview, nama file, ukuran, tombol ganti/hapus sebelum dikirim.
- `ConfirmationDialog`: konfirmasi terbitkan tagihan, setujui pembayaran, atau tolak pembayaran.
- `EmptyState`: ilustrasi/ikon sederhana, penjelasan singkat, tindakan berikutnya.
- `Skeleton`: placeholder saat data sedang dimuat.
- `Toast`: umpan balik berhasil/gagal tanpa menutupi pekerjaan pengguna.

## 6. Pola halaman
- Login/akses akun.
- Dashboard admin.
- Dashboard user.
- Daftar dan rincian periode tagihan.
- Form pengeluaran dan peserta patungan.
- Antrean verifikasi pembayaran.
- Rincian pembayaran.
- Jadwal giliran air.
- Riwayat aktivitas.
- Pengaturan anggota dan profil.

## 7. Prinsip UX
- Tampilkan total tagihan personal secara menonjol.
- Jelaskan cara total dihitung dan siapa peserta tiap pengeluaran.
- Jangan membuat tombol Setujui dan Tolak terlalu berdekatan tanpa konfirmasi.
- Minta alasan saat bukti ditolak.
- Gunakan format Rupiah Indonesia, misalnya `Rp300.000`.
- Berikan loading, empty, success, dan error state untuk semua operasi penting.
- Form tidak boleh kehilangan data tanpa peringatan.
- Sediakan kontras teks yang baik dalam mode terang maupun gelap.
- Jangan menampilkan bukti transfer atau data sensitif kepada anggota yang tidak berwenang.
