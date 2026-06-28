import Link from "next/link";
import { Edit, Plus, Trash2 } from "lucide-react";
import { deleteCustomerAction } from "@/app/actions/customers";
import { SearchField } from "@/components/search-field";
import { EmptyState } from "@/components/ui";
import { formatCustomerName } from "@/lib/format";
import { getSearchText } from "@/lib/search";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function CustomersPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = getSearchText(params.q);
  const supabase = await createServerSupabaseClient();
  let query = supabase.from("customers").select("*").order("updated_at", { ascending: false });

  if (q) {
    query = query.or(
      `customer_name.ilike.%${q}%,suffix.ilike.%${q}%,phone.ilike.%${q}%,email.ilike.%${q}%,gst_number.ilike.%${q}%`
    );
  }

  const { data: customers, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Customers</h1>
          <p className="text-sm text-slate-500">Create and manage customer records for quotations.</p>
        </div>
        <Link href="/customers/new" className="btn-primary w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Add Customer
        </Link>
      </div>

      <form className="panel grid gap-3 p-4 md:grid-cols-[1fr_auto]">
        <SearchField
          name="q"
          defaultValue={q}
          label="Search"
          placeholder="Search..."
          showSearchIcon
        />
        <div className="flex items-end">
          <button type="submit" className="btn-secondary w-full sm:w-auto">
            Search
          </button>
        </div>
      </form>

      {(customers || []).length ? (
        <section className="panel overflow-hidden">
          <div className="grid gap-3 p-3 md:hidden">
            {(customers || []).map((customer: any) => (
              <div key={customer.id} className="rounded-md border border-line bg-white p-3">
                <div className="font-black text-slate-950">{formatCustomerName(customer)}</div>
                <div className="mt-3 grid gap-1 text-sm text-slate-700">
                  <div>{customer.phone}</div>
                  <div>{customer.email || "-"}</div>
                  <div>
                    <span className="font-semibold text-slate-500">GST Number: </span>
                    {customer.gst_number || "-"}
                  </div>
                  <div>
                    {[customer.address, customer.city, customer.state, customer.pincode]
                      .filter(Boolean)
                      .join(", ") || "-"}
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href={`/customers/${customer.id}/edit`} className="btn-secondary w-full px-3">
                    <Edit className="h-4 w-4" />
                    Edit
                  </Link>
                  <form action={deleteCustomerAction}>
                    <input type="hidden" name="id" value={customer.id} />
                    <button type="submit" className="btn-danger w-full px-3">
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </form>
                </div>
              </div>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[980px]">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Customer Name</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">GST Number</th>
                  <th className="px-4 py-3">Location</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(customers || []).map((customer: any) => (
                  <tr key={customer.id}>
                    <td className="table-cell">
                      <div className="font-black text-slate-950">{formatCustomerName(customer)}</div>
                    </td>
                    <td className="table-cell">{customer.phone}</td>
                    <td className="table-cell">{customer.email || "-"}</td>
                    <td className="table-cell">{customer.gst_number || "-"}</td>
                    <td className="table-cell max-w-xs whitespace-normal">
                      {[customer.address, customer.city, customer.state, customer.pincode]
                        .filter(Boolean)
                        .join(", ") || "-"}
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-2">
                        <Link href={`/customers/${customer.id}/edit`} className="btn-secondary px-3">
                          <Edit className="h-4 w-4" />
                        </Link>
                        <form action={deleteCustomerAction}>
                          <input type="hidden" name="id" value={customer.id} />
                          <button type="submit" className="btn-danger px-3">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </form>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <EmptyState
          title="No customers found"
          description="Add customers manually or create them instantly while preparing a quotation."
          href="/customers/new"
          action="Add Customer"
        />
      )}
    </div>
  );
}
