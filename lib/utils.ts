import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: string | number | bigint): string {
  if (!amount) return "Rp 0";
  return "Rp " + amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function parseCurrency(amountString: string): string {
  if (!amountString) return "0";
  return amountString.replace(/\D/g, "");
}
