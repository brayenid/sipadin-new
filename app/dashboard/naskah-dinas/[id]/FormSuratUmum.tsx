"use client"

import { useState, useRef, useEffect } from "react"
import { useRouter } from "next/navigation"
import { NaskahDinas, Pegawai } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Save, FileText, Trash2, Plus, Settings2, LayoutGrid, FileType, Link as LinkIcon } from "lucide-react"
import { updateNaskahDinas, getAgendaOptions } from "@/app/actions/naskah-dinas"
import { toast } from "sonner"
import NaskahDinasPdfPreview, { PdfLayoutOptions } from "./NaskahDinasPdfPreview"
import SuratUmumPdf from "@/pdf/templates/SuratUmumPdf"
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
      <Label className="text-xs font-semibold">{label}</Label>
      {items.map((item, index) => (
        <div key={index} className="flex gap-2 items-center">
          <div className="text-sm text-slate-400 w-6 text-right shrink-0">{index + 1}.</div>
          <Input 
            value={item} 
            onChange={(e) => handleChange(index, e.target.value)} 
            placeholder={placeholder} 
            className="flex-1 text-xs sm:text-sm"
          />
          {items.length > 1 && (
            <Button variant="ghost" size="icon" type="button" onClick={() => handleRemove(index)} className="text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0">
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}
      <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="mt-2 text-xs">
        <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Baris
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
      <Label className="text-xs font-semibold">{label}</Label>
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
        <Button type="button" variant="outline" size="sm" onClick={handleAdd} className="mt-2 text-xs">
          <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Paraf
        </Button>
      )}
      <p className="text-xs text-slate-500">Maksimal 4 pejabat pemaraf.</p>
    </div>
  )
}

