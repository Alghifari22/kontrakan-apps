# User Flow

## 1. Akses dan login
1. Admin membuat akun atau mengundang anggota.
2. Anggota membuka URL aplikasi.
3. Anggota login dengan kredensial yang diberikan.
4. Sistem memeriksa keanggotaan kelompok dan peran.
5. Sistem menampilkan dashboard sesuai peran.

## 2. Admin membuat tagihan bulanan
1. Buka menu Tagihan.
2. Pilih atau buat periode, misalnya Oktober 2026.
3. Tambahkan pengeluaran seperti listrik, Wi-Fi, gas, beras, dan air.
4. Untuk setiap pengeluaran, isi nama, kategori, nominal, jenis tetap/tidak tetap, dan peserta.
5. Sistem menghitung bagian setiap peserta dan total kewajiban per orang.
6. Admin memeriksa ringkasan serta memperbaiki data jika masih draf.
7. Admin menerbitkan periode.
8. Penghuni melihat tagihan yang telah diterbitkan.

## 3. User mengirim bukti transfer
1. User membuka Tagihan Saya.
2. User memilih tagihan berstatus belum dibayar.
3. User melakukan transfer melalui metode di luar aplikasi.
4. User mengisi nominal dan tanggal transfer serta mengunggah bukti.
5. Sistem memvalidasi format, ukuran, kepemilikan tagihan, dan status tagihan.
6. Status menjadi `pending_review`.
7. User melihat pesan bahwa bukti sedang diperiksa.

## 4. Admin memverifikasi pembayaran
1. Admin membuka antrean pembayaran.
2. Admin melihat nominal, waktu kirim, pengirim, dan bukti privat.
3. Admin memilih Setujui atau Tolak.
4. Jika disetujui, sistem menyimpan keputusan, waktu, dan admin pemroses; pembayaran menjadi `paid`.
5. Jika ditolak, admin wajib mengisi alasan; status menjadi `rejected`.
6. User melihat hasil dan dapat mengirim bukti baru jika ditolak.

## 5. Jadwal giliran air minum
1. Admin membuka menu Jadwal Giliran.
2. Admin mengatur anggota, tanggal mulai, dan interval giliran.
3. Sistem membuat urutan tanggal dan penanggung jawab.
4. Semua anggota dapat melihat jadwal yang relevan.
5. Aplikasi menampilkan pengingat di dashboard sebelum giliran.
6. Admin dapat menandai jadwal selesai atau menggeser jadwal dengan catatan.

## 6. Kondisi tepi yang harus dirancang
- Admin mencoba menerbitkan periode tanpa pengeluaran.
- Pengeluaran memiliki nominal nol atau peserta kosong.
- Ada pembagian yang menghasilkan sisa rupiah.
- User mengirim bukti untuk tagihan yang sudah lunas.
- User mengunggah file terlalu besar atau tipe file tidak didukung.
- Admin menolak tanpa alasan.
- Dua admin memproses bukti yang sama pada waktu hampir bersamaan.
- Anggota keluar dari kelompok setelah periode diterbitkan.
- Jadwal giliran diubah setelah pengingat ditampilkan.
- Jaringan terputus saat upload atau persetujuan.
