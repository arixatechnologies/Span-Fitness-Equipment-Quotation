"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { logActivity } from "@/lib/data";
import { isTenDigitPhone, PHONE_VALIDATION_MESSAGE } from "@/lib/phone";
import { requireUser } from "@/lib/supabase/server";

const phoneSchema = z.string().trim().refine(isTenDigitPhone, PHONE_VALIDATION_MESSAGE);

const customerSchema = z.object({
  id: z.string().uuid().optional().or(z.literal("")),
  customer_name: z.string().min(1),
  business_name: z.string().nullable().optional(),
  phone: phoneSchema,
  suffix: z.string().nullable().optional(),
  alternate_phone: phoneSchema.nullable().optional(),
  email: z.string().email().nullable().optional().or(z.literal("")),
  gst_number: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  state: z.string().nullable().optional(),
  pincode: z.string().nullable().optional(),
  notes: z.string().nullable().optional()
});

function clean(value: FormDataEntryValue | null) {
  const text = String(value || "").trim();
  return text ? text : null;
}

export async function saveCustomerAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const parsed = customerSchema.parse({
    id: String(formData.get("id") || ""),
    customer_name: String(formData.get("customer_name") || "").trim(),
    business_name: clean(formData.get("business_name")),
    phone: String(formData.get("phone") || "").trim(),
    suffix: clean(formData.get("suffix")),
    alternate_phone: clean(formData.get("alternate_phone")),
    email: clean(formData.get("email")),
    gst_number: clean(formData.get("gst_number")),
    address: clean(formData.get("address")),
    city: clean(formData.get("city")),
    state: clean(formData.get("state")),
    pincode: clean(formData.get("pincode")),
    notes: clean(formData.get("notes"))
  });

  const payload = {
    customer_name: parsed.customer_name,
    business_name: parsed.business_name || null,
    phone: parsed.phone,
    suffix: parsed.suffix || null,
    alternate_phone: parsed.alternate_phone || null,
    email: parsed.email || null,
    gst_number: parsed.gst_number || null,
    address: parsed.address || null,
    city: parsed.city || null,
    state: parsed.state || null,
    pincode: parsed.pincode || null,
    notes: parsed.notes || null
  };

  if (parsed.id) {
    const { error } = await supabase.from("customers").update(payload).eq("id", parsed.id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, {
      userId: user.id,
      action: "Customer edited",
      entityType: "customer",
      entityId: parsed.id
    });
  } else {
    const { data, error } = await supabase.from("customers").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await logActivity(supabase, {
      userId: user.id,
      action: "Customer added",
      entityType: "customer",
      entityId: data.id
    });
  }

  revalidatePath("/customers");
  redirect("/customers");
}

export async function deleteCustomerAction(formData: FormData) {
  const { supabase } = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const { error } = await supabase.from("customers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/customers");
}
