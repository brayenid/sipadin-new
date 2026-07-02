"use client"

import dynamic from "next/dynamic"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Loader2 } from "lucide-react"

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
      <DialogContent className="max-w-[95vw] sm:max-w-[95vw] w-full h-[95vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b bg-slate-50 shrink-0">
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 w-full flex bg-slate-500/20 overflow-hidden">
          
          {/* Sidebar Pengaturan */}
          <div className="w-64 bg-white border-r p-4 overflow-y-auto shrink-0 space-y-6">
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

          <div className="flex-1 w-full bg-slate-500/20">
            {isOpen && (
              <PDFViewer width="100%" height="100%" className="border-none">
                {renderDocument(layout)}
              </PDFViewer>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
