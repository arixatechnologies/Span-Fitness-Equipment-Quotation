import { SettingsForm } from "@/components/settings-form";
import { SettingsTabs } from "@/components/settings-tabs";
import { getCompanySettings } from "@/lib/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function CompanySettingsPage() {
  const supabase = await createServerSupabaseClient();
  const settings = await getCompanySettings(supabase);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-black text-slate-950">Settings</h1>
        <p className="text-sm text-slate-500">Update Span Fitness company and quotation defaults.</p>
      </div>
      <SettingsTabs />
      <SettingsForm settings={settings} returnTo="/settings/company" section="company" />
    </div>
  );
}
