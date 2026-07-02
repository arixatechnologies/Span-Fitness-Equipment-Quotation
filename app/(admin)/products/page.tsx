import Link from "next/link";
import { Plus, Upload } from "lucide-react";
import { ProductsList } from "@/components/products-list";
import { ProductsExportButton } from "@/components/products-export";
import { SearchField } from "@/components/search-field";
import { EmptyState } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { getSearchText } from "@/lib/search";
import type { Product } from "@/lib/types";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProductsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const supabase = await createServerSupabaseClient();
  const q = getSearchText(params.q);
  const brand = getSearchText(params.brand);
  const [brandsResult, totalProductsResult] = await Promise.all([
    supabase.from("brands").select("*").order("name"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
  ]);

  if (brandsResult.error) throw new Error(brandsResult.error.message);
  if (totalProductsResult.error) throw new Error(totalProductsResult.error.message);

  const matchingBrandIds = q
    ? (brandsResult.data || [])
        .filter((item: any) => String(item.name || "").toLowerCase().includes(q.toLowerCase()))
        .map((item: any) => item.id as string)
    : [];

  let query = supabase
    .from("products")
    .select("*, brand:brands!products_brand_id_fkey(id,name)")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (q) {
    const filters = [`sku.ilike.%${q}%`, `product_name.ilike.%${q}%`, `description.ilike.%${q}%`];

    if (matchingBrandIds.length) {
      filters.push(`brand_id.in.(${matchingBrandIds.join(",")})`);
    }

    query = query.or(filters.join(","));
  }
  if (brand) query = query.eq("brand_id", brand);

  const productsResult = await query;

  if (productsResult.error) throw new Error(productsResult.error.message);

  const productRows = (productsResult.data || []) as Product[];

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-black text-slate-950">Products</h1>
            <span className="inline-flex min-h-8 items-center rounded-md border border-line bg-panel px-3 text-sm font-bold text-slate-700">
              Total Products: {totalProductsResult.count || 0}
            </span>
          </div>
          <p className="text-sm text-slate-500">Manage product catalog, pricing, GST, and images.</p>
        </div>
        <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
          <ProductsExportButton products={productRows} />
          <Link href="/products/import" className="btn-secondary w-full sm:w-auto">
            <Upload className="h-4 w-4" />
            Import
          </Link>
          <Link href="/products/new" className="btn-primary w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      </div>

      <form className="panel grid gap-3 p-4 md:grid-cols-[1fr_220px_auto]">
        <SearchField
          key={q}
          name="q"
          defaultValue={q}
          placeholder="Search Product by Name, Product ID, Description, Brand"
          label="Search"
        />
        <label>
          <span className="field-label">Brand</span>
          <select className="field-input" name="brand" defaultValue={brand}>
            <option value="">All brands</option>
            {(brandsResult.data || []).map((item: any) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end">
          <button className="btn-secondary w-full sm:w-auto" type="submit">
            Filter
          </button>
        </div>
      </form>

      {productRows.length ? (
        <ProductsList
          key={productRows.map((product) => product.id).join(":")}
          products={productRows}
        />
      ) : (
        <EmptyState
          title="No products found"
          description="Add products manually or import a small catalog from CSV or Excel."
          href="/products/new"
          action="Add Product"
        />
      )}
    </div>
  );
}
