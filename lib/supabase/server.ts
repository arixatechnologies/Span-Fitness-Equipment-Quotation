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
  let member:
    | {
        id: string;
        email: string;
        member_name: string;
        role: "Admin" | "Manager" | "Sales Executive";
        branch_location: string;
        profile_photo_url: string | null;
        max_discount_percent: number;
      }
    | null = null;

  if (session.memberId) {
    const { data, error } = await supabase
      .from("team_members")
      .select(
        "id, email, member_name, role, branch_location, profile_photo_url, max_discount_percent"
      )
      .eq("id", session.memberId)
      .eq("status", "active")
      .maybeSingle();

    if (error || !data || data.email.toLowerCase() !== session.email.toLowerCase()) {
      throw new Error("Authentication required");
    }

    member = data;
  }

  return {
    supabase,
    user: {
      id: member?.id || null,
      email: member?.email || session.email,
      name: member?.member_name || session.name,
      role: member?.role || session.role,
      branchLocation: member?.branch_location || session.branchLocation,
      profilePhotoUrl: member?.profile_photo_url || session.profilePhotoUrl,
      maxDiscountPercent: member ? Number(member.max_discount_percent) : null
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
