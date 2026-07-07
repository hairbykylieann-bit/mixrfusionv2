import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// (calculateChargeAmount removed 2026-07-06 — dead code from the old percent-markup pricing model.
//  Live pricing uses calculateServiceCharge + lib/reports/revenueEngine.)

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