import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number, useSmartFormatting: boolean = true): string {
  if (useSmartFormatting) {
    if (amount >= 1000000) {
      return (amount / 1000000).toFixed(1).replace(/\.0$/, "") + "M";
    }
    if (amount >= 10000) {
      return (amount / 1000).toFixed(1).replace(/\.0$/, "") + "K";
    }
  }
  return amount.toLocaleString("en-US");
}

export function formatAddress(address: string) {
  if (!address || address === "No Winner") return address;
  if (address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
