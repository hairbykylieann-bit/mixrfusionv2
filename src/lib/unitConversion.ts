/**
 * @deprecated LEGACY SHIM — do not add anything here.
 * All conversion logic lives in "@/lib/units". This file only re-exports so
 * older imports keep working. New code must import from "@/lib/units".
 */
export {
  convertToGrams,
  convertGramsToDisplayUnit,
  getUnitLabel,
} from "./units";
