"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search } from "lucide-react"

export default function NaskahDinasSearch() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [query, setQuery] = useState(searchParams.get("q") || "")
  const [jenis, setJenis] = useState(searchParams.get("jenis") || "all")

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (value && value !== "all") {
        params.set(name, value)
      } else {
        params.delete(name)
      }
      params.delete("page") // Reset to page 1 on new search
      return params.toString()
    },
    [searchParams]
  )

  // Debounce search query
  useEffect(() => {
    // Only trigger router push if query actually changed from current URL
    const currentQ = searchParams.get("q") || ""
    if (query === currentQ) return

    const timer = setTimeout(() => {
      const newQuery = createQueryString("q", query)
      router.push(`${pathname}?${newQuery}`)
    }, 400)

    return () => clearTimeout(timer)
  }, [query, pathname, router, createQueryString, searchParams])

  const handleJenisChange = (val: string | null) => {
    if (!val) return
    setJenis(val)
    router.push(`${pathname}?${createQueryString("jenis", val)}`)
  }

  const getJenisLabel = (val: string) => {
    switch (val) {
      case "SURAT_TUGAS": return "Surat Tugas"
      case "SURAT_PERINTAH": return "Surat Perintah"
      case "TELAAHAN_STAF": return "Telaahan Staf"
      case "SURAT_EDARAN_SEKDA": return "Surat Edaran Sekda"
      case "SURAT_EDARAN_BUPATI": return "Surat Edaran Bupati"
      case "all": 
      default: 
        return "Semua Jenis Naskah"
    }
  }

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-6">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Cari berdasarkan perihal atau nomor..."
          className="pl-9 bg-white border-slate-200 focus-visible:ring-slate-300 h-10"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>
      <Select value={jenis} onValueChange={handleJenisChange}>
        <SelectTrigger className="w-full sm:w-[240px] bg-white border-slate-200 data-[size=default]:h-10">
          <SelectValue placeholder="Semua Jenis Naskah">
            {getJenisLabel(jenis)}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Semua Jenis Naskah</SelectItem>
          <SelectItem value="SURAT_TUGAS">Surat Tugas</SelectItem>
          <SelectItem value="SURAT_PERINTAH">Surat Perintah</SelectItem>
          <SelectItem value="TELAAHAN_STAF">Telaahan Staf</SelectItem>
          <SelectItem value="SURAT_EDARAN_SEKDA">Surat Edaran Sekda</SelectItem>
          <SelectItem value="SURAT_EDARAN_BUPATI">Surat Edaran Bupati</SelectItem>
        </SelectContent>
      </Select>
    </div>
  )
}
