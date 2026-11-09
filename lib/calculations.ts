import type {
  CalculatedQuotationItem,
  GstMode,
  GstType,
  QuotationItemInput,
  QuotationTotals
} from "@/lib/types";

function toMoney(value: number) {
  const amount = Math.round((value + Number.EPSILON) * 100) / 100;
  return Object.is(amount, -0) || Math.abs(amount) < 0.005 ? 0 : amount;
}

export function calculateQuotation(
  items: QuotationItemInput[],
  gstMode: GstMode,
  gstType: GstType = gstMode === "none" ? "none" : "cgst_sgst"
): { items: CalculatedQuotationItem[]; totals: QuotationTotals } {
  const calculatedItems = items.map((item) => {
    const qty = Number(item.qty || 0);
    const unitPrice = Number(item.unit_price || 0);
    const specialPrice = Number(item.special_price || 0);
    const gstPercent = Number(item.gst_percent ?? 0);
    const listTotal = toMoney(unitPrice * qty);
    const specialTotal = toMoney(specialPrice * qty);
    const gstAmount =
      gstMode === "add"
        ? toMoney((specialTotal * gstPercent) / 100)
        : gstMode === "included" && gstPercent > 0
          ? toMoney(specialTotal - specialTotal / (1 + gstPercent / 100))
          : 0;
    const taxableValue = gstMode === "included" ? toMoney(specialTotal - gstAmount) : specialTotal;
    const cgstAmount = gstType === "cgst_sgst" ? toMoney(gstAmount / 2) : 0;
    const sgstAmount = gstType === "cgst_sgst" ? toMoney(gstAmount - cgstAmount) : 0;
    const igstAmount = gstType === "igst" ? gstAmount : 0;
    const lineTotal = specialTotal;

    return {
      ...item,
      qty,
      unit_price: unitPrice,
      special_price: specialPrice,
      gst_percent: gstPercent,
      list_total: listTotal,
      special_total: specialTotal,
      taxable_value: taxableValue,
      gst_amount: gstAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      line_total: lineTotal
    };
  });

  const totalListPrice = toMoney(
    calculatedItems.reduce((sum, item) => sum + item.list_total, 0)
  );
  const totalSpecialPrice = toMoney(
    calculatedItems.reduce((sum, item) => sum + item.special_total, 0)
  );
  const gstAmount = toMoney(calculatedItems.reduce((sum, item) => sum + item.gst_amount, 0));
  const cgstAmount = toMoney(calculatedItems.reduce((sum, item) => sum + item.cgst_amount, 0));
  const sgstAmount = toMoney(calculatedItems.reduce((sum, item) => sum + item.sgst_amount, 0));
  const igstAmount = toMoney(calculatedItems.reduce((sum, item) => sum + item.igst_amount, 0));
  const netTotal =
    gstMode === "add" ? toMoney(totalSpecialPrice + gstAmount) : totalSpecialPrice;
  const grandTotal = Math.round(netTotal);

  return {
    items: calculatedItems,
    totals: {
      total_list_price: totalListPrice,
      total_special_price: totalSpecialPrice,
      discount_amount: toMoney(totalListPrice - totalSpecialPrice),
      gst_amount: gstAmount,
      cgst_amount: cgstAmount,
      sgst_amount: sgstAmount,
      igst_amount: igstAmount,
      net_total: netTotal,
      round_off: toMoney(grandTotal - netTotal),
      grand_total: grandTotal
    }
  };
}
