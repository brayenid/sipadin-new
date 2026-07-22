'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Indent, AlignLeft, GripVertical, Plus, Trash2, ChevronDown, Bold, Italic, Underline, Table } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

export type BlockType = 'indent' | 'no-indent' | 'list-1' | 'list-2' | 'list-3' | 'table-kv'

export type KeyValueItem = {
  id: string
  key: string
  value: string
}

export type Block = {
  id: string
  type: BlockType
  prefix: string // for lists, e.g., '1.', 'a.', '1)', '-'
  content: string
  tableRows?: KeyValueItem[]
}

function generateId() {
  return Math.random().toString(36).substr(2, 9)
}

function parseMarkdownLite(text: string): Block[] {
  if (!text) return [{ id: generateId(), type: 'indent', prefix: '', content: '' }]

  const normalizedText = text.replace(/\r\n/g, '\n')
  const paragraphs = normalizedText.split(/\n\n+/)

  return paragraphs.map(para => {
    // Check for table-kv block
    if (para.trimStart().startsWith('[:table]')) {
      const tableLines = para.split('\n').slice(1)
      const tableRows = tableLines.map(line => {
        const colonIdx = line.indexOf(':')
        if (colonIdx === -1) {
          return { id: generateId(), key: line.trim(), value: '' }
        }
        return {
          id: generateId(),
          key: line.substring(0, colonIdx).trim(),
          value: line.substring(colonIdx + 1).trim()
        }
      })
      return {
        id: generateId(),
        type: 'table-kv',
        prefix: '',
        content: '',
        tableRows: tableRows.length > 0 ? tableRows : [{ id: generateId(), key: '', value: '' }]
      }
    }

    const lines = para.split('\n').map(l => l.trim()).filter(l => l.length > 0)
    
    // Better parser logic:
    if (para.trimStart().startsWith('[_]')) {
      const cleanPara = para.trimStart().substring(3).trimStart()
      return { id: generateId(), type: 'no-indent', prefix: '', content: cleanPara }
    }

    const firstLine = lines[0] || ''
    
    // Check level 1: [1.], [2.], [1], etc
    let match = firstLine.match(/^\[(\d+\.?)\]\s(.*)/)
    if (match) {
      return { id: generateId(), type: 'list-1', prefix: match[1], content: [match[2], ...lines.slice(1)].join('\n') }
    }

    // Check level 2: [a.], [b.], [a], etc
    match = firstLine.match(/^\[([a-z]\.?)\]\s(.*)/i)
    if (match) {
      return { id: generateId(), type: 'list-2', prefix: match[1], content: [match[2], ...lines.slice(1)].join('\n') }
    }

    // Check level 3: [1)], [a)], [-]
    match = firstLine.match(/^\[(.*?)\]\s(.*)/)
    if (match && (match[1].endsWith(')') || match[1] === '-' || match[1] === '•')) {
      return { id: generateId(), type: 'list-3', prefix: match[1], content: [match[2], ...lines.slice(1)].join('\n') }
    }

    // Default: indented paragraph
    return { id: generateId(), type: 'indent', prefix: '', content: para }
  })
}

function stringifyMarkdownLite(blocks: Block[]): string {
  return blocks.map(block => {
    if (block.type === 'table-kv') {
      const rows = block.tableRows || []
      if (rows.length === 0) return '[:table]\n : '
      return `[:table]\n` + rows.map(r => `${r.key} : ${r.value}`).join('\n')
    }
    if (block.type === 'no-indent') {
      return `[_] ${block.content}`
    }
    if (block.type === 'list-1' || block.type === 'list-2' || block.type === 'list-3') {
      const lines = block.content.split('\n')
      if (lines.length === 0) return `[${block.prefix}] `
      const firstLine = `[${block.prefix}] ${lines[0]}`
      const rest = lines.slice(1).join('\n')
      return rest ? `${firstLine}\n${rest}` : firstLine
    }
    return block.content
  }).join('\n\n')
}

interface MarkdownLiteEditorProps {
  value: string
  onChange: (value: string) => void
}

