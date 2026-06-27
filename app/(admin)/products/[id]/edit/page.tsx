import { notFound } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Brand, Product } from "@/lib/types";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const [productResult, brandsResult] = await Promise.all([
    supabase.from("products").select("*").eq("id", id).single(),
    supabase.from("brands").select("*").order("name")
  ]);

  if (productResult.error && productResult.error.code !== "PGRST116") {
    throw new Error(productResult.error.message);
  }
  if (!productResult.data) notFound();
  if (brandsResult.error) throw new Error(brandsResult.error.message);

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Edit Product</h1>
        <p className="text-sm text-slate-500">Update product information without changing old quotations.</p>
      </div>
      <ProductForm
        product={productResult.data as Product}
        brands={(brandsResult.data || []) as Brand[]}
      />
    </div>
  );
}
