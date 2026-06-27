"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { slugify } from "@/lib/format";
import { logActivity } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";

const productSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  sku: z.string().min(1),
  product_name: z.string().min(1),
  brand_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  sub_category_id: z.string().uuid().nullable().optional(),
  image_url: z.string().url().nullable().optional().or(z.literal("")),
  unit_price: z.coerce.number().min(0),
  special_price: z.coerce.number().min(0).optional(),
  gst_percent: z.coerce.number().min(0).max(100).default(18),
  stock_availability: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  technical_specifications: z.string().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  machine_weight: z.string().nullable().optional(),
  stack_weight: z.string().nullable().optional(),
  warranty_note: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]).default("active")
});

const importRowSchema = z.object({
  sku: z.string().min(1),
  product_name: z.string().min(1),
  brand: z.string().optional().default("Span"),
  description: z.string().optional().default(""),
  unit_price: z.coerce.number().min(0),
  special_price: z.coerce.number().min(0).optional(),
  gst_percent: z.coerce.number().min(0).max(100).default(18),
  image_url: z.string().optional().default(""),
  stock_availability: z.string().optional().default("In Stock"),
  status: z.enum(["active", "inactive"]).default("active")
});

async function uploadImage(
  supabase: any,
  file: File | null,
  existingUrl: string | null | undefined
) {
  if (!file || file.size === 0) {
    return existingUrl || null;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
  const path = `products/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("product-images").upload(path, file, {
    contentType: file.type,
    upsert: false
  });

  if (error) {
    throw new Error(error.message);
  }

  const {
    data: { publicUrl }
  } = supabase.storage.from("product-images").getPublicUrl(path);

  return publicUrl;
}

function cleanNullable(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text ? text : null;
}

export async function saveProductAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const imageFile = formData.get("image") as File | null;
  const imageUrl = await uploadImage(supabase, imageFile, cleanNullable(formData.get("image_url")));
  const parsed = productSchema.parse({
    id: String(formData.get("id") || ""),
    sku: String(formData.get("sku") || "").trim(),
    product_name: String(formData.get("product_name") || "").trim(),
    brand_id: cleanNullable(formData.get("brand_id")),
    category_id: cleanNullable(formData.get("category_id")),
    sub_category_id: cleanNullable(formData.get("sub_category_id")),
    image_url: imageUrl,
    unit_price: formData.get("unit_price"),
    special_price: formData.get("unit_price"),
    gst_percent: formData.get("gst_percent") || 18,
    stock_availability: cleanNullable(formData.get("stock_availability")),
    description: cleanNullable(formData.get("description")),
    technical_specifications: cleanNullable(formData.get("technical_specifications")),
    dimensions: cleanNullable(formData.get("dimensions")),
    machine_weight: cleanNullable(formData.get("machine_weight")),
    stack_weight: cleanNullable(formData.get("stack_weight")),
    warranty_note: cleanNullable(formData.get("warranty_note")),
    status: String(formData.get("status") || "active")
  });

  const payload = {
    sku: parsed.sku,
    product_name: parsed.product_name,
    brand_id: parsed.brand_id || null,
    category_id: parsed.category_id || null,
    sub_category_id: parsed.sub_category_id || null,
    image_url: parsed.image_url || null,
    unit_price: parsed.unit_price,
    special_price: parsed.unit_price,
    gst_percent: parsed.gst_percent,
    stock_availability: parsed.stock_availability || null,
    description: parsed.description || null,
    technical_specifications: parsed.technical_specifications || null,
    dimensions: parsed.dimensions || null,
    machine_weight: parsed.machine_weight || null,
    stack_weight: parsed.stack_weight || null,
    warranty_note: parsed.warranty_note || null,
    status: parsed.status
  };

  if (parsed.id) {
    const { error } = await supabase.from("products").update(payload).eq("id", parsed.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, {
      userId: user.id,
      action: "Product edited",
      entityType: "product",
      entityId: parsed.id
    });
  } else {
    const { data, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await logActivity(supabase, {
      userId: user.id,
      action: "Product added",
      entityType: "product",
      entityId: data.id
    });
  }

  revalidatePath("/products");
  redirect("/products");
}

export async function softDeleteProductAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), status: "inactive" })
    .eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity(supabase, {
    userId: user.id,
    action: "Product deleted",
    entityType: "product",
    entityId: id
  });

  revalidatePath("/products");
}

async function ensureBrand(supabase: any, name: string) {
  const cleanName = name.trim() || "Span";
  const slug = slugify(cleanName);
  const { data: existing } = await supabase.from("brands").select("id").eq("slug", slug).maybeSingle();

  if (existing?.id) return existing.id;

  const { data, error } = await supabase
    .from("brands")
    .insert({ name: cleanName, slug })
    .select("id")
    .single();

  if (error) throw new Error(error.message);
  return data.id;
}

export async function bulkImportProducts(rows: unknown[]) {
  const { supabase, user } = await requireUser();
  const parsedRows = z.array(importRowSchema).safeParse(rows);

  if (!parsedRows.success) {
    return {
      ok: false,
      message: "Import data is invalid. Check required columns and numeric fields."
    };
  }

  const skus = parsedRows.data.map((row) => row.sku.trim());
  const duplicateInFile = skus.find((sku, index) => skus.indexOf(sku) !== index);

  if (duplicateInFile) {
    return { ok: false, message: `Duplicate SKU in file: ${duplicateInFile}` };
  }

  const { data: existing, error: existingError } = await supabase
    .from("products")
    .select("sku")
    .in("sku", skus);

  if (existingError) throw new Error(existingError.message);

  if (existing?.length) {
    return {
      ok: false,
      message: `These SKUs already exist: ${existing.map((item: { sku: string }) => item.sku).join(", ")}`
    };
  }

  const productPayload = [];

  for (const row of parsedRows.data) {
    const brandId = await ensureBrand(supabase, row.brand);
    productPayload.push({
      sku: row.sku.trim(),
      product_name: row.product_name.trim(),
      brand_id: brandId,
      category_id: null,
      sub_category_id: null,
      image_url: row.image_url || null,
      unit_price: row.unit_price,
      special_price: row.unit_price,
      gst_percent: row.gst_percent,
      stock_availability: row.stock_availability,
      description: row.description || null,
      technical_specifications: null,
      status: row.status
    });
  }

  const { error } = await supabase.from("products").insert(productPayload);
  if (error) throw new Error(error.message);

  await logActivity(supabase, {
    userId: user.id,
    action: "Products imported",
    entityType: "product",
    metadata: { count: productPayload.length }
  });

  revalidatePath("/products");
  return { ok: true, message: `${productPayload.length} products imported successfully.` };
}
