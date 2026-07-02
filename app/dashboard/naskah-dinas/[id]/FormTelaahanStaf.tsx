"use client"

import { useState } from "react"
import { NaskahDinas, Pegawai } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Save, Loader2, FileText } from "lucide-react"
import { updateNaskahDinas } from "@/app/actions/naskah-dinas"
import { toast } from "sonner"
import NaskahDinasPdfPreview from "./NaskahDinasPdfPreview"
import TelaahanStafPdf from "@/pdf/templates/TelaahanStafPdf"
import { CreatableCombobox } from "@/components/ui/creatable-combobox"
import { PresetDialog } from "@/components/ui/preset-dialog"
import telaahanPresets from "@/lib/presets/telaahan.json"

export default function FormTelaahanStaf({
  naskah,
  pegawaiList
}: {
  naskah: NaskahDinas
  pegawaiList: Pegawai[]
}) {
  const data = (naskah.data as any) || {}
  
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const [form, setForm] = useState({
    nomorSurat: naskah.nomorSurat || "",
    tanggal: naskah.tanggal ? new Date(naskah.tanggal).toISOString().split("T")[0] : "",
    perihal: naskah.perihal || "",
    kepada: data.kepada || "",
    dari: data.dari || "",
    lampiran: data.lampiran || "-",
    dasar: data.dasar || "",
    analisis: data.analisis || "",
    kesimpulan: data.kesimpulan || "",
    saran: data.saran || "",
    penandatanganId: data.penandatanganId || "",
  })

  const [praAnggapan, setPraAnggapan] = useState<string[]>(data.praAnggapan?.length ? data.praAnggapan : [""])
  const [fakta, setFakta] = useState<string[]>(data.fakta?.length ? data.fakta : [""])

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleArrayChange = (setter: any, arr: string[], idx: number, val: string) => {
    const newArr = [...arr]
    newArr[idx] = val
    setter(newArr)
  }

  const handleAddArray = (setter: any, arr: string[]) => {
    setter([...arr, ""])
  }

  const handleRemoveArray = (setter: any, arr: string[], idx: number) => {
    const newArr = [...arr]
    newArr.splice(idx, 1)
    if (newArr.length === 0) newArr.push("")
    setter(newArr)
  }

  const handleSelectPreset = (key: string, text: string) => {
    setForm({ ...form, [key]: text })
  }

  const handleSelectArrayPreset = (setter: any, arr: string[], text: string) => {
    const lastItem = arr[arr.length - 1]
    if (lastItem.trim() === "") {
      const newArr = [...arr]
      newArr[newArr.length - 1] = text
      setter(newArr)
    } else {
      setter([...arr, text])
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateNaskahDinas(naskah.id, {
        nomorSurat: form.nomorSurat,
        tanggal: form.tanggal,
        perihal: form.perihal,
        data: {
          kepada: form.kepada,
          dari: form.dari,
          lampiran: form.lampiran,
          dasar: form.dasar,
          praAnggapan,
          fakta,
          analisis: form.analisis,
          kesimpulan: form.kesimpulan,
          saran: form.saran,
          penandatanganId: form.penandatanganId
        }
      })
      toast.success("Telaahan Staf berhasil disimpan")
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan data")
    } finally {
      setLoading(false)
    }
  }

  const signer = pegawaiList.find(p => p.id === form.penandatanganId)
  const pegawaiOptions = pegawaiList.map((p) => ({ value: p.id, label: p.nama }))

  return (
    <div className="space-y-6">
      <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle>Informasi Umum</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Kepada Yth.</Label>
            <Input name="kepada" value={form.kepada} onChange={handleChange} placeholder="Contoh: Bapak Sekretaris Daerah..." />
          </div>
          <div className="space-y-2">
            <Label>Dari</Label>
            <Input name="dari" value={form.dari} onChange={handleChange} placeholder="Contoh: Kepala Bagian..." />
          </div>
          <div className="space-y-2">
            <Label>Tanggal</Label>
            <Input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Nomor Surat (Opsional)</Label>
            <Input name="nomorSurat" value={form.nomorSurat} onChange={handleChange} placeholder="Contoh: 800.1.11.1/123/UMUM" />
          </div>
          <div className="space-y-2">
            <Label>Lampiran</Label>
            <Input name="lampiran" value={form.lampiran} onChange={handleChange} placeholder="Contoh: 1 (satu) Berkas" />
          </div>
          <div className="space-y-2">
            <Label>Perihal</Label>
            <Input name="perihal" value={form.perihal} onChange={handleChange} placeholder="Contoh: Permohonan Arahan Terkait..." />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Isi Telaahan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-8">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-bold">A. Dasar</Label>
              <PresetDialog title="Preset Dasar" options={telaahanPresets.dasar} onSelect={(text) => handleSelectPreset("dasar", text)} />
            </div>
            <Textarea name="dasar" value={form.dasar} onChange={handleChange} rows={3} placeholder="Dasar pelaksanaan kegiatan..." />
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="font-bold">A. Pra Anggapan</Label>
              <div className="flex gap-2">
                <PresetDialog title="Preset Pra Anggapan" options={telaahanPresets.praAnggapan} onSelect={(text) => handleSelectArrayPreset(setPraAnggapan, praAnggapan, text)} />
                <Button type="button" variant="outline" size="sm" onClick={() => handleAddArray(setPraAnggapan, praAnggapan)}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            {praAnggapan.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span className="mt-2 text-sm text-slate-500 w-6">{idx + 1}.</span>
                <Textarea value={item} onChange={(e) => handleArrayChange(setPraAnggapan, praAnggapan, idx, e.target.value)} rows={2} />
                <Button variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => handleRemoveArray(setPraAnggapan, praAnggapan, idx)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <Label className="font-bold">B. Fakta - Fakta</Label>
              <div className="flex gap-2">
                <PresetDialog title="Preset Fakta" options={telaahanPresets.fakta} onSelect={(text) => handleSelectArrayPreset(setFakta, fakta, text)} />
                <Button type="button" variant="outline" size="sm" onClick={() => handleAddArray(setFakta, fakta)}><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            {fakta.map((item, idx) => (
              <div key={idx} className="flex gap-2 items-start">
                <span className="mt-2 text-sm text-slate-500 w-6">{idx + 1}.</span>
                <Textarea value={item} onChange={(e) => handleArrayChange(setFakta, fakta, idx, e.target.value)} rows={2} />
                <Button variant="ghost" size="icon" className="text-red-500 shrink-0" onClick={() => handleRemoveArray(setFakta, fakta, idx)}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-bold">D. Analisis</Label>
              <PresetDialog title="Preset Analisis" options={telaahanPresets.analisis} onSelect={(text) => handleSelectPreset("analisis", text)} />
            </div>
            <Textarea name="analisis" value={form.analisis} onChange={handleChange} rows={3} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-bold">C. Kesimpulan</Label>
              <PresetDialog title="Preset Kesimpulan" options={telaahanPresets.kesimpulan} onSelect={(text) => handleSelectPreset("kesimpulan", text)} />
            </div>
            <Textarea name="kesimpulan" value={form.kesimpulan} onChange={handleChange} rows={3} />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-bold">E. Saran / Tindakan</Label>
              <PresetDialog title="Preset Saran" options={telaahanPresets.saran} onSelect={(text) => handleSelectPreset("saran", text)} />
            </div>
            <Textarea name="saran" value={form.saran} onChange={handleChange} rows={3} />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <CardHeader>
          <CardTitle>Penandatangan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Pegawai Penandatangan</Label>
            <CreatableCombobox 
              options={pegawaiOptions} 
              value={form.penandatanganId} 
              onChange={(val) => setForm({ ...form, penandatanganId: val })} 
              placeholder="Cari pejabat penandatangan..."
              className="w-full bg-white"
            />
            <p className="text-xs text-slate-500 mt-1">Gunakan kotak pencarian untuk menemukan pegawai dengan cepat.</p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-start gap-4 items-center pt-4 pb-12">
        <Button variant="outline" onClick={() => setShowPreview(true)}>
          <FileText className="w-4 h-4 mr-2" /> Pratinjau PDF
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan Perubahan
        </Button>
      </div>

      <NaskahDinasPdfPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Pratinjau Telaahan Staf"
        renderDocument={() => (
          <TelaahanStafPdf
            spj={{
              kotaTandaTangan: "Sendawar",
              tglSuratTugas: form.tanggal ? new Date(form.tanggal) : new Date(),
              noTelaahan: form.nomorSurat,
            }}
            telaahan={{
              kepada: form.kepada,
              sifat: null,
              lampiran: form.lampiran,
              perihal: form.perihal,
              dasar: form.dasar,
              praAnggapan,
              fakta,
              analisis: form.analisis,
              kesimpulan: form.kesimpulan,
              saran: form.saran,
              tglTelaahan: form.tanggal ? new Date(form.tanggal) : undefined
            }}
            roster={[]} // Naskah dinas umum mungkin tidak butuh roster
            signer={signer ? {
              nama: signer.nama,
              nip: signer.nip,
              jabatan: signer.jabatan,
              pangkat: signer.pangkat,
              golongan: signer.golongan
            } : undefined}
            config={{ content: { dariOverride: form.dari } }}
          />
        )}
      />
    </div>
  )
}
