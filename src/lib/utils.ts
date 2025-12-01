import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format number as Indian Rupee with proper formatting
 * @param amount - The amount to format
 * @param showSymbol - Whether to show ₹ symbol (default: true)
 * @returns Formatted string like ₹1,23,456.00
 */
export function formatINR(amount: number, showSymbol: boolean = true): string {
  const isNegative = amount < 0;
  const absAmount = Math.abs(amount);
  
  // Format with 2 decimal places
  const [integerPart, decimalPart] = absAmount.toFixed(2).split('.');
  
  // Indian number system formatting (lakhs and crores)
  let lastThree = integerPart.substring(integerPart.length - 3);
  const otherNumbers = integerPart.substring(0, integerPart.length - 3);
  
  if (otherNumbers !== '') {
    lastThree = ',' + lastThree;
  }
  
  const formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
  
  const result = `${formatted}.${decimalPart}`;
  const symbol = showSymbol ? '₹' : '';
  
  return isNegative ? `-${symbol}${result}` : `${symbol}${result}`;
}

