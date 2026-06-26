@AGENTS.md

# Claude Code Guide for SPJ Elektronik v2

## Commands

- Run development server: `npm run dev`
- Build project: `npm run build`
- Database migration (Prisma): `npx prisma migrate dev`
- Open Prisma Studio: `npx prisma studio`
- Generate Prisma client: `npx prisma generate`

## Code Style & Guidelines

- **Language:** TypeScript strictly. Never use `any`. Always define strict interfaces.
- **Framework Standard:** Next.js 15 App Router (perhatikan dokumen breaking changes di node_modules). Use Server Components by default. Use `"use client"` only for interactive UI (forms, dialogs, comboboxes).
- **Database Interactivity:** Use Next.js Server Actions for data mutations (Create, Update, Delete). Do not create manual API routes (`/api/...`) unless requested.
- **Financial Numbers:** All monetary fields (saldo, total, harga) MUST use `BigInt` to prevent rounding errors.
- **Imports:** Use absolute paths with alias `@/*` (e.g., `@/components/ui/button`).
- **Styling:** Tailwind CSS using Shadcn UI design patterns. Maintain a clean, professional financial dashboard look.
