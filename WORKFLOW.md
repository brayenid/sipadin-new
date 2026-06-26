# Workflow & Detailed Business Logic: SPJ Elektronik v2

Dokumen ini mendefinisikan seluruh alur kerja operasional, logika kalkulasi anggaran, skema antarmuka pengisian form (UX), hingga mekanisme otomatisasi cetak dokumen untuk aplikasi SPJ Elektronik v2.

---

## 1. Hak Akses & Isolasi Data (Multi-Tenant)

- **SUPER_ADMIN:** Akses global lintas tim untuk keperluan monitoring agregat data dan audit sistem.
- **TIM_KERJA (Otonomi Anggaran Penuh):**
  - Memiliki hak penuh (CRUD) dari pembuatan Tahun Anggaran, Kegiatan, Sub-Kegiatan, hingga penguncian Pagu Saldo awal divisi mereka sendiri.
  - **Data Isolation:** Semua query (SELECT, INSERT, UPDATE, DELETE) wajib dikunci menggunakan klausul `where: { teamId: session.user.teamId }`. Tim tidak diizinkan melihat atau memodifikasi data anggaran maupun SPJ milik tim lain.

---

## 2. Struktur Pengisian Data Anggaran & Master (Fase Awal)

### A. Hierarki Pagu Saldo (Otonomi Tim)

Tim Kerja menginput data dengan urutan linear berikut sebelum bisa mencatat SPJ:
$$\text{Tahun Anggaran (2026)} \rightarrow \text{Kegiatan} \rightarrow \text{Sub-Kegiatan (Punya Saldo Rp)}$$

- Saat Sub-Kegiatan disimpan, sistem otomatis menginisialisasi nilai data: `sisaSaldo = saldoAwal`.

### B. Sinkronisasi Data Master (Anti-Input Berulang)

Untuk mencegah pengguna mengetik informasi yang sama berulang kali, aplikasi menyediakan dua repositori master data:

1.  **Master Pegawai:** Menyimpan NIP, Nama, Pangkat, Golongan, Jabatan, dan Instansi.
2.  **Master Vendor Pihak Ketiga:** Menyimpan Nama Vendor (Katering/RM), Nama Pemilik, Alamat, NPWP, dan Nomor Rekening Bank.

---

## 3. Workflow Pencatatan SPJ & Logika Pemotongan Saldo

Setiap pengeluaran harian dicatat langsung tanpa melalui mekanisme verifikasi _approval_ (ACC/Reject). Semua data yang disimpan oleh Tim dianggap sah secara hukum dan langsung berdampak pada saldo.

### A. Siklus Transaksi Database (Prisma $transaction)

Setiap kali form SPJ disimpan, backend wajib menjalankan urutan operasi berikut secara atomik:

1.  **Locking Saldo:** Ambil data `sisaSaldo` terbaru dari `SubKegiatan` berdasarkan `subKegiatanId` yang dipilih.
2.  **Kalkulasi Nominal:** Hitung total pengeluaran dari _array_ komponen kuitansi detail ($\text{Total} = \sum \text{hargaSatuan} \times \text{qty}$).
3.  **Validasi Saldo:** Jika $\text{sisaSaldo} < \text{Total}$, transaksi langsung dibatalkan (_abort/rollback_) dan mengirimkan respon error _"Saldo Tidak Mencukupi"_ ke antarmuka pengguna.
4.  **Eksekusi Mutasi:** Jika saldo cukup, kurangi `sisaSaldo` di tabel `SubKegiatan`, simpan baris data induk `Spj`, lalu masukkan seluruh data detail pecahan pengeluaran.

### B. Mekanisme Modifikasi & Penghapusan SPJ

Karena sistem ini berbasis _Direct Ledger_ (Buku Besar Langsung):

- **Jika SPJ Diubah (Update):** Saldo pada `SubKegiatan` harus dikembalikan dahulu sebesar `totalPengeluaran` lama, lalu dihitung ulang dan dipotong berdasarkan `totalPengeluaran` yang baru di dalam satu transaksi aman.
- **Jika SPJ Dihapus (Delete):** Saldo pada `SubKegiatan` wajib dikembalikan utuh otomatis sesuai nilai `totalPengeluaran` dari SPJ yang dihapus tersebut.

---

## 4. Spesifikasi Pengisian Form Dinamis & Mekanisme Otomatisasi Dokumen

Semua jenis SPJ berbagi komponen induk wajib yang sama:

1.  **Daftar Kuitansi Detail:** Komponen tabel item pengeluaran yang memicu pemotongan saldo.
2.  **Tautan Arsip Fisik (Drive URL):** Satu kolom input teks wajib/opsional untuk menaruh tautan (URL) Google Drive folder tempat penyimpanan berkas fisik SPJ yang sudah di-scan. Ini diletakkan pada bagian informasi umum/utama di setiap jenis form SPJ.

### 4.1 Modul SPJ Perjalanan Dinas (PERJADIN)

#### A. Struktur Form Input (Didesain Sederhana & Ringkas)

1.  **Tab 1: Informasi Umum Perjalanan**
    - Maksud Dinas (Teks panjang/textarea), Tempat Berangkat (default: Sendawar), Tempat Tujuan, Alat Angkut (default: Darat), Tingkat Perjalanan.
    - Tanggal Berangkat & Tanggal Kembali (Menggunakan komponen _Date Range Picker_ Shadcn UI, di mana sistem langsung menghitung nilai otomatis untuk `lamaPerjalanan` dalam satuan hari).
