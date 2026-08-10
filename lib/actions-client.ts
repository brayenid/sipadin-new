import { updateMetaDokumen as updateMetaDokumenServer } from "@/app/actions/dokumen";

export async function updateMetaDokumen(
  spjId: string,
  docKey: string,
  payload: any,
  newTotalPengeluaran?: number
) {
  const res = await updateMetaDokumenServer(spjId, docKey, payload, newTotalPengeluaran);
  if (!res.success) {
    throw new Error(res.error);
  }
  return true;
}
