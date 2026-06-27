"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/data";
import { slugify } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export async function saveBrandAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") || "");
  const name = z.string().min(1).parse(String(formData.get("name") || "").trim());
  const isActive = formData.get("is_active") === "on";
  const payload = { name, slug: slugify(name), is_active: isActive };

  if (id) {
    const { error } = await supabase.from("brands").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, {
      userId: user.id,
      action: "Brand edited",
      entityType: "brand",
      entityId: id
    });
  } else {
    const { data, error } = await supabase.from("brands").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await logActivity(supabase, {
      userId: user.id,
      action: "Brand added",
      entityType: "brand",
      entityId: data.id
    });
  }

  revalidatePath("/brands");
}

export async function toggleBrandAction(formData: FormData) {
  const { supabase } = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const isActive = formData.get("is_active") === "true";
  const { error } = await supabase.from("brands").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/brands");
}

export async function deleteBrandAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const { error } = await supabase.from("brands").delete().eq("id", id);

  if (error) throw new Error(error.message);

  await logActivity(supabase, {
    userId: user.id,
    action: "Brand deleted",
    entityType: "brand",
    entityId: id
  });

  revalidatePath("/brands");
  revalidatePath("/products");
}

export async function saveCategoryAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") || "");
  const name = z.string().min(1).parse(String(formData.get("name") || "").trim());
  const parentId = String(formData.get("parent_id") || "") || null;
  const isActive = formData.get("is_active") === "on";
  const payload = {
    name,
    slug: slugify(parentId ? `${name}-${parentId.slice(0, 8)}` : name),
    parent_id: parentId,
    is_active: isActive
  };

  if (id) {
    const { error } = await supabase.from("categories").update(payload).eq("id", id);
    if (error) throw new Error(error.message);
    await logActivity(supabase, {
      userId: user.id,
      action: "Category edited",
      entityType: "category",
      entityId: id
    });
  } else {
    const { data, error } = await supabase.from("categories").insert(payload).select("id").single();
    if (error) throw new Error(error.message);
    await logActivity(supabase, {
      userId: user.id,
      action: "Category added",
      entityType: "category",
      entityId: data.id
    });
  }

  revalidatePath("/categories");
}

export async function toggleCategoryAction(formData: FormData) {
  const { supabase } = await requireUser();
  const id = z.string().uuid().parse(formData.get("id"));
  const isActive = formData.get("is_active") === "true";
  const { error } = await supabase.from("categories").update({ is_active: isActive }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/categories");
}
