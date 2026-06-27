import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getAdminEmail,
  getAuthSecret,
  isAdminPasswordValid
} from "@/lib/auth/session";
import { verifyMemberPassword } from "@/lib/auth/password";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { TeamMemberRole } from "@/lib/types";

function safeRedirectPath(value: FormDataEntryValue | null) {
  const path = String(value || "/dashboard");
  return path.startsWith("/") && !path.startsWith("//") ? path : "/dashboard";
}

function redirectToLogin(error: string, redirectedFrom: string) {
  const params = new URLSearchParams({ error, redirectedFrom });
  return new NextResponse(null, {
    status: 303,
    headers: { Location: `/login?${params.toString()}` }
  });
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const redirectedFrom = safeRedirectPath(formData.get("redirectedFrom"));
  const adminEmail = getAdminEmail().toLowerCase();

  if (!adminEmail || !getAuthSecret()) {
    return redirectToLogin("config", redirectedFrom);
  }

  let sessionMember:
    | {
        id?: string;
        name: string;
        role: TeamMemberRole;
        profilePhotoUrl?: string;
      }
    | undefined;
  let passwordOk = false;

  if (email === adminEmail) {
    passwordOk = await isAdminPasswordValid(password);
    let profile:
      | {
          full_name: string | null;
          profile_photo_url: string | null;
        }
      | null = null;

    if (passwordOk) {
      const supabase = createSupabaseAdminClient();
      const { data } = await supabase
        .from("profiles")
        .select("full_name, profile_photo_url")
        .eq("email", adminEmail)
        .maybeSingle();
      profile = data;
    }

    sessionMember = {
      name: profile?.full_name || "Administrator",
      role: "Admin",
      profilePhotoUrl: profile?.profile_photo_url || undefined
    };
  } else {
    const supabase = createSupabaseAdminClient();
    const { data: member, error } = await supabase
      .from("team_members")
      .select("id, member_name, password_hash, role, profile_photo_url")
      .eq("email", email)
      .eq("status", "active")
      .maybeSingle();

    if (!error && member) {
      passwordOk = await verifyMemberPassword(password, member.password_hash);
      sessionMember = {
        id: member.id,
        name: member.member_name,
        role: member.role as TeamMemberRole,
        profilePhotoUrl: member.profile_photo_url || undefined
      };
    }
  }

  if (!passwordOk || !sessionMember) {
    return redirectToLogin("invalid", redirectedFrom);
  }

  const token = await createSessionToken(email, sessionMember);
  const response = new NextResponse(null, {
    status: 303,
    headers: { Location: redirectedFrom }
  });
  response.cookies.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_MAX_AGE_SECONDS,
    path: "/"
  });

  return response;
}
