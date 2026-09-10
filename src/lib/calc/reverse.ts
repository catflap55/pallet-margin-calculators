import { addVat, stripVat } from "@/lib/calc/pricing";

export type ChannelId =
  | "discounter"
  | "conventional"
  | "premium"
  | "natural"
  | "club"
  | "convenience"
  | "custom";

export const CHANNELS: Record<
  ChannelId,
  {
    id: ChannelId;
    label: string;
    retailerMargin: number;
    distributorMarkup: number;
    tradeSpend: number;
    note: string;
  }
> = {
  discounter: {
    id: "discounter",
    label: "Discounter (Aldi, Lidl, and similar)",
    retailerMargin: 0.14,
    distributorMarkup: 0,
    tradeSpend: 0.06,
    note: "Thin retail margin, high volume, often direct-to-DC with little distributor layer. Promo spend is tightly controlled.",
  },
  conventional: {
    id: "conventional",
    label: "Conventional supermarket",
    retailerMargin: 0.3,
    distributorMarkup: 0.15,
    tradeSpend: 0.16,
    note: "Typical grocery range: about 25–35% retailer margin and a 10–20% distributor markup when you are not direct.",
  },
  premium: {
    id: "premium",
    label: "Premium supermarket",
    retailerMargin: 0.38,
    distributorMarkup: 0.12,
    tradeSpend: 0.14,
    note: "Higher shelf prices and a fatter retail take. Shoppers will pay more — the buyer still defends margin.",
  },
  natural: {
    id: "natural",
    label: "Natural / specialty grocery",
    retailerMargin: 0.4,
    distributorMarkup: 0.18,
    tradeSpend: 0.18,
    note: "Specialty distributors (KeHE/UNFI equivalents in many markets) plus 35–50% retailer margin is the usual stack.",
  },
  club: {
    id: "club",
    label: "Club / cash-and-carry",
    retailerMargin: 0.12,
    distributorMarkup: 0,
    tradeSpend: 0.08,
    note: "Low single-digit to mid-teens retail margin, huge pack sizes, usually a direct warehouse relationship.",
  },
  convenience: {
    id: "convenience",
    label: "Convenience / forecourt / drug",
    retailerMargin: 0.42,
    distributorMarkup: 0.22,
    tradeSpend: 0.12,
    note: "Small baskets, expensive last-mile, 40–50% retailer margin and a heavy wholesaler markup are common.",
  },
  custom: {
    id: "custom",
    label: "Custom — type the buyer’s numbers",
    retailerMargin: 0.3,
    distributorMarkup: 0.15,
    tradeSpend: 0.15,
    note: "Use this when the buyer has already quoted a margin, listing fee, or distributor path.",
  },
};

export type ReverseInputs = {
  shelfPrice: number;
  vatInclusive: boolean;
  vatRate: number;
  channel: ChannelId;
  retailerMargin: number;
  retailerUsesMarkup: boolean;
  distributorMarkup: number;
  tradeSpendRate: number;
  slottingTotal: number;
  annualUnits: number;
  supplierLandedCost: number;
  supplierTargetMargin: number;
};

export type ReverseResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  netShelfPrice: number;
  grossShelfPrice: number;
  retailerCost: number;
  retailerCashMargin: number;
  distributorSellPrice: number;
  maxListWholesale: number;
  netWholesaleAfterTrade: number;
  slottingPerUnit: number;
  netToSupplier: number;
  supplierProfit: number;
  supplierMargin: number;
  supplierMarkup: number;
  neededShelfForSupplierTarget: number;
  contributionOfShelf: number;
  waterfall: { label: string; value: number; note: string }[];
};

export const defaultReverseInputs: ReverseInputs = {
  shelfPrice: 2.49,
  vatInclusive: true,
  vatRate: 0.2,
  channel: "conventional",
  retailerMargin: CHANNELS.conventional.retailerMargin,
  retailerUsesMarkup: false,
  distributorMarkup: CHANNELS.conventional.distributorMarkup,
  tradeSpendRate: CHANNELS.conventional.tradeSpend,
  slottingTotal: 0,
  annualUnits: 25000,
  supplierLandedCost: 0.72,
  supplierTargetMargin: 0.4,
};

export function applyChannel(channel: ChannelId, current: ReverseInputs): ReverseInputs {
  const preset = CHANNELS[channel];
  return {
    ...current,
    channel,
    retailerMargin: preset.retailerMargin,
    distributorMarkup: preset.distributorMarkup,
    tradeSpendRate: preset.tradeSpend,
  };
}

