import { prisma } from "@/lib/prisma";

/** Kunci di kolom JSON Spj.metaDokumen. true = disembunyikan dari non Super Admin. */
export const SPJ_HIDDEN_KEY = "hiddenFromNonAdmin";

export function isSpjHidden(meta: unknown): boolean {
  return !!meta && typeof meta === "object" && (meta as any)[SPJ_HIDDEN_KEY] === true;
}

/** Filter Prisma `where` tambahan: kosong untuk Super Admin, exclude SPJ tersembunyi untuk lainnya. */
export async function spjVisibilityFilter(role: string): Promise<{ id?: { notIn: string[] } }> {
  if (role === "SUPER_ADMIN") return {};
  const rows = await prisma.$queryRaw<{ id: string }[]>`
    SELECT id FROM "Spj" WHERE "metaDokumen"->>${SPJ_HIDDEN_KEY} = 'true'`;
  return rows.length ? { id: { notIn: rows.map((r) => r.id) } } : {};
}
