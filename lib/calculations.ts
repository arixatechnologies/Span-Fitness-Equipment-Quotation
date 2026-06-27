import type {
  CalculatedQuotationItem,
  GstMode,
  QuotationItemInput,
  QuotationTotals
} from "@/lib/types";

function toMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateQuotation(
  items: QuotationItemInput[],
  gstMode: GstMode
): { items: CalculatedQuotationItem[]; totals: QuotationTotals } {
  const calculatedItems = items.map((item) => {
    const qty = Number(item.qty || 0);
    const unitPrice = Number(item.unit_price || 0);
    const specialPrice = Number(item.special_price || 0);
    const gstPercent = Number(item.gst_percent || 0);
    const listTotal = toMoney(unitPrice * qty);
    const specialTotal = toMoney(specialPrice * qty);
    const gstAmount =
      gstMode === "add"
        ? toMoney((specialTotal * gstPercent) / 100)
        : gstMode === "included" && gstPercent > 0
          ? toMoney(specialTotal - specialTotal / (1 + gstPercent / 100))
          : 0;

    return {
      ...item,
      qty,
      unit_price: unitPrice,
      special_price: specialPrice,
      gst_percent: gstPercent,
      list_total: listTotal,
      special_total: specialTotal,
      gst_amount: gstAmount,
      line_total: specialTotal
    };
  });

  const totalListPrice = toMoney(
    calculatedItems.reduce((sum, item) => sum + item.list_total, 0)
  );
  const totalSpecialPrice = toMoney(
    calculatedItems.reduce((sum, item) => sum + item.special_total, 0)
  );
  const gstAmount = toMoney(
    gstMode === "add" ? calculatedItems.reduce((sum, item) => sum + item.gst_amount, 0) : 0
  );
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
      net_total: netTotal,
      round_off: toMoney(grandTotal - netTotal),
      grand_total: grandTotal
    }
  };
}
