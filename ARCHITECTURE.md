\# Architecture Blueprint: SPJ Elektronik v2



Dokumen ini adalah Single Source of Truth (SSOT) untuk arsitektur, standar kode, dan aturan bisnis aplikasi SPJ Elektronik v2. Semua agen AI (termasuk Antigravity) WAJIB mematuhi dokumen ini dalam menulis kode.



\---



\## 1. Tech Stack \& Ecosystem



Aplikasi ini dibangun menggunakan arsitektur modern berbasis serverless dengan integrasi ketat antara Frontend dan Database:



\* \*\*Framework:\*\* Next.js 15+ (App Router) dengan TypeScript.

\* \*\*Database \& Auth:\*\* Supabase (PostgreSQL).

\* \*\*Database Access:\*\* Supabase Client (untuk transaksional \& real-time) terintegrasi dengan Next.js Server Actions.

\* \*\*Styling \& UI:\*\* Tailwind CSS + Shadcn UI (berbasis Radix Primitives).

\* \*\*State \& Form Management:\*\* React Hook Form + Zod (untuk skema validasi).



\---



\## 2. Struktur Folder (Feature-Driven \& Clean Architecture)



Struktur kode wajib modular dan memisahkan antara UI, logika bisnis, dan konfigurasi database.



```text

├── app/                  # Next.js App Router (Routing \& Pages)

│   ├── (auth)/           # Route Group untuk Login / Register

│   ├── dashboard/        # Halaman utama setelah login

│   │   ├── pegawai/      # Fitur \& halaman untuk Role Pegawai (Input SPJ)

│   │   ├── verifikator/  # Fitur \& halaman untuk Role Verifikator (Approval)

│   │   └── admin/        # Fitur \& halaman untuk Role Admin (Pagu Anggaran)

│   └── layout.tsx

├── components/           # UI Components global (Reusable)

│   ├── ui/               # Komponen dari Shadcn UI

│   └── shared/           # Komponen kustom (Sidebar, Navbar, dll)

├── lib/                  # Utilitas dan Konfigurasi

│   ├── supabase/         # Supabase client (Server, Client, \& Middleware)

│   └── utils.ts          # Helper functions bawaan shadcn

├── types/                # Definisi Tipe Data TypeScript global

├── ARCHITECTURE.md       # Dokumen ini

└── package.json

