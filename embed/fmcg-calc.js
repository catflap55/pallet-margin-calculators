/**
 * FMCG Tools Hub - Shared calculation logic for WordPress embeds
 * Self-contained, no dependencies. Copy into Custom HTML block or load via script tag.
 */
(function (global) {
  "use strict";

  var EUR_PALLET_LENGTH = 1200;
  var EUR_PALLET_WIDTH = 800;
  var EUR_PALLET_HEIGHT = 144;
  var DEFAULT_MAX_STACK_HEIGHT = 1800;
  var DEFAULT_MAX_GROSS_WEIGHT = 1000;
  var EUR_PALLET_EMPTY_WEIGHT = 25;

  function calculateMargin(input) {
    var caseCost = input.caseCost;
    var freightPerPallet = input.freightPerPallet;
    var casesPerPallet = input.casesPerPallet;
    var targetPercent = input.targetPercent;
    var useMarginMode = input.useMarginMode;
    var dutyPercent = input.dutyPercent || 0;
    var handlingPerCase = input.handlingPerCase || 0;
    var wastePercent = input.wastePercent || 0;
    var promoPercent = input.promoPercent || 0;

    if (casesPerPallet <= 0) throw new Error("Cases per pallet must be greater than zero.");

    var freightPerCase = freightPerPallet / casesPerPallet;
    var dutyPerCase = caseCost * (dutyPercent / 100);
    var landedCostPerCase = caseCost + freightPerCase + dutyPerCase + handlingPerCase;
    var wasteMultiplier = wastePercent > 0 ? 1 / (1 - wastePercent / 100) : 1;
    var adjustedCostPerCase = landedCostPerCase * wasteMultiplier;

    var sellingPricePerCase;
    if (useMarginMode) {
      if (targetPercent >= 100) throw new Error("Target margin must be less than 100%.");
      sellingPricePerCase = adjustedCostPerCase / (1 - targetPercent / 100);
    } else {
      sellingPricePerCase = adjustedCostPerCase * (1 + targetPercent / 100);
    }

    var profitPerCase = sellingPricePerCase - adjustedCostPerCase;
    var promoDeduction = sellingPricePerCase * (promoPercent / 100);
    var netProfitPerCase = profitPerCase - promoDeduction;

    return {
      landedCostPerCase: landedCostPerCase,
      adjustedCostPerCase: adjustedCostPerCase,
      sellingPricePerCase: sellingPricePerCase,
      profitPerCase: profitPerCase,
      profitPerPallet: profitPerCase * casesPerPallet,
      revenuePerPallet: sellingPricePerCase * casesPerPallet,
      actualMarginPercent: sellingPricePerCase > 0 ? (profitPerCase / sellingPricePerCase) * 100 : 0,
      actualMarkupPercent: adjustedCostPerCase > 0 ? (profitPerCase / adjustedCostPerCase) * 100 : 0,
      netProfitAfterPromo: netProfitPerCase * casesPerPallet,
    };
  }

  function calcLayer(palletL, palletW, caseL, caseW, tolerance) {
    var effL = palletL + tolerance;
    var effW = palletW + tolerance;
    var alongL = Math.floor(effL / caseL);
    var alongW = Math.floor(effW / caseW);
    return {
      ti: alongL * alongW,
      casesAlongLength: alongL,
      casesAlongWidth: alongW,
      lengthOverhang: Math.max(0, alongL * caseL - palletL),
      widthOverhang: Math.max(0, alongW * caseW - palletW),
      caseLengthOnPallet: caseL,
      caseWidthOnPallet: caseW,
    };
  }

  function calculatePallet(input) {
    var caseLength = input.caseLength;
    var caseWidth = input.caseWidth;
    var caseHeight = input.caseHeight;
    var caseWeight = input.caseWeight;
    var maxStackHeight = input.maxStackHeight || DEFAULT_MAX_STACK_HEIGHT;
    var maxGrossWeight = input.maxGrossWeight || DEFAULT_MAX_GROSS_WEIGHT;
    var allowOverhang = input.allowOverhang || false;
    var overhangTolerance = input.overhangTolerance || 0;
    var tolerance = allowOverhang ? overhangTolerance : 0;
    var warnings = [];

    var orientA = calcLayer(EUR_PALLET_LENGTH, EUR_PALLET_WIDTH, caseLength, caseWidth, tolerance);
    orientA.label = "Length × Width";
    var orientB = calcLayer(EUR_PALLET_LENGTH, EUR_PALLET_WIDTH, caseWidth, caseLength, tolerance);
    orientB.label = "Width × Length (rotated)";

    var best = orientA.ti >= orientB.ti ? orientA : orientB;
    if (best.ti === 0) throw new Error("Case too large for Euro pallet.");

    var availableHeight = maxStackHeight - EUR_PALLET_HEIGHT;
    var hi = Math.floor(availableHeight / caseHeight);
    if (hi < 1) hi = 1;

    var maxCasesByWeight = Math.floor((maxGrossWeight - EUR_PALLET_EMPTY_WEIGHT) / caseWeight);
    var totalCases = best.ti * hi;
    var weightLimited = false;

    if (totalCases > maxCasesByWeight) {
      weightLimited = true;
      hi = Math.floor(maxCasesByWeight / best.ti);
      if (hi < 1) throw new Error("Case weight exceeds pallet limit.");
      totalCases = best.ti * hi;
      warnings.push("Weight limit reduces layers to " + hi + ".");
    }

    var stackHeight = EUR_PALLET_HEIGHT + hi * caseHeight;
    var grossWeight = totalCases * caseWeight + EUR_PALLET_EMPTY_WEIGHT;
    var palletArea = EUR_PALLET_LENGTH * EUR_PALLET_WIDTH;
    var floorUtil = (best.ti * best.caseLengthOnPallet * best.caseWidthOnPallet) / palletArea * 100;

    return {
      ti: best.ti,
      hi: hi,
      totalCases: totalCases,
      grossWeight: grossWeight,
      stackHeight: stackHeight,
      floorUtilization: floorUtil,
      orientation: best.label,
      layout: best.casesAlongLength + " × " + best.casesAlongWidth,
      weightLimited: weightLimited,
      warnings: warnings,
    };
  }

  function calculateReverse(input) {
    var shelfPrice = input.shelfPrice;
    var retailerMargin = input.retailerMargin;
    var vatIncluded = input.vatIncluded !== false;
    var vatRate = input.vatRate || 20;
    var unitsPerCase = input.unitsPerCase || 1;
    var distributorMargin = input.distributorMargin || 0;
    var listingFee = input.listingFee || 0;
    var marketingAllowance = input.marketingAllowance || 0;

    var netShelf = vatIncluded && vatRate > 0 ? shelfPrice / (1 + vatRate / 100) : shelfPrice;
    var retailerProfit = netShelf * (retailerMargin / 100);
    var maxWholesaleUnit = netShelf - retailerProfit;
    var maxWholesaleCase = maxWholesaleUnit * unitsPerCase;
    var distributorTake = maxWholesaleCase * (distributorMargin / 100);
    var afterDistributor = maxWholesaleCase - distributorTake;
    var marketingDeduction = afterDistributor * (marketingAllowance / 100);
    var maxSupplierCase = afterDistributor - marketingDeduction - listingFee;

    return {
      netShelfPrice: netShelf,
      maxWholesaleUnitPrice: maxWholesaleUnit,
      maxWholesaleCasePrice: maxWholesaleCase,
      maxSupplierUnitPrice: maxSupplierCase / unitsPerCase,
      maxSupplierCasePrice: Math.max(0, maxSupplierCase),
      retailerGrossProfit: retailerProfit,
    };
  }

  function formatCurrency(value, symbol) {
    return symbol + value.toFixed(2);
  }

  global.FMCGCalc = {
    calculateMargin: calculateMargin,
    calculatePallet: calculatePallet,
    calculateReverse: calculateReverse,
    formatCurrency: formatCurrency,
    EUR_PALLET_LENGTH: EUR_PALLET_LENGTH,
    EUR_PALLET_WIDTH: EUR_PALLET_WIDTH,
  };
})(typeof window !== "undefined" ? window : this);
