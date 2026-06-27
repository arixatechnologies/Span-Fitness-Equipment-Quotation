import { quoteDisplayNumber } from "@/lib/format";

export async function generateBaseQuoteNumber(
  supabase: any,
  date = new Date()
) {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  const dayKey = `${yyyy}-${mm}-${dd}`;
  const nextDay = new Date(date);
  nextDay.setDate(date.getDate() + 1);
  const nextDayKey = `${nextDay.getFullYear()}-${String(nextDay.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(nextDay.getDate()).padStart(2, "0")}`;

  const { count, error } = await supabase
    .from("quotations")
    .select("id", { count: "exact", head: true })
    .gte("created_at", `${dayKey}T00:00:00`)
    .lt("created_at", `${nextDayKey}T00:00:00`);

  if (error) {
    throw new Error("Unable to generate quotation number");
  }

  const sequence = String((count || 0) + 1).padStart(3, "0");
  return `SFEQ${yyyy}${mm}${dd}${sequence}`;
}

export function makeQuoteNumber(baseQuoteNumber: string, revision: number) {
  return quoteDisplayNumber(baseQuoteNumber, revision);
}
