import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateChargeAmount(
  productCost: number,
  markupPercent: number,
  wasteFactorPercent: number,
  bowlFee: number,
  roundingAmount: number
): number {
  if (productCost <= 0) return 0;
  const withMarkup = productCost * (1 + markupPercent / 100);
  const withWaste = withMarkup * (1 + wasteFactorPercent / 100);
  const withBowlFee = withWaste + bowlFee;
  return Math.round(withBowlFee / roundingAmount) * roundingAmount;
}

export function calculateServiceCharge(
  productCost: number,
  backbarMultiplier: number,
  wasteFactorPercent: number,
  bowlFee: number,
  roundingAmount: number
): number {
  if (productCost <= 0) return 0;
  const productCharge = productCost * backbarMultiplier;
  const withWaste = productCharge * (1 + wasteFactorPercent / 100);
  const withBowlFee = withWaste + bowlFee;
  return Math.round(withBowlFee / roundingAmount) * roundingAmount;
}