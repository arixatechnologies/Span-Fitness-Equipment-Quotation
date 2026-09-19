import { getSearchText } from "@/lib/search";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EXPORT_BATCH_SIZE = 1000;

function csvCell(value: unknown) {
  let text = String(value ?? "");

  // Prevent spreadsheet programs from evaluating imported values as formulas.
  if (/^[=+\-@]/.test(text)) text = `'${text}`;

  return `"${text.replace(/"/g, '""')}"`;
}

export async function GET(request: Request) {
  let supabase;

  try {
    ({ supabase } = await requireUser());
  } catch {
    return new Response("Authentication required", { status: 401 });
  }

  const url = new URL(request.url);
  const q = getSearchText(url.searchParams.get("q") || undefined);
  const brand = getSearchText(url.searchParams.get("brand") || undefined);
  let matchingBrandIds: string[] = [];

  if (q) {
    const { data, error } = await supabase
      .from("brands")
      .select("id")
      .ilike("name", `%${q}%`)
      .limit(EXPORT_BATCH_SIZE);

    if (error) return new Response(error.message, { status: 500 });
    matchingBrandIds = (data || []).map((item) => item.id);
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      try {
        controller.enqueue(
          encoder.encode(
            `\uFEFF${[
              "SKU",
              "Product Name",
              "Brand",
              "Description",
              "Unit Price",
              "Image URL"
            ]
              .map(csvCell)
              .join(",")}\r\n`
          )
        );

        for (let from = 0; ; from += EXPORT_BATCH_SIZE) {
          let query = supabase
            .from("products")
            .select("sku,product_name,description,unit_price,image_url,brand:brands!products_brand_id_fkey(name)")
            .is("deleted_at", null)
            .order("created_at", { ascending: false })
            .range(from, from + EXPORT_BATCH_SIZE - 1);

          if (q) {
            const filters = [
              `sku.ilike.%${q}%`,
              `product_name.ilike.%${q}%`,
              `description.ilike.%${q}%`
            ];
            if (matchingBrandIds.length) {
              filters.push(`brand_id.in.(${matchingBrandIds.join(",")})`);
            }
            query = query.or(filters.join(","));
          }
          if (brand) query = query.eq("brand_id", brand);

          const { data, error } = await query;
          if (error) throw new Error(error.message);

          for (const product of data || []) {
            const relatedBrand = Array.isArray(product.brand) ? product.brand[0] : product.brand;
            const row = [
              product.sku,
              product.product_name,
              relatedBrand?.name || "",
              product.description || "",
              product.unit_price,
              product.image_url || ""
            ];
            controller.enqueue(encoder.encode(`${row.map(csvCell).join(",")}\r\n`));
          }

          if (!data || data.length < EXPORT_BATCH_SIZE) break;
        }

        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="span-fitness-products.csv"',
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
