"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Loader2, Save, FileText, Trash2, Plus } from "lucide-react"
import { updateNaskahDinas } from "@/app/actions/naskah-dinas"
import { toast } from "sonner"
import NaskahDinasPdfPreview, { PdfLayoutOptions } from "./NaskahDinasPdfPreview"
import SuratEdaranBupatiPdf from "@/pdf/templates/SuratEdaranBupatiPdf"
import { CreatableCombobox } from "@/components/ui/creatable-combobox"
import { getDefaultNomorSuffix } from "@/lib/utils"
import { MarkdownLiteEditor } from "@/components/ui/markdown-lite-editor"

function DynamicStringList({ label, items, onChange, placeholder }: { label: string, items: string[], onChange: (items: string[]) => void, placeholder?: string }) {
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
        <div key={index} className="flex gap-2 items-center">
          <div className="text-sm text-slate-400 w-6 text-right shrink-0">{index + 1}.</div>
          <Input 
            value={item} 
            onChange={(e) => handleChange(index, e.target.value)} 
            placeholder={placeholder} 
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
        <Plus className="w-4 h-4 mr-1" /> Tambah Baris
      </Button>
    </div>
  )
}

function DynamicParafList({ label, items, pegawaiList, onChange }: { label: string, items: string[], pegawaiList: any[], onChange: (items: string[]) => void }) {
  const pegawaiOptions = pegawaiList.map((p) => ({ value: p.id, label: p.nama }))
  const handleAdd = () => { if (items.length < 4) onChange([...items, ""]) }
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
        <div key={index} className="flex gap-2 items-center">
          <div className="text-sm text-slate-400 w-6 text-right shrink-0">{index + 1}.</div>
          <div className="flex-1">
            <CreatableCombobox 
              options={pegawaiOptions} 
              value={item} 
              onChange={(val) => handleChange(index, val)} 
              placeholder="Pilih Pejabat..."
              className="w-full bg-white"
            />
          </div>
          {items.length > 1 && (
            <Button variant="ghost" size="icon" type="button" onClick={() => handleRemove(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      {items.length < 4 && (
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="mt-2">
          <Plus className="w-4 h-4 mr-1" /> Tambah Paraf
        </Button>
      )}
      <p className="text-xs text-slate-500">Maksimal 4 pejabat pemaraf.</p>
    </div>
  )
}

export default function FormSuratEdaranBupati({ naskah, pegawaiList }: { naskah: any, pegawaiList: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const meta = typeof naskah.data === 'object' && naskah.data !== null ? naskah.data : {}

  const [form, setForm] = useState({
    nomorPrefix: meta.nomorPrefix ?? "800.1.11.1/",
    nomorTengah: meta.nomorTengah ?? "",
    nomorSuffix: meta.nomorSuffix ?? getDefaultNomorSuffix(),
    sifat: meta.sifat ?? "Penting",
    lampiran: meta.lampiran ?? "-",
    hal: meta.hal ?? naskah.perihal ?? "",
    tanggal: meta.tanggal || naskah.tanggal.toISOString().split("T")[0],
    penerimaTipe: meta.penerimaTipe ?? "SEMUA", // SEMUA, TERLAMPIR, LANGSUNG
    penerimaTeksSemua: meta.penerimaTeksSemua ?? "Seluruh Kepala Perangkat Daerah",
    penerimaDaftar: Array.isArray(meta.penerimaDaftar) && meta.penerimaDaftar.length > 0 ? meta.penerimaDaftar : [""],
    penerimaDiTampilkan: meta.penerimaDiTampilkan ?? true,
    penerimaLokasi: meta.penerimaLokasi ?? "",
    isiSurat: meta.isiSurat ?? "",
    tembusan: Array.isArray(meta.tembusan) && meta.tembusan.length > 0 ? meta.tembusan : [""],
    penandatanganId: meta.penandatanganId || "",
    sembunyikanGelar: meta.sembunyikanGelar ?? false,
    sembunyikanJabatan: meta.sembunyikanJabatan ?? false,
    sembunyikanPangkat: meta.sembunyikanPangkat ?? false,
    sembunyikanNip: meta.sembunyikanNip ?? false,
    parafTampilkan: meta.parafTampilkan ?? false,
    parafDaftar: Array.isArray(meta.parafDaftar) && meta.parafDaftar.length > 0 ? meta.parafDaftar : [""],
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
        perihal: form.hal,
        data: form
      })
      toast.success("Perubahan Surat Edaran Bupati berhasil disimpan")
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Gagal menyimpan perubahan")
    } finally {
      setLoading(false)
    }
  }

  const signer = pegawaiList.find(p => p.id === form.penandatanganId)
  const parafPejabatList = form.parafDaftar.map((id: string) => pegawaiList.find(p => p.id === id)).filter(Boolean)
  const pegawaiOptions = pegawaiList.map((p) => ({ value: p.id, label: p.nama }))

  return (
    <div className="space-y-6">
      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Atribut Surat</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs mt-1 text-slate-500">Atribut kepala surat (Nomor, Tanggal, Sifat, Lampiran, Hal).</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Label>Tanggal Surat</Label>
            <Input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Nomor Surat Edaran Bupati</Label>
            <div className="flex items-center">
              <Input 
                name="nomorPrefix" 
                value={form.nomorPrefix} 
                onChange={handleChange} 
                className="w-1/3 rounded-r-none border-r-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center" 
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
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Sifat</Label>
            <Input name="sifat" value={form.sifat} onChange={handleChange} placeholder="Contoh: Penting" />
          </div>
          <div className="space-y-2">
            <Label>Lampiran</Label>
            <Input name="lampiran" value={form.lampiran} onChange={handleChange} placeholder="Contoh: 1 (satu) Berkas" />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Hal</Label>
            <Input name="hal" value={form.hal} onChange={handleChange} placeholder="Tentang edaran..." />
          </div>
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Tujuan (Yth.)</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs mt-1 text-slate-500">Pilih siapa saja yang dituju dalam surat edaran ini.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <RadioGroup 
            value={form.penerimaTipe} 
            onValueChange={(val) => setForm({ ...form, penerimaTipe: val })}
            className="flex flex-col space-y-2"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="SEMUA" id="r1" />
              <Label htmlFor="r1" className="cursor-pointer">Semua (Teks Statis)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="TERLAMPIR" id="r2" />
              <Label htmlFor="r2" className="cursor-pointer">Terlampir (Halaman Daftar Undangan Khusus)</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="LANGSUNG" id="r3" />
              <Label htmlFor="r3" className="cursor-pointer">Langsung (List Poin di bawah Yth)</Label>
            </div>
          </RadioGroup>

          {form.penerimaTipe === "SEMUA" && (
            <div className="space-y-2 mt-4">
              <Label>Teks Tujuan</Label>
              <Input 
                name="penerimaTeksSemua" 
                value={form.penerimaTeksSemua} 
                onChange={handleChange} 
                placeholder="Contoh: Seluruh Kepala Perangkat Daerah" 
              />
            </div>
          )}

          {(form.penerimaTipe === "TERLAMPIR" || form.penerimaTipe === "LANGSUNG") && (
            <div className="mt-4">
              <DynamicStringList 
                label="Daftar Tujuan/Instansi" 
                items={form.penerimaDaftar} 
                onChange={(items) => setForm({ ...form, penerimaDaftar: items })} 
                placeholder="Contoh: Dinas Pemuda dan Olahraga"
              />
            </div>
          )}

          {/* Opsi Lokasi/Tempat Tujuan (di - TEMPAT) */}
          <div className="pt-4 border-t space-y-3">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="penerimaDiTampilkan" 
                checked={form.penerimaDiTampilkan} 
                onCheckedChange={(checked) => setForm({ ...form, penerimaDiTampilkan: checked === true })} 
              />
              <Label htmlFor="penerimaDiTampilkan" className="cursor-pointer font-semibold text-xs sm:text-sm">
                Tampilkan Alamat / Lokasi Tujuan (&quot;di - TEMPAT&quot;)
              </Label>
            </div>

            {form.penerimaDiTampilkan && (
              <div className="space-y-1.5 pl-6">
                <Label className="text-xs font-medium text-slate-700">Kustomisasi Teks Tempat / Lokasi</Label>
                <Input 
                  name="penerimaLokasi" 
                  value={form.penerimaLokasi} 
                  onChange={handleChange} 
                  placeholder="Default: T E M P A T (Kosongkan jika ingin 'T E M P A T')" 
                  className="bg-white text-xs"
                />
                <p className="text-[11px] text-slate-500">
                  Jika dikosongkan, otomatis akan dicetak <b>T E M P A T</b>. Jika diisi (contoh: <i>Sendawar</i> atau <i>Jakarta</i>), akan dicetak sesuai isian.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Isi Surat</CardTitle>
          <CardDescription className="text-[10px] sm:text-xs mt-1 text-slate-500">
            Tulis isi surat Anda menggunakan editor visual di bawah ini. Anda dapat menambah, menghapus, atau merubah jenis setiap blok paragraf.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 sm:space-y-4 p-4 sm:p-6">
          <MarkdownLiteEditor 
            value={form.isiSurat}
            onChange={(val) => setForm(prev => ({ ...prev, isiSurat: val }))}
          />
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Tembusan</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <DynamicStringList 
            label="Daftar Tembusan (Opsional)" 
            items={form.tembusan} 
            onChange={(items) => setForm({ ...form, tembusan: items })} 
            placeholder="Contoh: Bupati Kutai Barat"
          />
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">Penandatangan & Paraf</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Label>Pejabat yang Menandatangani</Label>
            <CreatableCombobox 
              options={pegawaiOptions} 
              value={form.penandatanganId} 
              onChange={(val) => setForm({ ...form, penandatanganId: val })} 
              placeholder="Cari pejabat penandatangan..."
              className="w-full bg-white"
            />
          </div>

          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2">
            <Label className="text-xs font-semibold text-slate-700">Opsi Atribut Penandatangan (PDF):</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sembunyikanGelar" 
                  checked={form.sembunyikanGelar} 
                  onCheckedChange={(checked) => setForm({ ...form, sembunyikanGelar: checked === true })} 
                />
                <Label htmlFor="sembunyikanGelar" className="cursor-pointer text-xs font-normal">Hapus Gelar</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sembunyikanJabatan" 
                  checked={form.sembunyikanJabatan} 
                  onCheckedChange={(checked) => setForm({ ...form, sembunyikanJabatan: checked === true })} 
                />
                <Label htmlFor="sembunyikanJabatan" className="cursor-pointer text-xs font-normal">Hapus Jabatan</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sembunyikanPangkat" 
                  checked={form.sembunyikanPangkat} 
                  onCheckedChange={(checked) => setForm({ ...form, sembunyikanPangkat: checked === true })} 
                />
                <Label htmlFor="sembunyikanPangkat" className="cursor-pointer text-xs font-normal">Hapus Pangkat</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="sembunyikanNip" 
                  checked={form.sembunyikanNip} 
                  onCheckedChange={(checked) => setForm({ ...form, sembunyikanNip: checked === true })} 
                />
                <Label htmlFor="sembunyikanNip" className="cursor-pointer text-xs font-normal">Hapus NIP</Label>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="parafTampilkan" 
                checked={form.parafTampilkan} 
                onCheckedChange={(checked) => setForm({ ...form, parafTampilkan: checked === true })} 
              />
              <Label htmlFor="parafTampilkan" className="cursor-pointer font-semibold">Tampilkan Kotak Paraf Berjenjang</Label>
            </div>

            {form.parafTampilkan && (
              <DynamicParafList 
                label="Daftar Pejabat Pemaraf" 
                items={form.parafDaftar} 
                pegawaiList={pegawaiList}
                onChange={(items) => setForm({ ...form, parafDaftar: items })} 
              />
            )}
          </div>
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
        title="Pratinjau Surat Edaran Bupati"
        renderDocument={(layout: PdfLayoutOptions) => (
          <SuratEdaranBupatiPdf 
            data={form} 
            signer={signer}
            parafList={parafPejabatList}
            layout={layout}
          />
        )}
      />
    </div>
  )
}
