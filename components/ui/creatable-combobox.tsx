"use client"

import * as React from "react"
import { Check, ChevronsUpDown, PlusCircle } from "lucide-react"

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

export function CreatableCombobox({
  options,
  value,
  onChange,
  placeholder = "Pilih atau ketik...",
  emptyText = "Opsi tidak ditemukan.",
  className,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const exactMatch = options.find((opt) => opt.label.toLowerCase() === search.toLowerCase())
  const selectedOption = options.find((opt) => opt.value === value) || { label: value, value: value }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger render={
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn("w-full justify-between font-normal", className)}
        >
          <span className="truncate">
            {value ? selectedOption.label : placeholder}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      } />
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={placeholder} 
            value={search} 
            onValueChange={setSearch} 
          />
          <CommandList>
            <CommandEmpty>
              {search.trim() !== "" ? (
                <div 
                  className="px-2 py-2 text-sm cursor-pointer hover:bg-slate-100 flex items-center"
                  onClick={() => {
                    onChange(search)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Gunakan &quot;{search}&quot;
                </div>
              ) : (
                emptyText
              )}
            </CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={() => {
                    onChange(option.value)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
              {search.trim() !== "" && !exactMatch && (
                <CommandItem
                  value={search}
                  onSelect={() => {
                    onChange(search)
                    setOpen(false)
                    setSearch("")
                  }}
                >
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Gunakan &quot;{search}&quot;
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
