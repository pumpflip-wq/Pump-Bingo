import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { PROTOCOL_CONFIG } from "@shared/config";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, useSmartFormatting: boolean = true): string {
  const numericAmount = typeof amount === "string" ? parseInt(amount, 10) : amount;
  if (!numericAmount || numericAmount === 0) return "0";
  
  const decimals = PROTOCOL_CONFIG.DECIMALS || 6;
  const val = numericAmount / Math.pow(10, decimals);

  if (useSmartFormatting) {
    if (val >= 1000000) {
      return (val / 1000000).toFixed(1).replace(/\.?0+$/, "") + "M";
    }
    if (val >= 1000) {
      return (val / 1000).toFixed(1).replace(/\.?0+$/, "") + "K";
    }
    if (val < 1) {
      return val.toFixed(3).replace(/\.?0+$/, "");
    }
    return Math.floor(val).toLocaleString("en-US");
  }
  return val.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: decimals });
}

export function formatAddress(address: string) {
  if (!address || address === "No Winner") return address;
  if (address.length < 10) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
