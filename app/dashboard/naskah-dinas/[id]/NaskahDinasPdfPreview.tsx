"use client"

import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Loader2, X } from "lucide-react"

import { useState } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <div className="flex items-center justify-center h-[70vh] w-full bg-slate-100 animate-pulse"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div> }
)

export type PdfLayoutOptions = {
  marginTop: number
  marginBottom: number
  marginHorizontal: number
  fontSize: number
  lineHeight: number
}

type Props = {
  isOpen: boolean
  onClose: () => void
  title: string
  renderDocument: (layout: PdfLayoutOptions) => React.ReactElement<any>
}

export default function NaskahDinasPdfPreview({
  isOpen,
  onClose,
  title,
  renderDocument,
}: Props) {
  const [layout, setLayout] = useState<PdfLayoutOptions>({
    marginTop: 30,
    marginBottom: 30,
    marginHorizontal: 42,
    fontSize: 11,
    lineHeight: 1.35
  })

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[100vw] sm:max-w-[95vw] w-full h-[100dvh] sm:h-[95vh] max-h-[100dvh] flex flex-col p-0 gap-0 overflow-hidden bg-slate-50 [&>button]:hidden rounded-none sm:rounded-lg border-0 sm:border">
        <DialogHeader className="px-4 py-3 sm:px-6 sm:py-4 border-b border-slate-200 bg-white shrink-0 flex flex-row items-center justify-between gap-2">
          <DialogTitle className="text-base sm:text-xl font-bold leading-tight line-clamp-1 flex-1 text-left">
            {title}
          </DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 sm:h-10 sm:w-10 shrink-0">
            <X className="w-4 h-4 sm:w-5 sm:h-5" />
          </Button>
        </DialogHeader>
        <div className="flex-1 w-full flex flex-col-reverse lg:flex-row min-h-0 bg-slate-500/20 overflow-hidden">
          
          {/* Sidebar Pengaturan */}
          <div className="h-[40vh] lg:h-auto w-full lg:w-64 bg-white border-r p-4 overflow-y-auto shrink-0 space-y-6">
            <div>
              <h3 className="font-semibold text-sm mb-4">Pengaturan Tata Letak</h3>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Margin Atas (pt)</Label>
              </div>
              <Input 
                type="number"
                value={layout.marginTop} 
                onChange={(e) => setLayout(prev => ({...prev, marginTop: Number(e.target.value)}))} 
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Margin Bawah (pt)</Label>
              </div>
              <Input 
                type="number"
                value={layout.marginBottom} 
                onChange={(e) => setLayout(prev => ({...prev, marginBottom: Number(e.target.value)}))} 
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Margin Kiri/Kanan (pt)</Label>
              </div>
              <Input 
                type="number"
                value={layout.marginHorizontal} 
                onChange={(e) => setLayout(prev => ({...prev, marginHorizontal: Number(e.target.value)}))} 
              />
            </div>

            <div className="space-y-3 pt-4 border-t">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Ukuran Font Dasar (pt)</Label>
              </div>
              <Input 
                type="number"
                step="0.5"
                value={layout.fontSize} 
                onChange={(e) => setLayout(prev => ({...prev, fontSize: Number(e.target.value)}))} 
              />
            </div>

            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <Label className="text-xs">Spasi Baris</Label>
              </div>
              <Input 
                type="number"
                step="0.05"
                value={layout.lineHeight} 
                onChange={(e) => setLayout(prev => ({...prev, lineHeight: Number(e.target.value)}))} 
              />
            </div>

          </div>

          <div className="flex-1 min-h-[50vh] lg:min-h-0 w-full bg-slate-500/20">
            {isOpen && (
              <PDFViewer width="100%" height="100%" className="border-none w-full h-full flex-1">
                {renderDocument(layout)}
              </PDFViewer>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
