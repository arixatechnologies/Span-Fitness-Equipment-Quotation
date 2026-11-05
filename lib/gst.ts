import type { GstMode, GstType } from "@/lib/types";

export const SUPPLIER_STATE = "Andhra Pradesh";

function normalizeState(value: string | null | undefined) {
  return String(value || "").trim().toLocaleLowerCase("en-IN");
}

export function determineGstType(
  placeOfSupply: string,
  gstMode: GstMode,
  supplierState = SUPPLIER_STATE
): GstType {
  if (gstMode === "none") return "none";

  return normalizeState(placeOfSupply) === normalizeState(supplierState)
    ? "cgst_sgst"
    : "igst";
}
