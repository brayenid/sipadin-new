"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
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
import { Loader2, Copy } from "lucide-react";
import { duplicateSpjTransaction } from "@/app/actions/spj";

export default function SpjDuplicateButton({ spjId }: { spjId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleDuplicate = async () => {
    setLoading(true);
    try {
      const newSpjId = await duplicateSpjTransaction(spjId);
      setOpen(false);
      
      // Delay sedikit agar animasi modal menutup (Radix UI) 
      // bisa membersihkan pointer-events dari body sebelum routing
      setTimeout(() => {
        router.push(`/dashboard/spj/${newSpjId}`);
      }, 300);
      
    } catch (err: any) {
      toast.error(err.message || "Gagal menduplikasi SPJ.");
      setLoading(false);
    }
  };

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
        onClick={() => setOpen(true)}
        title="Duplikat SPJ"
      >
        <Copy className="w-4 h-4" />
      </Button>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Duplikat SPJ ini?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini akan menyalin seluruh data SPJ ke entri baru.{" "}
              <strong>Saldo pagu anggaran akan otomatis terpotong</strong> sebesar total pengeluaran SPJ ini.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Batal</AlertDialogCancel>
            <Button
              onClick={(e) => {
                e.preventDefault();
                handleDuplicate();
              }}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Copy className="w-4 h-4 mr-2" />
              )}
              Ya, Duplikat
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
