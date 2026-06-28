import { cookies } from "next/headers";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export async function createServerSupabaseClient() {
  return createSupabaseAdminClient();
}

export async function requireUser() {
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  if (!session) {
    throw new Error("Authentication required");
  }

  const supabase = await createServerSupabaseClient();

  return {
    supabase,
    user: {
      id: session.memberId || null,
      email: session.email,
      name: session.name,
      role: session.role,
      branchLocation: session.branchLocation,
      profilePhotoUrl: session.profilePhotoUrl
    }
  };
}

export async function requireAdmin() {
  const context = await requireUser();

  if (context.user.role !== "Admin") {
    throw new Error("Administrator access required");
  }

  return context;
}
