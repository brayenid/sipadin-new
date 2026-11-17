"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy } from "lucide-react";
import SpjDuplicateModal, { type SpjDuplicateTarget } from "./SpjDuplicateModal";

export default function SpjDuplicateButton({
  spj,
  spjId,
  variant = "ghost",
  size = "icon",
  className = "h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50",
  title = "Duplikat SPJ",
  children,
  onSuccess,
}: {
  spj?: SpjDuplicateTarget | string;
  spjId?: string;
  variant?: "ghost" | "outline" | "default" | "secondary";
  size?: "icon" | "sm" | "default" | "lg";
  className?: string;
  title?: string;
  children?: React.ReactNode;
  onSuccess?: (newSpjId: string) => void;
}) {
  const [open, setOpen] = useState(false);

  // Normalisasi target SPJ agar mendukung passing object spj atau string spjId
  const target: SpjDuplicateTarget =
    typeof spj === "object" && spj !== null
      ? spj
      : { id: (typeof spj === "string" ? spj : spjId) || "" };

  return (
    <>
      <Button
        variant={variant}
        size={size}
        className={className}
        onClick={() => setOpen(true)}
        title={title}
      >
        {children || <Copy className="w-4 h-4" />}
      </Button>

      {open && (
        <SpjDuplicateModal
          isOpen={open}
          onClose={() => setOpen(false)}
          spj={target}
          onSuccess={onSuccess}
        />
      )}
    </>
  );
}
