"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowRight } from "lucide-react"
import { createNaskahDinas, getAgendaOptions } from "@/app/actions/naskah-dinas"
import { CreatableCombobox } from "@/components/ui/creatable-combobox"
import { toast } from "sonner"

export default function NaskahDinasWizard() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [agendaOptions, setAgendaOptions] = useState<{ value: string; label: string }[]>([])
  const [formData, setFormData] = useState({
    jenisNaskah: "SURAT_TUGAS",
    tanggal: new Date().toISOString().split("T")[0],
    perihal: "",
    agenda: "",
  })

  useEffect(() => {
    getAgendaOptions().then((list) => {
      setAgendaOptions(list.map((a) => ({ value: a, label: a })))
    })
  }, [])

  const handleChange = (e: any) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const result = await createNaskahDinas(formData)
      toast.success("Naskah Dinas berhasil dibuat")
      router.push(`/dashboard/naskah-dinas/${result.id}`)
    } catch (error: any) {
      toast.error(error.message || "Terjadi kesalahan")
      setLoading(false)
    }
  }

  const getJenisNaskahLabel = (val: string) => {
    switch(val) {
      case 'SURAT_TUGAS': return 'Surat Tugas'
      case 'SURAT_PERINTAH': return 'Surat Perintah'
      case 'TELAAHAN_STAF': return 'Telaahan Staf'
      case 'SURAT_EDARAN_SEKDA': return 'Surat Edaran Sekda'
      case 'SURAT_EDARAN_BUPATI': return 'Surat Edaran Bupati'
      case 'SURAT_UMUM': return 'Surat Umum (Kustom Fleksibel)'
      case 'NOTULA': return 'Notula Rapat'
      default: return val
    }
  }

  return (
    <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] sm:rounded-xl rounded-none border-x-0 sm:border-x">
      <form onSubmit={handleSubmit}>
        <CardHeader className="flex flex-col items-start justify-between pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Naskah Dinas Baru</CardTitle>
            <CardDescription className="text-[10px] sm:text-xs mt-1 text-slate-500">
              Pilih jenis dokumen dan isi informasi dasar. Anda akan dapat melengkapi isian secara detail di halaman selanjutnya.
            </CardDescription>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">Jenis Naskah</Label>
            <Select 
              value={formData.jenisNaskah} 
              onValueChange={(val) => setFormData({ ...formData, jenisNaskah: val || "SURAT_TUGAS" })}
            >
              <SelectTrigger className="w-full h-9 sm:h-10 text-xs sm:text-sm">
                <SelectValue placeholder="Pilih Jenis Naskah">
                  {getJenisNaskahLabel(formData.jenisNaskah)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem className="text-xs sm:text-sm" value="NOTULA">Notula Rapat</SelectItem>
                <SelectItem className="text-xs sm:text-sm" value="SURAT_UMUM">Surat Umum (Kustom Fleksibel)</SelectItem>
                <SelectItem className="text-xs sm:text-sm" value="SURAT_EDARAN_SEKDA">Surat Edaran Sekda</SelectItem>
                <SelectItem className="text-xs sm:text-sm" value="SURAT_EDARAN_BUPATI">Surat Edaran Bupati</SelectItem>
                <SelectItem className="text-xs sm:text-sm" value="SURAT_TUGAS">Surat Tugas</SelectItem>
                <SelectItem className="text-xs sm:text-sm" value="SURAT_PERINTAH">Surat Perintah</SelectItem>
                <SelectItem className="text-xs sm:text-sm" value="TELAAHAN_STAF">Telaahan Staf</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">Agenda Kegiatan</Label>
              <span className="text-[10px] text-slate-400 font-medium">Opsional</span>
            </div>
            <CreatableCombobox
              options={agendaOptions}
              value={formData.agenda}
              onChange={(val) => setFormData({ ...formData, agenda: val })}
              placeholder="Pilih agenda yang ada atau ketik nama agenda baru..."
              emptyText="Ketik untuk menambahkan agenda baru."
            />
            <p className="text-[10px] text-slate-400">
              Kelompokkan beberapa berkas naskah dinas ke dalam satu rangkaian agenda kegiatan.
            </p>
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">Tanggal Pembuatan</Label>
            <Input 
              type="date" 
              name="tanggal"
              value={formData.tanggal} 
              onChange={handleChange}
              required
              className="h-9 sm:h-10 text-xs sm:text-sm"
            />
          </div>

          <div className="space-y-1.5 sm:space-y-2">
            <Label className="text-[10px] sm:text-xs font-semibold text-slate-700 uppercase tracking-wider">Perihal / Keterangan Dasar</Label>
            <Textarea 
              name="perihal"
              value={formData.perihal}
              onChange={handleChange}
              placeholder="Contoh: Mengikuti Bimbingan Teknis..."
              rows={3}
              className="text-xs sm:text-sm resize-none"
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col-reverse sm:flex-row justify-end gap-2 p-4 sm:p-6 bg-slate-50/50 border-t border-slate-100 mt-2">
          <Button type="button" variant="outline" onClick={() => router.back()} className="w-full sm:w-auto h-10 sm:h-9 text-xs sm:text-sm">
            Batal
          </Button>
          <Button type="submit" disabled={loading} className="w-full sm:w-auto h-10 sm:h-9 text-xs sm:text-sm">
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Lanjutkan ke Form Detail <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 ml-1.5 sm:ml-2" />
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
