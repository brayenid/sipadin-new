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
import { Pencil, Loader2, Save, CheckCircle2, AlertCircle, Trash2, FileText } from 'lucide-react'
import { updateSpjMasterData, deleteSpjTransaction } from '@/app/actions/spj'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { useUnsavedChanges } from '@/hooks/use-unsaved-changes'
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog'
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
      <UnsavedChangesDialog open={showDialog} onConfirm={confirmLeaveCallback} onCancel={cancelLeave} />
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

            {/* Hanya tampilkan DOPD jika Perjadin atau Honorarium */}
            {(spj.jenisSpj === 'PERJADIN' || spj.jenisSpj === 'HONORARIUM') && <TabsTrigger value="dopd">DOPD</TabsTrigger>}
            {spj.jenisSpj !== 'PERJADIN' && spj.jenisSpj !== 'HONORARIUM' && (
              <TabsTrigger value="pengeluaran">Pengeluaran</TabsTrigger>
            )}

            {spj.jenisSpj === 'HONORARIUM' && (
              <>
                <TabsTrigger value="daftar-hadir-narasumber">Daftar Hadir Narasumber</TabsTrigger>
                <TabsTrigger value="daftar-tanda-terima">Daftar Tanda Terima</TabsTrigger>
              </>
            )}

            {spj.jenisSpj === 'MAKAN_MINUM' && (
              <>
                <TabsTrigger value="surat-pengantar">SPPB</TabsTrigger>
                <TabsTrigger value="daftar-hadir">Daftar Hadir</TabsTrigger>
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

          <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>Informasi Master SPJ</CardTitle>
              <div className="flex gap-2">
                <Dialog open={openDelete} onOpenChange={setOpenDelete}>
                  <DialogTrigger
                    render={
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive">
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" /> Hapus
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
                      <Button variant="outline" size="sm">
                        <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit Master
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
                        <Label>Tautan Bukti Fisik (Google Drive)</Label>
                        <Input name="driveUrl" value={editForm.driveUrl} onChange={handleEditChange} />
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
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 p-4 rounded-md border">
                <div className="space-y-1 col-span-2 md:col-span-4 flex items-center justify-between border-b pb-3 mb-1">
                  <div>
                    <p className="text-slate-500 uppercase tracking-widest text-xs font-bold mb-1">Status Pembayaran</p>
                    {spj.terbayar ? (
                      <Badge className="bg-emerald-100 text-emerald-800 hover:bg-emerald-100 border-emerald-200">
                        <CheckCircle2 className="w-4 h-4 mr-1" /> Sudah Terbayar Lunas
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-700 border-amber-300 bg-amber-50">
                        <AlertCircle className="w-4 h-4 mr-1" /> Belum Terbayar
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Tanggal SPJ</p>
                  <p className="font-semibold text-slate-900">
                    {formatWita(spj.tanggalSpj, 'dd MMMM yyyy')}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Tanggal Pelaksanaan</p>
                  <p className="font-semibold text-slate-900">
                    {spj.tanggalPelaksanaan ? formatWita(spj.tanggalPelaksanaan, 'dd MMMM yyyy') : '-'}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Nomor BKU</p>
                  <p className="font-semibold text-slate-900">{spj.nomorBku || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-500 uppercase tracking-widest text-xs font-bold">Link Drive</p>
                  <p className="font-semibold text-blue-600 truncate">
                    {spj.metaDokumen?.driveUrl ? (
                      <a href={spj.metaDokumen.driveUrl} target="_blank" rel="noreferrer" className="hover:underline">
                        {spj.metaDokumen.driveUrl}
                      </a>
                    ) : (
                      '-'
                    )}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
            <CardHeader>
              <CardTitle>Informasi Anggaran</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-slate-500">Tahun Anggaran</p>
                  <p className="font-medium">{spj.kodeRekening?.subKegiatan?.kegiatan?.tahunAnggaran?.tahun}</p>
                </div>
                <div>
                  <p className="text-slate-500">Kegiatan</p>
                  <p className="font-medium">{spj.kodeRekening?.subKegiatan?.kegiatan?.judulKegiatan}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-500">Sub-Kegiatan</p>
                  <p className="font-medium">{spj.kodeRekening?.subKegiatan?.judulSub}</p>
                </div>
                <div>
                  <p className="text-slate-500">Kode Rekening</p>
                  <p className="font-medium">{spj.kodeRekening?.judulRekening}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {spj.jenisSpj === 'MAKAN_MINUM' && spj.maminDetail && (
            <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
              <CardHeader>
                <CardTitle>Informasi Penyedia (Pihak Ketiga)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Nama Badan Usaha / Vendor</p>
                    <p className="font-medium text-slate-900">{spj.maminDetail.vendor?.namaVendor || "-"}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Nama Pemilik / Direktur</p>
                    <p className="font-medium text-slate-900">{spj.maminDetail.vendor?.namaPemilik || "-"}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-slate-500">Alamat Usaha</p>
                    <p className="font-medium text-slate-900">{spj.maminDetail.vendor?.alamat || "-"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {spj.jenisSpj === 'PERJADIN' && spj.perjadinDetail && (
            <Card className="bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
              <CardHeader>
                <CardTitle>Rute Perjalanan Dinas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-slate-500">Tempat Berangkat</p>
                    <p className="font-medium">{spj.perjadinDetail.tempatBerangkat}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tempat Tujuan</p>
                    <p className="font-medium">{spj.perjadinDetail.tempatTujuan}</p>
                  </div>
                  <div>
                    <p className="text-slate-500">Tanggal Perjalanan</p>
                    <p className="font-medium">
                      {fmtDateId(spj.perjadinDetail.tglBerangkat)} s.d.{' '}
                      {fmtDateId(spj.perjadinDetail.tglKembali)}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Lama Perjalanan</p>
                    <p className="font-medium">{spj.perjadinDetail.lamaPerjalanan} Hari</p>
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

        {/* TAB DOPD (KHUSUS PERJADIN & HONORARIUM) */}
        {(spj.jenisSpj === 'PERJADIN' || spj.jenisSpj === 'HONORARIUM') && (
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
