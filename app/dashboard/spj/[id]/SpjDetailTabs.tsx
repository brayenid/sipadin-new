'use client'

import { useState, useEffect, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Switch } from '@/components/ui/switch'
import { Pencil, Loader2, Save, CheckCircle2, AlertCircle, Trash2, FileText, AlertTriangle, FolderPlus, ExternalLink } from 'lucide-react'
import { updateSpjMasterData, deleteSpjTransaction } from '@/app/actions/spj'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { Combobox } from '@/components/ui/combobox'
import DopdTab from './DopdTab'
import PersonelTab from './PersonelTab'
import TelaahanTab from './TelaahanTab'
import PengeluaranTab from './PengeluaranTab'
import SuratPengantarTab from './SuratPengantarTab'
import BapbTab from './BapbTab'
import BastbTab from './BastbTab'
import DaftarHadirTab from './DaftarHadirTab'
import KuitansiTab from './KuitansiTab'
import SuratTugasTab from './SuratTugasTab'
import SpdTab from './SpdTab'
import VisumTab from './VisumTab'
import LaporanTab from './LaporanTab'
import DaftarHadirNarasumberTab from './DaftarHadirNarasumberTab'
import DaftarTandaTerimaTab from './DaftarTandaTerimaTab'
import NotulaTab from './NotulaTab'
import { fmtDateId } from '@/lib/utils'
import { formatWita } from '@/lib/date-utils'

