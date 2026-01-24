import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, useSmartFormatting: boolean = true): string {
  const numericAmount = typeof amount === "string" ? parseInt(amount, 10) : amount;
  if (!numericAmount || numericAmount === 0) return "0";
  
  // Convert lamports to SOL for display
  const val = numericAmount / 1e9;

  if (useSmartFormatting) {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(2).replace(/\.?0+$/, "") + "M";
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(2).replace(/\.?0+$/, "") + "K";
    }
    // For small SOL amounts, show more precision (up to 4 decimals)
    return val.toFixed(4).replace(/\.?0+$/, "");
  }
  return val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 9 });
}

export function formatAddress(address: string) {
  if (!address || address === "No Winner") return address;
  if (address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
