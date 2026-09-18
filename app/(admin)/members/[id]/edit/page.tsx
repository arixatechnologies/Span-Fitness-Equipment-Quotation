import { notFound } from "next/navigation";
import { MemberForm } from "@/components/member-form";
import { requireAdmin } from "@/lib/supabase/server";
import type { TeamMember } from "@/lib/types";

export default async function EditMemberPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireAdmin();
  const { data, error } = await supabase
    .from("team_members")
    .select(
      "id, member_name, phone_number, email, role, branch_location, max_discount_percent, status, profile_photo_url, profile_photo_path, created_at, updated_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) notFound();

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Edit Member</h1>
        <p className="text-sm text-slate-500">Update team member access and account details.</p>
      </div>
      <MemberForm member={data as TeamMember} />
    </div>
  );
}
