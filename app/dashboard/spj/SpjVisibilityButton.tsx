"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setSpjHidden } from "@/app/actions/spj-visibility";

export default function SpjVisibilityButton({ spjId, hidden }: { spjId: string; hidden: boolean }) {
  const [value, setValue] = useState(hidden);
  const [pending, start] = useTransition();

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      disabled={pending}
      title={value ? "Tersembunyi dari non Super Admin (klik untuk tampilkan)" : "Sembunyikan dari non Super Admin"}
      className={value ? "text-amber-600" : "text-slate-500"}
      onClick={() => {
        const next = !value;
        setValue(next);
        start(async () => {
          try { await setSpjHidden(spjId, next); } catch { setValue(!next); }
        });
      }}
    >
      {value ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
    </Button>
  );
}
