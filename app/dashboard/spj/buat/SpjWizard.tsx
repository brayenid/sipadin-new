"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Combobox } from "@/components/ui/combobox";
import { CurrencyInput } from "@/components/ui/currency-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Plus, Loader2, Save, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { createSpjTransaction } from "@/app/actions/spj";

// -- TYPES --
type SpjWizardProps = {
  pegawais: any[];
  vendors: any[];
  tahunAnggarans: any[];
};

export default function SpjWizard({ pegawais, vendors, tahunAnggarans }: SpjWizardProps) {
  const router = useRouter();
  
  // -- STATE: TAB NAV --
  const [activeTab, setActiveTab] = useState("step-1");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // -- STATE: FORM DATA --
  const [jenisSpj, setJenisSpj] = useState("PERJADIN");
  const [tanggalSpj, setTanggalSpj] = useState("");
  const [subKegiatanId, setSubKegiatanId] = useState("");
  const [nomorBku, setNomorBku] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [perihal, setPerihal] = useState("");
  
  // Step 2: Spesifik
  const [perjadin, setPerjadin] = useState({
    tempatBerangkat: "Sendawar",
    tempatTujuan: "",
    tglBerangkat: "",
    tglKembali: "",
    lamaPerjalanan: "",
    alatAngkut: "Darat",
    tingkatPerjadin: "C",
  });

  const [mamin, setMamin] = useState({
    vendorId: "",
    jumlahPeserta: "",
  });

  // Step 3: Rincian Harga
  const [rincian, setRincian] = useState<any[]>([{ id: `temp-${Date.now()}`, uraian: "", hargaSatuan: "0", qty: "1", satuan: "Kali", total: "0" }]);

  // Step 4: Roster (Pegawai)
  const [roster, setRoster] = useState<any[]>([]);

  // -- OPTIONS FORMATTING --
  const subKegiatanOptions = useMemo(() => {
    const options: any[] = [];
    tahunAnggarans.forEach((ta) => {
      ta.kegiatan.forEach((k: any) => {
        k.subKegiatan.forEach((sk: any) => {
          // Format sisa saldo agar user tahu batasan pagu
          const sisaFmt = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(sk.sisaSaldo));
          options.push({
            value: sk.id,
            label: `[${ta.tahun}] ${sk.judulSub} (Sisa: ${sisaFmt})`,
            sisaSaldo: sk.sisaSaldo,
          });
        });
      });
    });
    return options;
  }, [tahunAnggarans]);

  const pegawaiOptions = useMemo(() => {
    return pegawais.map(p => ({ value: p.id, label: p.nama }));
  }, [pegawais]);

  const vendorOptions = useMemo(() => {
    return vendors.map(v => ({ value: v.id, label: v.namaVendor }));
  }, [vendors]);

  // -- COMPUTATIONS --
  const totalPengeluaran = jenisSpj === "PERJADIN" 
    ? BigInt(0) 
    : rincian.reduce((acc, curr) => acc + (BigInt(curr.total || 0)), BigInt(0));
    
  const selectedSubKegiatan = subKegiatanOptions.find(o => o.value === subKegiatanId);
  const isValidSaldo = selectedSubKegiatan ? BigInt(selectedSubKegiatan.sisaSaldo) >= totalPengeluaran : true;

  // -- HANDLERS --
  const addRincian = () => {
    setRincian([...rincian, { id: `temp-${Date.now()}`, uraian: "", hargaSatuan: "0", qty: "1", satuan: "Kali", total: "0" }]);
  };
  const updateRincian = (idx: number, field: string, val: string) => {
    const newR = [...rincian];
    newR[idx][field] = val;
    // Auto hitung total jika hargaSatuan atau qty berubah
    if (field === "hargaSatuan" || field === "qty") {
      const harga = BigInt(newR[idx].hargaSatuan || 0);
      const qty = BigInt(newR[idx].qty || 1);
      newR[idx].total = (harga * qty).toString();
    }
    setRincian(newR);
  };
  const removeRincian = (idx: number) => {
    setRincian(rincian.filter((_, i) => i !== idx));
  };

  const addRoster = () => {
    setRoster([...roster, { id: `temp-${Date.now()}`, pegawaiId: "", role: "PENGIKUT" }]);
  };
  const updateRoster = (idx: number, field: string, val: string) => {
    const newR = [...roster];
    newR[idx][field] = val;
    setRoster(newR);
  };
  const removeRoster = (idx: number) => {
    setRoster(roster.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setErrorMsg("");

    // Siapkan data Roster (Snapshots)
    const processedRoster = roster.filter(r => r.pegawaiId).map(r => {
      const p = pegawais.find(peg => peg.id === r.pegawaiId);
      return {
        pegawaiId: p.id,
        role: r.role,
        nama: p.nama,
        nip: p.nip,
        jabatan: p.jabatan,
        golongan: p.golongan,
        pangkat: p.pangkat,
      };
    });

    try {
      await createSpjTransaction({
        jenisSpj,
        tanggalSpj,
        subKegiatanId,
        nomorBku,
        driveUrl,
        perihal,
        totalPengeluaran: totalPengeluaran.toString(),
        pengeluaranDetails: rincian,
        roster: processedRoster,
        spesifik: jenisSpj === "PERJADIN" ? perjadin : (jenisSpj === "MAKAN_MINUM" ? mamin : null),
      });

      window.location.href = "/dashboard/spj";
    } catch (err: any) {
      setErrorMsg(err.message || "Terjadi kesalahan saat memproses SPJ.");
      setLoading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader className="border-b bg-slate-50/50">
        <CardTitle>Form Wizard SPJ</CardTitle>
      </CardHeader>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {/* TAB LIST DISABLED POINTER EVENTS SO USER MUST USE BUTTONS */}
        <div className="px-6 pt-4">
          <TabsList className={`grid w-full ${jenisSpj === "PERJADIN" ? "grid-cols-3" : "grid-cols-4"} pointer-events-none`}>
            <TabsTrigger value="step-1">1. Info Dasar</TabsTrigger>
            <TabsTrigger value="step-2">2. Detail SPJ</TabsTrigger>
            {jenisSpj !== "PERJADIN" && <TabsTrigger value="step-3">3. Rincian Biaya</TabsTrigger>}
            <TabsTrigger value="step-4">{jenisSpj === "PERJADIN" ? "3. Personil & Final" : "4. Personil & Final"}</TabsTrigger>
          </TabsList>
        </div>

        {/* STEP 1: INFO DASAR */}
        <TabsContent value="step-1" className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Jenis SPJ</Label>
              <select 
                className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm ring-offset-white focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={jenisSpj}
                onChange={(e) => setJenisSpj(e.target.value)}
              >
                <option value="PERJADIN">Perjalanan Dinas (Perjadin)</option>
                <option value="MAKAN_MINUM">Makan & Minum Rapat</option>
                <option value="HONORARIUM">Honorarium</option>
                <option value="OPERASIONAL">Operasional Kantor</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <Label>Sumber Dana (Sub-Kegiatan) <span className="text-red-500">*</span></Label>
              <Combobox 
                options={subKegiatanOptions} 
                value={subKegiatanId} 
                onChange={setSubKegiatanId} 
                placeholder="Pilih Sub-Kegiatan..."
              />
            </div>

            <div className="space-y-2">
              <Label>Tanggal SPJ <span className="text-red-500">*</span></Label>
              <Input type="date" value={tanggalSpj} onChange={(e) => setTanggalSpj(e.target.value)} />
            </div>

            <div className="space-y-2">
              <Label>Nomor BKU (Opsional)</Label>
              <Input placeholder="001/BKU/2026" value={nomorBku} onChange={(e) => setNomorBku(e.target.value)} />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Perihal / Maksud Kegiatan <span className="text-red-500">*</span></Label>
              <Input placeholder="Contoh: Perjalanan Dinas dalam rangka Koordinasi Anggaran ke Provinsi..." value={perihal} onChange={(e) => setPerihal(e.target.value)} className="font-semibold" />
              <p className="text-xs text-slate-500">Perihal ini akan digunakan secara otomatis pada dokumen Surat Tugas, Telaahan, dll.</p>
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label>Tautan Dokumen Fisik (Google Drive)</Label>
              <Input placeholder="https://drive.google.com/..." value={driveUrl} onChange={(e) => setDriveUrl(e.target.value)} />
              <p className="text-xs text-slate-500">Tempelkan tautan folder / file Google Drive yang berisi bukti kuitansi (hanya tautan saja).</p>
            </div>
          </div>
          
          <div className="flex justify-end pt-4">
            <Button onClick={() => setActiveTab("step-2")} disabled={!subKegiatanId || !tanggalSpj || !perihal}>
              Selanjutnya <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </TabsContent>

        {/* STEP 2: DETAIL SPESIFIK */}
        <TabsContent value="step-2" className="p-6 space-y-6">
          
          {jenisSpj === "PERJADIN" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label>Tempat Berangkat</Label>
                <Input value={perjadin.tempatBerangkat} onChange={(e) => setPerjadin({...perjadin, tempatBerangkat: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tempat Tujuan</Label>
                <Input value={perjadin.tempatTujuan} onChange={(e) => setPerjadin({...perjadin, tempatTujuan: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Berangkat</Label>
                <Input type="date" value={perjadin.tglBerangkat} onChange={(e) => setPerjadin({...perjadin, tglBerangkat: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Tanggal Kembali</Label>
                <Input type="date" value={perjadin.tglKembali} onChange={(e) => setPerjadin({...perjadin, tglKembali: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Lama Perjalanan (Hari)</Label>
                <Input type="number" value={perjadin.lamaPerjalanan} onChange={(e) => setPerjadin({...perjadin, lamaPerjalanan: e.target.value})} />
              </div>
              <div className="space-y-2">
                <Label>Alat Angkut</Label>
                <Input value={perjadin.alatAngkut} onChange={(e) => setPerjadin({...perjadin, alatAngkut: e.target.value})} />
              </div>
            </div>
          )}

          {jenisSpj === "MAKAN_MINUM" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start bg-slate-50 border border-slate-200 p-8 rounded-xl shadow-sm">
              <div className="space-y-3">
                <Label className="text-base font-semibold text-slate-900">Pilih Vendor / Katering</Label>
                <Combobox 
                  options={vendorOptions} 
                  value={mamin.vendorId} 
                  onChange={(v) => setMamin({...mamin, vendorId: v})} 
                  placeholder="Cari Vendor..."
                />
                <p className="text-xs text-slate-500">Pilih penyedia makan/minum dari daftar master data.</p>
              </div>
              <div className="space-y-3">
                <Label className="text-base font-semibold text-slate-900">Jumlah Peserta</Label>
                <Input type="number" min="1" value={mamin.jumlahPeserta} onChange={(e) => setMamin({...mamin, jumlahPeserta: e.target.value})} placeholder="Contoh: 50" className="bg-white" />
                <p className="text-xs text-slate-500">Estimasi kuantitas porsi konsumsi yang disediakan.</p>
              </div>
            </div>
          )}

          {["HONORARIUM", "OPERASIONAL"].includes(jenisSpj) && (
            <div className="py-12 text-center text-slate-500">
              <p>Tidak ada detail khusus yang diperlukan untuk jenis SPJ ini.</p>
              <p>Silakan lanjut ke langkah pengisian Rincian Biaya.</p>
            </div>
          )}

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setActiveTab("step-1")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
            <Button 
              onClick={() => setActiveTab(jenisSpj === "PERJADIN" ? "step-4" : "step-3")}
              disabled={
                (jenisSpj === "PERJADIN" && (!perjadin.tempatBerangkat || !perjadin.tempatTujuan || !perjadin.tglBerangkat || !perjadin.tglKembali || !perjadin.lamaPerjalanan)) ||
                (jenisSpj === "MAKAN_MINUM" && (!mamin.vendorId || !mamin.jumlahPeserta))
              }
            >
              Selanjutnya <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </TabsContent>

        {/* STEP 3: RINCIAN PENGELUARAN */}
        <TabsContent value="step-3" className="p-6 space-y-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium">Rincian Pengeluaran</h3>
              <p className="text-sm text-slate-500">Masukkan detail kuitansi belanja.</p>
            </div>
            <Button size="sm" onClick={addRincian} variant="secondary"><Plus className="w-4 h-4 mr-2"/> Tambah Item</Button>
          </div>

          <div className="border rounded-md overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-[300px]">Uraian</TableHead>
                  <TableHead className="w-[200px]">Harga Satuan</TableHead>
                  <TableHead className="w-[100px]">Qty</TableHead>
                  <TableHead className="w-[120px]">Satuan</TableHead>
                  <TableHead className="w-[200px]">Total</TableHead>
                  <TableHead className="w-[60px] text-center">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rincian.map((item, idx) => (
                  <TableRow key={item.id}>
                    <TableCell className="p-2">
                      <Input value={item.uraian} onChange={(e) => updateRincian(idx, "uraian", e.target.value)} placeholder="Tiket pesawat / Nasi Kotak..." />
                    </TableCell>
                    <TableCell className="p-2">
                      <CurrencyInput value={item.hargaSatuan} onChange={(v) => updateRincian(idx, "hargaSatuan", v)} />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input type="number" min="1" value={item.qty} onChange={(e) => updateRincian(idx, "qty", e.target.value)} />
                    </TableCell>
                    <TableCell className="p-2">
                      <Input value={item.satuan} onChange={(e) => updateRincian(idx, "satuan", e.target.value)} placeholder="Ekor, Dus, dll" />
                    </TableCell>
                    <TableCell className="p-2">
                      <CurrencyInput value={item.total} onChange={(v) => updateRincian(idx, "total", v)} disabled className="bg-slate-50 text-slate-500 font-bold" />
                    </TableCell>
                    <TableCell className="p-2 text-center">
                      <Button variant="ghost" size="icon" onClick={() => removeRincian(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          
          <div className="flex flex-col items-end gap-1 pt-4 border-t border-slate-100">
            <span className="text-sm text-slate-500 font-medium">Grand Total</span>
            <span className={`text-2xl font-bold ${!isValidSaldo ? 'text-red-600' : 'text-slate-900'}`}>
              Rp {new Intl.NumberFormat("id-ID").format(Number(totalPengeluaran))}
            </span>
            {!isValidSaldo && (
              <span className="text-xs text-red-600 font-medium bg-red-50 px-2 py-1 rounded">
                Peringatan: Total pengeluaran melebihi sisa saldo pagu anggaran!
              </span>
            )}
          </div>

          <div className="flex justify-between pt-4">
            <Button variant="outline" onClick={() => setActiveTab("step-2")}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
            <Button onClick={() => setActiveTab("step-4")}>
              Selanjutnya <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </TabsContent>

        {/* STEP 4: ROSTER & FINAL */}
        <TabsContent value="step-4" className="p-6 space-y-6">
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-medium">Personil Terlibat (Opsional)</h3>
              <p className="text-sm text-slate-500">Pilih pegawai yang melakukan perjalanan atau menerima honor.</p>
            </div>
            <Button size="sm" onClick={addRoster} variant="secondary"><Plus className="w-4 h-4 mr-2"/> Tambah Personil</Button>
          </div>

          <div className="space-y-3">
            {roster.map((item, idx) => (
              <div key={item.id} className="flex gap-4 items-center bg-slate-50 p-4 rounded-md border border-slate-100">
                <div className="flex-1 space-y-2">
                  <Label>Nama Pegawai</Label>
                  <Combobox 
                    options={pegawaiOptions} 
                    value={item.pegawaiId} 
                    onChange={(v) => updateRoster(idx, "pegawaiId", v)}
                    className="bg-white"
                  />
                </div>
                <div className="w-48 space-y-2">
                  <Label>Peran</Label>
                  <select 
                    className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-950"
                    value={item.role}
                    onChange={(e) => updateRoster(idx, "role", e.target.value)}
                  >
                    <option value="PENGIKUT">Pengikut</option>
                    <option value="KEPALA_JALAN">Kepala Jalan</option>
                  </select>
                </div>
                <div className="pt-6">
                  <Button variant="ghost" size="icon" onClick={() => removeRoster(idx)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
            {roster.length === 0 && (
              <div className="text-center py-6 text-slate-500 border border-dashed rounded-md bg-slate-50">
                Belum ada personil yang ditambahkan.
              </div>
            )}
          </div>

          {errorMsg && (
            <div className="p-4 bg-red-50 text-red-700 rounded-md text-sm border border-red-200">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-between pt-8 border-t">
            <Button variant="outline" onClick={() => setActiveTab(jenisSpj === "PERJADIN" ? "step-2" : "step-3")} disabled={loading}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
            </Button>
            <Button onClick={handleSubmit} disabled={loading || !isValidSaldo || !subKegiatanId || !tanggalSpj} className="bg-primary text-white">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-2" />} 
              Simpan & Rekam SPJ
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </Card>
  );
}
