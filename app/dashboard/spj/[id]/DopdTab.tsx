"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { CurrencyInput } from "@/components/ui/currency-input";
import { CreatableCombobox } from "@/components/ui/creatable-combobox";
import { Plus, Trash2, ChevronLeft, ChevronRight, Save, Loader2, FileText } from "lucide-react";
import { saveDopdTransaction } from "@/app/actions/dopd";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

export default function DopdTab({ spj }: { spj: any }) {
  const router = useRouter();
  
  // -- STATE --
  const [activePersonIdx, setActivePersonIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Initialize local items from database
  const initialItems = useMemo(() => {
    const items: any[] = [];
    spj.roster.forEach((r: any) => {
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
  }, [spj]);

  const [dopdItems, setDopdItems] = useState<any[]>(initialItems);

  // Dialog Add State
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState({
    kategori: "Uang Harian",
    uraian: "",
    hargaSatuan: "0",
    faktorPengali: [{ label: "org", value: 1 }, { label: "hari", value: 1 }]
  });

  // -- COMPUTATIONS --
  const activePerson = spj.roster[activePersonIdx];
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
      spjRosterItemId: item.spjRosterItemId,
      kategori: item.kategori,
      uraian: item.uraian,
      hargaSatuan: item.hargaSatuan.toString(),
      faktorPengali: item.faktorPengali,
    }));

    try {
      await saveDopdTransaction(spj.id, payload);
      router.refresh();
      // Optional toast success could go here
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan DOPD.");
    } finally {
      setLoading(false);
    }
  };

  const handleAddItem = () => {
    setDopdItems([...dopdItems, {
      id: `temp-${Date.now()}`,
      spjRosterItemId: activePerson.id,
      ...newItem,
    }]);
    setIsDialogOpen(false);
    // Reset form
    setNewItem({
      kategori: "Uang Harian",
      uraian: "",
      hargaSatuan: "0",
      faktorPengali: [{ label: "org", value: 1 }, { label: "hari", value: 1 }]
    });
  };

  const handleDeleteItem = (id: string) => {
    setDopdItems(dopdItems.filter(i => i.id !== id));
  };

  // -- RENDER --
  if (!activePerson) return <div>Data Personel Kosong.</div>;

  return (
    <div className="space-y-6">
      
      {/* HEADER DOPD */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 bg-slate-900 text-white rounded-xl shadow-lg">
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Editor Daftar Pengeluaran Riil</p>
          <p className="text-xl font-bold">Total DOPD: {formatRupiah(totalDopdAll)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleSaveDopd} disabled={loading} className="font-bold">
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
            Simpan DOPD Permanen
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
          {errorMsg}
        </div>
      )}

      {/* PERSONEL NAVIGATOR */}
      <Card>
        <CardHeader className="py-4 border-b bg-slate-50 flex flex-row items-center justify-between">
          <div className="flex items-center gap-4 w-full">
            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setActivePersonIdx(Math.max(0, activePersonIdx - 1))}
              disabled={activePersonIdx === 0}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            
            <div className="flex-1 text-center">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Personel Ke-{activePersonIdx + 1} dari {spj.roster.length}</p>
              <h3 className="text-xl font-black text-slate-900">{activePerson.nama}</h3>
              <p className="text-sm text-slate-500">{activePerson.role === "KEPALA_JALAN" ? "Kepala Jalan" : "Pengikut"} • {activePerson.jabatan}</p>
            </div>

            <Button 
              variant="outline" 
              size="icon" 
              onClick={() => setActivePersonIdx(Math.min(spj.roster.length - 1, activePersonIdx + 1))}
              disabled={activePersonIdx === spj.roster.length - 1}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-6 border-b">
            <div>
              <p className="text-sm text-slate-500 font-semibold">Subtotal Personel Ini</p>
              <p className="text-2xl font-bold text-slate-900">{formatRupiah(activePersonSubtotal)}</p>
            </div>
            
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger render={
                <Button className="bg-slate-900 text-white hover:bg-slate-800">
                  <Plus className="w-4 h-4 mr-2" /> ITEM BIAYA
                </Button>
              } />
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Tambah Rincian Biaya</DialogTitle>
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
                    <Label>Uraian Detail</Label>
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
                            onChange={(e) => {
                              const newF = [...newItem.faktorPengali];
                              newF[idx].value = parseInt(e.target.value) || 0;
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
                  <Button onClick={handleAddItem}>Tambahkan ke List</Button>
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
                {activePersonItems.map((item) => {
                  const itemTotal = calculateItemTotal(item);
                  return (
                    <div key={item.id} className="flex items-center p-6 gap-6 hover:bg-slate-50 transition-colors group">
                      
                      <div className="w-40 flex-shrink-0">
                        <Badge variant="secondary" className="bg-slate-200 text-slate-700 font-bold tracking-wider rounded-md">
                          {item.kategori}
                        </Badge>
                      </div>
                      
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{item.uraian || "Tanpa uraian detail..."}</p>
                        <div className="flex gap-2 mt-2">
                          {item.faktorPengali.map((f: any, i: number) => (
                            <Badge key={i} variant="outline" className="text-slate-500 bg-white shadow-sm font-mono text-[10px]">
                              {f.value} {f.label}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <div className="w-32 text-right">
                        <p className="text-xs text-slate-500">Harga Satuan</p>
                        <p className="font-medium text-slate-700">{new Intl.NumberFormat("id-ID").format(Number(item.hargaSatuan))}</p>
                      </div>

                      <div className="w-40 text-right">
                        <p className="text-xs text-slate-500">Total Akhir</p>
                        <p className="text-lg font-black text-slate-900">{formatRupiah(itemTotal)}</p>
                      </div>

                      <div className="w-10 text-right opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteItem(item.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50">
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
    </div>
  );
}
