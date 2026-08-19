"use client"

import * as React from "react"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export function Combobox({
  options,
  value,
  onChange,
  placeholder = "Pilih opsi...",
  emptyText = "Opsi tidak ditemukan.",
  className,
}: {
  options: { value: string; label: string; content?: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  // Optimasi Performa: Hanya render maksimal 50 opsi yang relevan ke DOM
  const filteredOptions = React.useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) {
      // Jika value terpilih belum ada di 50 pertama, pastikan value terpilih tetap ada
      const topSlice = options.slice(0, 50)
      if (value && !topSlice.some((o) => o.value === value)) {
        const selectedOpt = options.find((o) => o.value === value)
        if (selectedOpt) return [selectedOpt, ...topSlice.slice(0, 49)]
      }
      return topSlice
    }

    const results: typeof options = []
    for (let i = 0; i < options.length; i++) {
      const opt = options[i]
      if (opt.label.toLowerCase().includes(q) || opt.value.toLowerCase().includes(q)) {
        results.push(opt)
        if (results.length >= 50) break
      }
    }
    return results
  }, [options, search, value])

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen)
    if (!newOpen) {
      setSearch("")
    }
  }

  const selectedOption = React.useMemo(() => {
    return options.find((option) => option.value === value)
  }, [options, value])

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger render={
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal shrink whitespace-normal overflow-hidden", className)}
        >
          <span className="truncate flex-1 text-left min-w-0 block">
            {selectedOption?.label || placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      } />
      <PopoverContent className="w-[calc(100vw-2rem)] sm:w-[400px] p-0 shadow-lg" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder={`Cari dari ${options.length.toLocaleString("id-ID")} data...`}
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="max-h-[260px] overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <CommandEmpty>{emptyText}</CommandEmpty>
            ) : (
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => {
                      onChange(option.value)
                      handleOpenChange(false)
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4 shrink-0",
                        value === option.value ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {option.content || option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
            {options.length > 50 && (
              <div className="p-1.5 text-center text-[10px] text-slate-400 border-t border-slate-100 bg-slate-50/60">
                {search
                  ? `Menampilkan ${filteredOptions.length} hasil teratas`
                  : `Menampilkan 50 dari ${options.length.toLocaleString("id-ID")} opsi. Ketik untuk mencari.`}
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
