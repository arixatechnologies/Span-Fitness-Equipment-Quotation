"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { calculateQuotation } from "@/lib/calculations";
import { getCompanySettings, getQuotationWithItems, logActivity } from "@/lib/data";
import { isTenDigitPhone, PHONE_VALIDATION_MESSAGE } from "@/lib/phone";
import { makeQuoteNumber, generateBaseQuoteNumber } from "@/lib/quotation-number";
import { requireUser } from "@/lib/supabase/server";
import type { Customer, GstMode, QuotationItemInput, QuotationStatus } from "@/lib/types";

const itemSchema = z.object({
  product_id: z.string().uuid().nullable().optional(),
  sku: z.string().optional().default(""),
  product_name: z.string().min(1),
  brand_name: z.string().optional().default(""),
  image_url: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  specifications: z.string().nullable().optional(),
  dimensions: z.string().nullable().optional(),
  machine_weight: z.string().nullable().optional(),
  stack_weight: z.string().nullable().optional(),
  unit_price: z.coerce.number().min(0),
  special_price: z.coerce.number().min(0),
  qty: z.coerce.number().positive(),
  gst_percent: z.coerce.number().min(0).max(100)
});

const quotationStatusSchema = z.enum([
  "Draft",
  "Sent",
  "Accepted",
  "Rejected",
  "Cancelled"
]);
const phoneSchema = z.string().trim().refine(isTenDigitPhone, PHONE_VALIDATION_MESSAGE);

function clean(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text ? text : null;
}

async function resolveCustomer(supabase: any, formData: FormData) {
  const customerId = clean(formData.get("customer_id"));

  if (customerId) {
    const { data, error } = await supabase.from("customers").select("*").eq("id", customerId).single();
    if (error) throw new Error(error.message);
    return { customerId, customerSnapshot: data as Customer };
  }

  const payload = {
    customer_name: z.string().min(1).parse(String(formData.get("new_customer_name") || "").trim()),
    business_name: clean(formData.get("new_business_name")),
    phone: phoneSchema.parse(String(formData.get("new_phone") || "")),
    suffix: clean(formData.get("new_suffix")),
    alternate_phone: phoneSchema.nullable().parse(clean(formData.get("new_alternate_phone"))),
    email: clean(formData.get("new_email")),
    gst_number: clean(formData.get("new_gst_number")),
    address: clean(formData.get("new_address")),
    city: clean(formData.get("new_city")),
    state: clean(formData.get("new_state")),
    pincode: clean(formData.get("new_pincode")),
    notes: clean(formData.get("new_notes"))
  };

  const { data, error } = await supabase.from("customers").insert(payload).select("*").single();
  if (error) throw new Error(error.message);

  return { customerId: data.id as string, customerSnapshot: data as Customer };
}

function quotationPayloadFromForm(
  formData: FormData,
  settings: Awaited<ReturnType<typeof getCompanySettings>>,
  customerId: string | null,
  customerSnapshot: Customer,
  calculated: ReturnType<typeof calculateQuotation>,
  status: QuotationStatus
) {
  const gstMode = z.enum(["add", "included", "none"]).parse(formData.get("gst_mode"));

  return {
    quote_date: String(formData.get("quote_date") || new Date().toISOString().slice(0, 10)),
    validity_days: z.coerce.number().int().positive().parse(formData.get("validity_days")),
    customer_id: customerId,
    customer_snapshot: customerSnapshot,
    total_list_price: calculated.totals.total_list_price,
    discount_amount: calculated.totals.discount_amount,
    total_special_price: calculated.totals.total_special_price,
    gst_amount: calculated.totals.gst_amount,
    net_total: calculated.totals.net_total,
    round_off: calculated.totals.round_off,
    grand_total: calculated.totals.grand_total,
    gst_mode: gstMode,
    terms: String(formData.get("terms") || settings.default_terms),
    payment_terms: String(formData.get("payment_terms") || settings.default_payment_terms),
    transportation_note: String(
      formData.get("transportation_note") || settings.default_transportation
    ),
    delivery_note: String(formData.get("delivery_note") || settings.default_delivery),
    warranty_note: String(formData.get("warranty_note") || settings.default_warranty),
    after_sales_support: String(
      formData.get("after_sales_support") || settings.default_after_sales_support
    ),
    bank_details: {
      bank_name: settings.bank_name,
      bank_account_no: settings.bank_account_no,
      bank_branch: settings.bank_branch,
      bank_ifsc: settings.bank_ifsc
    },
    company_settings_snapshot: settings,
    prepared_by: String(formData.get("prepared_by") || settings.authorized_person_name),
    status
  };
}

