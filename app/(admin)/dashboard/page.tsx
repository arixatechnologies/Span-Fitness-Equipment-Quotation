import Link from "next/link";
import { Plus, Upload, FileText, Settings } from "lucide-react";
import { StatCard, SectionTitle, StatusBadge } from "@/components/ui";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatCustomerName, formatDate } from "@/lib/format";

export default async function DashboardPage() {
  const supabase = await createServerSupabaseClient();
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [
    productsResult,
    quotationsResult,
    monthQuotationsResult,
    valueResult,
    recentResult
  ] = await Promise.all([
    supabase.from("products").select("id", { count: "exact", head: true }).is("deleted_at", null),
    supabase.from("quotations").select("id", { count: "exact", head: true }),
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .gte("created_at", monthStart.toISOString()),
    supabase.from("quotations").select("grand_total"),
    supabase
      .from("quotations")
      .select("id, quote_number, quote_date, customer_snapshot, grand_total, status")
      .order("created_at", { ascending: false })
      .limit(6)
  ]);

  const failedResult = [
    productsResult,
    quotationsResult,
    monthQuotationsResult,
    valueResult,
    recentResult
  ].find((result) => result.error);

  if (failedResult?.error) {
    throw new Error(failedResult.error.message);
  }

  const totalValue = (valueResult.data || []).reduce(
    (sum: number, quote: { grand_total: number }) => sum + Number(quote.grand_total || 0),
    0
  );

  return (
    <div className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Total Products" value={productsResult.count || 0} helper="Active catalog" />
        <StatCard label="Total Quotations" value={quotationsResult.count || 0} helper="All time" />
        <StatCard
          label="This Month"
          value={monthQuotationsResult.count || 0}
          helper="Created quotations"
        />
        <StatCard label="Quotation Value" value={formatCurrency(totalValue)} helper="All statuses" />
      </div>

      <div className="grid gap-3 md:grid-cols-5">
        <Link href="/products/new" className="btn-primary">
          <Plus className="h-4 w-4" />
          Add Product
        </Link>
        <Link href="/products/import" className="btn-secondary">
          <Upload className="h-4 w-4" />
          Import Products
        </Link>
        <Link href="/quotations/new" className="btn-primary">
          <FileText className="h-4 w-4" />
          Create Quotation
        </Link>
        <Link href="/quotations" className="btn-secondary">
          View Quotations
        </Link>
        <Link href="/settings/company" className="btn-secondary">
          <Settings className="h-4 w-4" />
          Company Settings
        </Link>
      </div>

      <section className="panel overflow-hidden">
        <div className="border-b border-line px-5 py-4">
          <SectionTitle title="Recent Quotations" />
        </div>
        <div className="grid gap-3 p-3 md:hidden">
          {(recentResult.data || []).map((quote: any) => {
            const customer = quote.customer_snapshot || {};
            return (
              <div key={quote.id} className="rounded-md border border-line bg-white p-3">
                <div className="flex items-start justify-between gap-3">
                  <Link href={`/quotations/${quote.id}`} className="min-w-0 truncate font-black text-navy">
                    {quote.quote_number}
                  </Link>
                  <StatusBadge status={quote.status} />
                </div>
                <div className="mt-3 grid gap-1 text-sm text-slate-700">
                  <div>{formatCustomerName(customer)}</div>
                  <div>{formatDate(quote.quote_date)}</div>
                  <div className="font-black text-navy">{formatCurrency(quote.grand_total)}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px]">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Quotation</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Grand Total</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(recentResult.data || []).map((quote: any) => {
                const customer = quote.customer_snapshot || {};
                return (
                  <tr key={quote.id}>
                    <td className="table-cell font-semibold text-navy">
                      <Link href={`/quotations/${quote.id}`}>{quote.quote_number}</Link>
                    </td>
                    <td className="table-cell">
                      {formatCustomerName(customer)}
                    </td>
                    <td className="table-cell">{formatDate(quote.quote_date)}</td>
                    <td className="table-cell text-right font-semibold">
                      {formatCurrency(quote.grand_total)}
                    </td>
                    <td className="table-cell">
                      <StatusBadge status={quote.status} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
