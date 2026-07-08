"use client"

import * as React from "react"
import { Input } from "@/components/ui/input"

export function CurrencyInput({
  value,
  onChange,
  placeholder = "0",
  className,
  disabled = false,
}: {
  value: string | bigint | number;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const [displayValue, setDisplayValue] = React.useState("")

  const formatRupiah = (angka: string) => {
    const number_string = angka.replace(/[^,\d]/g, "").toString()
    const split = number_string.split(",")
    const sisa = split[0].length % 3
    let rupiah = split[0].substring(0, sisa)
    const ribuan = split[0].substring(sisa).match(/\d{3}/gi)

    if (ribuan) {
      const separator = sisa ? "." : ""
      rupiah += separator + ribuan.join(".")
    }
    return split[1] !== undefined ? rupiah + "," + split[1] : rupiah
  }

  React.useEffect(() => {
    if (value !== undefined && value !== null) {
      const numValue = value.toString()
      if (numValue === "0" || numValue === "") {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayValue("")
      } else {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDisplayValue(formatRupiah(numValue))
      }
    }
  }, [value])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/[^0-9]/g, "")
    val = val.replace(/^0+/, "")
    if (val === "") val = "0"
    
    setDisplayValue(val === "0" ? "" : formatRupiah(val))
    onChange(val)
  }

  return (
    <div className="relative">
      <span className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[10px] sm:text-sm font-medium">Rp</span>
      <Input
        type="text"
        placeholder={placeholder}
        value={displayValue}
        onChange={handleChange}
        disabled={disabled}
        className={`pl-6 sm:pl-9 text-right font-mono text-slate-900 font-medium ${className || ""}`}
      />
    </div>
  )
}
