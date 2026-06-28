import Link from "next/link";
import { Edit, Plus, Trash2, Upload } from "lucide-react";
import { ProductImage } from "@/components/product-image";
import { ProductsExportButton } from "@/components/products-export";
import { SearchField } from "@/components/search-field";
import { EmptyState } from "@/components/ui";
import { softDeleteProductAction } from "@/app/actions/products";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";
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
  const brandsResult = await supabase.from("brands").select("*").order("name");

  if (brandsResult.error) throw new Error(brandsResult.error.message);

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
          <h1 className="text-2xl font-black text-slate-950">Products</h1>
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
        <section className="panel overflow-hidden">
          <div className="grid gap-3 p-3 md:hidden">
            {productRows.map((product) => (
              <div key={product.id} className="rounded-md border border-line bg-white p-3">
                <div className="flex gap-3">
                  <ProductImage
                    src={product.image_url}
                    alt={product.product_name}
                    className="h-16 w-16 shrink-0 rounded-md border border-line object-contain"
                    fallbackClassName="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-xs font-black text-navy"
                    fallbackLabel="SFE"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="block truncate font-black text-slate-950 hover:text-navy"
                    >
                      {product.product_name}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">{product.sku}</div>
                    <div className="mt-2 text-sm text-slate-600">{product.brand?.name || "-"}</div>
                    <div className="mt-1 font-black text-navy">{formatCurrency(product.unit_price)}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href={`/products/${product.id}/edit`} className="btn-secondary w-full px-3">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                  <form action={softDeleteProductAction}>
                    <input type="hidden" name="id" value={product.id} />
                    <button className="btn-danger w-full px-3" type="submit">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[820px]">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Brand</th>
                  <th className="px-4 py-3 text-right">Unit Price</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {productRows.map((product) => (
                  <tr key={product.id}>
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={product.image_url}
                          alt={product.product_name}
                          className="h-16 w-16 shrink-0 rounded-md border border-line object-contain"
                          fallbackClassName="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-xs font-black text-navy"
                          fallbackLabel="SFE"
                        />
                        <div>
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="font-black text-slate-950 hover:text-navy"
                          >
                            {product.product_name}
                          </Link>
                          <div className="text-xs text-slate-500">{product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">{product.brand?.name || "-"}</td>
                    <td className="table-cell text-right font-semibold">
                      {formatCurrency(product.unit_price)}
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-2">
                        <Link href={`/products/${product.id}/edit`} className="btn-secondary px-3">
                          <Edit className="h-4 w-4" />
                        </Link>
                        <form action={softDeleteProductAction}>
                          <input type="hidden" name="id" value={product.id} />
                          <button className="btn-danger px-3" type="submit">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
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
