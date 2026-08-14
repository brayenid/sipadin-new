"use client"

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { TextStyle } from '@tiptap/extension-text-style'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import Superscript from '@tiptap/extension-superscript'
import Subscript from '@tiptap/extension-subscript'
import FontFamily from '@tiptap/extension-font-family'
import { Table } from '@tiptap/extension-table'
import { TableRow } from '@tiptap/extension-table-row'
import { TableCell } from '@tiptap/extension-table-cell'
import { TableHeader } from '@tiptap/extension-table-header'
import { useEffect, useState, useRef } from 'react'
import './tiptap.css'
import { Button } from '@/components/ui/button'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Heading1,
  Heading2,
  Heading3,
  Table as TableIcon,
  Plus,
  Trash2,
  Undo,
  Redo,
  Highlighter,
  Palette,
  Superscript as SuperIcon,
  Subscript as SubIcon,
  Minus,
  RemoveFormatting,
  Indent,
  Outdent,
  Type
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

interface TiptapEditorProps {
  value: string
  onChange: (html: string) => void
}

const FONT_FAMILIES = [
  { name: 'Default (Sans-serif)', value: '' },
  { name: 'Arial', value: 'Arial, sans-serif' },
  { name: 'Times New Roman', value: '"Times New Roman", Times, serif' },
  { name: 'Calibri', value: 'Calibri, sans-serif' },
  { name: 'Georgia', value: 'Georgia, serif' },
  { name: 'Courier New', value: '"Courier New", Courier, monospace' },
]

const TEXT_COLORS = [
  { label: 'Hitam', value: '#000000' },
  { label: 'Abu Gelap', value: '#334155' },
  { label: 'Biru', value: '#2563eb' },
  { label: 'Merah', value: '#dc2626' },
  { label: 'Hijau', value: '#16a34a' },
  { label: 'Ungu', value: '#9333ea' },
]

const HIGHLIGHT_COLORS = [
  { label: 'Kuning', value: '#fef08a' },
  { label: 'Hijau Muda', value: '#bbf7d0' },
  { label: 'Biru Muda', value: '#bae6fd' },
  { label: 'Merah Muda', value: '#fecdd3' },
  { label: 'Oranye Muda', value: '#fed7aa' },
]

