/**
 * Pure per-session financial breakdown. Mirrors the per-stylist math in useReportsData
 * so a single session expands to the same buckets owners see in aggregate reports.
 */

import { convertAmountBetweenUnits } from "@/lib/units";


export interface SessionFinancialsInput {
  productCost: number; // wholesale total (colors + developers, after unit conversion)
  bowlCount: number;
  totalColorUsed: number; // in service's color_unit
  totalDevUsed: number; // in service's developer_unit
  service: {
    price: number;
    color_amount: number;
    color_unit: string;
    developer_amount: number;
    developer_unit: string;
  } | null;
  settings: {
    bowl_fee: number;
    backbar_multiplier: number;
    /** Waste factor % — matches in-session live preview. */
    waste_factor_percent?: number;
  };
}

export interface SessionFinancials {
  charged: number;
  productCost: number;
  laborCharge: number; // service-fee portion that pays stylist time
  productMarkup: number; // backbar / overage markup (includes waste factor)
  bowlFee: number;
  salonKeeps: number; // charged − productCost
}

export function computeSessionFinancials(input: SessionFinancialsInput): SessionFinancials {
  const { productCost, bowlCount, totalColorUsed, totalDevUsed, service, settings } = input;
  const bowlFee = bowlCount * (settings.bowl_fee || 0);
  const mult = settings.backbar_multiplier || 1;
  const wasteMul = 1 + (settings.waste_factor_percent || 0) / 100;

  let charged = 0;
  let laborCharge = 0;
  let productMarkup = 0;

  if (service) {
    const colorOverage = Math.max(0, totalColorUsed - service.color_amount);
    const devOverage = Math.max(0, totalDevUsed - service.developer_amount);
    // Normalize to grams before combining - color/developer may use different units.
    const colorOverageG = convertAmountBetweenUnits(colorOverage, service.color_unit, 'g');
    const devOverageG = convertAmountBetweenUnits(devOverage, service.developer_unit, 'g');
    const totalUsedG = convertAmountBetweenUnits(totalColorUsed, service.color_unit, 'g')
      + convertAmountBetweenUnits(totalDevUsed, service.developer_unit, 'g');
    if (totalUsedG > 0 && (colorOverageG + devOverageG) > 0) {
      const overageRatio = (colorOverageG + devOverageG) / totalUsedG;
      productMarkup = productCost * overageRatio * mult * wasteMul;
    }
    laborCharge = service.price;
    charged = service.price + productMarkup + bowlFee;
  } else {
    const productCharge = productCost * mult * wasteMul;
    productMarkup = productCharge - productCost; // markup portion only
    laborCharge = 0;
    charged = productCharge + bowlFee;
  }

  const salonKeeps = charged - productCost;

  return {
    charged,
    productCost,
    laborCharge,
    productMarkup,
    bowlFee,
    salonKeeps,
  };
}
