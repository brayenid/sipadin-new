# Architecture Blueprint: SPJ Elektronik v2 SIPADIN (Catatan Keuangan Agent)

Dokumen ini adalah Single Source of Truth (SSOT) untuk pengembangan sistem SPJ berbasis pencatatan langsung, multi-tenant (Tim), dan otomatisasi dokumen. Semua agen AI (termasuk Antigravity) WAJIB mematuhi seluruh aturan dan skema di dalam dokumen ini.

---

## 1. Core Business Logic & Rules (Aturan Bisnis)

1. **Model Pencatatan (Direct Ledger):** Sistem menggunakan model pencatatan harian langsung. Tidak ada mekanisme ACC/Reject birokrasi. Semua data yang diinput oleh Tim dianggap valid dan langsung memotong saldo anggaran sumber.
2. **Sistem Pagu Berjenjang:**
   Struktur keuangan wajib mengikuti hirarki:
   Tahun Anggaran -> Kegiatan -> Sub-Kegiatan (Punya Saldo Rp).
3. Multi-Tenant & Otonomi Tim Kerja:
   - Superadmin: Memiliki bypass akses global (bisa melihat data seluruh tim).
   - Tim Kerja: Memiliki hak akses penuh (CRUD) untuk membuat Tahun Anggaran, Kegiatan, Sub-Kegiatan, dan mengunci Saldo Awal mereka sendiri.
   - Data Isolation: Semua entitas anggaran dan transaksi SPJ mengikat pada `teamId`. Tim A tidak bisa melihat/mengedit Anggaran atau SPJ milik Tim B.
4. **Komponen Pengeluaran Bersama:** Semua jenis SPJ memiliki kesamaan fundamental, yaitu "memakan anggaran" melalui daftar kuitansi pecahan/pengeluaran detail di dalamnya.
5. **Prinsip Snapshot Master Data:** Untuk menghindari rusaknya dokumen arsip lama akibat adanya mutasi pegawai (naik pangkat/jabatan) atau perubahan data vendor, data dari tabel master wajib disalin sebagai _Snapshot Data_ ke dalam tabel transaksi SPJ saat data disimpan.

---

## 2. Tech Stack & Authentication

- **Framework:** Next.js 15+ (App Router) & TypeScript.
- **Database:** Supabase (PostgreSQL).
- **ORM:** Prisma ORM.
- **Authentication:** NextAuth.js / Auth.js menggunakan **Credentials Provider (Username & Password)**. Tidak menggunakan OAuth.
- **UI & Design System:** Tailwind CSS + Shadcn UI.
- **Form & Validation:** React Hook Form + Zod (Multi-step / Tab form dinamis).

---

## 3. Database Blueprint (Prisma Schema)

