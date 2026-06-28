"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { hashMemberPassword } from "@/lib/auth/password";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getAdminEmail
} from "@/lib/auth/session";
import { logActivity } from "@/lib/data";
import { isTenDigitPhone, PHONE_VALIDATION_MESSAGE } from "@/lib/phone";
import { requireUser } from "@/lib/supabase/server";

const profileSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254),
  phoneNumber: z
    .string()
    .trim()
    .refine((value) => !value || isTenDigitPhone(value), PHONE_VALIDATION_MESSAGE),
  branchLocation: z.string().trim().max(150)
});

const photoTypes: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

async function uploadProfilePhoto(supabase: any, file: File | null) {
  if (!file || file.size === 0) {
    return { url: null, path: null };
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Profile photo must be 5 MB or smaller.");
  }

  const extension = photoTypes[file.type];
  if (!extension) {
    throw new Error("Profile photo must be a JPEG, PNG, or WebP image.");
  }

  const path = `profiles/${crypto.randomUUID()}.${extension}`;
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

export async function saveMyProfileAction(formData: FormData) {
  const { supabase, user } = await requireUser();
  const isMember = Boolean(user.id);
  const accountEmail = isMember
    ? String(formData.get("email") || "").toLowerCase()
    : getAdminEmail().trim().toLowerCase() || user.email.toLowerCase();
  const parsed = profileSchema.parse({
    name: formData.get("name"),
    email: accountEmail,
    phoneNumber: formData.get("phone_number"),
    branchLocation: formData.get("branch_location")
  });
  const password = String(formData.get("new_password") || "");
  const confirmPassword = String(formData.get("confirm_password") || "");

  if (password && password.length < 8) {
    throw new Error("New password must contain at least 8 characters.");
  }

  if (password !== confirmPassword) {
    throw new Error("New password and confirmation do not match.");
  }

  let current:
    | {
        id: string;
        profile_photo_url: string | null;
        profile_photo_path: string | null;
      }
    | null = null;

  if (isMember) {
    const { data, error } = await supabase
      .from("team_members")
      .select("id, profile_photo_url, profile_photo_path")
      .eq("id", user.id)
      .single();
    if (error) throw new Error(error.message);
    current = data;
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, profile_photo_url, profile_photo_path")
      .eq("email", parsed.email)
      .maybeSingle();
    if (error) throw new Error(error.message);
    current = data;
  }

  const uploadedPhoto = await uploadProfilePhoto(
    supabase,
    formData.get("profile_photo") as File | null
  );
  const removePhoto = formData.get("remove_photo") === "on";
  const profilePhotoUrl = uploadedPhoto.url
    ? uploadedPhoto.url
    : removePhoto
      ? null
      : current?.profile_photo_url || null;
  const profilePhotoPath = uploadedPhoto.path
    ? uploadedPhoto.path
    : removePhoto
      ? null
      : current?.profile_photo_path || null;
  let profileId = current?.id || null;
  let saveError: { code?: string; message: string } | null = null;

  if (isMember) {
    const payload: Record<string, unknown> = {
      member_name: parsed.name,
      email: parsed.email,
      phone_number: parsed.phoneNumber,
      branch_location: parsed.branchLocation,
      profile_photo_url: profilePhotoUrl,
      profile_photo_path: profilePhotoPath
    };

    if (password) {
      payload.password_hash = await hashMemberPassword(password);
    }

    const { error } = await supabase.from("team_members").update(payload).eq("id", user.id);
    saveError = error;
    profileId = user.id;
  } else if (current) {
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: parsed.name,
        phone_number: parsed.phoneNumber || null,
        branch_location: parsed.branchLocation || null,
        profile_photo_url: profilePhotoUrl,
        profile_photo_path: profilePhotoPath,
        role: user.role
      })
      .eq("id", current.id);
    saveError = error;
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .insert({
        full_name: parsed.name,
        email: parsed.email,
        phone_number: parsed.phoneNumber || null,
        branch_location: parsed.branchLocation || null,
        profile_photo_url: profilePhotoUrl,
        profile_photo_path: profilePhotoPath,
        role: user.role
      })
      .select("id")
      .single();
    saveError = error;
    profileId = data?.id || null;
  }

  if (saveError) {
    if (uploadedPhoto.path) {
      await supabase.storage.from("member-photos").remove([uploadedPhoto.path]);
    }

    if (saveError.code === "23505") {
      throw new Error("This email is already used by another account.");
    }

    throw new Error(saveError.message);
  }

  if (
    current?.profile_photo_path &&
    (uploadedPhoto.path || removePhoto) &&
    current.profile_photo_path !== profilePhotoPath
  ) {
    await supabase.storage.from("member-photos").remove([current.profile_photo_path]);
  }

  const token = await createSessionToken(parsed.email, {
    id: user.id || undefined,
    name: parsed.name,
    role: user.role,
    branchLocation: parsed.branchLocation || undefined,
    profilePhotoUrl: profilePhotoUrl || undefined
  });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });

  await logActivity(supabase, {
    userId: user.id,
    action: "Profile updated",
    entityType: isMember ? "team_member" : "profile",
    entityId: profileId
  });

  revalidatePath("/settings/profile");
  revalidatePath("/", "layout");
  redirect("/settings/profile?saved=1");
}
