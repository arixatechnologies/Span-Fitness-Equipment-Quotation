function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function getMinimumSpecialPrice(unitPrice: number, maxDiscountPercent: number) {
  const normalizedUnitPrice = Math.max(0, Number(unitPrice || 0));
  const normalizedLimit = Math.min(100, Math.max(0, Number(maxDiscountPercent || 0)));
  return roundMoney(normalizedUnitPrice * (1 - normalizedLimit / 100));
}

export function exceedsDiscountLimit(
  unitPrice: number,
  specialPrice: number,
  maxDiscountPercent: number
) {
  return Number(specialPrice) + 0.001 < getMinimumSpecialPrice(unitPrice, maxDiscountPercent);
}

export function discountLimitMessage(maxDiscountPercent: number) {
  return `Maximum discount applicable is ${Number(maxDiscountPercent.toFixed(2))}%.`;
}