export default function SpjDetailTabs({
  spj,
  pegawaiList,
  vendorList = [],
  tahunAnggarans = []
}: {
  spj: any
  pegawaiList: any[]
  vendorList?: any[]
  tahunAnggarans?: any[]
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState('ringkasan')
  const [openEdit, setOpenEdit] = useState(false)
  const [openDelete, setOpenDelete] = useState(false)
  const [loadingEdit, setLoadingEdit] = useState(false)
  const [loadingDelete, setLoadingDelete] = useState(false)
  const [highlightDriveInput, setHighlightDriveInput] = useState(false)

  const handleOpenEditDriveLink = () => {
    setOpenEdit(true)
    setHighlightDriveInput(true)
    setTimeout(() => {
      const inputEl = document.getElementById("edit-spj-drive-url-input")
      if (inputEl) {
        inputEl.scrollIntoView({ behavior: "smooth", block: "center" })
        inputEl.focus()
      }
    }, 250)

    setTimeout(() => {
      setHighlightDriveInput(false)
    }, 3500)
  }

  // Unsaved changes guard — tab yang aktif mendeklarasikan isDirty-nya lewat ref ini
  const [isDirty, setIsDirty] = useState(false)
  const { showDialog, confirmLeave, confirmLeaveCallback, cancelLeave } = useUnsavedChanges(isDirty)

  // Baca hash saat komponen dimount
  useEffect(() => {
    const hash = window.location.hash.replace('#', '')
    if (hash) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveTab(hash)
    }
  }, [])

  const handleTabChange = async (newTab: string) => {
    if (isDirty) {
      const ok = await confirmLeave()
      if (!ok) return
      setIsDirty(false)
    }
    setActiveTab(newTab)
    window.history.replaceState(null, '', `#${newTab}`)
  }

  // State form edit master
  const [editForm, setEditForm] = useState({
    tanggalSpj: spj.tanggalSpj ? formatWita(spj.tanggalSpj, 'yyyy-MM-dd') : '',
    tanggalPelaksanaan: spj.tanggalPelaksanaan ? formatWita(spj.tanggalPelaksanaan, 'yyyy-MM-dd') : '',
    nomorBku: spj.nomorBku || '',
    perihal: spj.perihal || '',
    driveUrl: spj.metaDokumen?.driveUrl || spj.driveUrl || '',
    terbayar: spj.terbayar || false,
    tempatBerangkat: spj.perjadinDetail?.tempatBerangkat || 'Sendawar',
    tempatTujuan: spj.perjadinDetail?.tempatTujuan || '',
    tglBerangkat: spj.perjadinDetail?.tglBerangkat
      ? formatWita(spj.perjadinDetail.tglBerangkat, 'yyyy-MM-dd')
      : '',
    tglKembali: spj.perjadinDetail?.tglKembali
      ? formatWita(spj.perjadinDetail.tglKembali, 'yyyy-MM-dd')
      : '',
    alatAngkut: spj.perjadinDetail?.alatAngkut || 'Darat',
    kodeRekeningId: spj.kodeRekeningId || '',
    vendorId: spj.maminDetail?.vendorId || ''
  })

  const [localRekeningId, setLocalRekeningId] = useState(spj.kodeRekeningId || '')
  const [localVendorId, setLocalVendorId] = useState(spj.maminDetail?.vendorId || '')

  // Options for Vendor Combobox
  const vendorOptions = useMemo(() => {
    return vendorList.map((v) => ({
      value: v.id,
      label: v.namaVendor,
    }));
  }, [vendorList]);

  // Options for Combobox
  const kodeRekeningOptions = useMemo(() => {
    const options: any[] = []
    tahunAnggarans.forEach((ta) => {
      ta.kegiatan?.forEach((k: any) => {
        k.subKegiatan?.forEach((sk: any) => {
          sk.rekening?.forEach((rek: any) => {
            const sisaFmt = new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              maximumFractionDigits: 0
            }).format(Number(rek.sisaSaldo))
            options.push({
              value: rek.id,
              label: `[${ta.tahun}] ${sk.judulSub} - ${rek.judulRekening} (Sisa: ${sisaFmt})`,
              content: (
                <div className="flex flex-col py-1 gap-1 border-b border-slate-50 last:border-0 w-full overflow-hidden">
                  <div className="flex items-center gap-2">
                    <span className="bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                      TA {ta.tahun}
                    </span>
                    <span className="text-xs font-medium text-slate-500 truncate" title={sk.judulSub}>
                      {sk.judulSub}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-slate-800 whitespace-normal leading-snug">
                    {rek.judulRekening}
                  </div>
                  <div className="text-xs font-bold text-emerald-600 mt-0.5">
                    Sisa Pagu: {sisaFmt}
                  </div>
                </div>
              ),
              sisaSaldo: rek.sisaSaldo,
              tahun: ta.tahun
            })
          })
        })
      })
    })
    const currentYear = new Date().getFullYear().toString()
    options.sort((a, b) => {
      if (a.tahun === currentYear && b.tahun !== currentYear) return -1
      if (b.tahun === currentYear && a.tahun !== currentYear) return 1
      return b.tahun.localeCompare(a.tahun)
    })
    return options
  }, [tahunAnggarans])

  const handleEditChange = (e: any) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value })
  }

  const handleSaveMaster = async () => {
    // TRIGGER TURBOPACK CLIENT RECOMPILE
    setLoadingEdit(true)
    try {
      await updateSpjMasterData(spj.id, {
        ...editForm,
        kodeRekeningId: localRekeningId,
        vendorId: localVendorId
      })
      toast.success('Master Data SPJ berhasil diperbarui.')
      setOpenEdit(false)
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || 'Gagal menyimpan data.')
    } finally {
      setLoadingEdit(false)
    }
  }

  const formatRupiah = (val: bigint) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(
      Number(val)
    )
  }

  const handleDeleteSpj = async () => {
    setLoadingDelete(true)
    try {
      await deleteSpjTransaction(spj.id)
      window.location.href = '/dashboard/spj'
    } catch (error: any) {
      toast.error(error.message || 'Gagal menghapus SPJ.')
      setLoadingDelete(false)
      setOpenDelete(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Notasi Khusus jika Bukti Dukung (Google Drive Link) Belum Diunggah */}
      {!editForm.driveUrl && (
        <div className="bg-amber-50/80 border border-amber-200/90 rounded-lg p-3.5 sm:p-4 text-amber-900 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-4.5 h-4.5" />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-amber-950 flex items-center gap-1.5">
                Bukti Dukung Fisik (Google Drive) Belum Diunggah
              </h4>
              <p className="text-[11px] sm:text-xs text-amber-800/90 mt-0.5 leading-relaxed">
                SPJ ini belum memiliki tautan Google Drive arsip bukti scan dokumen fisik, kuitansi, atau foto pelaksanaan. Silakan tautkan link Drive agar arsip tersimpan rapi.
              </p>
            </div>
          </div>
          <Button
            onClick={handleOpenEditDriveLink}
            size="sm"
            className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shrink-0 shadow-xs self-start sm:self-auto"
          >
            <FolderPlus className="w-3.5 h-3.5 mr-1.5" />
            Tautkan Link Drive
          </Button>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        {/* SCROLLABLE TABS */}
        <div className="border-b overflow-x-auto no-scrollbar mb-6">
          <TabsList className="bg-transparent border-none w-max h-12 p-0 justify-start gap-6">
            <TabsTrigger value="ringkasan">Ringkasan</TabsTrigger>
            {spj.jenisSpj === 'PERJADIN' && (
              <>
                <TabsTrigger value="personel">Personel</TabsTrigger>
                <TabsTrigger value="telaahan">Telaahan</TabsTrigger>
              </>
            )}

            {/* Hanya tampilkan DOPD jika Perjadin */}
            {spj.jenisSpj === 'PERJADIN' && <TabsTrigger value="dopd">DOPD</TabsTrigger>}
            {spj.jenisSpj !== 'PERJADIN' && spj.jenisSpj !== 'HONORARIUM' && (
              <TabsTrigger value="pengeluaran">Pengeluaran</TabsTrigger>
            )}

            {spj.jenisSpj === 'HONORARIUM' && (
              <>
                <TabsTrigger value="daftar-hadir-narasumber">Daftar Hadir Narasumber</TabsTrigger>
                <TabsTrigger value="daftar-tanda-terima">Daftar Tanda Terima</TabsTrigger>
                <TabsTrigger value="notula">Notula</TabsTrigger>
              </>
            )}

            {spj.jenisSpj === 'MAKAN_MINUM' && (
              <>
                <TabsTrigger value="surat-pengantar">SPPB</TabsTrigger>
                <TabsTrigger value="daftar-hadir">Daftar Hadir</TabsTrigger>
                <TabsTrigger value="notula">Notula</TabsTrigger>
                <TabsTrigger value="bapb">BAPB</TabsTrigger>
                <TabsTrigger value="bastb">BASTB</TabsTrigger>
              </>
            )}

            <TabsTrigger value="kuitansi">Kuitansi</TabsTrigger>

            {spj.jenisSpj === 'PERJADIN' && (
              <>
                <TabsTrigger value="surat-tugas">Surat Tugas</TabsTrigger>
                <TabsTrigger value="spd">SPD</TabsTrigger>
                <TabsTrigger value="visum">Visum</TabsTrigger>
                <TabsTrigger value="laporan">Laporan</TabsTrigger>
              </>
            )}
          </TabsList>
        </div>

        {/* TAB RINGKASAN */}
        <TabsContent value="ringkasan" className="space-y-6">

          <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
            <CardHeader className="flex flex-row items-center justify-between pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b">
              <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Master SPJ</CardTitle>
              <div className="flex gap-1.5 sm:gap-2">
                <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                  <DialogTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-[10px] sm:h-9 sm:px-3 sm:text-sm text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive">
                        <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" /> Hapus
                      </Button>
                    }
                  />
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle className="text-red-600 flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" /> Peringatan Kritikal
                      </DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                      <p className="text-sm text-slate-600 mb-4">
                        Apakah Anda yakin ingin menghapus permanen SPJ ini beserta seluruh dokumen, rincian biaya, dan
                        anggotanya?
                      </p>
                      <p className="text-sm text-slate-600 font-medium">
                        Saldo anggaran yang telah terpakai akan otomatis dikembalikan ke Pagu Sub-Kegiatan.
                      </p>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setOpenDelete(false)}>
                        Batal
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteSpj} disabled={loadingDelete}>
                        {loadingDelete ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Trash2 className="w-4 h-4 mr-2" />
                        )}{' '}
                        Ya, Hapus SPJ
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
                <Dialog open={openEdit} onOpenChange={setOpenEdit}>
                  <DialogTrigger
                    render={
                      <Button variant="outline" size="sm" className="h-7 px-2 text-[10px] sm:h-9 sm:px-3 sm:text-sm">
                        <Pencil className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 sm:mr-1.5" /> Edit Master
                      </Button>
                    }
                  />
                  <DialogContent className="sm:max-w-150 max-h-[90vh] overflow-y-auto overflow-x-hidden">
                    <DialogHeader>
                      <DialogTitle>Edit Data Master SPJ</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2 w-full">
                      <Label>Sumber Dana (Kode Rekening)</Label>
                      {/* Grid hack: forcing min-w-0 on the grid item prevents flex children from expanding the layout */}
                      <div className="grid grid-cols-1">
                        <div className="min-w-0">
                          <Combobox 
                            options={kodeRekeningOptions} 
                            value={localRekeningId} 
                            onChange={setLocalRekeningId} 
                            placeholder="Pilih Kode Rekening..."
                          />
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">Mengubah sumber dana akan memotong sisa pagu anggaran rekening baru, dan mengembalikan pagu rekening lama.</p>
                    </div>
                      <div className="space-y-2">
                        <Label>Tanggal SPJ</Label>
                        <Input type="date" name="tanggalSpj" value={editForm.tanggalSpj} onChange={handleEditChange} />
                        <p className="text-xs text-slate-500 mt-1">
                          Tanggal penetapan/dikeluarkannya dokumen SPJ secara keseluruhan.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Nomor BKU</Label>
                        <Input
                          name="nomorBku"
                          value={editForm.nomorBku}
                          onChange={handleEditChange}
                          placeholder="Contoh: 001/BKU/2026"
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Nomor Buku Kas Umum (Opsional jika belum diterbitkan).
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Perihal / Judul Kegiatan</Label>
                        <Input name="perihal" value={editForm.perihal} onChange={handleEditChange} />
                        <p className="text-xs text-slate-500 mt-1">
                          Perihal ini akan muncul otomatis sebagai Maksud/Tujuan di seluruh dokumen.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>Tanggal Pelaksanaan (Opsional)</Label>
                        <Input type="date" name="tanggalPelaksanaan" value={editForm.tanggalPelaksanaan} onChange={handleEditChange} />
                        <p className="text-xs text-slate-500 mt-1">
                          Tanggal spesifik kapan kegiatan ini dilakukan. (Akan tampil di BASTB, dll).
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label htmlFor="edit-spj-drive-url-input">
                            Tautan Bukti Fisik (Google Drive)
                          </Label>
                          <a
                            href="https://drive.google.com/drive/u/3/folders/10N-NmZSzQ8QYYWqwlmgfoqb5EP471snp"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center gap-1 hover:underline"
                          >
                            <ExternalLink className="w-3 h-3" />
                            Folder Google Drive
                          </a>
                        </div>
                        <Input
                          id="edit-spj-drive-url-input"
                          name="driveUrl"
                          placeholder="https://drive.google.com/drive/folders/..."
                          value={editForm.driveUrl}
                          onChange={handleEditChange}
                          className={`transition-colors duration-500 ${highlightDriveInput ? "border-amber-500 focus:border-amber-500 ring-1 ring-amber-500" : ""}`}
                        />
                        <p className="text-xs text-slate-500 mt-1">
                          Link penyimpanan cloud untuk hasil scan kuitansi/nota/tiket.
                        </p>
                      </div>

                      {spj.jenisSpj === 'PERJADIN' && (
                        <>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Asal / Tempat Berangkat</Label>
                              <Input
                                name="tempatBerangkat"
                                value={editForm.tempatBerangkat}
                                onChange={handleEditChange}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tempat Tujuan</Label>
                              <Input name="tempatTujuan" value={editForm.tempatTujuan} onChange={handleEditChange} />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Tanggal Berangkat</Label>
                              <Input
                                type="date"
                                name="tglBerangkat"
                                value={editForm.tglBerangkat}
                                onChange={handleEditChange}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Tanggal Kembali</Label>
                              <Input
                                type="date"
                                name="tglKembali"
                                value={editForm.tglKembali}
                                onChange={handleEditChange}
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label>Alat Angkut</Label>
                            <Input
                              name="alatAngkut"
                              value={editForm.alatAngkut}
                              onChange={handleEditChange}
                              placeholder="Cth: Darat, Udara, Sungai"
                            />
                          </div>
                        </>
                      )}

                      {spj.jenisSpj === 'MAKAN_MINUM' && (
                        <div className="space-y-2 w-full">
                          <Label>Penyedia / Vendor (Pihak Ketiga)</Label>
                          <div className="grid grid-cols-1">
                            <div className="min-w-0">
                              <Combobox 
                                options={vendorOptions} 
                                value={localVendorId} 
                                onChange={setLocalVendorId} 
                                placeholder="Pilih Vendor..."
                              />
                            </div>
                          </div>
                          <p className="text-xs text-slate-500 mt-1">Vendor ini akan bertindak sebagai pihak penerima pembayaran pada Kuitansi SPJ Makan Minum.</p>
                        </div>
                      )}

                      <div className="flex flex-row items-center justify-between rounded-lg border p-4 bg-slate-50">
                        <div className="space-y-0.5">
                          <Label className="text-base">Status Pembayaran</Label>
                          <p className="text-sm text-muted-foreground">
                            Tandai jika SPJ ini sudah lunas dibayarkan ke pegawai / vendor.
                          </p>
                        </div>
                        <Switch
                          checked={editForm.terbayar}
                          onCheckedChange={(val) => setEditForm({ ...editForm, terbayar: val })}
                        />
                      </div>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setOpenEdit(false)}>
                        Batal
                      </Button>
                      <Button
                        onClick={handleSaveMaster}
                        disabled={loadingEdit || !editForm.tanggalSpj || !editForm.perihal}>
                        {loadingEdit ? (
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        ) : (
                          <Save className="w-4 h-4 mr-2" />
                        )}
                        Simpan Perubahan
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="px-4 pb-4 sm:p-6 sm:pt-0">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 text-xs sm:text-sm">
                <div className="col-span-2 md:col-span-4 flex flex-row items-center justify-between border-b border-slate-100 pb-3 sm:pb-4 mb-2 sm:mb-3 gap-4">
                  <p className="text-slate-500 uppercase tracking-widest text-[10px] sm:text-xs font-bold m-0">Status Pembayaran</p>
                  <div>
                    {spj.terbayar ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200 text-[10px] sm:text-xs">
                        <CheckCircle2 className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Sudah Terbayar Lunas
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50 text-[10px] sm:text-xs">
                        <AlertCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" /> Belum Terbayar
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <p className="text-slate-500 uppercase tracking-widest text-[10px] sm:text-xs font-bold">Tanggal SPJ</p>
                  <p className="font-semibold text-slate-900 leading-relaxed">
                    {formatWita(spj.tanggalSpj, 'dd MMMM yyyy')}
                  </p>
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <p className="text-slate-500 uppercase tracking-widest text-[10px] sm:text-xs font-bold">Tanggal Pelaksanaan</p>
                  <p className="font-semibold text-slate-900 leading-relaxed">
                    {spj.tanggalPelaksanaan ? formatWita(spj.tanggalPelaksanaan, 'dd MMMM yyyy') : '-'}
                  </p>
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <p className="text-slate-500 uppercase tracking-widest text-[10px] sm:text-xs font-bold">Nomor BKU</p>
                  <p className="font-semibold text-slate-900 leading-relaxed">{spj.nomorBku || '-'}</p>
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <p className="text-slate-500 uppercase tracking-widest text-[10px] sm:text-xs font-bold">Link Drive (Bukti Dukung)</p>
                  <p className="font-semibold text-blue-600 truncate leading-relaxed">
                    {editForm.driveUrl ? (
                      <a href={editForm.driveUrl} target="_blank" rel="noreferrer" className="hover:underline inline-flex items-center gap-1">
                        <ExternalLink className="w-3.5 h-3.5" />
                        {editForm.driveUrl}
                      </a>
                    ) : (
                      <span className="text-slate-400 font-normal italic">Belum diunggah</span>
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
            <CardHeader className="pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b mb-3 sm:mb-5">
              <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Informasi Anggaran</CardTitle>
            </CardHeader>
            <CardContent className="px-3 pb-3 sm:p-6 sm:pt-0">
              <div className="grid grid-cols-2 gap-3 sm:gap-5 text-[10px] sm:text-sm">
                <div className="space-y-1 sm:space-y-1.5">
                  <p className="text-slate-500 uppercase tracking-widest font-bold">Tahun Anggaran</p>
                  <p className="font-semibold sm:font-medium text-slate-900 leading-relaxed">{spj.kodeRekening?.subKegiatan?.kegiatan?.tahunAnggaran?.tahun}</p>
                </div>
                <div className="space-y-1 sm:space-y-1.5">
                  <p className="text-slate-500 uppercase tracking-widest font-bold">Kegiatan</p>
                  <p className="font-semibold sm:font-medium text-slate-900 leading-relaxed">{spj.kodeRekening?.subKegiatan?.kegiatan?.judulKegiatan}</p>
                </div>
                <div className="col-span-2 space-y-1 sm:space-y-1.5">
                  <p className="text-slate-500 uppercase tracking-widest font-bold">Sub-Kegiatan</p>
                  <p className="font-semibold sm:font-medium text-slate-900 leading-relaxed">{spj.kodeRekening?.subKegiatan?.judulSub}</p>
                </div>
                <div className="col-span-2 space-y-1 sm:space-y-1.5">
                  <p className="text-slate-500 uppercase tracking-widest font-bold">Kode Rekening</p>
                  <p className="font-semibold sm:font-medium text-slate-900 leading-relaxed">{spj.kodeRekening?.judulRekening}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {spj.jenisSpj === 'MAKAN_MINUM' && spj.maminDetail && (
            <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
              <CardHeader className="pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b mb-3 sm:mb-5">
                <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Informasi Penyedia (Pihak Ketiga)</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 sm:p-6 sm:pt-0">
                <div className="grid grid-cols-2 gap-3 sm:gap-5 text-[10px] sm:text-sm">
                  <div className="space-y-1 sm:space-y-1.5">
                    <p className="text-slate-500 uppercase tracking-widest font-bold">Nama Badan Usaha / Vendor</p>
                    <p className="font-semibold sm:font-medium text-slate-900 leading-relaxed">{spj.maminDetail.vendor?.namaVendor || "-"}</p>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <p className="text-slate-500 uppercase tracking-widest font-bold">Nama Pemilik / Direktur</p>
                    <p className="font-semibold sm:font-medium text-slate-900 leading-relaxed">{spj.maminDetail.vendor?.namaPemilik || "-"}</p>
                  </div>
                  <div className="col-span-2 space-y-1 sm:space-y-1.5">
                    <p className="text-slate-500 uppercase tracking-widest font-bold">Alamat Usaha</p>
                    <p className="font-semibold sm:font-medium text-slate-900 leading-relaxed">{spj.maminDetail.vendor?.alamat || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {spj.jenisSpj === 'PERJADIN' && spj.perjadinDetail && (
            <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
              <CardHeader className="pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b mb-3 sm:mb-5">
                <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Rute Perjalanan Dinas</CardTitle>
              </CardHeader>
              <CardContent className="px-3 pb-3 sm:p-6 sm:pt-0">
                <div className="grid grid-cols-2 gap-3 sm:gap-5 text-[10px] sm:text-sm">
                  <div className="space-y-1 sm:space-y-1.5">
                    <p className="text-slate-500 uppercase tracking-widest font-bold">Tempat Berangkat</p>
                    <p className="font-semibold sm:font-medium text-slate-900 leading-relaxed">{spj.perjadinDetail.tempatBerangkat}</p>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <p className="text-slate-500 uppercase tracking-widest font-bold">Tempat Tujuan</p>
                    <p className="font-semibold sm:font-medium text-slate-900 leading-relaxed">{spj.perjadinDetail.tempatTujuan}</p>
                  </div>
                  <div className="col-span-2 sm:col-span-1 space-y-1 sm:space-y-1.5">
                    <p className="text-slate-500 uppercase tracking-widest font-bold">Tanggal Perjalanan</p>
                    <p className="font-semibold sm:font-medium text-slate-900 leading-relaxed">
                      {fmtDateId(spj.perjadinDetail.tglBerangkat)} s.d.{' '}
                      {fmtDateId(spj.perjadinDetail.tglKembali)}
                    </p>
                  </div>
                  <div className="space-y-1 sm:space-y-1.5">
                    <p className="text-slate-500 uppercase tracking-widest font-bold">Lama Perjalanan</p>
                    <p className="font-semibold sm:font-medium text-slate-900 leading-relaxed">{spj.perjadinDetail.lamaPerjalanan} Hari</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* TAB PERSONEL & TELAAHAN (KHUSUS PERJADIN) */}
        {spj.jenisSpj === 'PERJADIN' && (
          <>
            <TabsContent value="personel">
              <PersonelTab spj={spj} pegawaiList={pegawaiList} />
            </TabsContent>
            <TabsContent value="telaahan">
              <TelaahanTab spj={spj} pegawaiList={pegawaiList} onDirtyChange={setIsDirty} />
            </TabsContent>
          </>
        )}

        {/* TAB DOPD (KHUSUS PERJADIN) */}
        {spj.jenisSpj === 'PERJADIN' && (
          <TabsContent value="dopd">
            <DopdTab spj={spj} pegawaiList={pegawaiList} onDirtyChange={setIsDirty} />
          </TabsContent>
        )}

        {/* TAB PENGELUARAN (KHUSUS NON-PERJADIN) */}
        {spj.jenisSpj !== 'PERJADIN' && spj.jenisSpj !== 'HONORARIUM' && (
          <TabsContent value="pengeluaran" className="mt-6">
            <PengeluaranTab spj={spj} onDirtyChange={setIsDirty} />
          </TabsContent>
        )}

        {spj.jenisSpj === 'MAKAN_MINUM' && (
          <TabsContent value="surat-pengantar">
            <SuratPengantarTab spj={spj} pegawaiList={pegawaiList} />
          </TabsContent>
        )}
        
        {spj.jenisSpj === 'MAKAN_MINUM' && (
          <TabsContent value="daftar-hadir">
            <DaftarHadirTab spj={spj} />
          </TabsContent>
        )}

        {spj.jenisSpj === 'MAKAN_MINUM' && (
          <TabsContent value="bapb">
            <BapbTab spj={spj} pegawaiList={pegawaiList} />
          </TabsContent>
        )}

        {spj.jenisSpj === 'HONORARIUM' && (
          <>
            <TabsContent value="daftar-hadir-narasumber">
              <DaftarHadirNarasumberTab spj={spj} pegawaiList={pegawaiList} />
            </TabsContent>
            <TabsContent value="daftar-tanda-terima">
              <DaftarTandaTerimaTab spj={spj} pegawaiList={pegawaiList} />
            </TabsContent>
          </>
        )}

        {(spj.jenisSpj === 'MAKAN_MINUM' || spj.jenisSpj === 'HONORARIUM') && (
          <TabsContent value="notula">
            <NotulaTab spj={spj} pegawaiList={pegawaiList} onDirtyChange={setIsDirty} />
          </TabsContent>
        )}

        {spj.jenisSpj === 'MAKAN_MINUM' && (
          <TabsContent value="bastb">
            <BastbTab spj={spj} pegawaiList={pegawaiList} />
          </TabsContent>
        )}

        <TabsContent value="kuitansi">
          <KuitansiTab spj={spj} pegawaiList={pegawaiList} onDirtyChange={setIsDirty} />
        </TabsContent>

        <TabsContent value="surat-tugas">
          <SuratTugasTab spj={spj} pegawaiList={pegawaiList} />
        </TabsContent>

        {spj.jenisSpj === 'PERJADIN' && (
          <>
            <TabsContent value="spd">
              <SpdTab spj={spj} pegawaiList={pegawaiList} />
            </TabsContent>
            <TabsContent value="visum">
              <VisumTab spj={spj} pegawaiList={pegawaiList} />
            </TabsContent>
            <TabsContent value="laporan">
              <LaporanTab spj={spj} pegawaiList={pegawaiList} onDirtyChange={setIsDirty} />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  )
}
