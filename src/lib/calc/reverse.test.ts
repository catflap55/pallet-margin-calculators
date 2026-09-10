import { describe, expect, it } from "vitest";
import { calculateReverse, defaultReverseInputs } from "@/lib/calc/reverse";
import { stripVat } from "@/lib/calc/pricing";

describe("supermarket reverse-engineer", () => {
  it("peels VAT, retailer margin, distributor markup and trade spend off a shelf price", () => {
    const result = calculateReverse({
      ...defaultReverseInputs,
      shelfPrice: 2.49,
      vatInclusive: true,
      vatRate: 0.2,
      retailerMargin: 0.3,
      retailerUsesMarkup: false,
      distributorMarkup: 0.15,
      tradeSpendRate: 0.16,
      slottingTotal: 0,
      supplierLandedCost: 0.72,
    });

    const netShelf = 2.49 / 1.2;
    const retailerCost = netShelf * 0.7;
    const wholesale = retailerCost / 1.15;
    const afterTrade = wholesale * 0.84;

    expect(result.ok).toBe(true);
    expect(result.netShelfPrice).toBeCloseTo(netShelf, 8);
    expect(result.retailerCost).toBeCloseTo(retailerCost, 8);
    expect(result.maxListWholesale).toBeCloseTo(wholesale, 8);
    expect(result.netToSupplier).toBeCloseTo(afterTrade, 8);
    expect(result.supplierProfit).toBeCloseTo(afterTrade - 0.72, 8);
  });

  it("treats a buyer “50 markup” differently from a 50% margin", () => {
    const margin = calculateReverse({
      ...defaultReverseInputs,
      shelfPrice: 10,
      vatInclusive: false,
      vatRate: 0,
      retailerMargin: 0.5,
      retailerUsesMarkup: false,
      distributorMarkup: 0,
      tradeSpendRate: 0,
      slottingTotal: 0,
      supplierLandedCost: 0,
    });
    const markup = calculateReverse({
      ...defaultReverseInputs,
      shelfPrice: 10,
      vatInclusive: false,
      vatRate: 0,
      retailerMargin: 0.5,
      retailerUsesMarkup: true,
      distributorMarkup: 0,
      tradeSpendRate: 0,
      slottingTotal: 0,
      supplierLandedCost: 0,
    });

    expect(margin.maxListWholesale).toBeCloseTo(5, 8);
    expect(markup.maxListWholesale).toBeCloseTo(10 / 1.5, 8);
    expect(markup.maxListWholesale).toBeGreaterThan(margin.maxListWholesale);
  });

  it("spreads slotting across annual units", () => {
    const result = calculateReverse({
      ...defaultReverseInputs,
      shelfPrice: 5,
      vatInclusive: false,
      vatRate: 0,
      retailerMargin: 0.3,
      distributorMarkup: 0,
      tradeSpendRate: 0,
      slottingTotal: 12000,
      annualUnits: 40000,
      supplierLandedCost: 2,
    });
    expect(result.slottingPerUnit).toBeCloseTo(0.3, 8);
    expect(result.retailerCost).toBeCloseTo(3.5, 8);
    expect(result.netToSupplier).toBeCloseTo(3.2, 8);
  });

  it("strips VAT only when the ticket is VAT-inclusive", () => {
    const incl = stripVat(1.2, 0.2);
    expect(incl).toBeCloseTo(1, 8);
    const result = calculateReverse({
      ...defaultReverseInputs,
      shelfPrice: 1.2,
      vatInclusive: false,
      vatRate: 0.2,
      retailerMargin: 0,
      distributorMarkup: 0,
      tradeSpendRate: 0,
      slottingTotal: 0,
      supplierLandedCost: 0,
    });
    expect(result.netShelfPrice).toBeCloseTo(1.2, 8);
    expect(result.grossShelfPrice).toBeCloseTo(1.44, 8);
  });

  it("rejects a 100% retailer margin", () => {
    const result = calculateReverse({
      ...defaultReverseInputs,
      retailerMargin: 1,
    });
    expect(result.ok).toBe(false);
  });
});
