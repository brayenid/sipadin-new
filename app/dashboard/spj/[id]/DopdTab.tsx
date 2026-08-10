"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, Loader2, FileText, Edit, Copy, ChevronDown } from "lucide-react";
import { saveDopdTransaction, saveDopdHonorarium } from "@/app/actions/dopd";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import PdfPreviewModal from "@/components/pdf/PdfPreviewModal";
import { PresetDialog } from "@/components/ui/preset-dialog";
import DopdPdf from "@/pdf/templates/DopdPdf";
import { Combobox } from "@/components/ui/combobox";
import dopdPresets from "@/lib/presets/dopd.json";
import { toast } from "sonner";

export default function DopdTab({ spj, pegawaiList = [], onDirtyChange }: { spj: any; pegawaiList?: any[]; onDirtyChange?: (dirty: boolean) => void }) {
  const router = useRouter();
  
  // -- STATE --
  const [activePersonIdx, setActivePersonIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const navigatorRef = useRef<HTMLDivElement>(null);

  const isHonor = spj.jenisSpj === 'HONORARIUM';
  const sourceMeta = isHonor ? spj.metaDokumen?.dopdHonorarium : spj.metaDokumen?.dopd;

  const [dopdMeta, setDopdMeta] = useState({
    kpaId: sourceMeta?.kpaId || "",
    bppId: sourceMeta?.bppId || "",
    kotaTandaTangan: sourceMeta?.kotaTandaTangan || "Sendawar",
    pejabatMemberiPerintahLabel: sourceMeta?.pejabatMemberiPerintahLabel || "Sekretaris Daerah Kabupaten Kutai Barat",
  });

  const rosterList = useMemo(() => {
    if (isHonor) {
       return (spj.metaDokumen?.daftarHadirNarasumber?.narasumber || []).map((n: any, idx: number) => ({
          id: n.id || `narsum-${idx}`, // Ensure there's an ID
          nama: n.nama,
          jabatan: n.jabatan,
          instansi: n.instansi,
          role: "PENGIKUT", // Fallback for ui
          nip: null
       }));
    }
    return spj.roster || [];
  }, [spj, isHonor]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in an input
      const tag = (e.target as HTMLElement).tagName;
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(tag)) {
        return;
      }

      if (e.key === "ArrowLeft") {
        setActivePersonIdx((prev) => Math.max(0, prev - 1));
      } else if (e.key === "ArrowRight") {
        setActivePersonIdx((prev) => Math.min((rosterList.length || 1) - 1, prev + 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [rosterList.length]);

  // Auto-focus navigator on mount so arrow keys work immediately
  useEffect(() => {
    navigatorRef.current?.focus();
  }, []);

  const pegawaiOptions = useMemo(() => {
    return pegawaiList.map((p) => ({
      value: p.id,
      label: p.nama,
    }));
  }, [pegawaiList]);
  
  // Initialize local items from database
  const initialItems = useMemo(() => {
    if (isHonor) {
       return spj.metaDokumen?.dopdHonorarium?.items || [];
    }
    const items: any[] = [];
    rosterList.forEach((r: any) => {
      if (r.pengeluaranDetails && r.pengeluaranDetails.length > 0) {
        r.pengeluaranDetails.forEach((d: any) => {
          items.push({
            id: d.id, // could be uuid from db or temp
            spjRosterItemId: d.spjRosterItemId,
            kategori: d.kategori || "Biaya Lainnya",
            uraian: d.uraian,
            hargaSatuan: d.hargaSatuan.toString(),
            faktorPengali: d.faktorPengali || [{ label: "kali", value: 1 }],
          });
        });
      }
    });
    return items;
  }, [spj, isHonor, rosterList]);

  const [dopdItems, setDopdItems] = useState<any[]>(initialItems);

  const updateDopdItems = (items: any[]) => {
    setDopdItems(items);
    onDirtyChange?.(true);
  };

  // Dialog Add/Edit State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [newItem, setNewItem] = useState({
    kategori: "Uang Harian",
    uraian: "",
    hargaSatuan: "0",
    faktorPengali: [{ label: "org", value: 1 }, { label: "hari", value: 1 }]
  });

  // Duplicate from person state
  const [duplicateFromIdx, setDuplicateFromIdx] = useState<number | null>(null);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [showDuplicateDropdown, setShowDuplicateDropdown] = useState(false);

  // -- COMPUTATIONS --
  const activePerson = rosterList[activePersonIdx];
  const activePersonItems = dopdItems.filter(item => item.spjRosterItemId === activePerson?.id);
  
  const calculateItemTotal = (item: any) => {
    const harga = BigInt(item.hargaSatuan || 0);
    let multi = 1;
    item.faktorPengali.forEach((f: any) => { multi *= (parseInt(f.value) || 1) });
    return harga * BigInt(multi);
  };

  const activePersonSubtotal = activePersonItems.reduce((acc, curr) => acc + calculateItemTotal(curr), BigInt(0));

  const totalDopdAll = dopdItems.reduce((acc, curr) => acc + calculateItemTotal(curr), BigInt(0));
  
  const formatRupiah = (val: bigint) => {
    return new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(val));
  };

  // -- HANDLERS --
  const handleSaveDopd = async () => {
    setLoading(true);
    setErrorMsg("");
    
    // Prepare payload
    const payload = dopdItems.map(item => ({
      id: item.id,
      spjRosterItemId: item.spjRosterItemId,
      kategori: item.kategori,
      uraian: item.uraian,
      hargaSatuan: item.hargaSatuan.toString(),
      faktorPengali: item.faktorPengali,
    }));

    try {
      if (isHonor) {
        await saveDopdHonorarium(spj.id, payload, dopdMeta);
      } else {
        await saveDopdTransaction(spj.id, payload, dopdMeta);
      }
      onDirtyChange?.(false);
      router.refresh();
      toast.success("Rincian DOPD berhasil disimpan.");
    } catch (err: any) {
      toast.error(err.message || "Gagal menyimpan DOPD.");
      setErrorMsg(err.message || "Gagal menyimpan DOPD.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveItem = () => {
    if (editingItem) {
      updateDopdItems(dopdItems.map(i => i.id === editingItem ? { ...i, ...newItem } : i));
    } else {
      updateDopdItems([...dopdItems, {
        id: `temp-${Date.now()}`,
        spjRosterItemId: activePerson.id,
        ...newItem,
      }]);
    }
    setIsDialogOpen(false);
    // Reset form
    setEditingItem(null);
    setNewItem({
      kategori: "Uang Harian",
      uraian: "",
      hargaSatuan: "0",
      faktorPengali: [{ label: "org", value: 1 }, { label: "hari", value: 1 }]
    });
  };

  const handleDeleteItem = (id: string) => {
    updateDopdItems(dopdItems.filter(i => i.id !== id));
  };

  // Personel lain yang sudah memiliki item DOPD (bukan personel aktif)
  const otherPersonsWithItems = useMemo(() => {
    return rosterList
      .map((r: any, idx: number) => ({ ...r, idx }))
      .filter((r: any) => r.idx !== activePersonIdx && dopdItems.some(i => i.spjRosterItemId === r.id));
  }, [rosterList, activePersonIdx, dopdItems]);

  const handleConfirmDuplicate = () => {
    if (duplicateFromIdx === null) return;
    const sourcePersonId = rosterList[duplicateFromIdx]?.id;
    const sourceItems = dopdItems.filter(i => i.spjRosterItemId === sourcePersonId);
    // Hapus item aktif personel ini dulu, lalu masukkan salinan dari sumber
    const otherItems = dopdItems.filter(i => i.spjRosterItemId !== activePerson.id);
    const duplicated = sourceItems.map(i => ({
      ...i,
      id: `temp-dup-${Date.now()}-${Math.random()}`,
      spjRosterItemId: activePerson.id,
    }));
    updateDopdItems([...otherItems, ...duplicated]);
    setShowDuplicateConfirm(false);
    setDuplicateFromIdx(null);
    toast.success(`Rincian biaya dari ${rosterList[duplicateFromIdx]?.nama} berhasil diduplikasi.`);
  };

  // -- RENDER --
  if (!activePerson) return <div>Data Personel Kosong.</div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER DOPD */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-3 sm:gap-4 p-3 sm:p-4 bg-white border border-slate-200/60 rounded-lg shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <div className="text-center md:text-left w-full md:w-auto">
          <p className="text-slate-500 text-[10px] sm:text-xs font-semibold uppercase tracking-wider">Total Pengeluaran</p>
          <p className="text-base sm:text-lg font-black text-slate-900 mt-0.5">{formatRupiah(totalDopdAll)}</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Button variant="outline" className="flex-1 md:flex-none h-8 px-2 text-[10px] sm:h-9 sm:px-4 sm:text-sm" onClick={() => setShowPreview(true)}>
            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />
            Preview
          </Button>
          <Button className="flex-1 md:flex-none h-8 px-2 text-[10px] sm:h-9 sm:px-4 sm:text-sm" onClick={handleSaveDopd} disabled={loading}>
            {loading ? <Loader2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2 animate-spin" /> : <Save className="w-3.5 h-3.5 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" />}
            Simpan
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {errorMsg}
        </div>
      )}

      {/* PERSONEL NAVIGATOR */}
      <Card ref={navigatorRef} tabIndex={-1} className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)] outline-none focus:ring-2 focus:ring-indigo-200 focus:ring-offset-1">
        <CardHeader className="py-2.5 sm:py-4 bg-slate-50/30 border-b flex flex-row items-center justify-between">
          <div className="flex items-center gap-2 sm:gap-4 w-full">
            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0"
              onClick={() => setActivePersonIdx(Math.max(0, activePersonIdx - 1))}
              disabled={activePersonIdx === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 text-center min-w-0">
              <p className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-widest">Personel {activePersonIdx + 1} / {rosterList.length}</p>
              <h3 className="font-extrabold text-sm sm:text-lg text-slate-900 leading-tight truncate px-1">{activePerson.nama}</h3>
              <p className="text-[10px] sm:text-sm text-slate-500 truncate">{activePerson.role === "KEPALA_JALAN" ? "Kepala Jalan" : "Pengikut"} - {activePerson.jabatan}</p>
              <p className="text-[9px] text-slate-400 mt-1 hidden sm:block">Gunakan tombol ← → di keyboard untuk berpindah personel</p>
            </div>

            <Button 
              variant="outline" 
              size="icon" 
              className="h-7 w-7 sm:h-9 sm:w-9 flex-shrink-0"
              onClick={() => setActivePersonIdx(Math.min(rosterList.length - 1, activePersonIdx + 1))}
              disabled={activePersonIdx === rosterList.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-3 sm:p-6 border-b">
            <div>
              <p className="text-[10px] sm:text-sm text-slate-500">Subtotal Personel Ini</p>
              <p className="font-extrabold text-sm sm:text-lg text-slate-900 mt-0.5 leading-none">{formatRupiah(activePersonSubtotal)}</p>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Dropdown Duplikasi dari Personel Lain */}
              {otherPersonsWithItems.length > 0 && (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-[10px] sm:h-9 sm:px-3 sm:text-sm text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                    onClick={() => setShowDuplicateDropdown(v => !v)}
                  >
                    <Copy className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                    <span className="hidden sm:inline">Duplikasi dari</span>
                    <ChevronDown className={`w-3 h-3 ml-1 transition-transform ${showDuplicateDropdown ? 'rotate-180' : ''}`} />
                  </Button>
                  {showDuplicateDropdown && (
                    <>
                      {/* Overlay to close dropdown when clicking outside */}
                      <div className="fixed inset-0 z-[9]" onClick={() => setShowDuplicateDropdown(false)} />
                      <div className="absolute right-0 top-full mt-1 z-10 flex flex-col bg-white border border-slate-200 rounded-lg shadow-lg min-w-[180px] py-1">
                        {otherPersonsWithItems.map((person: any) => {
                          const count = dopdItems.filter(i => i.spjRosterItemId === person.id).length;
                          return (
                            <button
                              key={person.idx}
                              className="flex flex-col px-3 py-2 text-left hover:bg-slate-50 transition-colors"
                              onClick={() => {
                                setDuplicateFromIdx(person.idx);
                                setShowDuplicateConfirm(true);
                                setShowDuplicateDropdown(false);
                              }}
                            >
                              <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px]">{person.nama}</span>
                              <span className="text-[10px] text-slate-400">{count} item biaya</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              )}

              <Button variant="outline" size={"sm"} className="h-7 px-2 text-[10px] sm:h-9 sm:px-3 sm:text-sm" onClick={() => {
                setEditingItem(null);
                setNewItem({
                  kategori: "Uang Harian",
                  uraian: "",
                  hargaSatuan: "0",
                  faktorPengali: [{ label: "org", value: 1 }, { label: "hari", value: 1 }]
                });
                setIsDialogOpen(true);
              }}>
                <Plus className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /> Tambah Biaya
              </Button>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>{editingItem ? "Edit Rincian Biaya" : "Tambah Rincian Biaya"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Kategori Biaya</Label>
                    <CreatableCombobox 
                      value={newItem.kategori}
                      onChange={(v) => setNewItem({...newItem, kategori: v})}
                      options={[
                        { value: "Uang Harian", label: "Uang Harian" },
                        { value: "Uang Transport", label: "Uang Transport" },
                        { value: "Biaya Penginapan", label: "Biaya Penginapan" },
                        { value: "Biaya Lainnya", label: "Biaya Lainnya" },
                      ]}
                      placeholder="Pilih atau ketik kategori..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Harga Satuan (Rp)</Label>
                    <CurrencyInput 
                      value={newItem.hargaSatuan} 
                      onChange={(v) => setNewItem({...newItem, hargaSatuan: v})} 
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Uraian Detail</Label>
                      <PresetDialog 
                        title="Template Uraian" 
                        options={dopdPresets.uraian} 
                        onSelect={(text) => {
                          const asal = spj.perjadinDetail?.tempatBerangkat || "Sendawar";
                          const tujuan = spj.perjadinDetail?.tempatTujuan || "Samarinda";
                          const parsedText = text.replace("[ASAL]", asal).replace("[TUJUAN]", tujuan);
                          setNewItem({...newItem, uraian: parsedText});
                        }} 
                      />
                    </div>
                    <Input 
                      placeholder="Cth: Transportasi Darat Berangkat - Pulang" 
                      value={newItem.uraian}
                      onChange={(e) => setNewItem({...newItem, uraian: e.target.value})}
                    />
                  </div>
                  
                  <Separator className="my-2" />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Faktor Pengali</Label>
                      <Button variant="ghost" size="sm" onClick={() => setNewItem({...newItem, faktorPengali: [...newItem.faktorPengali, { label: "x", value: 1 }]})}>
                        <Plus className="w-3 h-3 mr-1" /> Tambah Faktor
                      </Button>
                    </div>
                    
                    <div className="space-y-2">
                      {newItem.faktorPengali.map((f, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <Input 
                            type="number" 
                            className="w-20" 
                            value={f.value} 
                            min="0"
                            onChange={(e) => {
                              const newF = [...newItem.faktorPengali];
                              newF[idx].value = Math.max(0, parseInt(e.target.value) || 0);
                              setNewItem({...newItem, faktorPengali: newF});
                            }} 
                          />
                          <Input 
                            placeholder="Satuan (org/hari/kali)" 
                            className="flex-1"
                            value={f.label} 
                            onChange={(e) => {
                              const newF = [...newItem.faktorPengali];
                              newF[idx].label = e.target.value;
                              setNewItem({...newItem, faktorPengali: newF});
                            }} 
                          />
                          <Button variant="ghost" size="icon" className="text-red-500" onClick={() => {
                            const newF = newItem.faktorPengali.filter((_, i) => i !== idx);
                            setNewItem({...newItem, faktorPengali: newF});
                          }}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Batal</Button>
                  <Button onClick={handleSaveItem}>{editingItem ? "Simpan Perubahan" : "Tambahkan ke List"}</Button>
                </DialogFooter>
              </DialogContent>
              </Dialog>

            {/* MODAL KONFIRMASI DUPLIKASI */}
            <Dialog open={showDuplicateConfirm} onOpenChange={setShowDuplicateConfirm}>
              <DialogContent className="sm:max-w-[380px]">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-indigo-600" />
                    Duplikasi Isi DOPD
                  </DialogTitle>
                </DialogHeader>
                <div className="py-3 text-sm text-slate-600 leading-relaxed">
                  Apakah Anda yakin ingin menduplikasi seluruh rincian biaya dari{" "}
                  <span className="font-bold text-slate-900">
                    {duplicateFromIdx !== null ? rosterList[duplicateFromIdx]?.nama : ""}
                  </span>{" "}
                  ke personel{" "}
                  <span className="font-bold text-slate-900">{activePerson.nama}</span>?
                  <p className="mt-2 text-xs text-red-500 font-medium">
                    Seluruh rincian biaya personel ini yang sudah ada akan digantikan.
                  </p>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => { setShowDuplicateConfirm(false); setDuplicateFromIdx(null); }}>
                    Batal
                  </Button>
                  <Button className="bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleConfirmDuplicate}>
                    <Copy className="w-3.5 h-3.5 mr-2" /> Ya, Duplikasi
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

          </div>
          
          {/* LIST ITEM DOPD */}
          <div className="p-0">
            {activePersonItems.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <FileText className="w-12 h-12 mx-auto mb-3 opacity-20" />
                <p>Belum ada rincian biaya untuk personel ini.</p>
              </div>
            ) : (
              <div className="divide-y">
                {activePersonItems.map((item, index) => {
                  const itemTotal = calculateItemTotal(item);
                  return (
                    <div key={item.id || `item-${index}`} className="flex flex-col sm:flex-row sm:items-center p-3 sm:px-6 sm:py-4 gap-2 sm:gap-6 hover:bg-slate-50 transition-colors group">
                      
                      <div className="flex items-start sm:items-center justify-between sm:w-32 flex-shrink-0">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[10px] sm:text-xs font-semibold text-slate-700">
                          {item.kategori}
                        </span>
                        
                        {/* Mobile Actions */}
                        <div className="flex justify-end sm:hidden gap-1">
                          <Button variant="ghost" size="icon" onClick={() => {
                            setEditingItem(item.id);
                            setNewItem({
                              kategori: item.kategori,
                              uraian: item.uraian || "",
                              hargaSatuan: item.hargaSatuan,
                              faktorPengali: item.faktorPengali.map((f: any) => ({...f}))
                            });
                            setIsDialogOpen(true);
                          }} className="h-6 w-6 text-slate-400 hover:text-primary">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="h-6 w-6 text-slate-400 hover:text-red-700">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0 mt-1 sm:mt-0">
                        <p className="text-xs sm:text-sm font-medium text-slate-900 leading-tight">{item.uraian || "Tanpa uraian detail..."}</p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5 sm:mt-1.5">
                          {item.faktorPengali.map((f: any, i: number) => (
                            <span key={i} className="inline-flex items-center rounded-full border border-slate-200/60 px-1.5 py-0 sm:px-2 sm:py-0.5 text-[9px] sm:text-[10px] text-slate-500 bg-white">
                              <span className="font-semibold text-slate-700 mr-1">{f.value}</span> {f.label}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center sm:items-end justify-between mt-2 sm:mt-0 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                        <div className="text-left sm:text-right sm:w-28 flex-shrink-0">
                          <p className="text-[9px] sm:text-[10px] text-slate-500 mb-0.5">Harga Satuan</p>
                          <p className="font-extrabold text-xs sm:text-sm text-slate-700">{new Intl.NumberFormat("id-ID").format(Number(item.hargaSatuan))}</p>
                        </div>

                        <div className="text-right sm:w-36 flex-shrink-0 ml-auto sm:ml-0">
                          <p className="text-[9px] sm:text-[10px] text-slate-500 mb-0.5">Total Akhir</p>
                          <p className="font-extrabold text-sm sm:text-base text-slate-900">{formatRupiah(itemTotal)}</p>
                        </div>
                      </div>

                      {/* Desktop Actions */}
                      <div className="hidden sm:flex justify-end opacity-0 group-hover:opacity-100 transition-opacity gap-1 w-16 flex-shrink-0">
                        <Button variant="ghost" size="icon" onClick={() => {
                          setEditingItem(item.id);
                          setNewItem({
                            kategori: item.kategori,
                            uraian: item.uraian || "",
                            hargaSatuan: item.hargaSatuan,
                            faktorPengali: item.faktorPengali.map((f: any) => ({...f}))
                          });
                          setIsDialogOpen(true);
                        }} className="text-slate-400 hover:text-primary hover:bg-primary/10 h-8 w-8">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="text-slate-400 hover:text-red-700 hover:bg-red-50 h-8 w-8">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="p-0 overflow-hidden bg-white border-slate-200/60 shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <CardHeader className="pt-3 pb-2 sm:p-5 bg-slate-50/30 border-b">
          <CardTitle className="text-sm font-extrabold sm:text-base sm:font-semibold">Pengaturan Cetak DOPD</CardTitle>
        </CardHeader>
        <CardContent className="px-3 pb-3 pt-4 sm:p-6 sm:pt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Kuasa Pengguna Anggaran (KPA)</Label>
              <Combobox 
                options={pegawaiOptions}
                value={dopdMeta.kpaId}
                onChange={(val) => setDopdMeta({ ...dopdMeta, kpaId: val })}
                placeholder="Pilih KPA..."
              />
            </div>
            <div className="space-y-2">
              <Label>Bendahara Pengeluaran Pembantu (BPP)</Label>
              <Combobox 
                options={pegawaiOptions}
                value={dopdMeta.bppId}
                onChange={(val) => setDopdMeta({ ...dopdMeta, bppId: val })}
                placeholder="Pilih BPP..."
              />
            </div>
            <div className="space-y-2">
              <Label>Kota Penandatanganan</Label>
              <Input 
                value={dopdMeta.kotaTandaTangan}
                onChange={(e) => setDopdMeta({ ...dopdMeta, kotaTandaTangan: e.target.value })}
                placeholder="Cth: Sendawar"
              />
            </div>
            <div className="space-y-2">
              <Label>Pejabat Memberi Perintah</Label>
              <Input 
                value={dopdMeta.pejabatMemberiPerintahLabel}
                onChange={(e) => setDopdMeta({ ...dopdMeta, pejabatMemberiPerintahLabel: e.target.value })}
                placeholder="Cth: Kepala Bagian Organisasi"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <PdfPreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        title="Preview Daftar Ongkos Perjalanan Dinas (DOPD)"
        spjId={spj.id}
        docKey="dopd"
        initialConfig={spj.metaDokumen?.dopdConfig}
        fields={[
          { key: 'kotaTandaTangan', label: 'Kota Tanda Tangan', type: 'text' },
          { key: 'kpaNamaOverride', label: 'Override Nama KPA', type: 'text', placeholder: 'Menimpa data otomatis' },
          { key: 'kpaNipOverride', label: 'Override NIP KPA', type: 'text', placeholder: 'Menimpa data otomatis' },
          { key: 'bppNamaOverride', label: 'Override Nama BPP', type: 'text', placeholder: 'Menimpa data otomatis' },
          { key: 'bppNipOverride', label: 'Override NIP BPP', type: 'text', placeholder: 'Menimpa data otomatis' }
        ]}
        renderDocument={(config) => {
          const kpa = pegawaiList.find((p) => p.id === dopdMeta.kpaId);
          const bpp = pegawaiList.find((p) => p.id === dopdMeta.bppId);
          return (
            <DopdPdf 
              spj={{
                pejabatMemberiPerintahLabel: dopdMeta.pejabatMemberiPerintahLabel,
                tingkatPerjalananLabel: "Perjalanan Dinas Dalam Daerah", // bisa dinamis nanti
                kotaTandaTangan: dopdMeta.kotaTandaTangan,
                tglSuratTugas: spj.tanggalAwal || undefined
              }}
              roster={[...rosterList]
                .sort((a: any, b: any) => (a.role === 'KEPALA_JALAN' ? -1 : (b.role === 'KEPALA_JALAN' ? 1 : 0)))
                .map((r: any, idx: number) => ({
                  id: r.id,
                  order: idx,
                  role: r.role,
                  nama: r.nama,
                  nip: r.nip,
                  jabatan: r.jabatan,
                  pangkat: r.pangkat,
                  golongan: r.golongan,
                  instansi: r.instansi || null
                }))}
              items={dopdItems.map(item => ({
                id: item.id,
                rosterItemId: item.spjRosterItemId,
                kategori: item.kategori,
                uraian: item.uraian,
                hargaSatuan: parseInt(item.hargaSatuan) || 0,
                total: parseInt(calculateItemTotal(item).toString()) || 0,
                factors: item.faktorPengali.map((f: any, i: number) => ({
                  id: String(i),
                  order: i,
                  label: f.label,
                  qty: parseInt(f.value) || 1
                }))
              }))}
              signers={{
                kpa: kpa ? { nama: kpa.nama, nip: kpa.nip } : null,
                bpp: bpp ? { nama: bpp.nama, nip: bpp.nip } : null
              }}
              config={{
                styles: config.styles,
                content: {
                  ...config.content,
                  kpaNamaOverride: config.content?.kpaNamaOverride,
                  kpaNipOverride: config.content?.kpaNipOverride,
                  bppNamaOverride: config.content?.bppNamaOverride,
                  bppNipOverride: config.content?.bppNipOverride
                }
              }}
            />
          );
        }}
      />
    </div>
  );
}
