import { Power, UserPlus } from "lucide-react";
import {
  addMemberAction,
  toggleMemberStatusAction
} from "@/app/actions/members";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { MemberPhotoInput } from "@/components/member-photo-input";
import { PhoneInput } from "@/components/phone-input";
import { RequiredMark } from "@/components/required-mark";
import { SubmitButton } from "@/components/submit-button";
import { StatusBadge } from "@/components/ui";
import { requireAdmin } from "@/lib/supabase/server";
import type { TeamMember } from "@/lib/types";

function MemberAvatar({ member }: { member: TeamMember }) {
  return (
    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-panel text-sm font-black text-navy">
      {member.profile_photo_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.profile_photo_url}
          alt={`${member.member_name} profile`}
          className="h-full w-full object-cover"
        />
      ) : (
        member.member_name.charAt(0).toUpperCase()
      )}
    </div>
  );
}

export default async function MembersPage() {
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("team_members")
    .select(
      "id, member_name, phone_number, email, role, branch_location, max_discount_percent, status, profile_photo_url, profile_photo_path, created_at, updated_at"
    )
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  const members = (data || []) as TeamMember[];

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Add Member</h1>
        <p className="text-sm text-slate-500">Create and manage team access.</p>
      </div>

      <form action={addMemberAction} className="panel p-5">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <MemberPhotoInput />
          <label htmlFor="member-name">
            <span className="field-label">
              Member Name
              <RequiredMark />
            </span>
            <input
              id="member-name"
              className="field-input"
              name="member_name"
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
              autoComplete="email"
              required
            />
          </label>
          <label htmlFor="member-password">
            <span className="field-label">
              Password
              <RequiredMark />
            </span>
            <input
              id="member-password"
              className="field-input"
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
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
              defaultValue="Sales Executive"
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
              defaultValue="48"
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
              defaultValue="active"
              required
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="flex items-end">
            <SubmitButton pendingLabel="Adding..." className="btn-primary w-full">
              <UserPlus className="h-4 w-4" aria-hidden="true" />
              Add Member
            </SubmitButton>
          </div>
        </div>
      </form>

      <section className="panel overflow-hidden">
        {members.length ? (
          <>
            <div className="grid gap-3 p-3 lg:hidden">
              {members.map((member) => (
                <article key={member.id} className="rounded-md border border-line bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <MemberAvatar member={member} />
                      <div className="min-w-0">
                        <div className="truncate font-black text-slate-950">
                          {member.member_name}
                        </div>
                        <div className="truncate text-xs text-slate-500">{member.email}</div>
                      </div>
                    </div>
                    <StatusBadge status={member.status} />
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-slate-700">
                    <div>{member.phone_number}</div>
                    <div>{member.role}</div>
                    <div>{member.branch_location}</div>
                    <div>Maximum Discount: {Number(member.max_discount_percent)}%</div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <form action={toggleMemberStatusAction}>
                      <input type="hidden" name="id" value={member.id} />
                      <input
                        type="hidden"
                        name="status"
                        value={member.status === "active" ? "inactive" : "active"}
                      />
                      <SubmitButton
                        className="btn-muted w-full px-3"
                        pendingLabel="Updating..."
                      >
                        <Power className="h-4 w-4" aria-hidden="true" />
                        {member.status === "active" ? "Deactivate" : "Activate"}
                      </SubmitButton>
                    </form>
                    <ConfirmDeleteButton
                      entity="member"
                      id={member.id}
                      itemName={member.member_name}
                      className="btn-danger w-full px-3"
                      showLabel
                    />
                  </div>
                </article>
              ))}
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full min-w-[940px]">
                <thead className="table-head">
                  <tr>
                    <th className="px-4 py-3">Member</th>
                    <th className="px-4 py-3">Phone Number</th>
                    <th className="px-4 py-3">Role</th>
                    <th className="px-4 py-3">Branch / Location</th>
                    <th className="px-4 py-3">Maximum Discount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id}>
                      <td className="table-cell">
                        <div className="flex items-center gap-3">
                          <MemberAvatar member={member} />
                          <div className="min-w-0">
                            <div className="font-black text-slate-950">{member.member_name}</div>
                            <div className="text-xs text-slate-500">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="table-cell">{member.phone_number}</td>
                      <td className="table-cell">{member.role}</td>
                      <td className="table-cell">{member.branch_location}</td>
                      <td className="table-cell">{Number(member.max_discount_percent)}%</td>
                      <td className="table-cell">
                        <StatusBadge status={member.status} />
                      </td>
                      <td className="table-cell">
                        <div className="flex justify-end gap-2">
                          <form action={toggleMemberStatusAction}>
                            <input type="hidden" name="id" value={member.id} />
                            <input
                              type="hidden"
                              name="status"
                              value={member.status === "active" ? "inactive" : "active"}
                            />
                            <SubmitButton
                              className="btn-muted px-3"
                              pendingLabel=""
                              title={member.status === "active" ? "Deactivate" : "Activate"}
                              aria-label={`${member.status === "active" ? "Deactivate" : "Activate"} ${member.member_name}`}
                            >
                              <Power className="h-4 w-4" aria-hidden="true" />
                            </SubmitButton>
                          </form>
                          <ConfirmDeleteButton
                            entity="member"
                            id={member.id}
                            itemName={member.member_name}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="px-5 py-12 text-center text-sm text-slate-500">
            No team members added yet.
          </div>
        )}
      </section>
    </div>
  );
}
