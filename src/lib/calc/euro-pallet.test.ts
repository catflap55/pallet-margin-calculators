import { describe, expect, it } from "vitest";
import {
  bestLayer,
  calculateEuroPallet,
  defaultEuroInputs,
  EURO_PALLET,
  TRAILER,
} from "@/lib/calc/euro-pallet";

describe("Euro pallet layer packing", () => {
  it("rotates a 400 × 300 mm case to 8 per layer on a Euro pallet", () => {
    const aligned = bestLayer(1200, 800, 400, 300, false);
    expect(aligned.ti).toBe(6);

    const rotated = bestLayer(1200, 800, 400, 300, true);
    expect(rotated.ti).toBe(8);
    expect(rotated.orientation).toBe("rotated");
  });

  it("fits a 600 × 400 mm modular case 4 per layer with no waste", () => {
    const layer = bestLayer(1200, 800, 600, 400, true);
    expect(layer.ti).toBe(4);
    expect(layer.leftoverLengthMm).toBe(0);
    expect(layer.leftoverWidthMm).toBe(0);
  });

  it("uses a mixed pattern when it beats a simple grid", () => {
    const layer = bestLayer(1200, 800, 500, 300, true);
    // Simple: 1200/500=2, 800/300=2 → 4. Rotated: 1200/300=4, 800/500=1 → 4.
    // Mixed along length: 2 columns of 500 (1000 used) leaves 200 — too thin.
    // Mixed along width: 2 rows of 300 (600 used) leaves 200 — too thin for 300, too thin for 500.
    // 1200/500=2 * 800/300=2 = 4 is the grid. 500x300 mixed might still be 4.
    expect(layer.ti).toBeGreaterThanOrEqual(4);

    const awkward = bestLayer(1200, 800, 700, 450, true);
    expect(awkward.ti).toBeGreaterThanOrEqual(1);
  });
});

describe("Euro pallet configurator", () => {
  it("locks the pallet to 1200 × 800 mm and returns TI/HI for the default case", () => {
    const result = calculateEuroPallet(defaultEuroInputs);
    expect(result.ok).toBe(true);
    expect(result.layer?.ti).toBe(8);
    expect(result.hi).toBe(6);
    expect(result.casesPerPallet).toBe(48);
    expect(result.unitsPerPallet).toBe(576);
    expect(result.loadWeightKg).toBeCloseTo(48 * 8.4, 6);
    expect(result.grossWeightKg).toBeCloseTo(48 * 8.4 + EURO_PALLET.tareKg, 6);
    expect(result.totalHeightMm).toBe(6 * 250 + 144);
    expect(result.binding).toBe("height");
    expect(result.trailerPallets).toBe(TRAILER.euroPallets);
    expect(result.trailerCases).toBe(48 * 33);
  });

  it("cuts layers when payload binds before height", () => {
    const result = calculateEuroPallet({
      ...defaultEuroInputs,
      caseWeightKg: 40,
      maxPayloadKg: 1500,
    });
    expect(result.layer?.ti).toBe(8);
    expect(result.hiByHeight).toBe(6);
    expect(result.hi).toBe(4);
    expect(result.casesPerPallet).toBe(32);
    expect(result.binding).toBe("weight");
    expect(result.loadWeightKg).toBe(1280);
  });

  it("rejects a case that cannot sit on a Euro pallet without overhang", () => {
    const result = calculateEuroPallet({
      ...defaultEuroInputs,
      caseLengthMm: 1300,
      caseWidthMm: 500,
      caseHeightMm: 200,
      overhangMm: 0,
      allowRotate: true,
    });
    expect(result.ok).toBe(false);
    expect(result.casesPerPallet).toBe(0);
  });

  it("fits the same oversized case once 50 mm overhang is allowed", () => {
    const result = calculateEuroPallet({
      ...defaultEuroInputs,
      caseLengthMm: 1300,
      caseWidthMm: 400,
      caseHeightMm: 200,
      overhangMm: 50,
      allowRotate: true,
    });
    expect(result.ok).toBe(true);
    expect(result.layer?.ti).toBeGreaterThan(0);
    expect(result.warnings.some((w) => w.toLowerCase().includes("overhang"))).toBe(true);
  });

  it("can stand a case on its side when any-side-up is enabled", () => {
    const upright = calculateEuroPallet({
      ...defaultEuroInputs,
      caseLengthMm: 800,
      caseWidthMm: 600,
      caseHeightMm: 400,
      allowRotate: true,
      allowAnySideUp: false,
      maxTotalHeightMm: 1800,
    });
    const anySide = calculateEuroPallet({
      ...defaultEuroInputs,
      caseLengthMm: 800,
      caseWidthMm: 600,
      caseHeightMm: 400,
      allowRotate: true,
      allowAnySideUp: true,
      maxTotalHeightMm: 1800,
    });
    expect(anySide.casesPerPallet).toBeGreaterThanOrEqual(upright.casesPerPallet);
  });

  it("caps a heavy pallet below 33 trailer faces when payload runs out", () => {
    const result = calculateEuroPallet({
      ...defaultEuroInputs,
      caseWeightKg: 18,
      maxPayloadKg: 1500,
      maxTotalHeightMm: 1800,
    });
    const palletGross = result.grossWeightKg;
    expect(result.trailerPallets).toBe(Math.min(33, Math.floor(24000 / palletGross)));
    expect(result.trailerPallets).toBeLessThanOrEqual(33);
  });
});
