"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, ArrowRight } from "lucide-react"
import { createNaskahDinas } from "@/app/actions/naskah-dinas"
import { toast } from "sonner"

export default function NaskahDinasWizard() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    jenisNaskah: "SURAT_TUGAS",
    tanggal: new Date().toISOString().split("T")[0],
    perihal: "",
  })

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
      default: return val
    }
  }

  return (
    <Card className="shadow-[0_4px_24px_-8px_rgba(0,0,0,0.08)] border-slate-200/60 transition-shadow">
      <form onSubmit={handleSubmit}>
        <CardHeader className="border-b pb-4">
          <CardTitle className="text-xl">Naskah Dinas Baru</CardTitle>
          <CardDescription>
            Pilih jenis dokumen dan isi informasi dasar. Anda akan dapat melengkapi isian secara detail di halaman selanjutnya.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 pt-6">
          <div className="space-y-2">
            <Label className="text-sm font-semibold">Jenis Naskah</Label>
            <Select 
              value={formData.jenisNaskah} 
              onValueChange={(val) => setFormData({ ...formData, jenisNaskah: val || "SURAT_TUGAS" })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Pilih Jenis Naskah">
                  {getJenisNaskahLabel(formData.jenisNaskah)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SURAT_TUGAS">Surat Tugas</SelectItem>
                <SelectItem value="SURAT_PERINTAH">Surat Perintah</SelectItem>
                <SelectItem value="TELAAHAN_STAF">Telaahan Staf</SelectItem>
                <SelectItem value="SURAT_EDARAN_SEKDA">Surat Edaran Sekda</SelectItem>
                <SelectItem value="SURAT_EDARAN_BUPATI">Surat Edaran Bupati</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Tanggal Pembuatan</Label>
            <Input 
              type="date" 
              name="tanggal"
              value={formData.tanggal} 
              onChange={handleChange}
              required
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-semibold">Perihal / Keterangan Dasar</Label>
            <Textarea 
              name="perihal"
              value={formData.perihal}
              onChange={handleChange}
              placeholder="Contoh: Mengikuti Bimbingan Teknis..."
              rows={3}
            />
          </div>
        </CardContent>

        <CardFooter className="flex justify-end pt-4 mt-6 bg-white">
          <Button type="button" variant="outline" onClick={() => router.back()} className="mr-2">
            Batal
          </Button>
          <Button type="submit" disabled={loading} className="gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Lanjutkan ke Form Detail <ArrowRight className="w-4 h-4" />
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}
