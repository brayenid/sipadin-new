import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: string | number | bigint): string {
  if (!amount) return 'Rp 0'
  return 'Rp ' + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
}

export function parseCurrency(amountString: string): string {
  if (!amountString) return '0'
  return amountString.replace(/\D/g, '')
}

export function getDefaultNomorSuffix(prefix: string = '/Org-TU.P'): string {
  const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII']
  const date = new Date()
  return `${prefix}/${romanMonths[date.getMonth()]}/${date.getFullYear()}`
}

export function fmtDateId(d: Date | null) {
  if (!d) return ''
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(d)
}
