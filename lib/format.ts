export function formatCurrency(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : value || 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  }).format(amount);
}

export function formatNumber(value: number | string | null | undefined) {
  const amount = typeof value === "string" ? Number(value) : value || 0;
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 2
  }).format(amount);
}

export function formatDate(value: string | Date) {
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(new Date(value));
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function sanitizeFilename(value: string) {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export function quotationDownloadBaseName(customerName: string, quoteNumber: string) {
  const safeCustomerName = sanitizeFilename(customerName) || "Customer";
  const cleanQuoteNumber = quoteNumber.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  const safeQuoteNumber = sanitizeFilename(cleanQuoteNumber) || "Quotation";

  return `${safeCustomerName}-${safeQuoteNumber}`;
}

export function quoteDisplayNumber(baseQuoteNumber: string, revision: number) {
  return revision > 0 ? `${baseQuoteNumber}-R${revision}` : baseQuoteNumber;
}

export function formatCustomerName(
  customer:
    | {
        suffix?: string | null;
        customer_name?: string | null;
        business_name?: string | null;
      }
    | null
    | undefined,
  fallback = "Customer"
) {
  const fullName = [customer?.suffix, customer?.customer_name].filter(Boolean).join(" ").trim();
  return fullName || customer?.business_name || fallback;
}