```prisma
datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

generator client {
  provider = "prisma-client-js"
}

// ==========================================
// ENUMS
// ==========================================
enum UserRole {
  SUPER_ADMIN
  TIM_KERJA
}

enum SpjType {
  PERJADIN
  MAKAN_MINUM
  HONORARIUM
  OPERASIONAL
}

enum RosterRole {
  KEPALA_JALAN
  PENGIKUT
}

// ==========================================
// AUTH & MULTI-TENANT
// ==========================================
model Team {
  id        String   @id @default(uuid())
  name      String   @unique
  createdAt DateTime @default(now())
  users     User[]
  spjs      Spj[]
}

model User {
  id           String   @id @default(uuid())
  name         String
  username     String   @unique
  passwordHash String
  role         UserRole @default(TIM_KERJA)

  teamId       String
  team         Team     @relation(fields: [teamId], references: [id])

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  spjsCreated  Spj[]
}

// ==========================================
// DATABASE MASTER
// ==========================================
model Pegawai {
  id        String   @id @default(uuid())
  nip       String?  @unique
  nama      String
  pangkat   String?
  golongan  String?
  jabatan   String
  instansi  String   @default("Sekretariat Daerah Kabupaten Kutai Barat")
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  rosterItems SpjRosterItem[]
}

model VendorPihakKetiga {
  id           String   @id @default(uuid())
  namaVendor   String
  namaPemilik  String?
  alamat       String?
  npwp         String?
  rekeningBank String?
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  spjMaminDetails SpjMaminDetail[]
}

// ==========================================
// STRUKTUR ANGGARAN & SALDO
// ==========================================
model TahunAnggaran {
  id        String     @id @default(uuid())
  tahun     String     @unique
  kegiatan  Kegiatan[]
}

model Kegiatan {
  id              String        @id @default(uuid())
  tahunAnggaranId String
  tahunAnggaran   TahunAnggaran @relation(fields: [tahunAnggaranId], references: [id], onDelete: Cascade)

  kodeKegiatan    String
  judulKegiatan   String
  subKegiatan     SubKegiatan[]
}

model SubKegiatan {
  id         String   @id @default(uuid())
  kegiatanId String
  kegiatan   Kegiatan @relation(fields: [kegiatanId], references: [id], onDelete: Cascade)

  kodeSub    String
  judulSub   String

  saldoAwal  BigInt
  sisaSaldo  BigInt

  spjs       Spj[]
}

// ==========================================
// INTI TRANSAKSI SPJ
// ==========================================
model Spj {
  id            String      @id @default(uuid())
  nomorBku      String?     @unique
  tanggalSpj    DateTime    @default(now())
  jenisSpj      SpjType

  // Penghubung ke Sumber Saldo
  subKegiatanId String
  subKegiatan   SubKegiatan @relation(fields: [subKegiatanId], references: [id])

  // Atribut Kepemilikan (Multi-Tenant)
  teamId        String
  team          Team        @relation(fields: [teamId], references: [id])
  createdById   String
  createdBy     User        @relation(fields: [createdById], references: [id])

  totalPengeluaran BigInt   @default(0)

  // Tautan Dokumen Fisik (Google Drive / Cloud Storage Eksternal)
  driveUrl      String?     // <--- KOLOM BARU DI SINI (Opsional/Wajib sesuai kebijakan)

  // Meta Dokumen Cetak (JSON Dinamis: Menghemat tabel 1-to-1 untuk narasi dokumen)
  metaDokumen   Json?

  createdAt     DateTime    @default(now())
  updatedAt     DateTime    @updatedAt

  // Ekstensi Relasi Modular
  pengeluaranDetails SpjPengeluaranDetail[]
  roster             SpjRosterItem[]
  perjadinDetail     SpjPerjadinDetail?
  maminDetail        SpjMaminDetail?
}

model SpjPengeluaranDetail {
  id           String @id @default(uuid())
  spjId        String
  spj          Spj    @relation(fields: [spjId], references: [id], onDelete: Cascade)

  uraian       String
  hargaSatuan  BigInt
  qty          Int    @default(1)
  satuan       String @default("Orang")
  total        BigInt
}

// ==========================================
// EXTENSION MODUL SPESIFIK
// ==========================================
model SpjPerjadinDetail {
  id              String   @id @default(uuid())
  spjId           String   @unique
  spj             Spj      @relation(fields: [spjId], references: [id], onDelete: Cascade)

  tempatBerangkat String   @default("Sendawar")
  tempatTujuan    String
  tglBerangkat    DateTime
  tglKembali      DateTime
  lamaPerjalanan  Int
  alatAngkut      String   @default("Darat")
  tingkatPerjadin String?
}

model SpjRosterItem {
  id        String     @id @default(uuid())
  spjId     String
  spj       Spj        @relation(fields: [spjId], references: [id], onDelete: Cascade)

  pegawaiId String
  pegawai   Pegawai    @relation(fields: [pegawaiId], references: [id])

  order     Int        @default(0)
  role      RosterRole @default(PENGIKUT)

  // Snapshot Data
  nama      String
  nip       String?
  jabatan   String
  golongan  String?
  pangkat   String?
}

model SpjMaminDetail {
  id           String            @id @default(uuid())
  spjId        String            @unique
  spj          Spj               @relation(fields: [spjId], references: [id], onDelete: Cascade)

  vendorId     String
  vendor       VendorPihakKetiga @relation(fields: [vendorId], references: [id])

  namaRapat    String
  jumlahPeserta Int
}
```

## 4. Dokumentasi

Catat semua fitur yang ada ke dalam dokumentasi readme
