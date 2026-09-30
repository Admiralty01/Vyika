import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(
  amount: number | string,
  currencyCode: string = "USD",
  symbol: string = "$"
): string {
  const numericAmount = typeof amount === "string" ? parseFloat(amount) : Number(amount);
  if (isNaN(numericAmount)) return `${symbol}0.00`;
  
  return `${symbol}${numericAmount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currencyCode !== "USD" ? currencyCode : ""}`.trim();
}

export function formatDate(dateString: string): string {
  if (!dateString) return "-";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
