"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Combobox } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreVertical, UserPlus, UserMinus, ShieldAlert, Loader2 } from "lucide-react";
import { addRoster, deleteRoster, updateRosterRole } from "@/app/actions/roster";

export default function PersonelTab({ spj, pegawaiList }: { spj: any, pegawaiList: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Add Dialog State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newPegawaiId, setNewPegawaiId] = useState("");
  const [newRole, setNewRole] = useState<"KEPALA_JALAN" | "PENGIKUT">("PENGIKUT");

  // Alert Dialog States
  const [confirmRoleData, setConfirmRoleData] = useState<{ id: string, role: "KEPALA_JALAN" | "PENGIKUT" } | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const unassignedPegawai = pegawaiList.filter(p => !spj.roster.some((r: any) => r.pegawaiId === p.id));
  const pegawaiOptions = unassignedPegawai.map(p => ({
    value: p.id,
    label: `${p.nama} (${p.nip || "Non-PNS"})`
  }));

  const handleAddPersonel = async () => {
    if (!newPegawaiId) {
      setErrorMsg("Pilih pegawai terlebih dahulu.");
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      await addRoster(spj.id, newPegawaiId, newRole);
      setIsAddOpen(false);
      setNewPegawaiId("");
      setNewRole("PENGIKUT");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menambah personel.");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = (rosterItemId: string, newRole: "KEPALA_JALAN" | "PENGIKUT") => {
    setConfirmRoleData({ id: rosterItemId, role: newRole });
  };

  const executeRoleUpdate = async () => {
    if (!confirmRoleData) return;
    setLoading(true);
    try {
      await updateRosterRole(spj.id, confirmRoleData.id, confirmRoleData.role);
      router.refresh();
      setConfirmRoleData(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal mengubah peran.");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (rosterItemId: string) => {
    setConfirmDeleteId(rosterItemId);
  };

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    setLoading(true);
    try {
      await deleteRoster(spj.id, confirmDeleteId);
      router.refresh();
      setConfirmDeleteId(null);
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus personel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Daftar Personel</CardTitle>
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger render={
            <Button>
              <UserPlus className="w-4 h-4 mr-2" /> Tambah Personel
            </Button>
          } />
          <DialogContent className="sm:max-w-[550px] overflow-hidden">
            <DialogHeader>
              <DialogTitle>Tambah Personel ke SPJ</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {errorMsg && <p className="text-sm font-medium text-red-500 bg-red-50 p-3 rounded-md">{errorMsg}</p>}
              <div className="space-y-2">
                <Label>Pilih Pegawai (Ketik Nama / NIP)</Label>
                <Combobox 
                  options={pegawaiOptions}
                  value={newPegawaiId}
                  onChange={setNewPegawaiId}
                  placeholder="Cari pegawai..."
                  emptyText="Pegawai tidak ditemukan (atau sudah dimasukkan)."
                />
              </div>
              <div className="space-y-2">
                <Label>Peran (Role)</Label>
                <select 
                  className="flex h-10 w-full items-center justify-between rounded-md border border-slate-200/60 bg-white px-3 py-2 text-sm"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                >
                  <option value="PENGIKUT">Pengikut (Anggota)</option>
                  <option value="KEPALA_JALAN">Kepala Jalan (Pimpinan Rombongan)</option>
                </select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddOpen(false)}>Batal</Button>
              <Button onClick={handleAddPersonel} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Tambahkan
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent className="pt-6">
        {spj.roster.length === 0 ? (
          <p className="text-slate-500 text-center py-6">Tidak ada personel yang ditugaskan pada SPJ ini.</p>
        ) : (
          <div className="space-y-4">
            {spj.roster.map((r: any, idx: number) => {
              const dopdAmount = r.pengeluaranDetails ? r.pengeluaranDetails.reduce((acc: any, curr: any) => acc + BigInt(curr.total), BigInt(0)) : BigInt(0);
              
              return (
                <div key={r.id} className="flex flex-col md:flex-row items-start md:items-center justify-between p-4 border rounded-lg bg-white">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-400">#{idx + 1}</span>
                      <p className="font-bold text-slate-900">{r.nama}</p>
                      <Badge variant="outline" className={r.role === "KEPALA_JALAN" ? "bg-amber-50 text-amber-700 border-amber-200" : ""}>
                        {r.role === "KEPALA_JALAN" ? "Kepala Jalan" : "Pengikut"}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">NIP: {r.nip || "-"} • {r.jabatan}</p>
                    
                    {dopdAmount > BigInt(0) && (
                      <p className="text-xs text-green-600 font-semibold mt-2 bg-green-50 px-2 py-1 rounded inline-block">
                        Biaya DOPD Tersemat: Rp {new Intl.NumberFormat("id-ID").format(Number(dopdAmount))}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 md:mt-0">
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <div className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors hover:bg-slate-100 hover:text-slate-900 h-9 w-9">
                          <MoreVertical className="w-4 h-4" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleUpdateRole(r.id, "KEPALA_JALAN")} disabled={r.role === "KEPALA_JALAN"}>
                          <ShieldAlert className="w-4 h-4 mr-2" /> Jadikan Kepala Jalan
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleUpdateRole(r.id, "PENGIKUT")} disabled={r.role === "PENGIKUT"}>
                          <ShieldAlert className="w-4 h-4 mr-2" /> Jadikan Pengikut
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-red-600 focus:text-red-700 focus:bg-red-50" onClick={() => handleDelete(r.id)}>
                          <UserMinus className="w-4 h-4 mr-2" /> Hapus Personel
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <AlertDialog open={!!confirmRoleData} onOpenChange={(open) => !open && setConfirmRoleData(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Ubah Peran?</AlertDialogTitle>
              <AlertDialogDescription>
                Anda yakin ingin mengubah peran personel ini?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={executeRoleUpdate} disabled={loading}>
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Ya, Ubah Peran
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={!!confirmDeleteId} onOpenChange={(open) => !open && setConfirmDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Hapus Personel?</AlertDialogTitle>
              <AlertDialogDescription>
                PERINGATAN: Semua biaya DOPD yang terkait dengan orang ini akan otomatis dihapus dan saldo Pagu dikembalikan. Lanjutkan?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={executeDelete} disabled={loading} className="bg-red-600 hover:bg-red-700 text-white">
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Ya, Hapus
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
