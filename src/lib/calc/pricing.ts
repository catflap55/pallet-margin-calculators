export function sellingPriceFromMargin(cost: number, margin: number): number {
  if (!Number.isFinite(cost) || !Number.isFinite(margin)) return NaN;
  if (margin >= 1) return NaN;
  return cost / (1 - margin);
}

export function sellingPriceFromMarkup(cost: number, markup: number): number {
  if (!Number.isFinite(cost) || !Number.isFinite(markup)) return NaN;
  return cost * (1 + markup);
}

export function marginFromPrices(cost: number, price: number): number {
  if (!Number.isFinite(cost) || !Number.isFinite(price) || price === 0) return NaN;
  return (price - cost) / price;
}

export function markupFromPrices(cost: number, price: number): number {
  if (!Number.isFinite(cost) || !Number.isFinite(price) || cost === 0) return NaN;
  return (price - cost) / cost;
}

export function marginToMarkup(margin: number): number {
  if (!Number.isFinite(margin) || margin >= 1) return NaN;
  return margin / (1 - margin);
}

export function markupToMargin(markup: number): number {
  if (!Number.isFinite(markup) || markup <= -1) return NaN;
  return markup / (1 + markup);
}

export function stripVat(gross: number, vatRate: number): number {
  if (!Number.isFinite(gross) || !Number.isFinite(vatRate) || vatRate <= -1) return NaN;
  return gross / (1 + vatRate);
}

export function addVat(net: number, vatRate: number): number {
  if (!Number.isFinite(net) || !Number.isFinite(vatRate)) return NaN;
  return net * (1 + vatRate);
}
