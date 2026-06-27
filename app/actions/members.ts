"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashMemberPassword } from "@/lib/auth/password";
import { getAdminEmail } from "@/lib/auth/session";
import { logActivity } from "@/lib/data";
import { requireAdmin } from "@/lib/supabase/server";

const memberSchema = z.object({
  member_name: z.string().trim().min(2).max(100),
  phone_number: z.string().trim().min(5).max(20),
  email: z.string().trim().email().max(254),
  password: z.string().min(8).max(128),
  role: z.enum(["Admin", "Manager", "Sales Executive"]),
  branch_location: z.string().trim().min(2).max(150),
  status: z.enum(["active", "inactive"])
});

const memberPhotoTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

async function uploadMemberPhoto(supabase: any, file: File | null) {
  if (!file || file.size === 0) {
    return { url: null, path: null };
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Profile photo must be 5 MB or smaller.");
  }

  const extension = memberPhotoTypes[file.type];
  if (!extension) {
    throw new Error("Profile photo must be a JPEG, PNG, or WebP image.");
  }

  const path = `members/${crypto.randomUUID()}.${extension}`;
  const { error } = await supabase.storage.from("member-photos").upload(path, file, {
    contentType: file.type,
    upsert: false
  });

  if (error) throw new Error(error.message);

  const {
    data: { publicUrl }
  } = supabase.storage.from("member-photos").getPublicUrl(path);

  return { url: publicUrl, path };
}

export async function addMemberAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const parsed = memberSchema.parse({
    member_name: formData.get("member_name"),
    phone_number: formData.get("phone_number"),
    email: String(formData.get("email") || "").toLowerCase(),
    password: formData.get("password"),
    role: formData.get("role"),
    branch_location: formData.get("branch_location"),
    status: formData.get("status")
  });

  if (parsed.email === getAdminEmail().trim().toLowerCase()) {
    throw new Error("This email is reserved for the main administrator account.");
  }

  const photo = await uploadMemberPhoto(
    supabase,
    formData.get("profile_photo") as File | null
  );
  const { data, error } = await supabase
    .from("team_members")
    .insert({
      member_name: parsed.member_name,
      phone_number: parsed.phone_number,
      email: parsed.email,
      password_hash: await hashMemberPassword(parsed.password),
      role: parsed.role,
      branch_location: parsed.branch_location,
      status: parsed.status,
      profile_photo_url: photo.url,
      profile_photo_path: photo.path
    })
    .select("id")
    .single();

  if (error) {
    if (photo.path) {
      await supabase.storage.from("member-photos").remove([photo.path]);
    }

    if (error.code === "23505") {
      throw new Error("A team member with this email already exists.");
    }

    throw new Error(error.message);
  }

  await logActivity(supabase, {
    userId: user.id,
    action: "Team member added",
    entityType: "team_member",
    entityId: data.id,
    metadata: { role: parsed.role }
  });

  revalidatePath("/members");
  redirect("/members");
}

export async function toggleMemberStatusAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));
  const status = z.enum(["active", "inactive"]).parse(formData.get("status"));

  if (user.id === id && status === "inactive") {
    throw new Error("You cannot deactivate your own account.");
  }

  const { error } = await supabase.from("team_members").update({ status }).eq("id", id);
  if (error) throw new Error(error.message);

  await logActivity(supabase, {
    userId: user.id,
    action: status === "active" ? "Team member activated" : "Team member deactivated",
    entityType: "team_member",
    entityId: id
  });

  revalidatePath("/members");
}

export async function deleteMemberAction(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const id = z.string().uuid().parse(formData.get("id"));

  if (user.id === id) {
    throw new Error("You cannot delete your own account.");
  }

  const { data: member, error: memberError } = await supabase
    .from("team_members")
    .select("profile_photo_path")
    .eq("id", id)
    .single();
  if (memberError) throw new Error(memberError.message);

  const { error } = await supabase.from("team_members").delete().eq("id", id);
  if (error) throw new Error(error.message);

  if (member.profile_photo_path) {
    await supabase.storage.from("member-photos").remove([member.profile_photo_path]);
  }

  await logActivity(supabase, {
    userId: user.id,
    action: "Team member deleted",
    entityType: "team_member",
    entityId: id
  });

  revalidatePath("/members");
}