export function TiptapEditor({ value, onChange }: TiptapEditorProps) {
  const [leftMargin, setLeftMargin] = useState(7)
  const [rightMargin, setRightMargin] = useState(7)
  const [dragging, setDragging] = useState<'left' | 'right' | null>(null)
  const rulerRef = useRef<HTMLDivElement>(null)

  // Handle global mouse move & mouse up for smooth dragging
  useEffect(() => {
    if (!dragging) return

    const handleMouseMove = (e: MouseEvent) => {
      if (!rulerRef.current) return
      const rect = rulerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const pct = Math.max(3, Math.min(30, (x / rect.width) * 100))

      if (dragging === 'left') {
        setLeftMargin(pct)
      } else if (dragging === 'right') {
        const rightPct = Math.max(3, Math.min(30, ((rect.right - e.clientX) / rect.width) * 100))
        setRightMargin(rightPct)
      }
    }

    const handleMouseUp = () => {
      setDragging(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragging])
  useEffect(() => {
    const styleId = 'tiptap-injected-styles'
    let styleEl = document.getElementById(styleId) as HTMLStyleElement | null
    if (!styleEl) {
      styleEl = document.createElement('style')
      styleEl.id = styleId
      document.head.appendChild(styleEl)
    }
    styleEl.innerHTML = `
      /* Word Canvas Base */
      .word-page-container {
        background-color: #f1f5f9;
        padding: 1.25rem 0.75rem;
        display: flex;
        justify-content: center;
        min-height: 500px;
      }
      @media (min-width: 640px) {
        .word-page-container {
          padding: 1.5rem 1.25rem;
        }
      }
      .word-page {
        background: #ffffff;
        box-shadow: 0 4px 12px -2px rgba(0,0,0,0.08), 0 2px 6px -2px rgba(0,0,0,0.04), 0 0 0 1px rgba(0,0,0,0.06);
        border-radius: 4px;
        width: 100%;
        max-width: 900px;
        min-height: 700px;
        padding-top: 2.5rem;
        padding-bottom: 3.5rem;
        box-sizing: border-box;
      }

      /* ProseMirror Editor Styles */
      .tiptap {
        outline: none !important;
        min-height: 600px;
        color: #1e293b;
        font-size: 10pt;
        line-height: 1.6;
        font-family: inherit;
      }

      /* Headings */
      .tiptap h1 {
        font-size: 13pt !important;
        font-weight: 700 !important;
        margin-top: 1.25rem !important;
        margin-bottom: 0.5rem !important;
        color: #0f172a !important;
        line-height: 1.3 !important;
      }
      .tiptap h2 {
        font-size: 11.5pt !important;
        font-weight: 700 !important;
        margin-top: 1rem !important;
        margin-bottom: 0.375rem !important;
        color: #1e293b !important;
        line-height: 1.35 !important;
      }
      .tiptap h3 {
        font-size: 10.5pt !important;
        font-weight: 600 !important;
        margin-top: 0.75rem !important;
        margin-bottom: 0.25rem !important;
        color: #334155 !important;
      }

      /* Paragraphs */
      .tiptap p {
        margin-top: 0 !important;
        margin-bottom: 0.5rem !important;
      }

      /* Ordered List CSS Counter */
      .tiptap ol, .ProseMirror ol {
        counter-reset: tiptap-num !important;
        list-style: none !important;
        padding-left: 0 !important;
        margin: 0.35rem 0 !important;
      }
      .tiptap ol > li, .ProseMirror ol > li {
        counter-increment: tiptap-num !important;
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: baseline !important;
        margin: 0.25rem 0 !important;
        list-style: none !important;
      }
      .tiptap ol > li::before, .ProseMirror ol > li::before {
        content: counter(tiptap-num) "." !important;
        font-weight: 600 !important;
        width: 1.5rem !important;
        min-width: 1.5rem !important;
        max-width: 1.5rem !important;
        color: #334155 !important;
        flex-shrink: 0 !important;
        user-select: none !important;
      }

      /* Bullet List */
      .tiptap ul, .ProseMirror ul {
        list-style: none !important;
        padding-left: 0 !important;
        margin: 0.35rem 0 !important;
      }
      .tiptap ul > li, .ProseMirror ul > li {
        display: flex !important;
        flex-wrap: wrap !important;
        align-items: baseline !important;
        margin: 0.25rem 0 !important;
        list-style: none !important;
      }
      .tiptap ul > li::before, .ProseMirror ul > li::before {
        content: "•" !important;
        font-weight: 700 !important;
        font-size: 1.1rem !important;
        line-height: 1.2 !important;
        width: 1.25rem !important;
        min-width: 1.25rem !important;
        max-width: 1.25rem !important;
        color: #475569 !important;
        flex-shrink: 0 !important;
        user-select: none !important;
      }

      /* Nested Lists Wrap & Indentation */
      .tiptap li > ol,
      .tiptap li > ul,
      .ProseMirror li > ol,
      .ProseMirror li > ul {
        flex-basis: 100% !important;
        width: 100% !important;
        margin-left: 1.5rem !important;
        margin-top: 0.25rem !important;
        padding-left: 0 !important;
      }

      .tiptap ol ol, .ProseMirror ol ol {
        counter-reset: tiptap-alpha !important;
      }
      .tiptap ol ol > li, .ProseMirror ol ol > li {
        counter-increment: tiptap-alpha !important;
      }
      .tiptap ol ol > li::before, .ProseMirror ol ol > li::before {
        content: counter(tiptap-alpha, lower-alpha) "." !important;
        font-weight: 600 !important;
        width: 1.35rem !important;
        min-width: 1.35rem !important;
        max-width: 1.35rem !important;
        flex-shrink: 0 !important;
        color: #334155 !important;
      }

      .tiptap ul ul > li::before, .ProseMirror ul ul > li::before,
      .tiptap ol ul > li::before, .ProseMirror ol ul > li::before {
        content: "◦" !important;
        width: 1.25rem !important;
        min-width: 1.25rem !important;
      }

      .tiptap li > p, .ProseMirror li > p {
        margin: 0 !important;
        flex: 1 1 0% !important;
        min-width: 0 !important;
      }

      /* Tables */
      .tiptap table {
        border-collapse: collapse !important;
        table-layout: fixed !important;
        width: 100% !important;
        margin: 1rem 0 !important;
        overflow: hidden !important;
      }
      .tiptap td, .tiptap th {
        min-width: 1em !important;
        border: 1px solid #94a3b8 !important;
        padding: 0.5rem 0.75rem !important;
        vertical-align: top !important;
        box-sizing: border-box !important;
        position: relative !important;
        font-size: 9pt;
      }
      .tiptap th {
        font-weight: 700 !important;
        text-align: left !important;
        background-color: #f8fafc !important;
      }
      .tiptap .selectedCell:after {
        z-index: 2;
        position: absolute;
        content: "";
        left: 0; right: 0; top: 0; bottom: 0;
        background: rgba(200, 200, 255, 0.4);
        pointer-events: none;
      }

      /* Text Alignment */
      .tiptap [style*="text-align: center"] { text-align: center !important; }
      .tiptap [style*="text-align: right"] { text-align: right !important; }
      .tiptap [style*="text-align: justify"] { text-align: justify !important; }
      .tiptap [style*="text-align: left"] { text-align: left !important; }
    `
  }, [])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      Superscript,
      Subscript,
      FontFamily,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
        defaultAlignment: 'left',
      }),
      Table.configure({
        resizable: true,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: value || '',
    editorProps: {
      attributes: {
        class: 'tiptap focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value || '')
    }
  }, [value, editor])

  if (!editor) {
    return null
  }

  const addTable = () => {
    editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()
  }

  return (
    <div className="border border-slate-300/80 rounded-xl overflow-hidden bg-white shadow-sm">
      {/* Microsoft Word Style Ribbon Toolbar */}
      <div className="bg-slate-50 border-b border-slate-200 p-2 space-y-1.5 select-none">
        {/* Row 1: Font, Style, Formatting */}
        <div className="flex flex-wrap items-center gap-1">
          {/* Undo / Redo */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200/70"
            title="Undo (Ctrl+Z)"
          >
            <Undo className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200/70"
            title="Redo (Ctrl+Y)"
          >
            <Redo className="w-4 h-4" />
          </Button>

          <div className="w-[1px] h-6 bg-slate-300 mx-1" />

          {/* Font Family Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 px-2.5 text-xs font-medium gap-1 bg-white border border-slate-300 rounded-md inline-flex items-center hover:bg-slate-50">
              <Type className="w-3.5 h-3.5 text-slate-500 mr-1" />
              <span>Font</span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 bg-white">
              {FONT_FAMILIES.map((font) => (
                <DropdownMenuItem
                  key={font.name}
                  onClick={() => font.value ? editor.chain().focus().setFontFamily(font.value).run() : editor.chain().focus().unsetFontFamily().run()}
                  className="text-xs cursor-pointer"
                  style={{ fontFamily: font.value || 'inherit' }}
                >
                  {font.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Heading Style Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 px-2.5 text-xs font-medium gap-1 bg-white border border-slate-300 rounded-md inline-flex items-center hover:bg-slate-50">
              <span>
                {editor.isActive('heading', { level: 1 })
                  ? 'Judul Utama (H1)'
                  : editor.isActive('heading', { level: 2 })
                  ? 'Sub Judul (H2)'
                  : editor.isActive('heading', { level: 3 })
                  ? 'Sub-sub Judul (H3)'
                  : 'Normal'}
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44 bg-white">
              <DropdownMenuItem onClick={() => editor.chain().focus().setParagraph().run()} className="text-xs cursor-pointer">
                Normal (Paragraf)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className="text-sm font-bold cursor-pointer">
                Judul Utama (H1)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className="text-xs font-bold cursor-pointer">
                Sub Judul (H2)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} className="text-xs font-semibold cursor-pointer">
                Sub-sub Judul (H3)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="w-[1px] h-6 bg-slate-300 mx-1" />

          {/* Basic Text Formatting */}
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('bold') ? 'bg-slate-200 text-slate-900 font-bold' : 'text-slate-700'}`}
            title="Tebal (Ctrl+B)"
          >
            <Bold className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('italic') ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
            title="Miring (Ctrl+I)"
          >
            <Italic className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('underline') ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
            title="Garis Bawah (Ctrl+U)"
          >
            <UnderlineIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('strike') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleStrike().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('strike') ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
            title="Coret (Strikethrough)"
          >
            <Strikethrough className="w-4 h-4" />
          </Button>

          {/* Superscript / Subscript */}
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('superscript') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleSuperscript().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('superscript') ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
            title="Superscript (X²)"
          >
            <SuperIcon className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('subscript') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleSubscript().run()}
            className={`h-8 w-8 p-0 ${editor.isActive('subscript') ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
            title="Subscript (X₂)"
          >
            <SubIcon className="w-4 h-4" />
          </Button>

          <div className="w-[1px] h-6 bg-slate-300 mx-1" />

          {/* Text Color Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-slate-700 hover:bg-slate-200/70" title="Warna Teks">
              <Palette className="w-4 h-4 text-blue-600" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="p-2 bg-white flex gap-1.5 shadow-md border border-slate-200">
              {TEXT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => editor.chain().focus().setColor(c.value).run()}
                  className="w-6 h-6 rounded-full border border-slate-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetColor().run()}
                className="px-2 py-0.5 text-[10px] text-slate-600 border border-slate-300 rounded hover:bg-slate-100"
                title="Reset Warna"
              >
                Reset
              </button>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Highlight Color Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="h-8 w-8 p-0 inline-flex items-center justify-center rounded-md text-slate-700 hover:bg-slate-200/70" title="Stabilo / Highlight">
              <Highlighter className="w-4 h-4 text-amber-500" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="p-2 bg-white flex gap-1.5 shadow-md border border-slate-200">
              {HIGHLIGHT_COLORS.map((c) => (
                <button
                  key={c.value}
                  type="button"
                  onClick={() => editor.chain().focus().toggleHighlight({ color: c.value }).run()}
                  className="w-6 h-6 rounded-full border border-slate-300 hover:scale-110 transition-transform"
                  style={{ backgroundColor: c.value }}
                  title={c.label}
                />
              ))}
              <button
                type="button"
                onClick={() => editor.chain().focus().unsetHighlight().run()}
                className="px-2 py-0.5 text-[10px] text-slate-600 border border-slate-300 rounded hover:bg-slate-100"
                title="Hapus Highlight"
              >
                Hapus
              </button>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Formatting */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
            className="h-8 w-8 p-0 text-slate-600 hover:bg-slate-200/70 ml-auto"
            title="Hapus Semua Format (Clear Formatting)"
          >
            <RemoveFormatting className="w-4 h-4 text-rose-500" />
          </Button>
        </div>

        {/* Row 2: Paragraph Alignment, Lists, Tables */}
        <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-slate-200/70">
          {/* Alignments: Left, Center, Right, Justify */}
          <Button
            type="button"
            size="sm"
            variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'left' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
            title="Rata Kiri (Align Left)"
          >
            <AlignLeft className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'center' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
            title="Rata Tengah (Align Center)"
          >
            <AlignCenter className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'right' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
            title="Rata Kanan (Align Right)"
          >
            <AlignRight className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant={editor.isActive({ textAlign: 'justify' }) ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().setTextAlign('justify').run()}
            className={`h-8 w-8 p-0 ${editor.isActive({ textAlign: 'justify' }) ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
            title="Rata Kiri-Kanan (Justify)"
          >
            <AlignJustify className="w-4 h-4" />
          </Button>

          <div className="w-[1px] h-6 bg-slate-300 mx-1" />

          {/* List: Numbered & Bullet */}
          <Button
            type="button"
            size="sm"
            variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`h-8 px-2 text-xs font-medium gap-1 ${editor.isActive('orderedList') ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
            title="Daftar Angka (1., 2., 3.)"
          >
            <ListOrdered className="w-4 h-4" />
            <span>Nomor</span>
          </Button>

          <Button
            type="button"
            size="sm"
            variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`h-8 px-2 text-xs font-medium gap-1 ${editor.isActive('bulletList') ? 'bg-slate-200 text-slate-900' : 'text-slate-700'}`}
            title="Daftar Bullet (•)"
          >
            <List className="w-4 h-4" />
            <span>Bullet</span>
          </Button>

          {/* Indent / Outdent */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().sinkListItem('listItem').run()}
            disabled={!editor.can().sinkListItem('listItem')}
            className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200/70"
            title="Tambah Indentasi (Tab / Geser Kanan)"
          >
            <Indent className="w-4 h-4" />
          </Button>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().liftListItem('listItem').run()}
            disabled={!editor.can().liftListItem('listItem')}
            className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200/70"
            title="Kurangi Indentasi (Shift+Tab / Geser Kiri)"
          >
            <Outdent className="w-4 h-4" />
          </Button>

          <div className="w-[1px] h-6 bg-slate-300 mx-1" />

          {/* Insert Table */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={addTable}
            className="h-8 px-2.5 text-xs text-slate-700 hover:bg-slate-200/70"
            title="Sisipkan Tabel (3x3)"
          >
            <TableIcon className="w-4 h-4 mr-1 text-emerald-600" />
            <span>Tabel</span>
          </Button>

          {/* Table Operations if Table is Active */}
          {editor.isActive('table') && (
            <div className="flex items-center gap-1 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().addColumnAfter().run()}
                className="h-6 px-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                title="Tambah Kolom"
              >
                +Kolom
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().deleteColumn().run()}
                className="h-6 px-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                title="Hapus Kolom"
              >
                -Kolom
              </Button>
              <div className="w-[1px] h-4 bg-emerald-300 mx-0.5" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().addRowAfter().run()}
                className="h-6 px-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                title="Tambah Baris"
              >
                +Baris
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().deleteRow().run()}
                className="h-6 px-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                title="Hapus Baris"
              >
                -Baris
              </Button>
              <div className="w-[1px] h-4 bg-emerald-300 mx-0.5" />
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => editor.chain().focus().deleteTable().run()}
                className="h-6 px-1.5 text-[11px] font-medium text-rose-600 hover:bg-rose-50"
                title="Hapus Seluruh Tabel"
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            </div>
          )}

          {/* Horizontal Rule */}
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            className="h-8 w-8 p-0 text-slate-700 hover:bg-slate-200/70"
            title="Garis Pemisah Horizontal"
          >
            <Minus className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Word Horizontal Ruler (Interactive Draggable) */}
      <div className="bg-slate-100/90 border-b border-slate-200 px-4 sm:px-8 py-1.5 flex justify-center select-none overflow-x-auto relative">
        <div
          ref={rulerRef}
          className="w-full max-w-[900px] h-6 bg-slate-200/90 border border-slate-300 rounded flex items-center relative shadow-xs"
        >
          {/* Left Margin Shadow Area */}
          <div
            style={{ width: `${leftMargin}%` }}
            className="h-full bg-slate-300/90 border-r border-slate-400/90 flex items-center justify-end relative transition-none"
          >
            {/* Left Margin Draggable Marker (Word style) */}
            <div
              onMouseDown={(e) => {
                e.preventDefault()
                setDragging('left')
              }}
              className="absolute -right-2 top-0 bottom-0 w-4 flex flex-col items-center justify-center cursor-ew-resize group z-20"
              title="Tarik untuk mengubah Margin Kiri"
            >
              {/* First Line Indent Marker */}
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[5px] border-t-slate-800 group-hover:border-t-blue-600 transition-colors" />
              {/* Left Indent Marker */}
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-slate-800 mt-1 group-hover:border-b-blue-600 transition-colors" />
              <div className="w-2.5 h-1 bg-slate-800 rounded-[1px] group-hover:bg-blue-600 transition-colors" />
            </div>
          </div>

          {/* Printable Document Area Scale */}
          <div
            style={{ width: `${100 - leftMargin - rightMargin}%` }}
            className="h-full bg-white relative flex items-center overflow-hidden transition-none"
          >
            {/* Centimeter Tick Marks (1 to 16) */}
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 flex flex-col justify-between pointer-events-none"
                style={{ left: `${((i + 1) / 16) * 100}%` }}
              >
                <span className="text-[9px] font-semibold text-slate-500 -translate-x-1/2 pt-0.5 leading-none font-mono">
                  {i + 1}
                </span>
                <div className="w-[1px] h-2 bg-slate-400 -translate-x-1/2" />
              </div>
            ))}
            {/* Sub-ticks (every half cm) */}
            {Array.from({ length: 16 }).map((_, i) => (
              <div
                key={`sub-${i}`}
                className="absolute bottom-0 w-[1px] h-1 bg-slate-300 -translate-x-1/2 pointer-events-none"
                style={{ left: `${((i + 0.5) / 16) * 100}%` }}
              />
            ))}
          </div>

          {/* Right Margin Shadow Area */}
          <div
            style={{ width: `${rightMargin}%` }}
            className="h-full bg-slate-300/90 border-l border-slate-400/90 flex items-center justify-start relative transition-none"
          >
            {/* Right Margin Draggable Marker (Word style) */}
            <div
              onMouseDown={(e) => {
                e.preventDefault()
                setDragging('right')
              }}
              className="absolute -left-2 top-0 bottom-0 w-4 flex flex-col items-center justify-end pb-0.5 cursor-ew-resize group z-20"
              title="Tarik untuk mengubah Margin Kanan"
            >
              <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[5px] border-b-slate-800 group-hover:border-b-blue-600 transition-colors" />
              <div className="w-2.5 h-1 bg-slate-800 rounded-[1px] group-hover:bg-blue-600 transition-colors" />
            </div>
          </div>
        </div>
      </div>

      {/* Word-Like Document Canvas (Lembar Kertas A4 View) */}
      <div className="word-page-container relative">
        {/* Dynamic Margin Guideline during Dragging */}
        {dragging && (
          <div className="absolute inset-0 flex justify-center pointer-events-none z-30">
            <div className="w-full max-w-[900px] h-full relative">
              {dragging === 'left' && (
                <div
                  className="absolute top-0 bottom-0 border-r-2 border-dashed border-blue-500 z-30"
                  style={{ left: `${leftMargin}%` }}
                />
              )}
              {dragging === 'right' && (
                <div
                  className="absolute top-0 bottom-0 border-l-2 border-dashed border-blue-500 z-30"
                  style={{ right: `${rightMargin}%` }}
                />
              )}
            </div>
          </div>
        )}

        <div
          className="word-page transition-none"
          style={{
            paddingLeft: `${leftMargin}%`,
            paddingRight: `${rightMargin}%`,
          }}
        >
          <EditorContent editor={editor} />
        </div>
      </div>
    </div>
  )
}
