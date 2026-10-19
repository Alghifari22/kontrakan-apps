# Product Requirements Document (PRD)

## 1. Ringkasan produk
Aplikasi web responsif untuk membantu penghuni kontrakan mencatat pengeluaran bersama, menghitung kewajiban setiap orang, memantau pembayaran, dan mengingatkan giliran membeli air minum. Aplikasi digunakan oleh satu kelompok kontrakan yang terdiri dari enam penghuni.

## 2. Masalah yang ingin diselesaikan
- Perhitungan patungan sering dilakukan manual dan rawan salah.
- Pengeluaran tidak selalu ditanggung orang yang sama.
- Penghuni sulit mengetahui apakah pembayaran sudah diterima dan diverifikasi.
- Giliran membeli air minum mudah terlupakan.
- Riwayat pengeluaran dan bukti pembayaran tersebar di chat.

## 3. Tujuan
- Menampilkan jumlah tagihan per orang secara jelas.
- Memastikan setiap biaya hanya dibebankan kepada peserta yang dipilih.
- Mencatat proses pengiriman dan persetujuan bukti transfer.
- Menyediakan riwayat tagihan dan jadwal giliran yang mudah diperiksa.
- Bisa diakses dari PC, Android, dan iOS melalui browser/PWA.

## 4. Pengguna dan hak akses
### Admin
- Mengelola anggota kontrakan.
- Membuat dan mengubah draf periode tagihan.
- Menambahkan pengeluaran tetap dan tidak tetap.
- Menentukan peserta patungan setiap pengeluaran.
- Menerbitkan tagihan.
- Memeriksa, menyetujui, atau menolak bukti pembayaran dengan alasan.
- Mengatur urutan dan tanggal giliran membeli air.
- Melihat ringkasan dan riwayat seluruh kelompok.

### User
- Melihat ringkasan dan rincian tagihan miliknya.
- Mengirim bukti transfer untuk tagihan miliknya.
- Melihat status dan alasan penolakan.
- Melihat jadwal giliran dan riwayat yang relevan.
- Tidak dapat mengubah nominal tagihan, peserta, atau status persetujuan.

## 5. Ruang lingkup MVP
1. Login dengan akun yang dibuat/diundang admin.
2. Dashboard personal dan dashboard admin.
3. Periode tagihan bulanan.
4. Pengeluaran tetap dan tidak tetap.
5. Pembagian biaya berdasarkan peserta yang dipilih.
6. Penerbitan tagihan dan rincian kewajiban per penghuni.
7. Pengiriman bukti transfer dan verifikasi admin.
8. Jadwal giliran membeli air minum.
9. Riwayat tagihan, pembayaran, dan keputusan admin.
10. Layout responsif dan opsi instalasi PWA.

## 6. Di luar ruang lingkup MVP
- Saldo kas bersama atau dompet digital.
- Pembayaran otomatis melalui payment gateway.
- Integrasi rekening bank.
- OCR otomatis untuk membaca bukti transfer.
- Aplikasi native terpisah untuk Android/iOS.
- Multi-kontrakan dan multi-organisasi, kecuali dibutuhkan pada tahap berikutnya.
- Push notification yang dijamin bekerja pada semua perangkat. MVP dapat dimulai dengan pengingat di dalam aplikasi.

## 7. Aturan bisnis
- Semua nilai uang disimpan sebagai integer dalam rupiah, bukan floating point.
- Pengeluaran memiliki nama, kategori, nominal, jenis, dan daftar peserta.
- Jenis pengeluaran: tetap atau tidak tetap.
- Biaya per orang dihitung dari nominal pengeluaran dibagi jumlah peserta aktif yang ditentukan untuk pengeluaran tersebut.
- Jika hasil pembagian tidak habis, sisa rupiah dibagikan dengan aturan yang konsisten, misalnya satu rupiah tambahan kepada peserta berdasarkan urutan anggota. Aturan ini harus ditampilkan dan diuji.
- Anggota yang tidak dipilih sebagai peserta tidak mendapat beban biaya.
- Draf dapat diubah. Tagihan yang telah diterbitkan tidak boleh berubah diam-diam.
- User mengirim bukti transfer; status menjadi `pending_review`.
- Hanya admin yang berwenang dapat menyetujui atau menolak bukti.
- Jika ditolak, admin wajib menuliskan alasan dan user dapat mengirim ulang.
- Untuk MVP, satu pembayaran harus melunasi nominal tagihan penuh. Pembayaran parsial dapat ditambahkan kemudian.
- Bukti transfer disimpan secara privat dan tidak boleh diakses hanya dengan menebak URL.
- Jadwal giliran harus menyimpan penanggung jawab dan tanggal yang jelas.
- Tidak ada pencatatan kas bersama; fitur hanya menghitung patungan dan status kewajiban.

## 8. Status
### Periode/tagihan
- `draft`: belum diterbitkan, masih dapat diedit admin.
- `published`: sudah terlihat oleh penghuni.
- `archived`: periode lama yang tidak aktif.

### Pembayaran
- `unpaid`: belum ada bukti pembayaran aktif.
- `pending_review`: bukti sedang diperiksa.
- `paid`: telah disetujui admin.
- `rejected`: bukti ditolak dan membutuhkan tindakan user.

Status pembayaran dan status periode adalah dua hal berbeda.

## 9. Kriteria penerimaan
- User hanya dapat melihat data keuangan yang memang boleh dilihatnya sesuai kebijakan produk.
- Sistem menghitung tagihan sesuai peserta pada setiap pengeluaran.
- Total tagihan yang ditampilkan sama dengan rincian komponennya.
- User tidak bisa mengubah status menjadi lunas melalui manipulasi browser/API.
- Bukti yang dikirim tersimpan privat dan dapat dilihat admin yang berwenang.
- Penolakan menyimpan alasan dan memungkinkan pengiriman ulang.
- Tagihan terbit tetap konsisten walaupun keanggotaan berubah pada bulan berikutnya.
- Antarmuka berfungsi pada lebar layar ponsel dan desktop.
- Aplikasi dapat dibuka melalui URL tanpa publikasi toko aplikasi.

## 10. Ukuran keberhasilan awal
- Admin dapat membuat dan menerbitkan satu periode tagihan tanpa menghitung manual.
- Setiap penghuni dapat mengetahui total dan rincian kewajibannya.
- Semua keputusan pembayaran tercatat dengan waktu dan admin yang memproses.
- Jadwal giliran berikutnya dapat diketahui tanpa bertanya di chat.
