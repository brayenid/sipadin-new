"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Hash, Check } from "lucide-react";
import { KLASIFIKASI_SURAT_PRESETS, KlasifikasiSuratItem } from "@/lib/presets/klasifikasi-surat";

interface PresetNomorDialogProps {
  currentPrefix?: string;
  onSelect: (prefixFormatted: string) => void;
  formatTrailingSlash?: boolean; // default true: '000.1.5 / '
}

export function PresetNomorDialog({
  currentPrefix = "",
  onSelect,
  formatTrailingSlash = true,
}: PresetNomorDialogProps) {
  const [open, setOpen] = useState(false);

  const handlePick = (item: KlasifikasiSuratItem) => {
    // Format nomor prefix dengan slash dan spasi seragam
    const formatted = formatTrailingSlash ? `${item.kode} / ` : `${item.kode}/`;
    onSelect(formatted);
    setOpen(false);
  };

  const cleanCurrent = currentPrefix.replace(/[\s/]/g, "").trim();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-1.5 text-[10px] sm:text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium gap-1"
          >
            <Hash className="w-3 h-3 text-indigo-500" />
            <span>Preset Kode</span>
          </Button>
        }
      >
        <Hash className="w-3 h-3 text-indigo-500" />
        <span>Preset Kode</span>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b bg-slate-50">
          <DialogTitle className="text-sm sm:text-base font-bold text-slate-800 flex items-center gap-1.5">
            <Hash className="w-4 h-4 text-indigo-600" />
            Pilih Klasifikasi Nomor Surat Keluar
          </DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Cari kode nomor atau perihal surat..." className="text-xs sm:text-sm" />
          <CommandList className="max-h-[360px]">
            <CommandEmpty className="p-4 text-xs text-center text-slate-500">
              Klasifikasi tidak ditemukan.
            </CommandEmpty>
            <CommandGroup heading="Daftar Klasifikasi Penomoran">
              {KLASIFIKASI_SURAT_PRESETS.map((item) => {
                const isSelected = cleanCurrent === item.kode.replace(/[\s/]/g, "");
                return (
                  <CommandItem
                    key={item.kode}
                    value={`${item.kode} ${item.perihal}`}
                    onSelect={() => handlePick(item)}
                    className="flex items-center justify-between px-4 py-2.5 cursor-pointer border-b last:border-0 hover:bg-slate-50"
                  >
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs sm:text-sm text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          {item.kode}
                        </span>
                        <span className="text-xs sm:text-sm font-semibold text-slate-900">
                          {item.perihal}
                        </span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600 ml-2 shrink-0" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
