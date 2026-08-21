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
          titleColor: "text-slate-900",
          buttonClass: "bg-rose-600 hover:bg-rose-700 active:scale-[0.98] text-white shadow-xs font-semibold rounded-xl px-4.5",
          bgIcon: "bg-rose-50 text-rose-600 border border-rose-200/70",
        };
      case "warning":
        return {
          icon: <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />,
          titleColor: "text-slate-900",
          buttonClass: "bg-amber-600 hover:bg-amber-700 active:scale-[0.98] text-white shadow-xs font-semibold rounded-xl px-4.5",
          bgIcon: "bg-amber-50 text-amber-600 border border-amber-200/70",
        };
      case "success":
        return {
          icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />,
          titleColor: "text-slate-900",
          buttonClass: "bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] text-white shadow-xs font-semibold rounded-xl px-4.5",
          bgIcon: "bg-emerald-50 text-emerald-600 border border-emerald-200/70",
        };
      case "info":
        return {
          icon: <Info className="w-5 h-5 text-blue-600 shrink-0" />,
          titleColor: "text-slate-900",
          buttonClass: "bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white shadow-xs font-semibold rounded-xl px-4.5",
          bgIcon: "bg-blue-50 text-blue-600 border border-blue-200/70",
        };
      default: // primary
        return {
          icon: <AlertCircle className="w-5 h-5 text-indigo-600 shrink-0" />,
          titleColor: "text-slate-900",
          buttonClass: "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white shadow-xs font-semibold rounded-xl px-4.5",
          bgIcon: "bg-indigo-50 text-indigo-600 border border-indigo-200/70",
        };
    }
  };

  const style = getVariantStyles();

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-[92vw] sm:max-w-md bg-white p-5 sm:p-6 rounded-2xl shadow-xl border border-slate-100 duration-150">
        <DialogHeader className="flex flex-row items-start gap-3.5 space-y-0 text-left">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${style.bgIcon}`}>
            {icon || style.icon}
          </div>
          <div className="space-y-1 pt-0.5 flex-1 pr-4">
            <DialogTitle className={`text-base font-bold tracking-tight leading-snug ${style.titleColor}`}>
              {title}
            </DialogTitle>
            {description && (
              <div className="text-xs text-slate-600 leading-relaxed pt-0.5 font-normal">
                {description}
              </div>
            )}
          </div>
        </DialogHeader>

        <DialogFooter className="flex flex-row items-center justify-end gap-2 pt-4 border-t border-slate-100 mt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isLoading}
            onClick={handleClose}
            className="h-9 px-4 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border-slate-200 rounded-xl shadow-2xs transition-all cursor-pointer"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={isLoading}
            onClick={onConfirm}
            className={`h-9 text-xs transition-all cursor-pointer ${style.buttonClass}`}
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

