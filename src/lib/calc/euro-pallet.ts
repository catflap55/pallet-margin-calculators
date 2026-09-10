export const EURO_PALLET = {
  lengthMm: 1200,
  widthMm: 800,
  heightMm: 144,
  tareKg: 25,
  safeWorkingLoadKg: 1500,
  stackedFloorLimitKg: 5500,
} as const;

export const TRAILER = {
  label: "Standard 13.6 m European curtainsider",
  euroPallets: 33,
  payloadKg: 24000,
  internalHeightMm: 2700,
  ldmPerEuroPallet: 0.4,
} as const;

export type Rect = { x: number; y: number; w: number; h: number };

export type LayerPlan = {
  ti: number;
  name: string;
  orientation: "aligned" | "rotated" | "mixed";
  leftoverLengthMm: number;
  leftoverWidthMm: number;
  rects: Rect[];
  caseLengthUsedMm: number;
  caseWidthUsedMm: number;
  caseHeightUsedMm: number;
};

export type EuroPalletInputs = {
  caseLengthMm: number;
  caseWidthMm: number;
  caseHeightMm: number;
  caseWeightKg: number;
  allowRotate: boolean;
  allowAnySideUp: boolean;
  maxTotalHeightMm: number;
  maxPayloadKg: number;
  overhangMm: number;
  unitsPerCase: number;
};

export type EuroPalletResult = {
  ok: boolean;
  errors: string[];
  warnings: string[];
  layer: LayerPlan | null;
  hi: number;
  hiByHeight: number;
  hiByWeight: number;
  casesPerPallet: number;
  unitsPerPallet: number;
  loadWeightKg: number;
  grossWeightKg: number;
  loadHeightMm: number;
  totalHeightMm: number;
  footprintUtil: number;
  cubeUtil: number;
  weightUtil: number;
  binding: "height" | "weight" | "both" | "none";
  overhangUsedMm: number;
  trailerPalletsBySpace: number;
  trailerPalletsByWeight: number;
  trailerPallets: number;
  trailerCases: number;
  trailerWeightKg: number;
  trailerPayloadLeftKg: number;
  canDoubleStackInTrailer: boolean;
  steps: { label: string; value: string }[];
};

export const defaultEuroInputs: EuroPalletInputs = {
  caseLengthMm: 400,
  caseWidthMm: 300,
  caseHeightMm: 250,
  caseWeightKg: 8.4,
  allowRotate: true,
  allowAnySideUp: false,
  maxTotalHeightMm: 1800,
  maxPayloadKg: EURO_PALLET.safeWorkingLoadKg,
  overhangMm: 0,
  unitsPerCase: 12,
};

function orientations(input: EuroPalletInputs): [number, number, number][] {
  const { caseLengthMm: l, caseWidthMm: w, caseHeightMm: h } = input;
  if (input.allowAnySideUp) {
    const unique = new Map<string, [number, number, number]>();
    for (const triple of [
      [l, w, h],
      [w, l, h],
      [l, h, w],
      [h, l, w],
      [w, h, l],
      [h, w, l],
    ] as [number, number, number][]) {
      unique.set(triple.join("x"), triple);
    }
    return [...unique.values()];
  }
  if (input.allowRotate && l !== w) return [
    [l, w, h],
    [w, l, h],
  ];
  return [[l, w, h]];
}

function gridLayer(
  palletL: number,
  palletW: number,
  boxL: number,
  boxW: number,
  name: string,
  orientation: LayerPlan["orientation"],
): LayerPlan {
  const cols = Math.floor(palletL / boxL);
  const rows = Math.floor(palletW / boxW);
  const rects: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({ x: c * boxL, y: r * boxW, w: boxL, h: boxW });
    }
  }
  return {
    ti: rects.length,
    name,
    orientation,
    leftoverLengthMm: palletL - cols * boxL,
    leftoverWidthMm: palletW - rows * boxW,
    rects,
    caseLengthUsedMm: boxL,
    caseWidthUsedMm: boxW,
    caseHeightUsedMm: 0,
  };
}

