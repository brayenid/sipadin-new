"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle2, Info, Loader2 } from "lucide-react";

export type ConfirmDialogVariant = "primary" | "danger" | "warning" | "info" | "success";

export interface ConfirmDialogProps {
  open: boolean;
  onOpenChange?: (open: boolean) => void;
  onConfirm: () => void | Promise<void>;
  onCancel?: () => void;
  title?: string;
  description?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  variant?: ConfirmDialogVariant;
  isLoading?: boolean;
  icon?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  title = "Konfirmasi Tindakan",
  description,
  confirmText = "Ya, Lanjutkan",
  cancelText = "Batal",
  variant = "primary",
  isLoading = false,
  icon,
}: ConfirmDialogProps) {
  const handleClose = () => {
    if (isLoading) return;
    if (onCancel) onCancel();
    if (onOpenChange) onOpenChange(false);
  };

  const getVariantStyles = () => {
    switch (variant) {
      case "danger":
        return {
          icon: <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />,
          titleColor: "text-rose-950",
          buttonClass: "bg-rose-600 hover:bg-rose-700 text-white shadow-xs font-bold",
          bgIcon: "bg-rose-50 text-rose-600 border border-rose-200/60",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
          titleColor: "text-amber-950",
          buttonClass: "bg-amber-600 hover:bg-amber-700 text-white shadow-xs font-bold",
          bgIcon: "bg-amber-50 text-amber-600 border border-amber-200/60",
        };
      case "success":
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
          titleColor: "text-emerald-950",
          buttonClass: "bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-bold",
          bgIcon: "bg-emerald-50 text-emerald-600 border border-emerald-200/60",
        };
      case "info":
        return {
          icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
          titleColor: "text-blue-950",
          buttonClass: "bg-blue-600 hover:bg-blue-700 text-white shadow-xs font-bold",
          bgIcon: "bg-blue-50 text-blue-600 border border-blue-200/60",
        };
      default: // primary
        return {
          icon: <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />,
          titleColor: "text-slate-900",
          buttonClass: "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs font-bold",
          bgIcon: "bg-indigo-50 text-indigo-600 border border-indigo-200/60",
        };
    }
  };

  const style = getVariantStyles();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm sm:max-w-md bg-white p-5 sm:p-6 rounded-2xl shadow-xl animate-in fade-in-0 zoom-in-95 duration-150">
        <DialogHeader className="flex flex-row items-start gap-3 space-y-0 text-left">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bgIcon}`}>
            {icon || style.icon}
          </div>
          <div className="space-y-1 pt-0.5">
            <DialogTitle className={`text-base font-bold leading-tight ${style.titleColor}`}>
              {title}
            </DialogTitle>
            {description && (
              <div className="text-xs text-slate-600 leading-relaxed pt-0.5">
                {description}
              </div>
            )}
          </div>
        </DialogHeader>

        <DialogFooter className="flex flex-col-reverse sm:flex-row gap-2 pt-3 border-t border-slate-100 mt-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={handleClose}
            className="text-xs font-semibold text-slate-700 border-slate-300 hover:bg-slate-100"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isLoading}
            onClick={onConfirm}
            className={`text-xs h-9 ${style.buttonClass}`}
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                Memproses...
              </>
            ) : (
              confirmText
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
