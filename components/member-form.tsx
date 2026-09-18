import Link from "next/link";
import { Save, UserPlus } from "lucide-react";
import { addMemberAction, updateMemberAction } from "@/app/actions/members";
import { MemberPhotoInput } from "@/components/member-photo-input";
import { PhoneInput } from "@/components/phone-input";
import { RequiredMark } from "@/components/required-mark";
import { SubmitButton } from "@/components/submit-button";
import type { TeamMember } from "@/lib/types";

export function MemberForm({ member }: { member?: TeamMember }) {
  const isEdit = Boolean(member);

  return (
    <form action={isEdit ? updateMemberAction : addMemberAction} className="panel p-5">
      {member ? <input type="hidden" name="id" value={member.id} /> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MemberPhotoInput existingPhotoUrl={member?.profile_photo_url} />
        {member?.profile_photo_url ? (
          <label className="flex items-center gap-2 text-sm font-semibold text-slate-700 md:col-span-2 xl:col-span-4">
            <input type="checkbox" name="remove_photo" />
            Remove current profile photo
          </label>
        ) : null}

        <label htmlFor="member-name">
          <span className="field-label">
            Member Name
            <RequiredMark />
          </span>
          <input
            id="member-name"
            className="field-input"
            name="member_name"
            defaultValue={member?.member_name || ""}
            autoComplete="name"
            required
          />
        </label>
        <label htmlFor="member-phone">
          <span className="field-label">
            Phone Number
            <RequiredMark />
          </span>
          <PhoneInput
            id="member-phone"
            name="phone_number"
            defaultValue={member?.phone_number || ""}
            autoComplete="tel"
            required
          />
        </label>
        <label htmlFor="member-email">
          <span className="field-label">
            Email
            <RequiredMark />
          </span>
          <input
            id="member-email"
            className="field-input"
            name="email"
            type="email"
            defaultValue={member?.email || ""}
            autoComplete="email"
            required
          />
        </label>
        <label htmlFor="member-password">
          <span className="field-label">
            {isEdit ? "New Password" : "Password"}
            {!isEdit ? <RequiredMark /> : null}
          </span>
          <input
            id="member-password"
            className="field-input"
            name="password"
            type="password"
            minLength={8}
            autoComplete="new-password"
            required={!isEdit}
          />
        </label>
        <div>
          <label className="field-label" htmlFor="member-role">
            Role
            <RequiredMark />
          </label>
          <select
            id="member-role"
            className="field-input"
            name="role"
            defaultValue={member?.role || "Sales Executive"}
            required
          >
            <option value="Admin">Admin</option>
            <option value="Manager">Manager</option>
            <option value="Sales Executive">Sales Executive</option>
          </select>
        </div>
        <label htmlFor="member-branch">
          <span className="field-label">
            Branch / Location
            <RequiredMark />
          </span>
          <input
            id="member-branch"
            className="field-input"
            name="branch_location"
            defaultValue={member?.branch_location || ""}
            required
          />
        </label>
        <label htmlFor="member-max-discount">
          <span className="field-label">
            Maximum Discount (%)
            <RequiredMark />
          </span>
          <input
            id="member-max-discount"
            className="field-input"
            name="max_discount_percent"
            type="number"
            min="0"
            max="100"
            step="0.01"
            defaultValue={member ? Number(member.max_discount_percent) : 48}
            required
          />
        </label>
        <div>
          <label className="field-label" htmlFor="member-status">
            Status
            <RequiredMark />
          </label>
          <select
            id="member-status"
            className="field-input"
            name="status"
            defaultValue={member?.status || "active"}
            required
          >
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
        <div className="flex items-end gap-2 md:col-span-2 xl:col-span-4 xl:justify-end">
          {isEdit ? (
            <Link href="/members" className="btn-secondary flex-1 xl:flex-none">
              Cancel
            </Link>
          ) : null}
          <SubmitButton
            pendingLabel={isEdit ? "Saving..." : "Adding..."}
            className="btn-primary flex-1 xl:flex-none"
          >
            {isEdit ? (
              <Save className="h-4 w-4" aria-hidden="true" />
            ) : (
              <UserPlus className="h-4 w-4" aria-hidden="true" />
            )}
            {isEdit ? "Save Member" : "Add Member"}
          </SubmitButton>
        </div>
      </div>
    </form>
  );
}
