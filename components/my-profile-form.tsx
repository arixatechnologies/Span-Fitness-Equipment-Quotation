import { Save } from "lucide-react";
import { saveMyProfileAction } from "@/app/actions/profile";
import { MemberPhotoInput } from "@/components/member-photo-input";
import { PhoneInput } from "@/components/phone-input";
import { RequiredMark } from "@/components/required-mark";
import { SubmitButton } from "@/components/submit-button";
import type { TeamMemberRole } from "@/lib/types";

export type MyProfileFormValue = {
  name: string;
  email: string;
  phoneNumber: string;
  branchLocation: string;
  role: TeamMemberRole;
  profilePhotoUrl: string | null;
};

export function MyProfileForm({
  profile,
  isMember,
  saved
}: {
  profile: MyProfileFormValue;
  isMember: boolean;
  saved: boolean;
}) {
  return (
    <form action={saveMyProfileAction} className="panel p-5">
      {saved ? (
        <div className="mb-5 rounded-md border border-mist bg-mist/20 px-4 py-3 text-sm font-bold text-ink">
          Profile updated successfully.
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <MemberPhotoInput existingPhotoUrl={profile.profilePhotoUrl} />
        {profile.profilePhotoUrl ? (
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 md:col-span-2">
            <input type="checkbox" name="remove_photo" />
            Remove current profile photo
          </label>
        ) : null}

        <label htmlFor="profile-name">
          <span className="field-label">
            Name
            <RequiredMark />
          </span>
          <input
            id="profile-name"
            className="field-input"
            name="name"
            defaultValue={profile.name}
            required
          />
        </label>
        <label htmlFor="profile-phone">
          <span className="field-label">Phone Number</span>
          <PhoneInput
            id="profile-phone"
            name="phone_number"
            defaultValue={profile.phoneNumber}
            autoComplete="tel"
          />
        </label>
        <label htmlFor="profile-email">
          <span className="field-label">
            Email
            <RequiredMark />
          </span>
          <input
            id="profile-email"
            className={`field-input ${isMember ? "" : "bg-panel text-slate-500"}`}
            name="email"
            type="email"
            defaultValue={profile.email}
            readOnly={!isMember}
            required
          />
        </label>
        <label htmlFor="profile-role">
          <span className="field-label">Role</span>
          <input
            id="profile-role"
            className="field-input bg-panel text-slate-500"
            value={profile.role}
            readOnly
          />
        </label>
        <label htmlFor="profile-branch" className="md:col-span-2">
          <span className="field-label">Branch / Location</span>
          <input
            id="profile-branch"
            className="field-input"
            name="branch_location"
            defaultValue={profile.branchLocation}
          />
        </label>

        {isMember ? (
          <>
            <label htmlFor="profile-password">
              <span className="field-label">New Password</span>
              <input
                id="profile-password"
                className="field-input"
                name="new_password"
                type="password"
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label htmlFor="profile-confirm-password">
              <span className="field-label">Confirm New Password</span>
              <input
                id="profile-confirm-password"
                className="field-input"
                name="confirm_password"
                type="password"
                minLength={8}
                autoComplete="new-password"
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="mt-6 flex justify-end">
        <SubmitButton pendingLabel="Saving..." className="btn-primary w-full sm:w-auto">
          <Save className="h-4 w-4" aria-hidden="true" />
          Save Profile
        </SubmitButton>
      </div>
    </form>
  );
}
