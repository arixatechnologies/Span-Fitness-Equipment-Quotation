import { NextResponse } from "next/server";
import {
  ADMIN_SESSION_COOKIE,
  SESSION_MAX_AGE_SECONDS,
  createSessionToken,
  getAdminEmail,
  getAuthSecret
} from "@/lib/auth/session";
import {
  DUMMY_PASSWORD_HASH,
  verifyMemberPassword
} from "@/lib/auth/password";
import {
  clearSuccessfulLogin,
  getLoginRateLimitContext,
  registerLoginFailure
} from "@/lib/auth/rate-limit";
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
  const adminEmail = getAdminEmail().trim().toLowerCase();

  if (!adminEmail || !getAuthSecret()) {
    return redirectToLogin("config", redirectedFrom);
  }

  try {
    const supabase = createSupabaseAdminClient();
    const rateLimit = await getLoginRateLimitContext(supabase, request, email);

    if (
      rateLimit.blockedUntil &&
      new Date(rateLimit.blockedUntil).getTime() > Date.now()
    ) {
      return redirectToLogin("rate_limited", redirectedFrom);
    }

    let sessionMember:
      | {
          id?: string;
          name: string;
          role: TeamMemberRole;
          branchLocation?: string;
          profilePhotoUrl?: string;
        }
      | undefined;
    let storedPasswordHash = DUMMY_PASSWORD_HASH;

    if (email === adminEmail) {
      const { data: profile, error } = await supabase
        .from("profiles")
        .select("full_name, branch_location, profile_photo_url, password_hash")
        .eq("email", adminEmail)
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (profile?.password_hash) {
        storedPasswordHash = profile.password_hash;
        sessionMember = {
          name: profile.full_name || "Administrator",
          role: "Admin",
          branchLocation: profile.branch_location || undefined,
          profilePhotoUrl: profile.profile_photo_url || undefined
        };
      }
    } else {
      const { data: member, error } = await supabase
        .from("team_members")
        .select("id, member_name, password_hash, role, branch_location, profile_photo_url")
        .eq("email", email)
        .eq("status", "active")
        .maybeSingle();

      if (error) throw new Error(error.message);

      if (member?.password_hash) {
        storedPasswordHash = member.password_hash;
        sessionMember = {
          id: member.id,
          name: member.member_name,
          role: member.role as TeamMemberRole,
          branchLocation: member.branch_location || undefined,
          profilePhotoUrl: member.profile_photo_url || undefined
        };
      }
    }

    const credentialsWellFormed =
      email.length > 0 &&
      email.length <= 254 &&
      password.length > 0 &&
      password.length <= 128;
    const passwordOk =
      credentialsWellFormed &&
      (await verifyMemberPassword(password, storedPasswordHash));

    if (!passwordOk || !sessionMember) {
      const nowBlocked = await registerLoginFailure(supabase, rateLimit);
      return redirectToLogin(nowBlocked ? "rate_limited" : "invalid", redirectedFrom);
    }

    await clearSuccessfulLogin(supabase, rateLimit);

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
  } catch (error) {
    console.error("Login failed", error);
    return redirectToLogin("unknown", redirectedFrom);
  }
}
