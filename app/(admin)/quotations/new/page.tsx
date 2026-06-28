import { QuotationBuilder } from "@/components/quotation-builder";
import { getCompanySettings } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";
import type { Customer, Product } from "@/lib/types";

export default async function NewQuotationPage() {
  const { supabase, user } = await requireUser();
  const [settings, productsResult, customersResult] = await Promise.all([
    getCompanySettings(supabase),
    supabase
      .from("products")
      .select("*, brand:brands!products_brand_id_fkey(id,name)")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("product_name"),
    supabase.from("customers").select("*").order("customer_name")
  ]);

  if (productsResult.error) throw new Error(productsResult.error.message);
  if (customersResult.error) throw new Error(customersResult.error.message);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Create Quotation</h1>
        <p className="text-sm text-slate-500">
          Select products, adjust prices and quantities, then preview the PDF.
        </p>
      </div>
      <QuotationBuilder
        products={(productsResult.data || []) as Product[]}
        customers={(customersResult.data || []) as Customer[]}
        settings={settings}
        maxDiscountPercent={user.maxDiscountPercent}
      />
    </div>
  );
}