function mixedLayer(palletL: number, palletW: number, boxL: number, boxW: number): LayerPlan {
  let best: LayerPlan = {
    ti: 0,
    name: "No mixed pattern",
    orientation: "mixed",
    leftoverLengthMm: palletL,
    leftoverWidthMm: palletW,
    rects: [],
    caseLengthUsedMm: boxL,
    caseWidthUsedMm: boxW,
    caseHeightUsedMm: 0,
  };

  const consider = (rects: Rect[], name: string) => {
    if (rects.length < best.ti) return;
    const maxX = rects.reduce((m, r) => Math.max(m, r.x + r.w), 0);
    const maxY = rects.reduce((m, r) => Math.max(m, r.y + r.h), 0);
    const leftoverL = palletL - maxX;
    const leftoverW = palletW - maxY;
    if (rects.length > best.ti || leftoverL + leftoverW < best.leftoverLengthMm + best.leftoverWidthMm) {
      best = {
        ti: rects.length,
        name,
        orientation: "mixed",
        leftoverLengthMm: leftoverL,
        leftoverWidthMm: leftoverW,
        rects,
        caseLengthUsedMm: boxL,
        caseWidthUsedMm: boxW,
        caseHeightUsedMm: 0,
      };
    }
  };

  const maxPrimaryRows = Math.floor(palletW / boxW);
  for (let rows = 1; rows <= maxPrimaryRows; rows++) {
    const primary: Rect[] = [];
    const cols = Math.floor(palletL / boxL);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        primary.push({ x: c * boxL, y: r * boxW, w: boxL, h: boxW });
      }
    }
    const remainW = palletW - rows * boxW;
    const originY = rows * boxW;
    for (const [bL, bW] of [
      [boxL, boxW],
      [boxW, boxL],
    ] as const) {
      const extra: Rect[] = [];
      const extraCols = Math.floor(palletL / bL);
      const extraRows = Math.floor(remainW / bW);
      for (let r = 0; r < extraRows; r++) {
        for (let c = 0; c < extraCols; c++) {
          extra.push({ x: c * bL, y: originY + r * bW, w: bL, h: bW });
        }
      }
      consider([...primary, ...extra], `Mixed: ${rows} row(s) ${boxL}×${boxW}, remainder ${bL}×${bW}`);
    }
  }

  const maxPrimaryCols = Math.floor(palletL / boxL);
  for (let cols = 1; cols <= maxPrimaryCols; cols++) {
    const primary: Rect[] = [];
    const rows = Math.floor(palletW / boxW);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        primary.push({ x: c * boxL, y: r * boxW, w: boxL, h: boxW });
      }
    }
    const remainL = palletL - cols * boxL;
    const originX = cols * boxL;
    for (const [bL, bW] of [
      [boxL, boxW],
      [boxW, boxL],
    ] as const) {
      const extra: Rect[] = [];
      const extraCols = Math.floor(remainL / bL);
      const extraRows = Math.floor(palletW / bW);
      for (let r = 0; r < extraRows; r++) {
        for (let c = 0; c < extraCols; c++) {
          extra.push({ x: originX + c * bL, y: r * bW, w: bL, h: bW });
        }
      }
      consider([...primary, ...extra], `Mixed: ${cols} column(s) ${boxL}×${boxW}, remainder ${bL}×${bW}`);
    }
  }

  return best;
}

export function bestLayer(palletL: number, palletW: number, boxL: number, boxW: number, allowRotate: boolean): LayerPlan {
  const candidates: LayerPlan[] = [
    gridLayer(palletL, palletW, boxL, boxW, `Column stack, ${boxL} × ${boxW} mm`, "aligned"),
  ];
  if (allowRotate && boxL !== boxW) {
    candidates.push(gridLayer(palletL, palletW, boxW, boxL, `Column stack rotated, ${boxW} × ${boxL} mm`, "rotated"));
    candidates.push(mixedLayer(palletL, palletW, boxL, boxW));
    candidates.push(mixedLayer(palletL, palletW, boxW, boxL));
  }

  candidates.sort((a, b) => {
    if (b.ti !== a.ti) return b.ti - a.ti;
    const aWaste = a.leftoverLengthMm + a.leftoverWidthMm;
    const bWaste = b.leftoverLengthMm + b.leftoverWidthMm;
    if (aWaste !== bWaste) return aWaste - bWaste;
    const rank = { aligned: 0, rotated: 1, mixed: 2 };
    return rank[a.orientation] - rank[b.orientation];
  });

  return candidates[0];
}

