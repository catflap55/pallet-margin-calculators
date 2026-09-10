import { describe, expect, it } from "vitest";
import { calculateMargin, defaultMarginInputs } from "@/lib/calc/margin";
import { marginToMarkup, markupToMargin } from "@/lib/calc/pricing";

const clean = {
  ...defaultMarginInputs,
  insuranceRate: 0,
  handlingPerPallet: 0,
  shrinkRate: 0,
  daysInTransit: 0,
  annualCostOfCapital: 0,
  palletHirePerPallet: 0,
  dutyRate: 0,
};

describe("FMCG pallet margin calculator", () => {
  it("computes landed case cost and a 20% margin sell price from a clean pallet", () => {
    const result = calculateMargin({
      ...clean,
      costBasis: "perCase",
      caseCost: 10,
      unitsPerCase: 10,
      casesPerPallet: 100,
      freight: 50,
      freightMode: "perPallet",
      pricingMode: "targetMargin",
      targetMargin: 0.2,
    });

    expect(result.ok).toBe(true);
    expect(result.goodsCostPerPallet).toBe(1000);
    expect(result.freightPerPallet).toBe(50);
    expect(result.landedCostPerPallet).toBe(1050);
    expect(result.landedCostPerCase).toBe(10.5);
    expect(result.landedCostPerUnit).toBe(1.05);
    expect(result.sellingPricePerCase).toBeCloseTo(13.125, 6);
    expect(result.profitPerCase).toBeCloseTo(2.625, 6);
    expect(result.profitPerPallet).toBeCloseTo(262.5, 6);
    expect(result.margin).toBeCloseTo(0.2, 8);
    expect(result.markup).toBeCloseTo(0.25, 8);
  });

  it("treats 25% markup as the same price as 20% margin", () => {
    const fromMargin = calculateMargin({
      ...clean,
      caseCost: 10,
      casesPerPallet: 100,
      freight: 50,
      pricingMode: "targetMargin",
      targetMargin: 0.2,
    });
    const fromMarkup = calculateMargin({
      ...clean,
      caseCost: 10,
      casesPerPallet: 100,
      freight: 50,
      pricingMode: "targetMarkup",
      targetMarkup: 0.25,
    });
    expect(fromMarkup.sellingPricePerCase).toBeCloseTo(fromMargin.sellingPricePerCase, 8);
    expect(marginToMarkup(0.2)).toBeCloseTo(0.25, 8);
    expect(markupToMargin(0.25)).toBeCloseTo(0.2, 8);
  });

  it("allocates shipment freight across pallets", () => {
    const result = calculateMargin({
      ...clean,
      caseCost: 12,
      casesPerPallet: 50,
      freight: 330,
      freightMode: "perShipment",
      palletsInShipment: 11,
    });
    expect(result.freightPerPallet).toBe(30);
    expect(result.landedCostPerPallet).toBe(630);
    expect(result.landedCostPerCase).toBe(12.6);
  });

  it("adds duty, insurance, handling, shrink and finance onto landed cost", () => {
    const result = calculateMargin({
      ...defaultMarginInputs,
      costBasis: "perCase",
      caseCost: 12.5,
      unitsPerCase: 12,
      casesPerPallet: 80,
      freight: 65,
      freightMode: "perPallet",
      dutyRate: 0.04,
      insuranceRate: 0.002,
      handlingPerPallet: 8,
      shrinkRate: 0.005,
      daysInTransit: 4,
      annualCostOfCapital: 0.08,
      palletHirePerPallet: 0,
      pricingMode: "targetMargin",
      targetMargin: 0.22,
    });

    const goods = 12.5 * 80;
    const freight = 65;
    const duty = goods * 0.04;
    const insurance = (goods + freight) * 0.002;
    const shrink = goods * 0.005;
    const finance = goods * (0.08 * (4 / 365));
    const landedPallet = goods + freight + duty + insurance + 8 + shrink + finance;

    expect(result.goodsCostPerPallet).toBe(1000);
    expect(result.dutyPerPallet).toBe(40);
    expect(result.landedCostPerPallet).toBeCloseTo(landedPallet, 8);
    expect(result.landedCostPerCase).toBeCloseTo(landedPallet / 80, 8);
    expect(result.sellingPricePerCase).toBeCloseTo(result.landedCostPerCase / (1 - 0.22), 8);
  });

  it("can price from a unit cost instead of a case cost", () => {
    const result = calculateMargin({
      ...clean,
      costBasis: "perUnit",
      unitCost: 0.8,
      unitsPerCase: 12,
      casesPerPallet: 50,
      freight: 40,
      pricingMode: "fixedPrice",
      sellingPricePerCase: 12,
    });
    expect(result.goodsCostPerPallet).toBe(0.8 * 12 * 50);
    expect(result.landedCostPerCase).toBeCloseTo((480 + 40) / 50, 8);
    expect(result.sellingPricePerCase).toBe(12);
    expect(result.profitPerPallet).toBeCloseTo((12 - 10.4) * 50, 8);
  });

  it("rejects a 100% margin and a zero case count", () => {
    const badMargin = calculateMargin({ ...clean, pricingMode: "targetMargin", targetMargin: 1 });
    const badCases = calculateMargin({ ...clean, casesPerPallet: 0 });
    expect(badMargin.ok).toBe(false);
    expect(badCases.ok).toBe(false);
  });
});
