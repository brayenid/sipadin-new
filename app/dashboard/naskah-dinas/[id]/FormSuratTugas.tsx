"use client"

import { useState } from "react"
import { NaskahDinas, Pegawai } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Plus, Trash2, Save, Loader2, FileText, Link as LinkIcon } from "lucide-react"
import { updateNaskahDinas } from "@/app/actions/naskah-dinas"
import { toast } from "sonner"
import NaskahDinasPdfPreview from "./NaskahDinasPdfPreview"
import SuratTugasPdf from "@/pdf/templates/SuratTugasPdf"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CreatableCombobox } from "@/components/ui/creatable-combobox"

function DynamicListInput({ label, items, onChange, placeholder }: { label: string, items: string[], onChange: (items: string[]) => void, placeholder?: string }) {
  const handleAdd = () => onChange([...items, ""])
  const handleRemove = (index: number) => onChange(items.filter((_, i) => i !== index))
  const handleChange = (index: number, val: string) => {
    const newItems = [...items]
    newItems[index] = val
    onChange(newItems)
  }

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-start">
          <div className="pt-2 text-sm text-slate-400 w-6 text-right shrink-0">{index + 1}.</div>
          <Textarea 
            value={item} 
            onChange={(e) => handleChange(index, e.target.value)} 
            placeholder={placeholder} 
            rows={2}
            className="flex-1"
          />
          {items.length > 1 && (
            <Button variant="ghost" size="icon" type="button" onClick={() => handleRemove(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="mt-2">
        <Plus className="w-4 h-4 mr-1" /> Tambah Poin
      </Button>
    </div>
  )
}


export default function FormSuratTugas({
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
    tempatBerangkat: data.tempatBerangkat || "Sendawar",
    tempatTujuan: data.tempatTujuan || "",
    tglBerangkat: data.tglBerangkat || "",
    tglKembali: data.tglKembali || "",
    lamaPerjalanan: data.lamaPerjalanan || 1,
    alatAngkut: data.alatAngkut || "Darat",
    akunAnggaran: data.akunAnggaran || "",
    penandatanganId: data.penandatanganId || "",
    tautanNaskahAsli: data.tautanNaskahAsli || "",
  })

  const [dasar, setDasar] = useState<string[]>(data.dasar?.length ? data.dasar : [""])
  const [untuk, setUntuk] = useState<string[]>(data.untuk?.length ? data.untuk : [""])
  const [roster, setRoster] = useState<any[]>(data.roster?.length ? data.roster : [])

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

  const handleAddPersonel = () => {
    setRoster([...roster, { id: crypto.randomUUID(), nama: "", nip: "", pangkat: "", golongan: "", jabatan: "" }])
  }

  const handleRemovePersonel = (idx: number) => {
    const newRoster = [...roster]
    newRoster.splice(idx, 1)
    setRoster(newRoster)
  }

  const handlePersonelSelect = (idx: number, id: string) => {
    const p = pegawaiList.find((x) => x.id === id)
    if (p) {
      const newRoster = [...roster]
      newRoster[idx] = { id: p.id, nama: p.nama, nip: p.nip, pangkat: p.pangkat, golongan: p.golongan, jabatan: p.jabatan }
      setRoster(newRoster)
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
          tempatBerangkat: form.tempatBerangkat,
          tempatTujuan: form.tempatTujuan,
          tglBerangkat: form.tglBerangkat,
          tglKembali: form.tglKembali,
          lamaPerjalanan: Number(form.lamaPerjalanan),
          alatAngkut: form.alatAngkut,
          akunAnggaran: form.akunAnggaran,
          penandatanganId: form.penandatanganId,
          dasar,
          untuk,
          roster
        }
      })
      toast.success("Surat Tugas berhasil disimpan")
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
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Informasi Surat</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Label>Tanggal Surat</Label>
            <Input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Nomor Surat (Opsional)</Label>
            <Input name="nomorSurat" value={form.nomorSurat} onChange={handleChange} placeholder="Contoh: 800.1.11.1/123/UMUM" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Perihal / Tujuan Perjalanan (Opsional)</Label>
            <Input name="perihal" value={form.perihal} onChange={handleChange} placeholder="Contoh: Mengikuti Rapat Koordinasi Teknis di..." />
          </div>
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Rincian Perjalanan & Beban Anggaran</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Label>Tempat Berangkat</Label>
            <Input name="tempatBerangkat" value={form.tempatBerangkat} onChange={handleChange} placeholder="Contoh: Sendawar" />
          </div>
          <div className="space-y-2">
            <Label>Tempat Tujuan</Label>
            <Input name="tempatTujuan" value={form.tempatTujuan} onChange={handleChange} placeholder="Contoh: Samarinda" />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Berangkat</Label>
            <Input type="date" name="tglBerangkat" value={form.tglBerangkat} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Tanggal Kembali</Label>
            <Input type="date" name="tglKembali" value={form.tglKembali} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Lama Perjalanan (Hari)</Label>
            <Input type="number" name="lamaPerjalanan" value={form.lamaPerjalanan} onChange={handleChange} placeholder="Contoh: 3" />
          </div>
          <div className="space-y-2">
            <Label>Alat Angkut</Label>
            <Input name="alatAngkut" value={form.alatAngkut} onChange={handleChange} placeholder="Contoh: Darat / Kendaraan Dinas" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Beban Anggaran (Teks)</Label>
            <Input name="akunAnggaran" value={form.akunAnggaran} onChange={handleChange} placeholder="Contoh: DPA SKPD Sekretariat Daerah Kab. Kutai Barat TA 2026..." />
          </div>
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Klausul Surat Tugas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <DynamicListInput 
            label="Dasar" 
            items={dasar} 
            onChange={setDasar} 
            placeholder="Contoh: Surat Edaran Menteri Dalam Negeri Nomor..."
          />
          <DynamicListInput 
            label="Untuk" 
            items={untuk} 
            onChange={setUntuk} 
            placeholder="Contoh: Mengikuti Rapat Koordinasi Teknis di..."
          />
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">
            <span className="hidden sm:inline">Daftar Pegawai yang Ditugaskan</span>
            <span className="sm:hidden">Daftar Pegawai</span>
          </CardTitle>
          <Button type="button" variant="outline" size="sm" onClick={handleAddPersonel}><Plus className="w-4 h-4 mr-2" /> Tambah Personel</Button>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          {roster.map((r, idx) => (
            <div key={idx} className="flex gap-4 items-center bg-slate-50 p-4 rounded-lg border border-slate-200">
              <span className="font-bold text-slate-400">{idx + 1}.</span>
              <div className="flex-1">
                <CreatableCombobox 
                  options={pegawaiOptions} 
                  value={r.id || ""} 
                  onChange={(val) => handlePersonelSelect(idx, val)} 
                  placeholder="Cari pegawai..."
                  className="w-full bg-white"
                />
                {r.nama && (
                  <div className="mt-2 text-sm text-slate-600">
                    {r.nama} — {r.jabatan}
                  </div>
                )}
              </div>
              <Button type="button" variant="ghost" size="icon" className="text-red-500" onClick={() => handleRemovePersonel(idx)}>
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {roster.length === 0 && <div className="text-center text-slate-500 p-4">Belum ada pegawai ditugaskan.</div>}
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Penandatangan</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-2">
            <Label>Pejabat yang Memberi Perintah</Label>
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
        title="Pratinjau Surat Tugas"
        renderDocument={() => (
          <SuratTugasPdf
            spj={{
              kotaTandaTangan: "Sendawar",
              tempatBerangkat: form.tempatBerangkat,
              tempatTujuan: form.tempatTujuan,
              alatAngkut: form.alatAngkut,
              lamaPerjalanan: Number(form.lamaPerjalanan),
              akunAnggaran: form.akunAnggaran,
              tglBerangkat: form.tglBerangkat ? new Date(form.tglBerangkat) : null,
              tglKembali: form.tglKembali ? new Date(form.tglKembali) : null,
              tglSuratTugas: form.tanggal ? new Date(form.tanggal) : new Date(),
              noSuratTugas: form.nomorSurat,
            }}
            suratTugas={{
              untuk: untuk.join(", "),
              assignedRosterItemId: null,
              signerNama: signer?.nama || "",
              signerNip: signer?.nip || "",
              signerJabatan: signer?.jabatan || "",
              signerPangkatGolongan: signer ? `${signer.pangkat || ""} ${signer.golongan || ""}`.trim() : ""
            }}
            roster={roster}
          />
        )}
      />
    </div>
  )
}
