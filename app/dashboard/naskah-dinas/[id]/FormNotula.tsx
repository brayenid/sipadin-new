"use client"

import { useState } from "react"
import { NaskahDinas, Pegawai } from "@prisma/client"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Save, Loader2, FileText } from "lucide-react"
import { updateNaskahDinas } from "@/app/actions/naskah-dinas"
import { toast } from "sonner"
import NaskahDinasPdfPreview from "./NaskahDinasPdfPreview"
import { Checkbox } from "@/components/ui/checkbox"
import { CreatableCombobox } from "@/components/ui/creatable-combobox"
import { TiptapEditor } from "@/components/ui/tiptap-editor"
import NotulaPdf from "@/pdf/templates/NotulaPdf"
import InitNotulaAiModal, { AiNotulaInitData } from "./InitNotulaAiModal"
import RefineNotulaAiButton from "./RefineNotulaAiButton"

const DEFAULT_NOTULA_CONTENT = `<h1>I. PEMBUKAAN</h1>
<ol>
  <li>Penyampaian oleh Pimpinan Rapat:
    <ol>
      <li>Rapat dibuka oleh Kepala Bagian Organisasi Sekretariat Daerah pada pukul 09.00 WITA.</li>
      <li>Rapat ini merupakan forum koordinasi lintas OPD dalam rangka menyelaraskan pelaksanaan sistem kerja yang tertib, terukur, dan akuntabel.</li>
    </ol>
  </li>
</ol>

<h1>II. PEMBAHASAN</h1>
<h2>A. Paparan Utama / Materi Rapat</h2>
<ol>
  <li>Kerangka Regulasi dan Kebijakan Nasional:
    <ol>
      <li>Permenpan RB Nomor 6 Tahun 2022 tentang Pengelolaan Kinerja Pegawai ASN.</li>
      <li>Kebijakan penyederhanaan birokrasi melalui transformasi jabatan.</li>
    </ol>
  </li>
  <li>Kondisi Pelaksanaan Sistem Kerja di Tingkat Daerah:
    <ol>
      <li>Evaluasi menunjukkan sebagian besar OPD belum sepenuhnya mengimplementasikan SKP berbasis elektronik secara konsisten.</li>
    </ol>
  </li>
</ol>

<h1>III. TANGGAPAN / TANYA JAWAB</h1>
<ol>
  <li>Inspektorat Daerah:
    <ol>
      <li><strong>Pertanyaan:</strong> Bagaimana mekanisme pengawasan kinerja dapat diintegrasikan secara efektif?</li>
      <li><strong>Jawaban Narasumber:</strong> Pengawasan berbasis risiko (risk-based audit) menjadi solusi yang tepat.</li>
    </ol>
  </li>
</ol>

<h1>IV. KESIMPULAN DAN PENUTUP</h1>
<ol>
  <li>Bagian Organisasi Setda akan menyusun roadmap implementasi sistem kerja berbasis kinerja secara komprehensif.</li>
  <li>Inspektorat Daerah akan mengembangkan mekanisme pengawasan sistem kerja berbasis risiko.</li>
</ol>`

