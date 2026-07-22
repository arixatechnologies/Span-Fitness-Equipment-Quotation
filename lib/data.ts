import { DEFAULT_COMPANY_SETTINGS } from "@/lib/constants";
import type {
  BrandFooterLogo,
  CompanySettings,
  Product,
  Quotation,
  QuotationItem
} from "@/lib/types";

const PRODUCT_PAGE_SIZE = 1000;

export async function getCompanySettings(supabase: any): Promise<CompanySettings> {
  const { data, error } = await supabase
    .from("company_settings")
    .select("*")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data) {
    return data as CompanySettings;
  }

  const { data: created, error: createError } = await supabase
    .from("company_settings")
    .insert(DEFAULT_COMPANY_SETTINGS)
    .select("*")
    .single();

  if (createError) {
    throw new Error(createError.message);
  }

  return created as CompanySettings;
}

export async function getFooterLogos(supabase: any): Promise<BrandFooterLogo[]> {
  const { data, error } = await supabase
    .from("brand_footer_logos")
    .select("*")
    .order("sort_order", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []) as BrandFooterLogo[];
}

export async function getActiveQuotationProducts(supabase: any): Promise<Product[]> {
  const products: Product[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("products")
      .select("*, brand:brands!products_brand_id_fkey(id,name)")
      .eq("status", "active")
      .is("deleted_at", null)
      .order("product_name", { ascending: true })
      .order("id", { ascending: true })
      .range(from, from + PRODUCT_PAGE_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }

    const page = (data || []) as Product[];
    products.push(...page);

    if (page.length < PRODUCT_PAGE_SIZE) {
      return products;
    }

    from += PRODUCT_PAGE_SIZE;
  }
}

export async function getQuotationWithItems(
  supabase: any,
  id: string
): Promise<{ quotation: Quotation; items: QuotationItem[] }> {
  const { data: quotation, error: quotationError } = await supabase
    .from("quotations")
    .select("*")
    .eq("id", id)
    .single();

  if (quotationError) {
    throw new Error(quotationError.message);
  }

  const { data: items, error: itemsError } = await supabase
    .from("quotation_items")
    .select("*")
    .eq("quotation_id", id)
    .order("created_at", { ascending: true });

  if (itemsError) {
    throw new Error(itemsError.message);
  }

  return {
    quotation: quotation as Quotation,
    items: (items || []) as QuotationItem[]
  };
}

export async function logActivity(
  supabase: any,
  input: {
    userId?: string | null;
    action: string;
    entityType: string;
    entityId?: string | null;
    metadata?: Record<string, unknown>;
  }
) {
  await supabase.from("activity_logs").insert({
    user_id: input.userId || null,
    action: input.action,
    entity_type: input.entityType,
    entity_id: input.entityId || null,
    metadata: input.metadata || {}
  });
}