export default function FormSuratUmum({ naskah, pegawaiList }: { naskah: any, pegawaiList: any[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [agendaOptions, setAgendaOptions] = useState<{ value: string; label: string }[]>([])

  useEffect(() => {
    getAgendaOptions().then((list) => {
      setAgendaOptions(list.map((a) => ({ value: a, label: a })))
    })
  }, [])

  const meta = typeof naskah.data === 'object' && naskah.data !== null ? naskah.data : {}

  const [form, setForm] = useState({
    // Kustomisasi Tampilan & Layout (Surat Umum)
    kopSuratTipe: meta.kopSuratTipe ?? "SEKDA", // SEKDA, BUPATI, CUSTOM, NONE
    kopCustomLine1: meta.kopCustomLine1 ?? "PEMERINTAH KABUPATEN KUTAI BARAT",
    kopCustomLine2: meta.kopCustomLine2 ?? "DINAS TERKAIT",
    kopCustomAlamat: meta.kopCustomAlamat ?? "Jalan Kompleks Perkantoran Pemerintah Kabupaten Kutai Barat",

    tampilkanJudul: meta.tampilkanJudul ?? false,
    judulTeks: meta.judulTeks ?? "SURAT UMUM",
    posisiNomor: meta.posisiNomor ?? "HEADER_LEFT", // HEADER_LEFT (Sekda), BELOW_TITLE (Bupati/Formal)

    posisiTanggal: meta.posisiTanggal ?? "TOP_RIGHT", // TOP_RIGHT, ABOVE_SIGNATURE, BOTH

    tampilkanYth: meta.tampilkanYth ?? true,
    penerimaTipe: meta.penerimaTipe ?? "SEMUA", // SEMUA, TERLAMPIR, LANGSUNG
    penerimaTeksSemua: meta.penerimaTeksSemua ?? "Seluruh Kepala Perangkat Daerah",
    penerimaDaftar: Array.isArray(meta.penerimaDaftar) && meta.penerimaDaftar.length > 0 ? meta.penerimaDaftar : [""],
    penerimaDiTampilkan: meta.penerimaDiTampilkan ?? true,
    penerimaLokasi: meta.penerimaLokasi ?? "",

    // Basic Info
    nomorPrefix: meta.nomorPrefix ?? "800.1.11.1/",
    nomorTengah: meta.nomorTengah ?? "",
    nomorSuffix: meta.nomorSuffix ?? getDefaultNomorSuffix(),
    sifat: meta.sifat ?? "Biasa",
    lampiran: meta.lampiran ?? "-",
    hal: meta.hal ?? naskah.perihal ?? "",
    agenda: naskah.agenda || "",
    tanggal: meta.tanggal || naskah.tanggal.toISOString().split("T")[0],

    // Content
    isiSurat: meta.isiSurat ?? "",

    // Signer & Attributes
    penandatanganId: meta.penandatanganId || "",
    sembunyikanGelar: meta.sembunyikanGelar ?? false,
    sembunyikanJabatan: meta.sembunyikanJabatan ?? false,
    sembunyikanPangkat: meta.sembunyikanPangkat ?? false,
    sembunyikanNip: meta.sembunyikanNip ?? false,

    // Paraf & Tembusan
    parafTampilkan: meta.parafTampilkan ?? false,
    parafDaftar: Array.isArray(meta.parafDaftar) && meta.parafDaftar.length > 0 ? meta.parafDaftar : [""],
    tembusan: Array.isArray(meta.tembusan) && meta.tembusan.length > 0 ? meta.tembusan : [""],
    tautanNaskahAsli: meta.tautanNaskahAsli ?? "",
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
        agenda: form.agenda,
        data: form,
      })
      toast.success("Surat Umum berhasil disimpan!")
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan Surat Umum")
    } finally {
      setLoading(false)
    }
  }

  const selectedSigner = pegawaiList.find((p) => p.id === form.penandatanganId)
  const selectedParafList = form.parafDaftar
    .map((id: string) => pegawaiList.find(p => p.id === id))
    .filter(Boolean)

  const pegawaiOptions = pegawaiList.map((p) => ({
    value: p.id,
    label: `${p.nama}${p.jabatan ? ` (${p.jabatan})` : ''}`
  }))

  return (
    <div className="space-y-6">
      {/* CARD 1: OPSI KUSTOMISASI DOKUMEN */}
        <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="pt-4 pb-3 sm:pt-5 sm:pb-4 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold flex items-center text-slate-800">
              <LayoutGrid className="w-4 h-4 mr-2 text-indigo-600" /> Format & Opsi Tampilan Surat
            </CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Pilih gaya Kop Surat, penempatan nomor, judul, dan posisi tanggal (default: Surat Edaran Sekda)
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
            
            {/* Kop Surat Choice */}
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-slate-700">1. Jenis Kop Surat</Label>
              <Select
                value={form.kopSuratTipe}
                onValueChange={(val) => setForm({ ...form, kopSuratTipe: val as any })}
              >
                <SelectTrigger className="w-full text-xs">
                  <SelectValue placeholder="Pilih Jenis Kop Surat" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SEKDA">Sekretariat Daerah / Perangkat Daerah (Default)</SelectItem>
                  <SelectItem value="BUPATI">Lambang Garuda & Bupati Kutai Barat</SelectItem>
                  <SelectItem value="CUSTOM">Kop Kustom (Teks Instansi Mandiri)</SelectItem>
                  <SelectItem value="NONE">Tanpa Kop Surat</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.kopSuratTipe === "CUSTOM" && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Baris 1 Instansi</Label>
                  <Input 
                    value={form.kopCustomLine1}
                    onChange={(e) => setForm({ ...form, kopCustomLine1: e.target.value })}
                    placeholder="PEMERINTAH KABUPATEN KUTAI BARAT"
                    className="text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Baris 2 Unit Kerja / Dinas</Label>
                  <Input 
                    value={form.kopCustomLine2}
                    onChange={(e) => setForm({ ...form, kopCustomLine2: e.target.value })}
                    placeholder="DINAS PERHUBUNGAN"
                    className="text-xs bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Alamat & Kontak</Label>
                  <Input 
                    value={form.kopCustomAlamat}
                    onChange={(e) => setForm({ ...form, kopCustomAlamat: e.target.value })}
                    placeholder="Jalan Kompleks Perkantoran..."
                    className="text-xs bg-white"
                  />
                </div>
              </div>
            )}

            {/* Judul & Format Nomor */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="tampilkanJudul"
                    checked={form.tampilkanJudul}
                    onCheckedChange={(checked) => setForm({ ...form, tampilkanJudul: checked === true })}
                  />
                  <Label htmlFor="tampilkanJudul" className="text-xs font-semibold cursor-pointer">Tampilkan Judul Surat</Label>
                </div>
                {form.tampilkanJudul && (
                  <Input 
                    value={form.judulTeks}
                    onChange={(e) => setForm({ ...form, judulTeks: e.target.value })}
                    placeholder="SURAT UMUM"
                    className="text-xs"
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Tata Letak Nomor & Header</Label>
                <RadioGroup 
                  value={form.posisiNomor} 
                  onValueChange={(val) => setForm({ ...form, posisiNomor: val as any })}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="HEADER_LEFT" id="posisiNomor_left" />
                    <Label htmlFor="posisiNomor_left" className="text-xs font-normal cursor-pointer">Block Kiri (Nomor, Sifat, Lampiran, Hal)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="BELOW_TITLE" id="posisiNomor_title" />
                    <Label htmlFor="posisiNomor_title" className="text-xs font-normal cursor-pointer">Tengah di Bawah Judul Surat</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Posisi Tanggal */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Posisi Tanggal Surat</Label>
              <RadioGroup 
                value={form.posisiTanggal} 
                onValueChange={(val) => setForm({ ...form, posisiTanggal: val as any })}
                className="grid grid-cols-1 sm:grid-cols-3 gap-2"
              >
                <div className="flex items-center space-x-2 p-2 border rounded-lg bg-slate-50/50">
                  <RadioGroupItem value="TOP_RIGHT" id="posisiTanggal_top" />
                  <Label htmlFor="posisiTanggal_top" className="text-xs font-normal cursor-pointer">Kanan Atas (Sekda)</Label>
                </div>
                <div className="flex items-center space-x-2 p-2 border rounded-lg bg-slate-50/50">
                  <RadioGroupItem value="ABOVE_SIGNATURE" id="posisiTanggal_ttd" />
                  <Label htmlFor="posisiTanggal_ttd" className="text-xs font-normal cursor-pointer">Atas Tanda Tangan</Label>
                </div>
                <div className="flex items-center space-x-2 p-2 border rounded-lg bg-slate-50/50">
                  <RadioGroupItem value="BOTH" id="posisiTanggal_both" />
                  <Label htmlFor="posisiTanggal_both" className="text-xs font-normal cursor-pointer">Keduanya</Label>
                </div>
              </RadioGroup>
            </div>

          </CardContent>
        </Card>

        {/* CARD 2: INFORMASI NOMOR & TANGGAL */}
        <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="pt-4 pb-3 sm:pt-5 sm:pb-4 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold flex items-center text-slate-800">
              <FileType className="w-4 h-4 mr-2 text-indigo-600" /> Informasi Nomor & Perihal
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nomor Surat</Label>
                <div className="flex items-center">
                  <Input 
                    name="nomorPrefix" 
                    value={form.nomorPrefix} 
                    onChange={handleChange} 
                    className="w-1/3 rounded-r-none border-r-0 text-slate-500 bg-slate-50 focus-visible:ring-0 px-2 text-center text-xs sm:text-sm" 
                  />
                  <Input 
                    name="nomorTengah" 
                    value={form.nomorTengah} 
                    onChange={handleChange} 
                    placeholder="Contoh: 001/UMUM" 
                    className="flex-1 rounded-none focus-visible:ring-0 text-center text-xs sm:text-sm font-semibold" 
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
                <Label>Tanggal Surat</Label>
                <Input type="date" name="tanggal" value={form.tanggal} onChange={handleChange} className="text-xs sm:text-sm" />
              </div>

              <div className="space-y-2">
                <Label>Sifat Surat</Label>
                <Input name="sifat" value={form.sifat} onChange={handleChange} placeholder="Biasa / Penting / Rahasia" className="text-xs sm:text-sm" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Lampiran</Label>
                <Input name="lampiran" value={form.lampiran} onChange={handleChange} placeholder="1 (satu) Berkas / -" className="text-xs sm:text-sm" />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label>Hal / Perihal</Label>
                <Textarea name="hal" value={form.hal} onChange={handleChange} placeholder="Isikan hal atau perihal surat..." rows={2} className="text-xs sm:text-sm" />
              </div>

              <div className="space-y-2 sm:col-span-2">
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
            </div>
          </CardContent>
        </Card>

        {/* CARD 3: TUJUAN SURAT (YTH.) */}
        <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="pt-4 pb-3 sm:pt-5 sm:pb-4 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold text-slate-800">Tujuan Surat (Yth.)</CardTitle>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="tampilkanYth"
                checked={form.tampilkanYth}
                onCheckedChange={(checked) => setForm({ ...form, tampilkanYth: checked === true })}
              />
              <Label htmlFor="tampilkanYth" className="text-xs font-normal cursor-pointer">Tampilkan Block Yth.</Label>
            </div>
          </CardHeader>

          {form.tampilkanYth && (
            <CardContent className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-slate-700">Format Penerima</Label>
                <RadioGroup 
                  value={form.penerimaTipe} 
                  onValueChange={(val) => setForm({ ...form, penerimaTipe: val })}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="SEMUA" id="penerima_semua" />
                    <Label htmlFor="penerima_semua" className="text-xs font-normal cursor-pointer">Teks Statis (misal: Seluruh Kepala Perangkat Daerah)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="TERLAMPIR" id="penerima_terlampir" />
                    <Label htmlFor="penerima_terlampir" className="text-xs font-normal cursor-pointer">Terlampir (Daftar Undangan pada Halaman Lampiran)</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="LANGSUNG" id="penerima_langsung" />
                    <Label htmlFor="penerima_langsung" className="text-xs font-normal cursor-pointer">Langsung (List Poin Instansi di bawah Yth.)</Label>
                  </div>
                </RadioGroup>
              </div>

              {form.penerimaTipe === "SEMUA" && (
                <div className="space-y-2 pt-2">
                  <Label className="text-xs font-semibold">Teks Penerima</Label>
                  <Input 
                    value={form.penerimaTeksSemua} 
                    onChange={(e) => setForm({ ...form, penerimaTeksSemua: e.target.value })}
                    placeholder="Seluruh Kepala Perangkat Daerah"
                    className="text-xs"
                  />
                </div>
              )}

              {(form.penerimaTipe === "TERLAMPIR" || form.penerimaTipe === "LANGSUNG") && (
                <div className="mt-4">
                  <DynamicStringList 
                    label="Daftar Tujuan / Instansi" 
                    items={form.penerimaDaftar} 
                    onChange={(items) => setForm({ ...form, penerimaDaftar: items })}
                    placeholder="Nama Instansi / Pejabat..."
                  />
                </div>
              )}

              {/* Alamat / Lokasi Tujuan */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="penerimaDiTampilkan"
                    checked={form.penerimaDiTampilkan}
                    onCheckedChange={(checked) => setForm({ ...form, penerimaDiTampilkan: checked === true })}
                  />
                  <Label htmlFor="penerimaDiTampilkan" className="text-xs font-medium cursor-pointer">
                    Tampilkan lokasi tujuan (di - TEMPAT)
                  </Label>
                </div>

                {form.penerimaDiTampilkan && (
                  <div className="pl-6 space-y-1.5">
                    <Label className="text-xs text-slate-600">Teks Lokasi (Kosongkan jika ingin "T E M P A T")</Label>
                    <Input 
                      value={form.penerimaLokasi}
                      onChange={(e) => setForm({ ...form, penerimaLokasi: e.target.value })}
                      placeholder="T E M P A T (Default)"
                      className="text-xs max-w-sm bg-white"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          )}
        </Card>

        {/* CARD 4: ISI SURAT */}
        <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="pt-4 pb-3 sm:pt-5 sm:pb-4 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-800">Isi Surat</CardTitle>
            <CardDescription className="text-xs text-slate-500">
              Gunakan editor di bawah untuk menulis paragraf, poin-poin, dan tabel kustom.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4">
            <MarkdownLiteEditor
              value={form.isiSurat}
              onChange={(val) => setForm({ ...form, isiSurat: val })}
            />
          </CardContent>
        </Card>

        {/* CARD 5: PENANDATANGAN & ATRIBUT */}
        <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="pt-4 pb-3 sm:pt-5 sm:pb-4 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-800">Penandatangan & Opsi Tampilan</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 space-y-4 text-xs sm:text-sm">
            <div className="space-y-2">
              <Label>Pejabat Penandatangan</Label>
              <CreatableCombobox 
                options={pegawaiOptions} 
                value={form.penandatanganId} 
                onChange={(val) => setForm({ ...form, penandatanganId: val })} 
                placeholder="Pilih Pejabat Penandatangan..."
                className="w-full bg-white"
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-lg space-y-2">
              <Label className="text-xs font-semibold text-slate-700">Opsi Atribut Penandatangan (PDF):</Label>
              <div className="grid grid-cols-2 gap-2 pt-1">
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

            {/* Paraf Section Toggle */}
            <div className="pt-4 border-t border-slate-100 space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="parafTampilkan"
                  checked={form.parafTampilkan}
                  onCheckedChange={(checked) => setForm({ ...form, parafTampilkan: checked === true })}
                />
                <Label htmlFor="parafTampilkan" className="text-xs font-semibold cursor-pointer">
                  Tampilkan Tabel Paraf Berjenjang
                </Label>
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

        {/* CARD 6: TEMBUSAN */}
        <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
          <CardHeader className="pt-4 pb-3 sm:pt-5 sm:pb-4 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-800">Tembusan</CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6">
            <DynamicStringList 
              label="Tembusan disampaikan kepada Yth:" 
              items={form.tembusan} 
              onChange={(items) => setForm({ ...form, tembusan: items })} 
              placeholder="Contoh: Bupati Kutai Barat (sebagai laporan)..." 
            />
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

        {/* Save & Action Footer Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowPreview(true)}
            className="w-full sm:w-auto h-10 sm:h-9 text-xs sm:text-sm"
          >
            <FileText className="w-4 h-4 mr-2" />
            Pratinjau PDF
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="w-full sm:w-auto h-10 sm:h-9 text-xs sm:text-sm bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan Perubahan
          </Button>
        </div>

      <NaskahDinasPdfPreview
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Pratinjau Surat Umum"
        renderDocument={(layout: PdfLayoutOptions) => (
          <SuratUmumPdf 
            data={form} 
            signer={selectedSigner} 
            parafList={selectedParafList as any} 
            layout={layout}
          />
        )}
      />
    </div>
  )
}
