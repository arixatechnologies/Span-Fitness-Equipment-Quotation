import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { Sidebar, Topbar } from "@/components/nav";
import { SupabaseSetupNotice } from "@/components/setup-notice";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseConfigIssue } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabaseIssue = getSupabaseConfigIssue();
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);
  let currentUser = session
    ? {
        name: session.name,
        role: session.role,
        branchLocation: session.branchLocation,
        profilePhotoUrl: session.profilePhotoUrl
      }
    : null;

  if (session && !supabaseIssue) {
    try {
      const { user } = await requireUser();
      currentUser = {
        name: user.name,
        role: user.role,
        branchLocation: user.branchLocation,
        profilePhotoUrl: user.profilePhotoUrl
      };
    } catch {
      redirect("/api/auth/logout?reason=session_expired");
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-panel md:flex-row">
      <Sidebar role={currentUser?.role || "Admin"} />
      <div className="min-w-0 flex-1">
        <Topbar
          title={`Welcome ${currentUser?.name || "Administrator"}`}
          user={{
            name: currentUser?.name || "Administrator",
            branchLocation: currentUser?.branchLocation,
            profilePhotoUrl: currentUser?.profilePhotoUrl
          }}
        />
        <main className="px-4 py-5 md:px-7 md:py-6">
          {supabaseIssue ? <SupabaseSetupNotice issue={supabaseIssue} /> : children}
        </main>
      </div>
    </div>
  );
}
