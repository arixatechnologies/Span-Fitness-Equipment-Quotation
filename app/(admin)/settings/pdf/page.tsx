import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/supabase/server";

export default async function PdfSettingsRedirectPage() {
  await requireAdmin();
  redirect("/settings/company");
}
