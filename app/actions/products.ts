"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { databaseErrorMessage, type ActionState } from "@/lib/action-state";
import { slugify } from "@/lib/format";
import { logActivity } from "@/lib/data";
import { isSafeProductImageUrl } from "@/lib/product-image-url";
import { requireUser } from "@/lib/supabase/server";
import {
  imageExtension,
  imageUploadError,
  MAX_FORM_IMAGE_BYTES
} from "@/lib/upload-limits";

const productSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  sku: z.string().min(1),
  product_name: z.string().min(1),
  brand_id: z.string().uuid().nullable().optional(),
  category_id: z.string().uuid().nullable().optional(),
  sub_category_id: z.string().uuid().nullable().optional(),
  image_url: z
    .string()
    .url()
    .refine(isSafeProductImageUrl, "Product image link must use a public HTTPS URL.")
    .nullable()
    .optional()
    .or(z.literal("")),
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

const productIdSchema = z.string().uuid();
const bulkProductIdsSchema = z.array(productIdSchema).min(1).max(500);

async function uploadImage(
  supabase: any,
  file: File | null,
  existingUrl: string | null | undefined
) {
  if (!file || file.size === 0) {
    return existingUrl || null;
  }

  const validationError = imageUploadError(file, MAX_FORM_IMAGE_BYTES);
  if (validationError) throw new Error(validationError);

  const extension = imageExtension(file);
  if (!extension) throw new Error("Unsupported product image type.");

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

export async function saveProductAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const imageFile = formData.get("image") as File | null;
  const parsedResult = productSchema.safeParse({
    id: String(formData.get("id") || ""),
    sku: String(formData.get("sku") || "").trim(),
    product_name: String(formData.get("product_name") || "").trim(),
    brand_id: cleanNullable(formData.get("brand_id")),
    category_id: cleanNullable(formData.get("category_id")),
    sub_category_id: cleanNullable(formData.get("sub_category_id")),
    image_url: cleanNullable(formData.get("image_url")),
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

  if (!parsedResult.success) {
    const issue = parsedResult.error.issues[0];
    const field = String(issue?.path[0] || "");
    const messages: Record<string, string> = {
      sku: "Enter a Product ID.",
      product_name: "Enter a product name.",
      image_url: "Enter a valid public HTTPS image link.",
      unit_price: "Enter a valid Unit Price."
    };

    return {
      status: "error",
      message: messages[field] || issue?.message || "Check the product details and try again."
    };
  }

  const parsed = parsedResult.data;
  let duplicateQuery = supabase.from("products").select("id").eq("sku", parsed.sku);
  if (parsed.id) duplicateQuery = duplicateQuery.neq("id", parsed.id);
  const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle();

  if (duplicateError) {
    console.error("Unable to check Product ID uniqueness", duplicateError);
    return {
      status: "error",
      message: "Unable to validate the Product ID right now. Please try again."
    };
  }

  if (duplicate) {
    return {
      status: "error",
      message: `Product ID "${parsed.sku}" already exists. Enter a different Product ID.`
    };
  }

  let imageUrl: string | null;
  try {
    imageUrl = await uploadImage(supabase, imageFile, parsed.image_url || null);
  } catch (error) {
    console.error("Unable to upload product image", error);
    const message = error instanceof Error ? error.message : "";
    const safeMessage =
      message.startsWith("Image must") || message.startsWith("Unsupported product image")
        ? message
        : "Unable to upload the product image. Please try again.";
    return { status: "error", message: safeMessage };
  }

  const payload = {
    sku: parsed.sku,
    product_name: parsed.product_name,
    brand_id: parsed.brand_id || null,
    category_id: parsed.category_id || null,
    sub_category_id: parsed.sub_category_id || null,
    image_url: imageUrl,
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
    if (error) {
      console.error("Unable to update product", error);
      return {
        status: "error",
        message: databaseErrorMessage(
          error,
          {
            products_sku_key: `Product ID "${parsed.sku}" already exists. Enter a different Product ID.`
          },
          "Unable to update the product. Please try again."
        )
      };
    }
    await logActivity(supabase, {
      userId: user.id,
      action: "Product edited",
      entityType: "product",
      entityId: parsed.id
    });
  } else {
    const { data, error } = await supabase.from("products").insert(payload).select("id").single();
    if (error) {
      console.error("Unable to add product", error);
      return {
        status: "error",
        message: databaseErrorMessage(
          error,
          {
            products_sku_key: `Product ID "${parsed.sku}" already exists. Enter a different Product ID.`
          },
          "Unable to add the product. Please try again."
        )
      };
    }
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
  const id = productIdSchema.parse(formData.get("id"));

  const { error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), status: "inactive" })
    .eq("id", id)
    .is("deleted_at", null);

  if (error) throw new Error(error.message);

  await logActivity(supabase, {
    userId: user.id,
    action: "Product deleted",
    entityType: "product",
    entityId: id
  });

  revalidatePath("/products");
}

export async function bulkSoftDeleteProductsAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const rawIds = JSON.parse(String(formData.get("ids") || "[]"));
  const ids = [...new Set(bulkProductIdsSchema.parse(rawIds))];

  const { data, error } = await supabase
    .from("products")
    .update({ deleted_at: new Date().toISOString(), status: "inactive" })
    .in("id", ids)
    .is("deleted_at", null)
    .select("id");

  if (error) throw new Error(error.message);

  const deletedIds = (data || []).map((product: { id: string }) => product.id);

  await logActivity(supabase, {
    userId: user.id,
    action: "Products deleted",
    entityType: "product",
    metadata: {
      count: deletedIds.length,
      productIds: deletedIds
    }
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
