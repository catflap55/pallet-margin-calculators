import {
  marginFromPrices,
  markupFromPrices,
  sellingPriceFromMargin,
  sellingPriceFromMarkup,
} from "@/lib/calc/pricing";

export const PALLET_PRESETS = {
  euro: { id: "euro", label: "Euro / EPAL (1200 × 800 mm)", lengthMm: 1200, widthMm: 800 },
  uk: { id: "uk", label: "UK / industrial (1200 × 1000 mm)", lengthMm: 1200, widthMm: 1000 },
  halfEuro: { id: "halfEuro", label: "Half Euro (800 × 600 mm)", lengthMm: 800, widthMm: 600 },
  gma: { id: "gma", label: "GMA / North America (48 × 40 in)", lengthMm: 1219, widthMm: 1016 },
  custom: { id: "custom", label: "Custom pallet", lengthMm: 1200, widthMm: 800 },
} as const;

export type PalletPresetId = keyof typeof PALLET_PRESETS;

export type PricingMode = "targetMargin" | "targetMarkup" | "fixedPrice";
export type FreightMode = "perPallet" | "perShipment";
export type CostBasis = "perCase" | "perUnit";

export type MarginInputs = {
  costBasis: CostBasis;
  caseCost: number;
  unitCost: number;
  unitsPerCase: number;
  casesPerPallet: number;
  freight: number;
  freightMode: FreightMode;
  palletsInShipment: number;
  palletPreset: PalletPresetId;
  customLengthMm: number;
  customWidthMm: number;
  pricingMode: PricingMode;
  targetMargin: number;
  targetMarkup: number;
  sellingPricePerCase: number;
  dutyRate: number;
  insuranceRate: number;
  handlingPerPallet: number;
  shrinkRate: number;
  daysInTransit: number;
  annualCostOfCapital: number;
  palletHirePerPallet: number;
};

export type MarginResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  palletLengthMm: number;
  palletWidthMm: number;
  unitsPerPallet: number;
  goodsCostPerPallet: number;
  freightPerPallet: number;
  dutyPerPallet: number;
  insurancePerPallet: number;
  handlingPerPallet: number;
  shrinkPerPallet: number;
  financePerPallet: number;
  palletHirePerPallet: number;
  landedCostPerPallet: number;
  landedCostPerCase: number;
  landedCostPerUnit: number;
  sellingPricePerCase: number;
  sellingPricePerUnit: number;
  sellingPricePerPallet: number;
  profitPerCase: number;
  profitPerUnit: number;
  profitPerPallet: number;
  margin: number;
  markup: number;
  freightShareOfLanded: number;
  steps: { label: string; value: number; note?: string }[];
};

export const defaultMarginInputs: MarginInputs = {
  costBasis: "perCase",
  caseCost: 12.5,
  unitCost: 1.04,
  unitsPerCase: 12,
  casesPerPallet: 80,
  freight: 65,
  freightMode: "perPallet",
  palletsInShipment: 11,
  palletPreset: "euro",
  customLengthMm: 1200,
  customWidthMm: 800,
  pricingMode: "targetMargin",
  targetMargin: 0.22,
  targetMarkup: 0.28,
  sellingPricePerCase: 17.05,
  dutyRate: 0,
  insuranceRate: 0.002,
  handlingPerPallet: 8,
  shrinkRate: 0.005,
  daysInTransit: 4,
  annualCostOfCapital: 0.08,
  palletHirePerPallet: 0,
};

function palletSize(input: MarginInputs) {
  if (input.palletPreset === "custom") {
    return { lengthMm: input.customLengthMm, widthMm: input.customWidthMm };
  }
  const preset = PALLET_PRESETS[input.palletPreset];
  return { lengthMm: preset.lengthMm, widthMm: preset.widthMm };
}

