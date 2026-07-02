"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { UserRole } from "@prisma/client";
import { createAkun, updateAkun, deleteAkun } from "@/app/actions/akun";
import { Loader2, Plus, Trash2, Edit, ShieldAlert, KeyRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MobileActionBar from "@/components/dashboard/MobileActionBar";

type Akun = {
  id: string;
  name: string;
  username: string;
  role: UserRole;
  createdAt: Date;
};

export default function AkunList({ initialData }: { initialData: Akun[] }) {
  const [data, setData] = useState<Akun[]>(initialData);
  const [loading, setLoading] = useState(false);
  
  // Dialog State
  const [isOpen, setIsOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentId, setCurrentId] = useState<string | null>(null);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    passwordRaw: "",
    role: "TIM_KERJA" as UserRole,
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Pagination & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const handleOpenCreate = () => {
    setIsEditMode(false);
    setCurrentId(null);
    setFormData({ name: "", username: "", passwordRaw: "", role: "TIM_KERJA" });
    setErrorMsg(null);
    setIsOpen(true);
  };

  const handleOpenEdit = (akun: Akun) => {
    setIsEditMode(true);
    setCurrentId(akun.id);
    setFormData({
      name: akun.name,
      username: akun.username,
      passwordRaw: "", // Kosongkan untuk edit
      role: akun.role,
    });
    setErrorMsg(null);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    
    try {
      if (isEditMode && currentId) {
        await updateAkun(currentId, { ...formData });
      } else {
        if (!formData.passwordRaw) {
          throw new Error("Password wajib diisi untuk pengguna baru.");
        }
        await createAkun({ ...formData });
      }
      setIsOpen(false);
      window.location.reload();
    } catch (err: any) {
      setErrorMsg(err.message || "Gagal menyimpan data.");
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setLoading(true);
    try {
      await deleteAkun(deleteId);
      window.location.reload();
    } catch (err: any) {
      toast.error(err.message || "Gagal menghapus data.");
      setLoading(false);
      setDeleteId(null);
    }
  };

  const filteredData = data.filter((akun) => 
    akun.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    akun.username.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const paginatedData = filteredData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.max(1, Math.ceil(filteredData.length / itemsPerPage));

  const renderPagination = () => {
    return (
      <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 bg-white rounded-b-xl border shadow-[0_2px_8px_-3px_rgba(0,0,0,0.04)]">
        <p className="text-sm text-slate-500">
          Menampilkan <span className="font-medium text-slate-900">{filteredData.length > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0}</span> hingga <span className="font-medium text-slate-900">{Math.min(currentPage * itemsPerPage, filteredData.length)}</span> dari <span className="font-medium text-slate-900">{filteredData.length}</span> data
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="h-8">Sebelumnya</Button>
          <div className="flex items-center gap-1">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <Button key={p} variant={p === currentPage ? 'default' : 'outline'} size="sm" onClick={() => setCurrentPage(p)} className={`h-8 w-8 p-0 ${p !== currentPage ? 'text-slate-600 hover:text-slate-900' : ''}`}>{p}</Button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="h-8">Selanjutnya</Button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <div className="flex justify-between items-center">
        <div className="relative w-72">
          <Input 
            placeholder="Cari akun..." 
            className="h-9" 
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button onClick={handleOpenCreate} size="sm" className="hidden lg:flex"><Plus className="w-4 h-4 mr-2" /> Tambah Akun</Button>} />
          <DialogContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <DialogHeader>
                <DialogTitle>{isEditMode ? "Edit Akun" : "Tambah Akun Baru"}</DialogTitle>
              </DialogHeader>
              
              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-sm rounded-md border border-red-100 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                  <p>{errorMsg}</p>
                </div>
              )}

              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input 
                  required 
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  placeholder="Misal: Budi Santoso"
                />
              </div>

              <div className="space-y-2">
                <Label>Username</Label>
                <Input 
                  required 
                  value={formData.username}
                  onChange={(e) => setFormData({...formData, username: e.target.value})}
                  placeholder="Misal: budi.s"
                />
              </div>

              <div className="space-y-2">
                <Label>{isEditMode ? "Ubah Password (Kosongkan jika tidak ingin diubah)" : "Password"}</Label>
                <div className="relative">
                  <Input 
                    type="password"
                    required={!isEditMode}
                    value={formData.passwordRaw}
                    onChange={(e) => setFormData({...formData, passwordRaw: e.target.value})}
                    placeholder={isEditMode ? "Masukkan password baru" : "Masukkan password"}
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute right-3 top-2.5" />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Peran (Role)</Label>
                <select 
                  className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus:ring-2 focus:ring-slate-950"
                  value={formData.role}
                  onChange={(e) => setFormData({...formData, role: e.target.value as UserRole})}
                  required
                >
                  <option value="TIM_KERJA">Tim Kerja</option>
                  <option value="SUPER_ADMIN">Super Admin</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {isEditMode ? "Simpan Perubahan" : "Buat Akun"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paginatedData.map((akun) => (
          <Card key={akun.id} className="relative overflow-hidden hover:shadow-[0_4px_20px_-4px_rgba(0,0,0,0.1)] transition-all duration-300 border-slate-200/60">
            <CardContent className="p-5 flex justify-between items-start">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-slate-900">{akun.name}</h3>
                  {akun.role === "SUPER_ADMIN" && (
                    <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20 text-[10px] px-1.5 py-0">Admin</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">@{akun.username}</p>
                
                <div className="mt-4 text-xs text-slate-400">
                  Dibuat: {new Date(akun.createdAt).toLocaleDateString("id-ID")}
                </div>
              </div>
              
              <div className="flex gap-1 absolute top-3 right-3">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 text-slate-500 hover:text-primary hover:bg-primary/5" 
                  onClick={() => handleOpenEdit(akun)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                {akun.role !== "SUPER_ADMIN" && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50" 
                    onClick={() => setDeleteId(akun.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
        {filteredData.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed border-slate-200 rounded-xl bg-slate-50">
            <p className="text-slate-500">Belum ada data akun yang sesuai pencarian.</p>
          </div>
        )}
      </div>
      {renderPagination()}

      <MobileActionBar>
        <Button className="w-full" onClick={handleOpenCreate}><Plus className="w-4 h-4 mr-2" /> Tambah Akun</Button>
      </MobileActionBar>

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus Akun?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak dapat dibatalkan. Akun ini akan dihapus secara permanen dari sistem.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700 text-white" disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Hapus Akun
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
