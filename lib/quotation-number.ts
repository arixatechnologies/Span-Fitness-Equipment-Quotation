import { quoteDisplayNumber } from "@/lib/format";

export async function generateBaseQuoteNumber(
  supabase: any,
  date = new Date()
) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const { data, error } = await supabase.rpc("next_quotation_base_number", {
    p_quote_date: `${yyyy}-${mm}-${dd}`
  });

  if (error || typeof data !== "string") {
    throw new Error("Unable to generate quotation number");
  }

  return data;
}

export function makeQuoteNumber(baseQuoteNumber: string, revision: number) {
  return quoteDisplayNumber(baseQuoteNumber, revision);
}