export function calculateEuroPallet(input: EuroPalletInputs): EuroPalletResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (
    !Number.isFinite(input.caseLengthMm) ||
    !Number.isFinite(input.caseWidthMm) ||
    !Number.isFinite(input.caseHeightMm) ||
    input.caseLengthMm <= 0 ||
    input.caseWidthMm <= 0 ||
    input.caseHeightMm <= 0
  ) {
    errors.push("Case length, width and height must all be greater than zero.");
  }
  if (input.caseWeightKg < 0) errors.push("Case weight cannot be negative.");
  if (input.maxTotalHeightMm <= EURO_PALLET.heightMm) {
    errors.push("Maximum pallet height must be taller than the 144 mm Euro pallet deck.");
  }
  if (input.maxPayloadKg <= 0) errors.push("Maximum payload must be greater than zero.");
  if (input.overhangMm < 0) errors.push("Overhang cannot be negative.");
  if (input.unitsPerCase <= 0) errors.push("Units per case must be greater than zero.");

  const usableL = EURO_PALLET.lengthMm + 2 * input.overhangMm;
  const usableW = EURO_PALLET.widthMm + 2 * input.overhangMm;
  const usableHeight = input.maxTotalHeightMm - EURO_PALLET.heightMm;

  let best: {
    layer: LayerPlan;
    hiByHeight: number;
    hiByWeight: number;
    hi: number;
    cases: number;
  } | null = null;

  for (const [boxL, boxW, boxH] of orientations(input)) {
    if (boxL > usableL && boxW > usableW) continue;
    const layer = bestLayer(usableL, usableW, boxL, boxW, input.allowRotate);
    layer.caseHeightUsedMm = boxH;
    layer.caseLengthUsedMm = boxL;
    layer.caseWidthUsedMm = boxW;
    const hiByHeight = boxH > 0 ? Math.floor(usableHeight / boxH) : 0;
    const maxCasesByWeight =
      input.caseWeightKg > 0 ? Math.floor(input.maxPayloadKg / input.caseWeightKg) : Number.POSITIVE_INFINITY;
    const hiByWeight =
      layer.ti > 0 && Number.isFinite(maxCasesByWeight) ? Math.floor(maxCasesByWeight / layer.ti) : hiByHeight;
    const hi = Math.max(0, Math.min(hiByHeight, hiByWeight));
    const cases = layer.ti * hi;
    if (!best || cases > best.cases || (cases === best.cases && layer.orientation === "aligned")) {
      best = { layer, hiByHeight, hiByWeight, hi, cases };
    }
  }

  if (!best || best.layer.ti === 0) {
    errors.push("This case does not fit on a 1200 × 800 mm Euro pallet at the overhang you allowed. Reduce the case footprint or allow a small overhang.");
  }

  const layer = best?.layer ?? null;
  const hi = best?.hi ?? 0;
  const hiByHeight = best?.hiByHeight ?? 0;
  const hiByWeight = best?.hiByWeight ?? 0;
  const casesPerPallet = best?.cases ?? 0;
  const unitsPerPallet = casesPerPallet * input.unitsPerCase;
  const loadWeightKg = casesPerPallet * input.caseWeightKg;
  const grossWeightKg = loadWeightKg + EURO_PALLET.tareKg;
  const loadHeightMm = hi * (layer?.caseHeightUsedMm ?? 0);
  const totalHeightMm = loadHeightMm + EURO_PALLET.heightMm;
  const footprintUtil =
    layer && layer.ti > 0
      ? (layer.ti * layer.caseLengthUsedMm * layer.caseWidthUsedMm) / (EURO_PALLET.lengthMm * EURO_PALLET.widthMm)
      : 0;
  const cubeUtil =
    casesPerPallet > 0
      ? (casesPerPallet * (layer?.caseLengthUsedMm ?? 0) * (layer?.caseWidthUsedMm ?? 0) * (layer?.caseHeightUsedMm ?? 0)) /
        (EURO_PALLET.lengthMm * EURO_PALLET.widthMm * usableHeight)
      : 0;
  const weightUtil = input.maxPayloadKg > 0 ? loadWeightKg / input.maxPayloadKg : 0;

  let binding: EuroPalletResult["binding"] = "none";
  if (hi > 0 && hiByHeight === hiByWeight) binding = "both";
  else if (hi > 0 && hi === hiByHeight && hi < hiByWeight) binding = "height";
  else if (hi > 0 && hi === hiByWeight && hi < hiByHeight) binding = "weight";

  const palletGross = grossWeightKg;
  const trailerPalletsBySpace = TRAILER.euroPallets;
  const trailerPalletsByWeight = palletGross > 0 ? Math.floor(TRAILER.payloadKg / palletGross) : TRAILER.euroPallets;
  const trailerPallets = Math.min(trailerPalletsBySpace, trailerPalletsByWeight);
  const trailerCases = trailerPallets * casesPerPallet;
  const trailerWeightKg = trailerPallets * palletGross;
  const trailerPayloadLeftKg = TRAILER.payloadKg - trailerWeightKg;
  const canDoubleStackInTrailer = totalHeightMm * 2 <= TRAILER.internalHeightMm && palletGross * 2 <= EURO_PALLET.stackedFloorLimitKg;

  if (input.overhangMm > 0) {
    warnings.push("Overhang can cut carton compression strength by up to ~30% and is refused by many grocery DCs. Prefer a case that sits inside 1200 × 800 mm.");
  }
  if (footprintUtil > 0 && footprintUtil < 0.85) {
    warnings.push("Footprint utilisation is under 85%. A modular 600 × 400 mm family (or a 90° rotate) usually ships cheaper per unit.");
  }
  if (loadWeightKg > EURO_PALLET.safeWorkingLoadKg) {
    warnings.push("Load exceeds the EPAL 1,500 kg safe working load. Cut layers even if the trailer could take the weight.");
  }
  if (binding === "weight") {
    warnings.push("Weight, not height, is stopping this pallet. Fewer layers (or a lighter case) will keep you legal.");
  }
  if (trailerPallets < TRAILER.euroPallets) {
    warnings.push(`A 13.6 m trailer has floor space for 33 Euro pallets, but payload caps this load at ${trailerPallets} pallets.`);
  }
  if (canDoubleStackInTrailer) {
    warnings.push("This build is short enough to double-stack in a standard trailer, but most grocery goods-in teams still refuse double-stacked inbound pallets. Confirm before you plan 66 pallet faces.");
  }

  const steps = [
    { label: "Pallet footprint (locked)", value: "1200 × 800 mm Euro / EPAL" },
    { label: "Usable deck including overhang", value: `${usableL} × ${usableW} mm` },
    { label: "Best layer (TI)", value: layer ? `${layer.ti} cases · ${layer.name}` : "Does not fit" },
    { label: "Layers from height (HI)", value: String(hiByHeight) },
    { label: "Layers from payload (HI)", value: Number.isFinite(hiByWeight) ? String(hiByWeight) : "n/a" },
    { label: "Cases per pallet", value: String(casesPerPallet) },
    { label: "Load weight", value: `${loadWeightKg.toFixed(1)} kg` },
    { label: "Gross pallet weight", value: `${grossWeightKg.toFixed(1)} kg (includes 25 kg pallet)` },
  ];

  return {
    ok: errors.length === 0 && casesPerPallet > 0,
    errors,
    warnings,
    layer,
    hi,
    hiByHeight,
    hiByWeight: Number.isFinite(hiByWeight) ? hiByWeight : 0,
    casesPerPallet,
    unitsPerPallet,
    loadWeightKg,
    grossWeightKg,
    loadHeightMm,
    totalHeightMm,
    footprintUtil,
    cubeUtil,
    weightUtil,
    binding,
    overhangUsedMm: input.overhangMm,
    trailerPalletsBySpace,
    trailerPalletsByWeight,
    trailerPallets,
    trailerCases,
    trailerWeightKg,
    trailerPayloadLeftKg,
    canDoubleStackInTrailer,
    steps,
  };
}