export function MarkdownLiteEditor({ value, onChange }: MarkdownLiteEditorProps) {
  const [blocks, setBlocks] = useState<Block[]>([])
  
  // Gunakan ref untuk melacak state terbaru secara real-time (sinkron).
  const blocksRef = useRef<Block[]>([])
  
  // Sinkronkan ref setiap kali state berubah
  useEffect(() => {
    blocksRef.current = blocks
  }, [blocks])

  useEffect(() => {
    const currentStr = stringifyMarkdownLite(blocks)
    if (value !== currentStr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setBlocks(parseMarkdownLite(value))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value])

  const notifyChange = (newBlocks: Block[]) => {
    onChange(stringifyMarkdownLite(newBlocks))
  }

  const updateBlock = (id: string, updates: Partial<Block>) => {
    const newBlocks = blocksRef.current.map(b => b.id === id ? { ...b, ...updates } : b)
    blocksRef.current = newBlocks
    setBlocks(newBlocks)
    notifyChange(newBlocks)
  }

  const handleTypeChange = (blockId: string, newType: BlockType) => {
    const block = blocksRef.current.find(b => b.id === blockId)
    if (!block) return

    if (newType === 'table-kv' && block.type !== 'table-kv') {
      let tableRows: KeyValueItem[] = []
      if (block.content) {
        const lines = block.content.split('\n')
        tableRows = lines.map(line => {
          const colonIdx = line.indexOf(':')
          if (colonIdx !== -1) {
            return { id: generateId(), key: line.substring(0, colonIdx).trim(), value: line.substring(colonIdx + 1).trim() }
          }
          return { id: generateId(), key: '', value: line.trim() }
        })
      }
      if (tableRows.length === 0) {
        tableRows = [
          { id: generateId(), key: 'Hari / tanggal', value: '' },
          { id: generateId(), key: 'Pukul', value: '' },
          { id: generateId(), key: 'Tempat', value: '' },
          { id: generateId(), key: 'Agenda', value: '' }
        ]
      }
      updateBlock(blockId, { type: newType, tableRows })
    } else if (newType !== 'table-kv' && block.type === 'table-kv') {
      const content = (block.tableRows || []).map(r => `${r.key} : ${r.value}`).join('\n')
      updateBlock(blockId, { type: newType, content })
    } else {
      updateBlock(blockId, { type: newType })
    }
  }

  const addTableRow = (blockId: string) => {
    const block = blocksRef.current.find(b => b.id === blockId)
    if (!block) return
    const currentRows = block.tableRows || []
    const newRows = [...currentRows, { id: generateId(), key: '', value: '' }]
    updateBlock(blockId, { tableRows: newRows })
  }

  const removeTableRow = (blockId: string, rowId: string) => {
    const block = blocksRef.current.find(b => b.id === blockId)
    if (!block) return
    const currentRows = block.tableRows || []
    if (currentRows.length <= 1) return
    const newRows = currentRows.filter(r => r.id !== rowId)
    updateBlock(blockId, { tableRows: newRows })
  }

  const updateTableRow = (blockId: string, rowId: string, updates: Partial<KeyValueItem>) => {
    const block = blocksRef.current.find(b => b.id === blockId)
    if (!block) return
    const currentRows = block.tableRows || []
    const newRows = currentRows.map(r => r.id === rowId ? { ...r, ...updates } : r)
    updateBlock(blockId, { tableRows: newRows })
  }

  const handleFormatTableRow = (blockId: string, rowId: string, type: 'bold' | 'italic' | 'underline') => {
    const textarea = document.getElementById(`textarea-row-${rowId}`) as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const block = blocksRef.current.find(b => b.id === blockId)
    if (!block) return
    const row = (block.tableRows || []).find(r => r.id === rowId)
    if (!row) return

    const val = row.value
    const selectedText = val.substring(start, end)
    
    let wrapper = ''
    if (type === 'bold') wrapper = '**'
    if (type === 'italic') wrapper = '*'
    if (type === 'underline') wrapper = '__'

    const finalInsert = wrapper + selectedText + wrapper
    const newValue = val.substring(0, start) + finalInsert + val.substring(end)
    
    updateTableRow(blockId, rowId, { value: newValue })
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start + finalInsert.length)
    }, 0)
  }

  const handleFormat = (blockId: string, type: 'bold' | 'italic' | 'underline') => {
    const textarea = document.getElementById(`textarea-${blockId}`) as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const block = blocks.find(b => b.id === blockId)
    if (!block) return

    const val = block.content
    const selectedText = val.substring(start, end)
    
    let wrapper = ''
    if (type === 'bold') wrapper = '**'
    if (type === 'italic') wrapper = '*'
    if (type === 'underline') wrapper = '__'

    const finalInsert = wrapper + selectedText + wrapper
    const newValue = val.substring(0, start) + finalInsert + val.substring(end)
    
    updateBlock(blockId, { content: newValue })
    
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start, start + finalInsert.length)
    }, 0)
  }

  const addBlock = (index: number) => {
    const newBlock: Block = { id: generateId(), type: 'indent', prefix: '', content: '' }
    const newBlocks = [...blocksRef.current]
    newBlocks.splice(index + 1, 0, newBlock)
    
    blocksRef.current = newBlocks
    setBlocks(newBlocks)
    notifyChange(newBlocks)
  }

  const removeBlock = (id: string) => {
    if (blocksRef.current.length <= 1) return
    const newBlocks = blocksRef.current.filter(b => b.id !== id)
    
    blocksRef.current = newBlocks
    setBlocks(newBlocks)
    notifyChange(newBlocks)
  }

  const getPlaceholder = (type: BlockType) => {
    switch (type) {
      case 'indent': return 'Ketik paragraf (otomatis menjorok ke dalam saat dicetak)...'
      case 'no-indent': return 'Ketik paragraf (rata kiri)...'
      case 'list-1': return 'Ketik poin utama...'
      case 'list-2': return 'Ketik sub-poin...'
      case 'list-3': return 'Ketik sub-sub-poin...'
      default: return 'Ketik sesuatu...'
    }
  }

  return (
    <div className="space-y-1.5">
      {blocks.map((block, index) => (
        <div key={block.id} className="relative flex items-start gap-1.5 group rounded-md border border-transparent hover:border-slate-200 hover:bg-slate-50/50 p-1 -mx-1 transition-colors">
          
          <div className="flex flex-col gap-1 opacity-20 group-hover:opacity-100 transition-opacity pt-1">
            <button type="button" className="cursor-grab text-slate-400 hover:text-slate-600">
              <GripVertical className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 flex gap-1.5">
            
            {/* Type Selector Dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger className="inline-flex h-7 items-center justify-center rounded-sm border border-slate-200 bg-white px-1.5 text-xs font-medium shadow-sm hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-slate-300 shrink-0">
                {block.type === 'indent' && <Indent className="w-3.5 h-3.5" />}
                {block.type === 'no-indent' && <AlignLeft className="w-3.5 h-3.5" />}
                {block.type === 'list-1' && <span className="font-mono font-bold text-[10px]">1.</span>}
                {block.type === 'list-2' && <span className="font-mono font-bold text-[10px]">a.</span>}
                {block.type === 'list-3' && <span className="font-mono font-bold text-[10px]">1)</span>}
                {block.type === 'table-kv' && <Table className="w-3.5 h-3.5 text-blue-600" />}
                <ChevronDown className="w-2.5 h-2.5 ml-1 opacity-50" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56">
                <DropdownMenuItem onClick={() => handleTypeChange(block.id, 'indent')}>
                  <Indent className="w-4 h-4 mr-2 opacity-70" /> Paragraf Biasa
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTypeChange(block.id, 'no-indent')}>
                  <AlignLeft className="w-4 h-4 mr-2 opacity-70" /> Paragraf Rata Kiri
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTypeChange(block.id, 'list-1')}>
                  <span className="font-mono font-bold text-xs w-4 inline-block text-center mr-2 opacity-70">1.</span> Poin Utama
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTypeChange(block.id, 'list-2')}>
                  <span className="font-mono font-bold text-xs w-4 inline-block text-center mr-2 opacity-70">a.</span> Sub Poin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTypeChange(block.id, 'list-3')}>
                  <span className="font-mono font-bold text-xs w-4 inline-block text-center mr-2 opacity-70">1)</span> Sub-Sub Poin
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleTypeChange(block.id, 'table-kv')}>
                  <Table className="w-4 h-4 mr-2 text-blue-600" /> Tabel Rincian (Rata Titik Dua)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="flex-1 flex gap-1.5">
              {/* Prefix Input for Lists */}
              {(block.type === 'list-1' || block.type === 'list-2' || block.type === 'list-3') && (
                <input
                  type="text"
                  value={block.prefix}
                  onChange={(e) => updateBlock(block.id, { prefix: e.target.value })}
                  className={cn(
                    "h-7 px-1.5 text-xs text-center border border-slate-200 rounded-sm focus:outline-none focus:ring-1 focus:ring-slate-400 shrink-0 font-mono font-semibold bg-slate-50",
                    block.type === 'list-1' ? 'w-8' : block.type === 'list-2' ? 'w-8 ml-6' : 'w-8 ml-12'
                  )}
                />
              )}

              {block.type === 'table-kv' ? (
                <div className="flex-1 space-y-2 bg-slate-50/80 p-3 rounded-lg border border-slate-200">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600">
                    <span>Tabel Rincian (Format Rata Titik Dua)</span>
                  </div>
                  {(block.tableRows || []).map((row) => (
                    <div key={row.id} className="flex items-start gap-1.5 group/tablerow">
                      <Input
                        value={row.key}
                        onChange={(e) => updateTableRow(block.id, row.id, { key: e.target.value })}
                        placeholder="Hari / tanggal"
                        className="w-32 sm:w-44 h-8 text-xs font-medium shrink-0 bg-white"
                      />
                      <span className="py-1 font-bold text-slate-400 text-sm shrink-0">:</span>
                      <div className="flex-1 relative group/valarea">
                        <Textarea
                          id={`textarea-row-${row.id}`}
                          value={row.value}
                          onChange={(e) => updateTableRow(block.id, row.id, { value: e.target.value })}
                          placeholder="Ketik isi rincian..."
                          className="min-h-[32px] text-xs py-1.5 px-2 resize-none overflow-hidden bg-white border-slate-200 focus-visible:ring-1 focus-visible:ring-slate-400 leading-relaxed shadow-none"
                          onInput={(e) => {
                            const target = e.target as HTMLTextAreaElement
                            target.style.height = '32px'
                            target.style.height = `${target.scrollHeight}px`
                          }}
                        />
                        {/* Format buttons for row value */}
                        <div className="absolute top-1 right-1 flex bg-white border border-slate-200 rounded shadow-sm opacity-0 group-hover/valarea:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormatTableRow(block.id, row.id, 'bold')}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            title="Tebal (Bold)"
                          >
                            <Bold className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormatTableRow(block.id, row.id, 'italic')}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-l border-slate-200"
                            title="Miring (Italic)"
                          >
                            <Italic className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => handleFormatTableRow(block.id, row.id, 'underline')}
                            className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-l border-slate-200"
                            title="Garis Bawah (Underline)"
                          >
                            <Underline className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                      {(block.tableRows || []).length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50 shrink-0"
                          onClick={() => removeTableRow(block.id, row.id)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-1 h-7 text-xs bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                    onClick={() => addTableRow(block.id)}
                  >
                    <Plus className="w-3.5 h-3.5 mr-1" /> Tambah Baris Rincian
                  </Button>
                </div>
              ) : (
                <div className="flex-1 relative group/textarea">
                  <Textarea
                    id={`textarea-${block.id}`}
                    value={block.content}
                    onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                    placeholder={getPlaceholder(block.type)}
                    className={cn(
                      "min-h-[28px] text-sm py-1 px-1.5 resize-none overflow-hidden bg-transparent border-transparent hover:border-slate-200 focus-visible:ring-1 focus-visible:bg-white leading-relaxed shadow-none",
                      block.type === 'indent' ? "indent-8 text-slate-700" : "pl-1.5",
                      block.type === 'no-indent' && "pl-1.5 text-slate-700"
                    )}
                    onInput={(e) => {
                      const target = e.target as HTMLTextAreaElement
                      target.style.height = '28px'
                      target.style.height = `${target.scrollHeight}px`
                    }}
                  />
                  
                  {/* Formatting Toolbar */}
                  <div className="absolute top-1 right-1 flex bg-white border border-slate-200 rounded shadow-sm opacity-0 group-hover/textarea:opacity-100 transition-opacity">
                    <button 
                      type="button" 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleFormat(block.id, 'bold')}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      title="Tebal (Bold)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button" 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleFormat(block.id, 'italic')}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-l border-slate-200"
                      title="Miring (Italic)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      type="button" 
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleFormat(block.id, 'underline')}
                      className="p-1 text-slate-500 hover:text-slate-900 hover:bg-slate-100 border-l border-slate-200"
                      title="Garis Bawah (Underline)"
                    >
                      <Underline className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity pt-1">
            <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeBlock(block.id)}>
              <Trash2 className="w-4 h-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon" className="w-7 h-7 text-slate-500 hover:bg-slate-100" onClick={() => addBlock(index)}>
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" className="w-full mt-2 h-10 text-slate-500 border-dashed" onClick={() => addBlock(blocks.length - 1)}>
        <Plus className="w-4 h-4 mr-2" /> Tambah Paragraf Baru
      </Button>
    </div>
  )
}

