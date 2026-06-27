import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/customer-form";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";

export default async function EditCustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { data: customer, error } = await supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .single();

  if (error && error.code !== "PGRST116") throw new Error(error.message);
  if (!customer) notFound();

  return (
    <div className="grid gap-5">
      <div>
        <h1 className="text-2xl font-black text-slate-950">Edit Customer</h1>
        <p className="text-sm text-slate-500">Update customer details used for future quotations.</p>
      </div>
      <CustomerForm customer={customer as Customer} />
    </div>
  );
}