export function calculateMargin(input: MarginInputs): MarginResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const { lengthMm, widthMm } = palletSize(input);

  if (!Number.isFinite(input.unitsPerCase) || input.unitsPerCase <= 0) errors.push("Units per case must be greater than zero.");
  if (!Number.isFinite(input.casesPerPallet) || input.casesPerPallet <= 0) errors.push("Cases per pallet must be greater than zero.");
  if (input.costBasis === "perCase" && !Number.isFinite(input.caseCost)) errors.push("Enter a case cost.");
  if (input.costBasis === "perUnit" && !Number.isFinite(input.unitCost)) errors.push("Enter a unit cost.");
  if (input.costBasis === "perCase" && input.caseCost < 0) errors.push("Case cost cannot be negative.");
  if (input.costBasis === "perUnit" && input.unitCost < 0) errors.push("Unit cost cannot be negative.");
  if (input.freight < 0) errors.push("Freight cannot be negative.");
  if (input.freightMode === "perShipment" && input.palletsInShipment <= 0) {
    errors.push("Pallets in the shipment must be greater than zero to allocate freight.");
  }
  if (input.pricingMode === "targetMargin" && (input.targetMargin < 0 || input.targetMargin >= 1)) {
    errors.push("Target margin must be between 0% and 99.9%. Margin is a share of selling price, so 100% is impossible.");
  }
  if (input.pricingMode === "targetMarkup" && input.targetMarkup < -1) {
    errors.push("Target markup cannot be below -100%.");
  }
  if (input.pricingMode === "fixedPrice" && input.sellingPricePerCase < 0) {
    errors.push("Selling price cannot be negative.");
  }
  if (input.dutyRate < 0) errors.push("Duty rate cannot be negative.");
  if (lengthMm <= 0 || widthMm <= 0) errors.push("Pallet dimensions must be greater than zero.");

  const unitsPerPallet = input.unitsPerCase * input.casesPerPallet;
  const caseCost =
    input.costBasis === "perCase" ? input.caseCost : input.unitCost * input.unitsPerCase;
  const goodsCostPerPallet = caseCost * input.casesPerPallet;
  const freightPerPallet =
    input.freightMode === "perPallet"
      ? input.freight
      : input.palletsInShipment > 0
        ? input.freight / input.palletsInShipment
        : NaN;
  const dutyPerPallet = goodsCostPerPallet * input.dutyRate;
  const insurancePerPallet = (goodsCostPerPallet + freightPerPallet) * input.insuranceRate;
  const shrinkPerPallet = goodsCostPerPallet * input.shrinkRate;
  const financePerPallet =
    goodsCostPerPallet * (input.annualCostOfCapital * (input.daysInTransit / 365));
  const handlingPerPallet = input.handlingPerPallet;
  const palletHirePerPallet = input.palletHirePerPallet;

  const landedCostPerPallet =
    goodsCostPerPallet +
    freightPerPallet +
    dutyPerPallet +
    insurancePerPallet +
    handlingPerPallet +
    shrinkPerPallet +
    financePerPallet +
    palletHirePerPallet;

  const landedCostPerCase = landedCostPerPallet / input.casesPerPallet;
  const landedCostPerUnit = landedCostPerPallet / unitsPerPallet;

  let sellingPricePerCase = NaN;
  if (input.pricingMode === "targetMargin") {
    sellingPricePerCase = sellingPriceFromMargin(landedCostPerCase, input.targetMargin);
  } else if (input.pricingMode === "targetMarkup") {
    sellingPricePerCase = sellingPriceFromMarkup(landedCostPerCase, input.targetMarkup);
  } else {
    sellingPricePerCase = input.sellingPricePerCase;
  }

  const sellingPricePerUnit = sellingPricePerCase / input.unitsPerCase;
  const sellingPricePerPallet = sellingPricePerCase * input.casesPerPallet;
  const profitPerCase = sellingPricePerCase - landedCostPerCase;
  const profitPerUnit = sellingPricePerUnit - landedCostPerUnit;
  const profitPerPallet = profitPerCase * input.casesPerPallet;
  const margin = marginFromPrices(landedCostPerCase, sellingPricePerCase);
  const markup = markupFromPrices(landedCostPerCase, sellingPricePerCase);
  const freightShareOfLanded = landedCostPerPallet === 0 ? 0 : freightPerPallet / landedCostPerPallet;

  if (input.casesPerPallet < 20) {
    warnings.push("A low case count on the pallet raises freight per case. Half-empty pallets quietly destroy FMCG margin.");
  }
  if (freightShareOfLanded > 0.12) {
    warnings.push("Freight is a large share of landed cost. Check pallet utilisation or the lane rate before you lock a sell price.");
  }
  if (profitPerCase < 0) {
    warnings.push("This price is below landed case cost. You would lose money on every case that ships.");
  }
  if (input.palletPreset === "euro") {
    warnings.push("Shipping only on European 1200 × 800 mm pallets? Use the Euro Pallet Configurator to confirm TI/HI before you trust cases-per-pallet.");
  }

  const steps = [
    { label: "Goods cost per pallet", value: goodsCostPerPallet, note: "Invoice cost of every case on the pallet." },
    { label: "Freight allocated per pallet", value: freightPerPallet },
    { label: "Duty per pallet", value: dutyPerPallet },
    { label: "Insurance per pallet", value: insurancePerPallet },
    { label: "Handling / palletisation", value: handlingPerPallet },
    { label: "Shrink / damage allowance", value: shrinkPerPallet },
    { label: "Working-capital cost while in transit", value: financePerPallet },
    { label: "Pallet hire / deposit", value: palletHirePerPallet },
    { label: "Landed cost per pallet", value: landedCostPerPallet },
    { label: "Landed cost per case", value: landedCostPerCase },
    { label: "Selling price per case", value: sellingPricePerCase },
    { label: "Profit per pallet", value: profitPerPallet },
  ];

  return {
    ok: errors.length === 0 && Number.isFinite(landedCostPerCase) && Number.isFinite(sellingPricePerCase),
    errors,
    warnings,
    palletLengthMm: lengthMm,
    palletWidthMm: widthMm,
    unitsPerPallet,
    goodsCostPerPallet,
    freightPerPallet,
    dutyPerPallet,
    insurancePerPallet,
    handlingPerPallet,
    shrinkPerPallet,
    financePerPallet,
    palletHirePerPallet,
    landedCostPerPallet,
    landedCostPerCase,
    landedCostPerUnit,
    sellingPricePerCase,
    sellingPricePerUnit,
    sellingPricePerPallet,
    profitPerCase,
    profitPerUnit,
    profitPerPallet,
    margin,
    markup,
    freightShareOfLanded,
    steps,
  };
}
