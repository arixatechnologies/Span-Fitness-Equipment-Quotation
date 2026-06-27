import { ProductForm } from "@/components/product-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Brand } from "@/lib/types";

export default async function NewProductPage() {
  const supabase = await createServerSupabaseClient();
  const { data: brands, error } = await supabase
    .from("brands")
    .select("*")
    .eq("is_active", true)
    .order("name");

  if (error) throw new Error(error.message);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Add Product</h1>
        <p className="text-sm text-slate-500">Create a product that can be selected in quotations.</p>
      </div>
      <ProductForm brands={(brands || []) as Brand[]} />
    </div>
  );
}
