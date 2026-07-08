"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Loader2, Save, FileText } from "lucide-react"
import { updateNaskahDinas } from "@/app/actions/naskah-dinas"
import { toast } from "sonner"
import NaskahDinasPdfPreview from "./NaskahDinasPdfPreview"
import SuratPerintahPdf from "@/pdf/templates/SuratPerintahPdf"
import { CreatableCombobox } from "@/components/ui/creatable-combobox"
import { getDefaultNomorSuffix } from "@/lib/utils"
import { Trash2, Plus } from "lucide-react"

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


export default function FormSuratPerintah({ naskah, pegawaiList }: { naskah: any, pegawaiList: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const meta = typeof naskah.data === 'object' && naskah.data !== null ? naskah.data : {}

  const [form, setForm] = useState({
    nomorPrefix: meta.nomorPrefix ?? "800.1.11.1/",
    nomorTengah: meta.nomorTengah ?? "",
    nomorSuffix: meta.nomorSuffix ?? getDefaultNomorSuffix(),
    tanggal: meta.tanggal || naskah.tanggal.toISOString().split("T")[0],
    kepadaId: meta.kepadaId || "",
    menimbang: Array.isArray(meta.menimbang) ? meta.menimbang : (meta.menimbang ? [meta.menimbang] : [""]),
    dasar: Array.isArray(meta.dasar) ? meta.dasar : (meta.dasar ? [meta.dasar] : [""]),
    untuk: Array.isArray(meta.untuk) ? meta.untuk : (meta.untuk ? [meta.untuk] : [""]),
    penandatanganId: meta.penandatanganId || "",
  })

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateNaskahDinas(naskah.id, {
        nomorSurat: `${form.nomorPrefix}${form.nomorTengah}${form.nomorSuffix}`,
        tanggal: form.tanggal,
        data: form
      })
      toast.success("Perubahan Surat Perintah berhasil disimpan")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan perubahan")
    } finally {
      setLoading(false)
    }
  }

  const signer = pegawaiList.find(p => p.id === form.penandatanganId)
  const kepada = pegawaiList.find(p => p.id === form.kepadaId)
  const pegawaiOptions = pegawaiList.map((p) => ({ value: p.id, label: p.nama }))

  return (
    <div className="space-y-6">
      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Informasi Surat</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs mt-1 text-slate-500">Nomor dan tanggal penetapan Surat Perintah.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Label>Tanggal Surat</Label>
            <Input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Nomor Surat Perintah</Label>
            <div className="flex items-center">
              <Input 
                name="nomorPrefix" 
                value={form.nomorPrefix} 
                onChange={handleChange} 
                className="w-1/3 rounded-r-none border-r-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center" 
                placeholder="800.1.11.1/"
              />
              <Input 
                name="nomorTengah" 
                value={form.nomorTengah} 
                onChange={handleChange} 
                className="rounded-none font-bold text-center flex-1 focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-slate-400"
                placeholder="Contoh: 123"
              />
              <Input 
                name="nomorSuffix" 
                value={form.nomorSuffix} 
                onChange={handleChange} 
                className="w-1/3 rounded-l-none border-l-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center text-xs" 
                placeholder={getDefaultNomorSuffix()}
              />
            </div>
            <p className="text-xs text-slate-500 mt-1">Kosongkan nomor urut jika belum diterbitkan.</p>
          </div>
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Penerima & Klausul Perintah</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Label>Kepada (Pegawai yang Diperintah)</Label>
            <CreatableCombobox 
              options={pegawaiOptions} 
              value={form.kepadaId} 
              onChange={(val) => setForm({ ...form, kepadaId: val })} 
              placeholder="Cari pegawai penerima perintah..."
              className="w-full bg-white"
            />
            <p className="text-xs text-slate-500 mt-1">Pegawai yang diberikan amanat dalam surat perintah ini.</p>
          </div>
          
          <DynamicListInput 
            label="Menimbang" 
            items={form.menimbang} 
            onChange={(items) => setForm({ ...form, menimbang: items })} 
            placeholder="Contoh: bahwa dalam rangka kelancaran pelaksanaan..."
          />
          
          <DynamicListInput 
            label="Dasar" 
            items={form.dasar} 
            onChange={(items) => setForm({ ...form, dasar: items })} 
            placeholder="Contoh: Surat Edaran Menteri Dalam Negeri Nomor..."
          />
          
          <DynamicListInput 
            label="Untuk" 
            items={form.untuk} 
            onChange={(items) => setForm({ ...form, untuk: items })} 
            placeholder="Contoh: menjadi Person in Charge (PIC) yang bertanggung jawab..."
          />
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Penandatangan</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <div className="space-y-2">
            <Label>Pejabat yang Menandatangani</Label>
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

      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 sm:p-0 items-center pt-4 pb-12">
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
        title={`Preview: Surat Perintah`}
        renderDocument={() => (
          <SuratPerintahPdf 
            data={form} 
            signer={signer}
            kepada={kepada}
          />
        )}
      />
    </div>
  )
}
