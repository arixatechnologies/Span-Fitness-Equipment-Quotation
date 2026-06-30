"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { databaseErrorMessage, type ActionState } from "@/lib/action-state";
import { logActivity } from "@/lib/data";
import { slugify } from "@/lib/format";
import { requireUser } from "@/lib/supabase/server";

export async function saveBrandAction(
  _previousState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { supabase, user } = await requireUser();
  const id = String(formData.get("id") || "");
  const parsed = z
    .object({
      id: z.string().uuid().optional().or(z.literal("")),
      name: z.string().trim().min(1, "Enter a brand name.").max(100, "Brand name is too long.")
    })
    .safeParse({ id, name: String(formData.get("name") || "") });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message || "Check the brand details." };
  }

  const name = parsed.data.name;
  const isActive = formData.get("is_active") === "on";
  const payload = { name, slug: slugify(name), is_active: isActive };

  let duplicateQuery = supabase.from("brands").select("id").eq("slug", payload.slug);
  if (id) duplicateQuery = duplicateQuery.neq("id", id);
  const { data: duplicate, error: duplicateError } = await duplicateQuery.maybeSingle();

  if (duplicateError) {
    console.error("Unable to check brand uniqueness", duplicateError);
    return { status: "error", message: "Unable to validate the brand right now. Please try again." };
  }

  if (duplicate) {
    return { status: "error", message: `A brand named "${name}" already exists.` };
  }

  if (id) {
    const { error } = await supabase.from("brands").update(payload).eq("id", id);
    if (error) {
      console.error("Unable to update brand", error);
      return {
        status: "error",
        message: databaseErrorMessage(
          error,
          { brands_slug_key: `A brand named "${name}" already exists.` },
          "Unable to update the brand. Please try again."
        )
      };
    }
    await logActivity(supabase, {
      userId: user.id,
      action: "Brand edited",
      entityType: "brand",
      entityId: id
    });
  } else {
    const { data, error } = await supabase.from("brands").insert(payload).select("id").single();
    if (error) {
      console.error("Unable to add brand", error);
      return {
        status: "error",
        message: databaseErrorMessage(
          error,
          { brands_slug_key: `A brand named "${name}" already exists.` },
          "Unable to add the brand. Please try again."
        )
      };
    }
    await logActivity(supabase, {
      userId: user.id,
      action: "Brand added",
      entityType: "brand",
      entityId: data.id
    });
  }

  revalidatePath("/brands");
  return { status: "success", message: id ? "Brand updated successfully." : "Brand added successfully." };
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