export async function saveQuotationAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const settings = await getCompanySettings(supabase);
  const quotationId = clean(formData.get("quotation_id"));
  const status = quotationStatusSchema.parse(formData.get("status") || "Draft");
  const gstMode = z.enum(["add", "included", "none"]).parse(formData.get("gst_mode"));
  const rawItems = JSON.parse(String(formData.get("items") || "[]"));
  const items = z.array(itemSchema).min(1).parse(rawItems) as QuotationItemInput[];
  const calculated = calculateQuotation(items, gstMode as GstMode);
  const { customerId, customerSnapshot } = await resolveCustomer(supabase, formData);
  const basePayload = quotationPayloadFromForm(
    formData,
    settings,
    customerId,
    customerSnapshot,
    calculated,
    status
  );

  let savedId = quotationId;

  if (quotationId) {
    const { error } = await supabase
      .from("quotations")
      .update({ ...basePayload, pdf_url: null, pdf_path: null })
      .eq("id", quotationId);

    if (error) throw new Error(error.message);

    const { error: deleteItemsError } = await supabase
      .from("quotation_items")
      .delete()
      .eq("quotation_id", quotationId);

    if (deleteItemsError) throw new Error(deleteItemsError.message);

    await logActivity(supabase, {
      userId: user.id,
      action: "Quotation edited",
      entityType: "quotation",
      entityId: quotationId
    });
  } else {
    const baseQuoteNumber = await generateBaseQuoteNumber(supabase);
    const quoteNumber = makeQuoteNumber(baseQuoteNumber, 0);

    const { data, error } = await supabase
      .from("quotations")
      .insert({
        ...basePayload,
        base_quote_number: baseQuoteNumber,
        revision: 0,
        quote_number: quoteNumber,
        created_by: user.id
      })
      .select("id")
      .single();

    if (error) throw new Error(error.message);
    savedId = data.id as string;

    await logActivity(supabase, {
      userId: user.id,
      action: "Quotation created",
      entityType: "quotation",
      entityId: savedId
    });
  }

  const itemPayload = calculated.items.map((item) => ({
    quotation_id: savedId,
    product_id: item.product_id || null,
    sku: item.sku,
    product_name: item.product_name,
    brand_name: item.brand_name,
    image_url: item.image_url || null,
    description: item.description || null,
    specifications: item.specifications || null,
    dimensions: item.dimensions || null,
    machine_weight: item.machine_weight || null,
    stack_weight: item.stack_weight || null,
    unit_price: item.unit_price,
    special_price: item.special_price,
    qty: item.qty,
    gst_percent: item.gst_percent,
    list_total: item.list_total,
    special_total: item.special_total,
    gst_amount: item.gst_amount,
    line_total: item.line_total
  }));

  const { error: itemsError } = await supabase.from("quotation_items").insert(itemPayload);
  if (itemsError) throw new Error(itemsError.message);

  revalidatePath("/quotations");
  redirect(`/quotations/${savedId}/preview`);
}

export async function createRevisionAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const { quotation, items } = await getQuotationWithItems(supabase, id);
  const { data: revisions, error: revError } = await supabase
    .from("quotations")
    .select("revision")
    .eq("base_quote_number", quotation.base_quote_number)
    .order("revision", { ascending: false })
    .limit(1);

  if (revError) throw new Error(revError.message);

  const nextRevision = Number(revisions?.[0]?.revision || 0) + 1;
  const quoteNumber = makeQuoteNumber(quotation.base_quote_number, nextRevision);
  const { data, error } = await supabase
    .from("quotations")
    .insert({
      ...quotation,
      id: undefined,
      revision: nextRevision,
      quote_number: quoteNumber,
      quote_date: new Date().toISOString().slice(0, 10),
      status: "Draft",
      pdf_url: null,
      pdf_path: null,
      created_by: user.id,
      created_at: undefined,
      updated_at: undefined
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  const itemPayload = items.map((item) => ({
    ...item,
    id: undefined,
    quotation_id: data.id,
    created_at: undefined
  }));

  const { error: itemsError } = await supabase.from("quotation_items").insert(itemPayload);
  if (itemsError) throw new Error(itemsError.message);

  await logActivity(supabase, {
    userId: user.id,
    action: "Quotation revised",
    entityType: "quotation",
    entityId: data.id,
    metadata: { from: id, revision: nextRevision }
  });

  revalidatePath("/quotations");
  redirect(`/quotations/${data.id}/preview`);
}

export async function updateQuotationStatusAction(formData: FormData) {
  const { supabase } = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const status = quotationStatusSchema.parse(formData.get("status"));
  const { error } = await supabase.from("quotations").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/quotations");
  revalidatePath(`/quotations/${id}`);
}

export async function deleteQuotationAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));

  const { data: quotation } = await supabase
    .from("quotations")
    .select("pdf_path")
    .eq("id", id)
    .maybeSingle();

  if (quotation?.pdf_path) {
    await supabase.storage.from("quotation-pdfs").remove([quotation.pdf_path]);
  }

  const { error } = await supabase.from("quotations").delete().eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity(supabase, {
    userId: user.id,
    action: "Quotation deleted",
    entityType: "quotation",
    entityId: id
  });

  revalidatePath("/quotations");
  redirect("/quotations");
}
