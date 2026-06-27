import { SettingsForm } from "@/components/settings-form";
import { SettingsTabs } from "@/components/settings-tabs";
import { getCompanySettings } from "@/lib/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export default async function TermsSettingsPage() {
  const supabase = await createServerSupabaseClient();
  const settings = await getCompanySettings(supabase);

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-black text-slate-950">Terms Settings</h1>
        <p className="text-sm text-slate-500">Edit default terms copied into new quotations.</p>
      </div>
      <SettingsTabs />
      <SettingsForm settings={settings} returnTo="/settings/terms" section="terms" />
    </div>
  );
}
