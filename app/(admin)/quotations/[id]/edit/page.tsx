import { notFound } from "next/navigation";
import { QuotationBuilder } from "@/components/quotation-builder";
import { getCompanySettings, getQuotationWithItems } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import type { Customer, Product } from "@/lib/types";

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { supabase, user } = await requireUser();
  const [settings, quotationResult, productsResult, customersResult] = await Promise.all([
    getCompanySettings(supabase),
    getQuotationWithItems(supabase, id).catch(() => null),
    supabase
      .from("products")
      .select("*, brand:brands!products_brand_id_fkey(id,name)")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("product_name"),
    supabase.from("customers").select("*").order("customer_name")
  ]);

  if (!quotationResult) notFound();
  if (productsResult.error) throw new Error(productsResult.error.message);
  if (customersResult.error) throw new Error(customersResult.error.message);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Edit PDF</h1>
        <p className="text-sm text-slate-500">{quotationResult.quotation.quote_number}</p>
      </div>
      <QuotationBuilder
        products={(productsResult.data || []) as Product[]}
        customers={(customersResult.data || []) as Customer[]}
        settings={settings}
        maxDiscountPercent={user.maxDiscountPercent}
        quotation={quotationResult.quotation}
        quotationItems={quotationResult.items}
      />
    </div>
  );
}
