"use client"

import { NaskahDinas, Pegawai } from "@prisma/client"
import FormSuratTugas from "./FormSuratTugas"
import FormTelaahanStaf from "./FormTelaahanStaf"

export default function NaskahDinasDetailForm({
  naskah,
  pegawaiList
}: {
  naskah: NaskahDinas
  pegawaiList: Pegawai[]
}) {
  return (
    <div className="mt-4">
      {naskah.jenisNaskah === "SURAT_TUGAS" && (
        <FormSuratTugas naskah={naskah} pegawaiList={pegawaiList} />
      )}
      
      {naskah.jenisNaskah === "TELAAHAN_STAF" && (
        <FormTelaahanStaf naskah={naskah} pegawaiList={pegawaiList} />
      )}
    </div>
  )
}