export function calculateReverse(input: ReverseInputs): ReverseResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!Number.isFinite(input.shelfPrice) || input.shelfPrice <= 0) {
    errors.push("Target shelf price must be greater than zero.");
  }
  if (input.vatInclusive && input.vatRate < 0) errors.push("VAT rate cannot be negative.");
  if (input.retailerMargin < 0 || input.retailerMargin >= 1) {
    errors.push(
      input.retailerUsesMarkup
        ? "Retailer markup cannot be below 0% here — use a margin under 100% instead."
        : "Retailer margin must be between 0% and 99.9%. Buyers quoting “50 margin” mean half the shelf price.",
    );
  }
  if (input.distributorMarkup < 0) errors.push("Distributor markup cannot be negative.");
  if (input.tradeSpendRate < 0 || input.tradeSpendRate >= 1) {
    errors.push("Trade spend must be between 0% and 99.9% of wholesale.");
  }
  if (input.slottingTotal < 0) errors.push("Slotting cannot be negative.");
  if (input.slottingTotal > 0 && input.annualUnits <= 0) {
    errors.push("Enter annual units so slotting can be spread across the year.");
  }
  if (input.supplierLandedCost < 0) errors.push("Supplier landed cost cannot be negative.");
  if (input.supplierTargetMargin < 0 || input.supplierTargetMargin >= 1) {
    errors.push("Supplier target margin must be between 0% and 99.9%.");
  }

  const grossShelfPrice = input.vatInclusive ? input.shelfPrice : addVat(input.shelfPrice, input.vatRate);
  const netShelfPrice = input.vatInclusive ? stripVat(input.shelfPrice, input.vatRate) : input.shelfPrice;

  const retailerCost = input.retailerUsesMarkup
    ? netShelfPrice / (1 + input.retailerMargin)
    : netShelfPrice * (1 - input.retailerMargin);
  const retailerCashMargin = netShelfPrice - retailerCost;

  const distributorSellPrice = retailerCost;
  const maxListWholesale =
    input.distributorMarkup > 0 ? distributorSellPrice / (1 + input.distributorMarkup) : distributorSellPrice;
  const netWholesaleAfterTrade = maxListWholesale * (1 - input.tradeSpendRate);
  const slottingPerUnit = input.annualUnits > 0 ? input.slottingTotal / input.annualUnits : 0;
  const netToSupplier = netWholesaleAfterTrade - slottingPerUnit;
  const supplierProfit = netToSupplier - input.supplierLandedCost;
  const supplierMargin = netToSupplier === 0 ? NaN : supplierProfit / netToSupplier;
  const supplierMarkup =
    input.supplierLandedCost === 0 ? NaN : supplierProfit / input.supplierLandedCost;
  const contributionOfShelf = netShelfPrice === 0 ? NaN : supplierProfit / netShelfPrice;

  const neededNetToSupplier =
    input.supplierLandedCost > 0
      ? input.supplierLandedCost / (1 - input.supplierTargetMargin)
      : NaN;
  const neededList =
    Number.isFinite(neededNetToSupplier) && input.tradeSpendRate < 1
      ? (neededNetToSupplier + slottingPerUnit) / (1 - input.tradeSpendRate)
      : NaN;
  const neededDistributorSell =
    Number.isFinite(neededList) ? neededList * (1 + input.distributorMarkup) : NaN;
  const neededNetShelf = input.retailerUsesMarkup
    ? neededDistributorSell * (1 + input.retailerMargin)
    : neededDistributorSell / (1 - input.retailerMargin);
  const neededShelfForSupplierTarget = input.vatInclusive
    ? addVat(neededNetShelf, input.vatRate)
    : neededNetShelf;

  if (input.retailerMargin >= 0.45 && input.channel !== "convenience" && input.channel !== "natural") {
    warnings.push("A retailer margin above 45% is steep for grocery. Confirm whether the buyer said margin or markup.");
  }
  if (supplierProfit < 0 && input.supplierLandedCost > 0) {
    warnings.push("At this shelf price you would fund the retailer and lose money. Raise the ticket, cut cost, or walk away from the listing.");
  }
  if (input.distributorMarkup === 0) {
    warnings.push("No distributor markup is modelled. Direct-to-retailer still has warehouse and delivery cost — do not treat that layer as free.");
  }
  if (contributionOfShelf > 0 && contributionOfShelf < 0.1 && input.supplierLandedCost > 0) {
    warnings.push("Supplier contribution is under 10% of net shelf price. That is a common way a “nice listing” quietly fails.");
  }

  const waterfall = [
    {
      label: "Ticket price the shopper sees",
      value: grossShelfPrice,
      note: input.vatInclusive ? "VAT-inclusive shelf price." : "Net price plus VAT.",
    },
    {
      label: "Net shelf (ex VAT)",
      value: netShelfPrice,
      note: "Retailer margin is taken from this number, not the VAT gross.",
    },
    {
      label: "Retailer’s delivered cost",
      value: retailerCost,
      note: input.retailerUsesMarkup
        ? "Shelf ÷ (1 + markup)."
        : "Net shelf × (1 − retailer margin).",
    },
    {
      label: "Maximum list wholesale",
      value: maxListWholesale,
      note:
        input.distributorMarkup > 0
          ? "Retailer cost ÷ (1 + distributor markup)."
          : "Direct supply: retailer cost is your invoice ceiling.",
    },
    {
      label: "Net after trade spend",
      value: netWholesaleAfterTrade,
      note: "TPRs, scan deals and billbacks come off your side.",
    },
    {
      label: "Net after amortised slotting",
      value: netToSupplier,
      note: slottingPerUnit > 0 ? "Slotting spread across annual units." : "No slotting entered.",
    },
  ];

  return {
    ok: errors.length === 0 && Number.isFinite(maxListWholesale),
    errors,
    warnings,
    netShelfPrice,
    grossShelfPrice,
    retailerCost,
    retailerCashMargin,
    distributorSellPrice,
    maxListWholesale,
    netWholesaleAfterTrade,
    slottingPerUnit,
    netToSupplier,
    supplierProfit,
    supplierMargin,
    supplierMarkup,
    neededShelfForSupplierTarget,
    contributionOfShelf,
    waterfall,
  };
}
