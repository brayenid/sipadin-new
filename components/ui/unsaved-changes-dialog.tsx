"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface UnsavedChangesDialogProps {
  open: boolean;
  onConfirm: () => void;  // Lanjutkan tanpa simpan
  onCancel: () => void;   // Kembali ke form
}

export function UnsavedChangesDialog({
  open,
  onConfirm,
  onCancel,
}: UnsavedChangesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-600">
            <AlertTriangle className="w-5 h-5" />
            Perubahan Belum Disimpan
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Anda memiliki perubahan yang belum disimpan. Jika Anda melanjutkan, semua
          perubahan tersebut akan <strong className="text-foreground">hilang</strong>.
        </p>
        <DialogFooter className="flex gap-2 sm:flex-row-reverse">
          <Button variant="destructive" size="sm" onClick={onConfirm}>
            Lanjutkan Tanpa Simpan
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>
            Kembali ke Form
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
