"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

interface PresetItem {
  id: string;
  title: string;
  text: string;
}

interface PresetDialogProps {
  title: string;
  options: PresetItem[];
  onSelect: (text: string) => void;
  trigger?: React.ReactElement;
}

export function PresetDialog({ title, options, onSelect, trigger }: PresetDialogProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger render={trigger} />
      ) : (
        <DialogTrigger 
          render={
            <Button type="button" variant="outline" size="sm">
              <Zap className="w-3 h-3 mr-2" /> Preset
            </Button>
          } 
        />
      )}
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden">
        <DialogHeader className="px-4 py-3 border-b bg-slate-50">
          <DialogTitle className="text-base font-semibold">{title}</DialogTitle>
        </DialogHeader>
        <Command>
          <CommandInput placeholder="Cari preset..." />
          <CommandList className="max-h-[350px]">
            <CommandEmpty>Tidak ada preset yang cocok.</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.id}
                  value={opt.title + " " + opt.text} // searchable text
                  onSelect={() => {
                    onSelect(opt.text);
                    setOpen(false);
                  }}
                  className="flex flex-col items-start px-4 py-3 gap-1 cursor-pointer border-b last:border-0"
                >
                  <p className="text-sm font-semibold text-slate-900">{opt.title}</p>
                  <p className="text-xs text-slate-500 line-clamp-2">{opt.text}</p>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}
