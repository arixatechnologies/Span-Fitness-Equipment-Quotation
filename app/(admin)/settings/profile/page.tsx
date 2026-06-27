import { MyProfileForm, type MyProfileFormValue } from "@/components/my-profile-form";
import { SettingsTabs } from "@/components/settings-tabs";
import { requireUser } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function ProfileSettingsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const { supabase, user } = await requireUser();
  const isMember = Boolean(user.id);
  let profile: MyProfileFormValue;

  if (isMember) {
    const { data, error } = await supabase
      .from("team_members")
      .select(
        "member_name, phone_number, email, role, branch_location, profile_photo_url"
      )
      .eq("id", user.id)
      .single();
    if (error) throw new Error(error.message);

    profile = {
      name: data.member_name,
      phoneNumber: data.phone_number,
      email: data.email,
      role: data.role,
      branchLocation: data.branch_location,
      profilePhotoUrl: data.profile_photo_url
    };
  } else {
    const { data, error } = await supabase
      .from("profiles")
      .select("full_name, phone_number, branch_location, profile_photo_url")
      .eq("email", user.email.toLowerCase())
      .maybeSingle();
    if (error) throw new Error(error.message);

    profile = {
      name: data?.full_name || user.name,
      phoneNumber: data?.phone_number || "",
      email: user.email,
      role: user.role,
      branchLocation: data?.branch_location || "",
      profilePhotoUrl: data?.profile_photo_url || user.profilePhotoUrl || null
    };
  }

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-black text-slate-950">My Profile</h1>
        <p className="text-sm text-slate-500">Update your personal account details.</p>
      </div>
      <SettingsTabs />
      <MyProfileForm profile={profile} isMember={isMember} saved={params.saved === "1"} />
    </div>
  );
}