2.  **Tab 2: Personalia Berangkat (Roster Personel)**
    - Input menggunakan komponen _Combobox Autocomplete_ yang terhubung ke data `Master Pegawai`. User cukup mengetik nama pegawai.
    - User menentukan susunan hierarki: Siapa yang bertindak sebagai `KEPALA_JALAN` (order 0) dan siapa saja yang menjadi `PENGIKUT`.
    - _Sistem Behavior:_ Saat data disimpan, seluruh informasi pangkat, golongan, dan jabatan pegawai tersebut disalin ke tabel `SpjRosterItem` sebagai **Snapshot**.
3.  **Tab 3: Komponen Cetak & Penandatangan (Meta Dokumen JSON)**
    - Untuk kebutuhan dokumen formal, user menginput meta naskah melalui form teks: Nomor Surat Tugas, Nomor SPD, Nomor Telaahan Staf, Pejabat Penandatangan Surat Tugas (pilih dari master pegawai), serta esai pendek untuk Telaahan Staf (_Dasar_, _Analisis_, _Kesimpulan_, _Saran_).
4.  **Tab 4: Rincian Anggaran (DOPD & Kuitansi Utama)**
    - User menginput kuitansi pengeluaran riil per personel (Uang Harian, Biaya Transportasi, Biaya Penginapan). Sistem otomatis mengalikan dengan `qty` (jumlah hari perjalanan) untuk menghasilkan lembar data DOPD.

#### B. Logika Pembuatan Dokumen Otomatis (Output PDF)

Saat tombol cetak diklik, mesin generator PDF akan membaca satu ID SPJ ini dan menyusun file cetak berdasarkan aturan pemetaan berikut:

- **Surat Tugas:** Memuat nomor surat tugas, esai _Maksud Dinas_, data pejabat penandatangan, dan daftar seluruh pegawai yang ada di dalam _Roster_ tugas tersebut.
- **Surat Perjalanan Dinas (SPD):** Meng-generate lembar dokumen SPD terpisah untuk masing-masing pegawai yang ada di dalam _Roster_.
- **Daftar Ongkos Perjalanan Dinas (DOPD):** Menampilkan tabel kalkulasi rincian biaya per orang yang bersumber dari tabel `SpjPengeluaranDetail` yang dikelompokkan berdasarkan nama pegawai.
- **Telaahan Staf:** Struktur dokumen mengambil data teks dari kolom JSON `metaDokumen` (Dasar, Analisis, Kesimpulan, Saran) dan mencetak pejabat penandatangan dokumen tersebut secara formal.
- **Visum & Kuitansi Bendahara:** Dokumen cetakan lembar kosong verifikasi kunjungan daerah (Visum) berjumlah halaman sesuai kebutuhan (default 3 lembar) beserta nota kuitansi tanda terima dari bendahara pengeluaran.

---

### 4.2 Modul SPJ Makan Minum Rapat (MAKAN_MINUM)

#### A. Struktur Form Input

1.  **Tab 1: Meta Kegiatan Rapat**
    - Nama Rapat / Agenda, Tanggal Pelaksanaan, Jumlah Peserta Rapat.
2.  **Tab 2: Pilihan Vendor & Administrasi**
    - Input menggunakan _Combobox Autocomplete_ yang terhubung ke `VendorPihakKetiga`. User cukup memilih nama katering/rumah makan.
    - Sistem otomatis menarik data NPWP, Alamat, dan No Rekening Vendor untuk disisipkan ke dokumen.
3.  **Tab 3: Rincian Pengeluaran Mamin**
    - User menginput item belanja: Belanja Makan (Qty porsi $\times$ harga satuan) dan Belanja Snack (Qty kotak $\times$ harga satuan). Total dari nilai ini langsung memotong saldo Sub-Kegiatan.

#### B. Logika Pembuatan Dokumen Otomatis (Output PDF)

Sistem menghasilkan bundel dokumen makan minum yang meliputi:

- **Nota Pesanan / Surat Pesanan:** Surat resmi dari instansi kepada vendor katering mengenai detail pesanan menu makanan dan jumlah porsi.
- **Kuitansi Pihak Ketiga:** Lembaran tanda terima pembayaran yang memuat data NPWP dan nomor rekening bank milik vendor penyedia mamin.
- **Daftar Hadir Rapat:** Lembar format absensi formal sesuai dengan jumlah peserta rapat yang diinput.

---

### 4.3 Modul SPJ Honorarium & Operasional (HONORARIUM / OPERASIONAL)

#### A. Struktur Form Input

1.  **Detail Pengeluaran:**
    - Untuk Honorarium: Daftar nama penerima honor (diambil dari master pegawai atau luar instansi), status dalam tim (Ketua/Anggota), Besaran Honor per bulan/kegiatan, dan potongan pajak (jika ada).
    - Untuk Operasional/Pemeliharaan: Nama aset/fasilitas yang dipelihara, uraian perbaikan, dan kuitansi nota belanja suku cadang atau jasa servis.

#### B. Logika Pembuatan Dokumen Otomatis (Output PDF)

- **Honorarium:** Menghasilkan Lembar Daftar Nominatif Penerima Honor yang memuat kolom Nama, Golongan, Besaran Honor, Potongan Pajak, Jumlah Bersih, dan kolom Tanda Tangan Penerima.
- **Operasional:** Menghasilkan nota kuitansi dinas, nota pemeriksaan barang, dan dokumen serah terima pekerjaan pemeliharaan aset.

---

## 5. Standar Validasi Data (Zod Schema Engine)

Setiap pengiriman data dari sisi klien wajib divalidasi silang menggunakan skema Zod di sisi server untuk mencegah kerusakan integritas data anggaran:

- `nomorBku`: Harus unik secara global (jika diisi).
- `totalPengeluaran`: Wajib bernilai positif (> 0).
- `driveUrl`: Harus divalidasi menggunakan format URL yang valid (`z.string().url()`) jika pengguna menginputnya, untuk memastikan tautan Google Drive tidak asal ketik.
