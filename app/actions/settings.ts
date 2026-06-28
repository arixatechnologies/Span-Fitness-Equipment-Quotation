"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getCompanySettings, logActivity } from "@/lib/data";
import {
  isValidPhoneList,
  PHONE_LIST_VALIDATION_MESSAGE
} from "@/lib/phone";
import { requireUser } from "@/lib/supabase/server";

function clean(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text ? text : null;
}

function safeRedirectPath(value: FormDataEntryValue | null) {
  const path = String(value || "/settings/company");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/settings/company";
}

async function uploadAsset(
  supabase: any,
  file: File | null,
  existingUrl: string | null | undefined,
  folder: string
) {
  if (!file || file.size === 0) {
    return existingUrl || null;
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "png";
  const path = `${folder}/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("company-assets").upload(path, file, {
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message);

  const {
    data: { publicUrl }
  } = supabase.storage.from("company-assets").getPublicUrl(path);

  return publicUrl;
}

export async function saveCompanySettingsAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const current = await getCompanySettings(supabase);
  const logoUrl = await uploadAsset(
    supabase,
    formData.get("logo") as File | null,
    clean(formData.get("logo_url")),
    "logos"
  );
  const signatureUrl = await uploadAsset(
    supabase,
    formData.get("signature") as File | null,
    clean(formData.get("signature_url")),
    "signatures"
  );

  const payload = {
    company_name: z.string().min(1).parse(String(formData.get("company_name") || "").trim()),
    logo_url: logoUrl,
    gst_number: String(formData.get("gst_number") || "").trim(),
    phone_numbers: z
      .string()
      .trim()
      .refine(
        (value) => !value || isValidPhoneList(value),
        PHONE_LIST_VALIDATION_MESSAGE
      )
      .parse(formData.get("phone_numbers")),
    email: String(formData.get("email") || "").trim(),
    address: String(formData.get("address") || "").trim(),
    bank_name: String(formData.get("bank_name") || "").trim(),
    bank_account_no: String(formData.get("bank_account_no") || "").trim(),
    bank_branch: String(formData.get("bank_branch") || "").trim(),
    bank_ifsc: String(formData.get("bank_ifsc") || "").trim(),
    pdf_theme_color: String(formData.get("pdf_theme_color") || "#93B5C6").trim(),
    default_gst_percent: z.coerce.number().min(0).max(100).parse(formData.get("default_gst_percent")),
    default_gst_mode: z.enum(["add", "included", "none"]).parse(formData.get("default_gst_mode")),
    default_validity_days: z.coerce.number().int().min(1).parse(formData.get("default_validity_days")),
    default_terms: String(formData.get("default_terms") || "").trim(),
    default_warranty: String(formData.get("default_warranty") || "").trim(),
    default_delivery: String(formData.get("default_delivery") || "").trim(),
    default_transportation: String(formData.get("default_transportation") || "").trim(),
    default_payment_terms: String(formData.get("default_payment_terms") || "").trim(),
    default_after_sales_support: String(formData.get("default_after_sales_support") || "").trim(),
    authorized_person_name: String(formData.get("authorized_person_name") || "").trim(),
    authorized_person_designation: String(formData.get("authorized_person_designation") || "").trim(),
    signature_url: signatureUrl,
    brand_footer_heading: String(formData.get("brand_footer_heading") || "").trim(),
    brand_footer_enabled: formData.get("brand_footer_enabled") === "on"
  };

  const { error } = await supabase.from("company_settings").update(payload).eq("id", current.id);
  if (error) throw new Error(error.message);

  await logActivity(supabase, {
    userId: user.id,
    action: "Settings updated",
    entityType: "company_settings",
    entityId: current.id
  });

  revalidatePath("/settings/company");
  revalidatePath("/settings/terms");
  redirect(safeRedirectPath(formData.get("return_to")));
}

export async function saveFooterLogoAction(formData: FormData) {
  const { supabase } = await requireUser();
  const file = formData.get("image") as File | null;
  const imageUrl = await uploadAsset(supabase, file, clean(formData.get("image_url")), "brand-logos");
  const id = String(formData.get("id") || "");
  const payload = {
    label: z.string().min(1).parse(String(formData.get("label") || "").trim()),
    image_url: imageUrl,
    sort_order: z.coerce.number().int().parse(formData.get("sort_order") || 0),
    is_active: formData.get("is_active") === "on"
  };

  if (id) {
    const { error } = await supabase.from("brand_footer_logos").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("brand_footer_logos").insert(payload);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/settings/company");
}
