"use client"

import { useState, useEffect } from "react"
import { NaskahDinas, Pegawai } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Save, Loader2, FileText, Link as LinkIcon } from "lucide-react"
import { updateNaskahDinas, getAgendaOptions } from "@/app/actions/naskah-dinas"
import { toast } from "sonner"
import NaskahDinasPdfPreview from "./NaskahDinasPdfPreview"
import TelaahanStafPdf from "@/pdf/templates/TelaahanStafPdf"
import { CreatableCombobox } from "@/components/ui/creatable-combobox"
import { PresetDialog } from "@/components/ui/preset-dialog"
import telaahanPresets from "@/lib/presets/telaahan.json"
import { PresetNomorDialog } from "@/components/ui/preset-nomor-dialog"

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
  const [agendaOptions, setAgendaOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    getAgendaOptions().then((list) => {
      setAgendaOptions(list.map((a) => ({ value: a, label: a })))
    })
  }, [])

  const [form, setForm] = useState({
    nomorSurat: naskah.nomorSurat || "",
    tanggal: naskah.tanggal ? new Date(naskah.tanggal).toISOString().split("T")[0] : "",
    perihal: naskah.perihal || "",
    agenda: naskah.agenda || "",
    kepada: data.kepada || "",
    dari: data.dari || "",
    lampiran: data.lampiran || "-",
    dasar: data.dasar || "",
    analisis: data.analisis || "",
    kesimpulan: data.kesimpulan || "",
    saran: data.saran || "",
    penandatanganId: data.penandatanganId || "",
    tautanNaskahAsli: data.tautanNaskahAsli || "",
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
        agenda: form.agenda,
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
      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Informasi Umum</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
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
            <div className="flex items-center justify-between">
              <Label>Nomor Surat (Opsional)</Label>
              <PresetNomorDialog
                currentPrefix={form.nomorSurat}
                formatTrailingSlash={false}
                onSelect={(prefix) => setForm({ ...form, nomorSurat: `${prefix}` })}
              />
            </div>
            <Input name="nomorSurat" value={form.nomorSurat} onChange={handleChange} placeholder="Contoh: 000.2.3.6/123/Org-TU.P" />
          </div>
          <div className="space-y-2">
            <Label>Lampiran</Label>
            <Input name="lampiran" value={form.lampiran} onChange={handleChange} placeholder="Contoh: 1 (satu) Berkas" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Perihal</Label>
            <Input name="perihal" value={form.perihal} onChange={handleChange} placeholder="Contoh: Permohonan Arahan Terkait..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <div className="flex items-center justify-between">
              <Label>Agenda Kegiatan (Opsional)</Label>
            </div>
            <CreatableCombobox
              options={agendaOptions}
              value={form.agenda}
              onChange={(val) => setForm({ ...form, agenda: val })}
              placeholder="Pilih agenda yang ada atau ketik nama agenda baru..."
              emptyText="Ketik untuk menambahkan agenda baru."
            />
          </div>
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="flex flex-row items-center justify-between pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Isi Telaahan</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6">
          <div>
            <div className="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-t-lg border border-b-0 border-slate-200">
              <Label className="font-bold text-slate-700">A. Dasar</Label>
              <PresetDialog title="Preset Dasar" options={telaahanPresets.dasar} onSelect={(text) => handleSelectPreset("dasar", text)} />
            </div>
            <Textarea name="dasar" value={form.dasar} onChange={handleChange} rows={3} placeholder="Dasar pelaksanaan kegiatan..." className="rounded-t-none text-[13px] resize-none focus-visible:ring-1" />
          </div>

          <div>
            <div className="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-t-lg border border-b-0 border-slate-200">
              <Label className="font-bold text-slate-700">B. Pra Anggapan</Label>
              <div className="flex gap-2">
                <PresetDialog title="Preset Pra Anggapan" options={telaahanPresets.praAnggapan} onSelect={(text) => handleSelectArrayPreset(setPraAnggapan, praAnggapan, text)} />
                <Button type="button" variant="outline" size="sm" onClick={() => handleAddArray(setPraAnggapan, praAnggapan)} className="h-8 px-2"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-b-lg p-2 bg-white space-y-2">
              {praAnggapan.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="mt-2.5 text-sm font-medium text-slate-400 w-6 text-right shrink-0">{idx + 1}.</span>
                  <Textarea value={item} onChange={(e) => handleArrayChange(setPraAnggapan, praAnggapan, idx, e.target.value)} rows={2} placeholder="Contoh: Kondisi atau asumsi saat ini yang menjadi dasar..." className="text-[13px] resize-none focus-visible:ring-1" />
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 mt-1" onClick={() => handleRemoveArray(setPraAnggapan, praAnggapan, idx)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-t-lg border border-b-0 border-slate-200">
              <Label className="font-bold text-slate-700">C. Fakta - Fakta</Label>
              <div className="flex gap-2">
                <PresetDialog title="Preset Fakta" options={telaahanPresets.fakta} onSelect={(text) => handleSelectArrayPreset(setFakta, fakta, text)} />
                <Button type="button" variant="outline" size="sm" onClick={() => handleAddArray(setFakta, fakta)} className="h-8 px-2"><Plus className="w-4 h-4" /></Button>
              </div>
            </div>
            <div className="border border-slate-200 rounded-b-lg p-2 bg-white space-y-2">
              {fakta.map((item, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="mt-2.5 text-sm font-medium text-slate-400 w-6 text-right shrink-0">{idx + 1}.</span>
                  <Textarea value={item} onChange={(e) => handleArrayChange(setFakta, fakta, idx, e.target.value)} rows={2} placeholder="Contoh: Data, angka, atau kejadian nyata di lapangan..." className="text-[13px] resize-none focus-visible:ring-1" />
                  <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0 mt-1" onClick={() => handleRemoveArray(setFakta, fakta, idx)}><Trash2 className="w-4 h-4" /></Button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-t-lg border border-b-0 border-slate-200">
              <Label className="font-bold text-slate-700">D. Analisis</Label>
              <PresetDialog title="Preset Analisis" options={telaahanPresets.analisis} onSelect={(text) => handleSelectPreset("analisis", text)} />
            </div>
            <Textarea name="analisis" value={form.analisis} onChange={handleChange} rows={3} placeholder="Contoh: Berdasarkan fakta tersebut, dapat dianalisis bahwa..." className="rounded-t-none text-[13px] resize-none focus-visible:ring-1" />
          </div>

          <div>
            <div className="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-t-lg border border-b-0 border-slate-200">
              <Label className="font-bold text-slate-700">E. Kesimpulan</Label>
              <PresetDialog title="Preset Kesimpulan" options={telaahanPresets.kesimpulan} onSelect={(text) => handleSelectPreset("kesimpulan", text)} />
            </div>
            <Textarea name="kesimpulan" value={form.kesimpulan} onChange={handleChange} rows={3} placeholder="Contoh: Maka dapat ditarik kesimpulan perlunya..." className="rounded-t-none text-[13px] resize-none focus-visible:ring-1" />
          </div>

          <div>
            <div className="flex justify-between items-center bg-slate-50 p-2 px-3 rounded-t-lg border border-b-0 border-slate-200">
              <Label className="font-bold text-slate-700">F. Saran / Tindakan</Label>
              <PresetDialog title="Preset Saran" options={telaahanPresets.saran} onSelect={(text) => handleSelectPreset("saran", text)} />
            </div>
            <Textarea name="saran" value={form.saran} onChange={handleChange} rows={3} placeholder="Contoh: Mohon arahan dan persetujuan Bapak/Ibu untuk tindak lanjut..." className="rounded-t-none text-[13px] resize-none focus-visible:ring-1" />
          </div>
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Penandatangan</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
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

      {/* CARD: TAUTAN NASKAH DINAS ASLI */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-5 sm:pb-4 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <LinkIcon className="w-4 h-4 text-indigo-600" />
            Tautan Naskah Dinas Asli (PDF / Cloud)
          </CardTitle>
          <CardDescription className="text-xs text-slate-500">
            Opsional: Masukkan tautan / URL berkas fisik asli (seperti Google Drive, Cloud Storage, atau arsip digital) untuk naskah dinas ini.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <Input
            type="text"
            name="tautanNaskahAsli"
            value={form.tautanNaskahAsli}
            onChange={handleChange}
            placeholder="https://drive.google.com/file/d/..."
            className="bg-white border-slate-200 text-xs sm:text-sm"
          />
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 pb-4">
        <Button variant="outline" onClick={() => setShowPreview(true)} className="w-full sm:w-auto h-10 sm:h-9 text-xs sm:text-sm">
          <FileText className="w-4 h-4 mr-2" /> Pratinjau PDF
        </Button>
        <Button onClick={handleSave} disabled={loading} className="w-full sm:w-auto h-10 sm:h-9 text-xs sm:text-sm">
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan Perubahan
        </Button>
      </div>

      <NaskahDinasPdfPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Pratinjau Telaahan Staf"
        renderDocument={(layout) => (
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
            config={{ styles: layout, content: { dariOverride: form.dari } }}
          />
        )}
      />
    </div>
  )
}
