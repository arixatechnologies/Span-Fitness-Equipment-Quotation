import { notFound } from "next/navigation";
import { QuotationBuilder } from "@/components/quotation-builder";
import {
  getActiveQuotationProducts,
  getCompanySettings,
  getQuotationWithItems
} from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import type { Customer, Product } from "@/lib/types";

type SearchParams = Promise<{ duplicate?: string | string[] }>;

function getTodayInIndia() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));

  return `${value.year}-${value.month}-${value.day}`;
}

export default async function NewQuotationPage({
  searchParams
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const duplicateId = typeof params.duplicate === "string" ? params.duplicate : "";
  const { supabase, user } = await requireUser();
  const [settings, productsResult, customersResult, duplicateResult] = await Promise.all([
    getCompanySettings(supabase),
    getActiveQuotationProducts(supabase),
    supabase.from("customers").select("*").order("customer_name"),
    duplicateId ? getQuotationWithItems(supabase, duplicateId).catch(() => null) : null
  ]);

  if (customersResult.error) throw new Error(customersResult.error.message);
  if (duplicateId && !duplicateResult) notFound();

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Create Quotation</h1>
        <p className="text-sm text-slate-500">
          {duplicateResult
            ? `Based on ${duplicateResult.quotation.quote_number}`
            : "Select products, adjust prices and quantities, then preview the PDF."}
        </p>
      </div>
      <QuotationBuilder
        products={productsResult as Product[]}
        customers={(customersResult.data || []) as Customer[]}
        settings={settings}
        maxDiscountPercent={user.maxDiscountPercent}
        duplicateFrom={duplicateResult?.quotation}
        initialQuoteDate={getTodayInIndia()}
        quotationItems={duplicateResult?.items}
      />
    </div>
  );
}
