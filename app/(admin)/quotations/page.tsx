import Link from "next/link";
import { Eye, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { deleteQuotationAction } from "@/app/actions/quotations";
import { EmptyState, StatusBadge } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatCustomerName, formatDate } from "@/lib/format";
import { getSearchText } from "@/lib/search";

type SearchParams = Record<string, string | string[] | undefined>;

export default async function QuotationsPage({
  searchParams
}: {
  searchParams: Promise<SearchParams>;
}) {
  const params = await searchParams;
  const q = getSearchText(params.q);
  const status = getSearchText(params.status);
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("quotations")
    .select("*")
    .order("created_at", { ascending: false });

  if (q) {
    query = query.or(
      [
        `quote_number.ilike.%${q}%`,
        `customer_snapshot->>phone.ilike.%${q}%`,
        `customer_snapshot->>customer_name.ilike.%${q}%`,
        `customer_snapshot->>business_name.ilike.%${q}%`,
        `customer_snapshot->>email.ilike.%${q}%`,
        `customer_snapshot->>gst_number.ilike.%${q}%`
      ].join(",")
    );
  }
  if (status) query = query.eq("status", status);

  const { data: quotations, error } = await query;
  if (error) throw new Error(error.message);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Quotations</h1>
          <p className="text-sm text-slate-500">Create, preview, edit, and manage quotations.</p>
        </div>
        <Link href="/quotations/new" className="btn-primary w-full sm:w-auto">
          <Plus className="h-4 w-4" />
          Create Quotation
        </Link>
      </div>

      <form className="panel grid gap-3 p-4 md:grid-cols-[1fr_180px_auto]">
        <label className="relative">
          <span className="field-label">Search Quotations</span>
          <Search className="pointer-events-none absolute left-3 top-8 h-4 w-4 text-slate-400" />
          <input
            className="field-input !pl-10"
            name="q"
            defaultValue={q}
            placeholder="Search..."
          />
        </label>
        <label>
          <span className="field-label">Status</span>
          <select className="field-input" name="status" defaultValue={status}>
            <option value="">All</option>
            <option value="Draft">Draft</option>
            <option value="Sent">Sent</option>
            <option value="Accepted">Accepted</option>
            <option value="Rejected">Rejected</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </label>
        <div className="flex items-end">
          <button className="btn-secondary w-full sm:w-auto" type="submit">
            Filter
          </button>
        </div>
      </form>

      {(quotations || []).length ? (
        <section className="panel overflow-hidden">
          <div className="grid gap-3 p-3 md:hidden">
            {(quotations || []).map((quotation: any) => {
              const customer = quotation.customer_snapshot || {};
              return (
                <div key={quotation.id} className="rounded-md border border-line bg-white p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        href={`/quotations/${quotation.id}`}
                        className="block truncate font-black text-navy"
                      >
                        {quotation.quote_number}
                      </Link>
                      <div className="text-xs text-slate-500">Revision R{quotation.revision}</div>
                    </div>
                    <StatusBadge status={quotation.status} />
                  </div>
                  <div className="mt-3 grid gap-1 text-sm text-slate-700">
                    <div>{formatCustomerName(customer)}</div>
                    <div>{formatDate(quotation.quote_date)}</div>
                    <div className="font-black text-navy">{formatCurrency(quotation.grand_total)}</div>
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2">
                    <Link
                      href={`/quotations/${quotation.id}/preview`}
                      className="btn-secondary w-full px-3"
                      title="Preview"
                      aria-label={`Preview ${quotation.quote_number}`}
                    >
                      <Eye className="h-4 w-4" />
                    </Link>
                    <Link
                      href={`/quotations/${quotation.id}/edit`}
                      className="btn-secondary w-full px-3"
                      title="Edit PDF"
                      aria-label={`Edit PDF ${quotation.quote_number}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </Link>
                    <form action={deleteQuotationAction}>
                      <input type="hidden" name="id" value={quotation.id} />
                      <button
                        type="submit"
                        className="btn-danger w-full px-3"
                        title="Delete"
                        aria-label={`Delete ${quotation.quote_number}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full min-w-[1040px]">
              <thead className="table-head">
                <tr>
                  <th className="px-4 py-3">Quotation</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3 text-right">Grand Total</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(quotations || []).map((quotation: any) => {
                  const customer = quotation.customer_snapshot || {};
                  return (
                    <tr key={quotation.id}>
                      <td className="table-cell">
                        <Link href={`/quotations/${quotation.id}`} className="font-black text-navy">
                          {quotation.quote_number}
                        </Link>
                        <div className="text-xs text-slate-500">Revision R{quotation.revision}</div>
                      </td>
                      <td className="table-cell">
                        {formatCustomerName(customer)}
                      </td>
                      <td className="table-cell">{formatDate(quotation.quote_date)}</td>
                      <td className="table-cell text-right font-black text-navy">
                        {formatCurrency(quotation.grand_total)}
                      </td>
                      <td className="table-cell">
                        <StatusBadge status={quotation.status} />
                      </td>
                      <td className="table-cell">
                        <div className="flex justify-end gap-2">
                          <Link
                            href={`/quotations/${quotation.id}/preview`}
                            className="btn-secondary px-3"
                            title="Preview"
                            aria-label={`Preview ${quotation.quote_number}`}
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <Link
                            href={`/quotations/${quotation.id}/edit`}
                            className="btn-secondary px-3"
                            title="Edit PDF"
                            aria-label={`Edit PDF ${quotation.quote_number}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Link>
                          <form action={deleteQuotationAction}>
                            <input type="hidden" name="id" value={quotation.id} />
                            <button
                              type="submit"
                              className="btn-danger px-3"
                              title="Delete"
                              aria-label={`Delete ${quotation.quote_number}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </form>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <EmptyState
          title="No quotations found"
          description="Create a quotation by selecting products and entering customer details."
          href="/quotations/new"
          action="Create Quotation"
        />
      )}
    </div>
  );
}