export default function FormNotula({
  naskah,
  pegawaiList
}: {
  naskah: NaskahDinas
  pegawaiList: Pegawai[]
}) {
  const data = (naskah.data as any) || {}
  
  const [loading, setLoading] = useState(false)
  const [showPreview, setShowPreview] = useState(false)

  const pegawaiOptions = pegawaiList.map((p) => ({
    value: p.id,
    label: `${p.nama} (${p.jabatan})`,
    pegawai: p
  }))

  const formatHariTanggal = (dateStr: string) => {
    if (!dateStr) return ""
    try {
      const d = new Date(dateStr + "T00:00:00")
      return new Intl.DateTimeFormat("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric"
      }).format(d)
    } catch {
      return dateStr
    }
  }

  const defaultTanggal = naskah.tanggal
    ? new Date(naskah.tanggal).toISOString().split("T")[0]
    : new Date().toISOString().split("T")[0]

  const [form, setForm] = useState({
    nomorSurat: naskah.nomorSurat || "",
    tanggal: defaultTanggal,
    tanggalRapat: data.tanggalRapat || data.hariTanggal || defaultTanggal,
    pukul: data.pukul || "09.00 – selesai",
    suratUndangan: data.suratUndangan || "",
    tempat: data.tempat || "",
    acara: data.acara || naskah.perihal || "",
    
    ketuaPegawaiId: data.ketuaPegawaiId || "",
    ketuaJabatan: data.ketuaJabatan || "Kepala Bagian Organisasi",
    ketuaNama: data.ketuaNama || "AGUNG SUGARA, SE.,M.Si",
    ketuaNip: data.ketuaNip || "",
    ketuaPangkat: data.ketuaPangkat || "",

    sekretarisPegawaiId: data.sekretarisPegawaiId || "",
    sekretarisJabatan: data.sekretarisJabatan || "",
    sekretarisNama: data.sekretarisNama || "",
    sekretarisNip: data.sekretarisNip || "",
    sekretarisPangkat: data.sekretarisPangkat || "",

    pencatatPegawaiId: data.pencatatPegawaiId || "",
    pencatatJabatan: data.pencatatJabatan || "",
    pencatatNama: data.pencatatNama || "",
    pencatatNip: data.pencatatNip || "",
    pencatatPangkat: data.pencatatPangkat || "",

    pesertaRapat: data.pesertaRapat || "",
    penandatanganId: data.penandatanganId || data.ketuaPegawaiId || "",

    // Display Checkbox Options
    headerTampilkanJabatan: data.headerTampilkanJabatan ?? true,
    headerTampilkanNama: data.headerTampilkanNama ?? true,
    headerTampilkanNip: data.headerTampilkanNip ?? false,
    headerTampilkanPangkat: data.headerTampilkanPangkat ?? false,
    ttdTampilkanJabatan: data.ttdTampilkanJabatan ?? true,
    ttdTampilkanPangkat: data.ttdTampilkanPangkat ?? false,
    ttdTampilkanNip: data.ttdTampilkanNip ?? false,

    isiSurat: data.isiSurat || DEFAULT_NOTULA_CONTENT,
    isAiInitialized: Boolean(data.isAiInitialized),
    aiInitData: (data.aiInitData as AiNotulaInitData | null) || null,
  })

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value })
  }

  // Handle Pegawai Selection for Roles
  const handleSelectKetua = (val: string) => {
    const selected = pegawaiList.find((p) => p.id === val)
    if (selected) {
      setForm((prev) => ({
        ...prev,
        ketuaPegawaiId: selected.id,
        ketuaNama: selected.nama,
        ketuaJabatan: selected.jabatan,
        ketuaNip: selected.nip || "",
        ketuaPangkat: selected.pangkat || "",
        penandatanganId: prev.penandatanganId || selected.id
      }))
    } else {
      setForm((prev) => ({
        ...prev,
        ketuaPegawaiId: "",
        ketuaNama: val
      }))
    }
  }

  const handleSelectSekretaris = (val: string) => {
    const selected = pegawaiList.find((p) => p.id === val)
    if (selected) {
      setForm((prev) => ({
        ...prev,
        sekretarisPegawaiId: selected.id,
        sekretarisNama: selected.nama,
        sekretarisJabatan: selected.jabatan,
        sekretarisNip: selected.nip || "",
        sekretarisPangkat: selected.pangkat || ""
      }))
    } else {
      setForm((prev) => ({
        ...prev,
        sekretarisPegawaiId: "",
        sekretarisNama: val
      }))
    }
  }

  const handleSelectPencatat = (val: string) => {
    const selected = pegawaiList.find((p) => p.id === val)
    if (selected) {
      setForm((prev) => ({
        ...prev,
        pencatatPegawaiId: selected.id,
        pencatatNama: selected.nama,
        pencatatJabatan: selected.jabatan,
        pencatatNip: selected.nip || "",
        pencatatPangkat: selected.pangkat || ""
      }))
    } else {
      setForm((prev) => ({
        ...prev,
        pencatatPegawaiId: "",
        pencatatNama: val
      }))
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      await updateNaskahDinas(naskah.id, {
        nomorSurat: form.nomorSurat,
        tanggal: form.tanggal,
        perihal: form.acara,
        agenda: naskah.agenda || "",
        data: {
          ...form
        }
      })
      toast.success("Dokumen Notula berhasil disimpan")
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan Notula")
    } finally {
      setLoading(false)
    }
  }

  const ketuaSigner = pegawaiList.find((p) => p.id === form.ketuaPegawaiId)
  const mainSigner = pegawaiList.find((p) => p.id === form.penandatanganId) || ketuaSigner

  const pdfData = {
    ...form,
    hariTanggal: formatHariTanggal(form.tanggalRapat)
  }

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header Information */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">1. Informasi Rapat & Header Notula</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 p-4 sm:p-6">
          <div className="space-y-2">
            <Label>Hari / Tanggal Rapat</Label>
            <Input type="date" name="tanggalRapat" value={form.tanggalRapat} onChange={handleChange} />
          </div>
          <div className="space-y-2">
            <Label>Pukul</Label>
            <Input name="pukul" value={form.pukul} onChange={handleChange} placeholder="Contoh: 09.00 – selesai" />
          </div>
          <div className="space-y-2">
            <Label>Surat Undangan</Label>
            <Input name="suratUndangan" value={form.suratUndangan} onChange={handleChange} placeholder="Contoh: Rapat Pendampingan Perencanaan..." />
          </div>
          <div className="space-y-2">
            <Label>Tempat</Label>
            <Input name="tempat" value={form.tempat} onChange={handleChange} placeholder="Contoh: Ruang Rapat Biro Organisasi..." />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Acara / Perihal Rapat</Label>
            <Input name="acara" value={form.acara} onChange={handleChange} placeholder="Contoh: Rapat Pendampingan Perencanaan dan Evaluasi Sistem Kerja" />
          </div>
        </CardContent>
      </Card>

      {/* 2. Pimpinan & Peserta Rapat */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100">
          <CardTitle className="text-base sm:text-lg font-bold text-slate-800">2. Pimpinan & Peserta Rapat</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6 p-4 sm:p-6">
          {/* Ketua */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50/50 border border-slate-100">
            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold text-slate-700">Ketua Rapat (Pilih Master Pegawai atau Input Manual)</Label>
              <CreatableCombobox
                options={pegawaiOptions}
                value={form.ketuaPegawaiId || form.ketuaNama}
                onChange={handleSelectKetua}
                placeholder="Pilih dari Master Pegawai atau Ketik Nama..."
              />
            </div>
            <div className="space-y-2">
              <Label>Jabatan Ketua</Label>
              <Input name="ketuaJabatan" value={form.ketuaJabatan} onChange={handleChange} placeholder="Contoh: Kepala Bagian Organisasi" />
            </div>
            <div className="space-y-2">
              <Label>Nama Ketua</Label>
              <Input name="ketuaNama" value={form.ketuaNama} onChange={handleChange} placeholder="Contoh: AGUNG SUGARA, SE.,M.Si" />
            </div>
          </div>

          {/* Sekretaris */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50/50 border border-slate-100">
            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold text-slate-700">Sekretaris Rapat (Opsional)</Label>
              <CreatableCombobox
                options={pegawaiOptions}
                value={form.sekretarisPegawaiId || form.sekretarisNama}
                onChange={handleSelectSekretaris}
                placeholder="Pilih dari Master Pegawai atau Ketik Nama (Opsional)..."
              />
            </div>
            <div className="space-y-2">
              <Label>Jabatan Sekretaris</Label>
              <Input name="sekretarisJabatan" value={form.sekretarisJabatan} onChange={handleChange} placeholder="Contoh: Ketua Tim Pelayanan Publik..." />
            </div>
            <div className="space-y-2">
              <Label>Nama Sekretaris</Label>
              <Input name="sekretarisNama" value={form.sekretarisNama} onChange={handleChange} placeholder="Nama Sekretaris" />
            </div>
          </div>

          {/* Pencatat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50/50 border border-slate-100">
            <div className="space-y-2 md:col-span-2">
              <Label className="font-semibold text-slate-700">Pencatat Notula (Opsional)</Label>
              <CreatableCombobox
                options={pegawaiOptions}
                value={form.pencatatPegawaiId || form.pencatatNama}
                onChange={handleSelectPencatat}
                placeholder="Pilih dari Master Pegawai atau Ketik Nama (Opsional)..."
              />
            </div>
            <div className="space-y-2">
              <Label>Jabatan Pencatat</Label>
              <Input name="pencatatJabatan" value={form.pencatatJabatan} onChange={handleChange} placeholder="Contoh: Staf Pelayanan Publik..." />
            </div>
            <div className="space-y-2">
              <Label>Nama Pencatat</Label>
              <Input name="pencatatNama" value={form.pencatatNama} onChange={handleChange} placeholder="Nama Pencatat" />
            </div>
          </div>

          {/* Peserta Rapat */}
          <div className="space-y-2">
            <Label>Peserta Rapat (Opsional)</Label>
            <Input name="pesertaRapat" value={form.pesertaRapat} onChange={handleChange} placeholder="Contoh: 61 Orang / Seluruh OPD Terkait" />
          </div>

          {/* Opsi Format Tampilan Pimpinan & Tanda Tangan */}
          <div className="p-4 rounded-lg bg-indigo-50/40 border border-indigo-100 space-y-4">
            <div>
              <Label className="font-bold text-slate-800 text-xs sm:text-sm flex items-center gap-1.5">
                <span>Pengaturan Format Tampilan (Pimpinan & Tanda Tangan)</span>
              </Label>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Pilih informasi identitas yang ingin dicetak pada baris Pimpinan Rapat (atas) dan blok Tanda Tangan (bawah).
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Bagian Pimpinan Rapat (Atas) */}
              <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-2.5 shadow-2xs">
                <p className="font-semibold text-xs text-slate-800 border-b border-slate-100 pb-1.5">
                  1. Format Pimpinan Rapat (Header Atas)
                </p>
                <div className="space-y-2.5 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <Checkbox
                      checked={form.headerTampilkanJabatan}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, headerTampilkanJabatan: Boolean(checked) }))}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-slate-800 font-medium">Sertakan Jabatan</span>
                      <p className="text-[11px] text-slate-500">Contoh: Kepala Bagian Organisasi</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <Checkbox
                      checked={form.headerTampilkanNama}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, headerTampilkanNama: Boolean(checked) }))}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-slate-800 font-medium">Sertakan Nama Pejabat</span>
                      <p className="text-[11px] text-slate-500">Contoh: (AGUNG SUGARA, SE.,M.Si)</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <Checkbox
                      checked={form.headerTampilkanPangkat}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, headerTampilkanPangkat: Boolean(checked) }))}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-slate-800 font-medium">Sertakan Pangkat / Golongan</span>
                      <p className="text-[11px] text-slate-500">Contoh: - Pembina (IV/a)</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <Checkbox
                      checked={form.headerTampilkanNip}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, headerTampilkanNip: Boolean(checked) }))}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-slate-800 font-medium">Sertakan NIP Pejabat</span>
                      <p className="text-[11px] text-slate-500">Contoh: - NIP. 19800101...</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Bagian Tanda Tangan (Bawah) */}
              <div className="p-3 bg-white rounded-lg border border-slate-200/80 space-y-2.5 shadow-2xs">
                <p className="font-semibold text-xs text-slate-800 border-b border-slate-100 pb-1.5">
                  2. Format Tanda Tangan (Footer Bawah)
                </p>
                <div className="space-y-2.5 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <Checkbox
                      checked={form.ttdTampilkanJabatan}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, ttdTampilkanJabatan: Boolean(checked) }))}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-slate-800 font-medium">Tampilkan Teks Jabatan di atas TTD</span>
                      <p className="text-[11px] text-slate-500">Contoh: KEPALA BAGIAN ORGANISASI</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <Checkbox
                      checked={form.ttdTampilkanPangkat}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, ttdTampilkanPangkat: Boolean(checked) }))}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-slate-800 font-medium">Tampilkan Pangkat / Golongan di bawah Nama</span>
                      <p className="text-[11px] text-slate-500">Contoh: Pembina (IV/a)</p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <Checkbox
                      checked={form.ttdTampilkanNip}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, ttdTampilkanNip: Boolean(checked) }))}
                      className="mt-0.5"
                    />
                    <div className="space-y-0.5">
                      <span className="text-slate-800 font-medium">Tampilkan NIP di bawah Nama</span>
                      <p className="text-[11px] text-slate-500">Contoh: NIP. 19800101...</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 3. Isi Dokumen Notula (WYSIWYG Editor Lengkap + Groq AI Assistant) */}
      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] rounded-xl">
        <CardHeader className="pt-4 pb-3 sm:pt-6 sm:pb-5 px-4 sm:px-6 bg-slate-50/50 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold text-slate-800 flex items-center gap-2">
              <span>3. Isi Dokumen Notula Rapat</span>
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 mt-1">
              Gunakan editor visual Word di bawah ini atau manfaatkan <strong>Groq AI Assistant</strong> untuk menyusun dan menyempurnakan draf notula rapat kedinasan secara otomatis.
            </CardDescription>
          </div>

          {/* AI Action Buttons */}
          <div className="flex items-center gap-2 shrink-0">
            <InitNotulaAiModal
              formData={{
                acara: form.acara,
                tanggalRapat: form.tanggalRapat,
                pukul: form.pukul,
                tempat: form.tempat,
                ketuaNama: form.ketuaNama,
                ketuaJabatan: form.ketuaJabatan,
                pesertaRapat: form.pesertaRapat,
              }}
              initialAiData={form.aiInitData}
              isAiInitialized={form.isAiInitialized}
              onApplyGeneratedContent={(htmlContent, initData) => {
                setForm((prev) => ({
                  ...prev,
                  isiSurat: htmlContent,
                  isAiInitialized: true,
                  aiInitData: initData,
                }))
              }}
              onReset={() => {
                setForm((prev) => ({
                  ...prev,
                  isAiInitialized: false,
                  aiInitData: null,
                }))
              }}
            />

            <RefineNotulaAiButton
              currentHtml={form.isiSurat}
              aiInitData={form.aiInitData}
              onApplyRefinedContent={(refinedHtml) => {
                setForm((prev) => ({
                  ...prev,
                  isiSurat: refinedHtml,
                }))
              }}
            />
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0 sm:p-6 sm:pt-0">
          <TiptapEditor
            value={form.isiSurat}
            onChange={(html) => setForm((prev) => ({ ...prev, isiSurat: html }))}
          />
        </CardContent>
      </Card>

      {/* Action Toolbar */}
      <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-4 pb-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowPreview(true)}
          className="w-full sm:w-auto h-10 sm:h-9 text-xs sm:text-sm bg-white shadow-2xs"
        >
          <FileText className="w-4 h-4 mr-2" /> Pratinjau PDF
        </Button>
        <Button
          onClick={handleSave}
          disabled={loading}
          className="w-full sm:w-auto h-10 sm:h-9 text-xs sm:text-sm shadow-2xs"
        >
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          Simpan Perubahan
        </Button>
      </div>

      {/* PDF Modal Preview */}
      {showPreview && (
        <NaskahDinasPdfPreview
          isOpen={showPreview}
          onClose={() => setShowPreview(false)}
          title={`Notula - ${form.acara || "Rapat"}`}
          renderDocument={(layout) => (
            <NotulaPdf
              data={pdfData}
              signer={mainSigner}
              ketuaSigner={ketuaSigner}
              layout={layout}
            />
          )}
        />
      )}
    </div>
  )
}
