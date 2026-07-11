import { describe, it, expect } from "vitest";
import { resolveEffectiveMultiplier, productChargeBase } from "./effectiveMultiplier";

describe("resolveEffectiveMultiplier — hierarchy", () => {
  const salonDefault = 2;

  it("A: no override -> salon default 2x -> $7 = $14", () => {
    const m = resolveEffectiveMultiplier({ has_custom_markup: false, custom_markup_percent: 0 }, salonDefault);
    expect(m).toBe(2);
    expect(productChargeBase(7, m)).toBe(14);
  });

  it("B: custom 3x overrides salon 2x -> $7 = $21", () => {
    const m = resolveEffectiveMultiplier({ has_custom_markup: true, custom_markup_percent: 3 }, salonDefault);
    expect(m).toBe(3);
    expect(productChargeBase(7, m)).toBe(21);
  });

  it("C: custom 4x -> $7 = $28", () => {
    const m = resolveEffectiveMultiplier({ has_custom_markup: true, custom_markup_percent: 4 }, salonDefault);
    expect(m).toBe(4);
    expect(productChargeBase(7, m)).toBe(28);
  });

  it("D: blank custom -> salon default 2x -> $10.50 = $21", () => {
    const m = resolveEffectiveMultiplier({ has_custom_markup: true, custom_markup_percent: "" as unknown as number }, salonDefault);
    expect(m).toBe(2);
    expect(productChargeBase(10.5, m)).toBe(21);
  });

  it("null / undefined stylist -> salon default", () => {
    expect(resolveEffectiveMultiplier(null, salonDefault)).toBe(2);
    expect(resolveEffectiveMultiplier(undefined, salonDefault)).toBe(2);
    expect(resolveEffectiveMultiplier({ has_custom_markup: true, custom_markup_percent: null }, salonDefault)).toBe(2);
  });

  it("override flag on but value 0 -> salon default (no $0 charge)", () => {
    const m = resolveEffectiveMultiplier({ has_custom_markup: true, custom_markup_percent: 0 }, salonDefault);
    expect(m).toBe(2);
    expect(productChargeBase(7, m)).toBe(14);
  });

  it("string custom '3' treated as number 3, not 300%", () => {
    const m = resolveEffectiveMultiplier({ has_custom_markup: true, custom_markup_percent: "3" }, salonDefault);
    expect(m).toBe(3);
    expect(productChargeBase(7, m)).toBe(21);
  });

  it("never silently 1x -> missing salon default falls back to safe 2, not 1", () => {
    expect(resolveEffectiveMultiplier(null, null)).toBe(2);
    expect(resolveEffectiveMultiplier(null, 0)).toBe(2);
  });

  it("does not combine: 2 default + 3 custom = 3, never 5 or 6", () => {
    const m = resolveEffectiveMultiplier({ has_custom_markup: true, custom_markup_percent: 3 }, 2);
    expect(m).toBe(3);
  });
});
