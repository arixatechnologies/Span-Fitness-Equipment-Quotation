import { cookies } from "next/headers";
import { Sidebar, Topbar } from "@/components/nav";
import { SupabaseSetupNotice } from "@/components/setup-notice";
import { ADMIN_SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";
import { getSupabaseConfigIssue } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabaseIssue = getSupabaseConfigIssue();
  const cookieStore = await cookies();
  const session = await verifySessionToken(cookieStore.get(ADMIN_SESSION_COOKIE)?.value);

  return (
    <div className="flex min-h-screen flex-col bg-panel md:flex-row">
      <Sidebar role={session?.role || "Admin"} />
      <div className="min-w-0 flex-1">
        <Topbar title="Quotation Management" />
        <main className="px-4 py-5 md:px-7 md:py-6">
          {supabaseIssue ? <SupabaseSetupNotice issue={supabaseIssue} /> : children}
        </main>
      </div>
    </div>
  );
}
