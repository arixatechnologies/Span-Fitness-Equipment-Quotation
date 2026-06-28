import { cookies } from "next/headers";
import { Sidebar, Topbar } from "@/components/nav";
import { SupabaseSetupNotice } from "@/components/setup-notice";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseConfigIssue } from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabaseIssue = getSupabaseConfigIssue();
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  let branchLocation = session?.branchLocation || "";

  if (session && !branchLocation && !supabaseIssue) {
    const supabase = await createServerSupabaseClient();
    const query = session.memberId
      ? supabase.from("team_members").select("branch_location").eq("id", session.memberId)
      : supabase.from("profiles").select("branch_location").eq("email", session.email);
    const { data } = await query.maybeSingle();
    branchLocation = data?.branch_location || "";
  }

  return (
    <div className="flex min-h-screen flex-col bg-panel md:flex-row">
      <Sidebar role={session?.role || "Admin"} />
      <div className="min-w-0 flex-1">
        <Topbar
          title={`Welcome ${session?.name || "Administrator"}`}
          user={{
            name: session?.name || "Administrator",
            branchLocation,
            profilePhotoUrl: session?.profilePhotoUrl
          }}
        />
        <main className="px-4 py-5 md:px-7 md:py-6">
          {supabaseIssue ? <SupabaseSetupNotice issue={supabaseIssue} /> : children}
        </main>
      </div>
    </div>
  );
}
