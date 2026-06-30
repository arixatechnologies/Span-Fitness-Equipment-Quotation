import Link from "next/link";
import {
  FileText,
  Pencil,
  RefreshCcw
} from "lucide-react";
import {
  createRevisionAction
} from "@/app/actions/quotations";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";
import { QuotationActions } from "@/components/quotation-actions";
import { StatusBadge } from "@/components/ui";
import { getQuotationWithItems } from "@/lib/data";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { formatCurrency, formatCustomerName, formatDate } from "@/lib/format";
import type { Customer } from "@/lib/types";

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { quotation, items } = await getQuotationWithItems(supabase, id);
  const customer = quotation.customer_snapshot as Partial<Customer>;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950">{quotation.quote_number}</h1>
          <p className="text-sm text-slate-500">
            {formatCustomerName(customer)} | {formatDate(quotation.quote_date)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {quotation.status === "Draft" ? (
            <Link
              href={`/quotations/${quotation.id}/edit`}
              className="btn-secondary"
              title="Edit Draft"
            >
              <Pencil className="h-4 w-4" />
              Edit Draft
            </Link>
          ) : null}
          <Link
            href={`/quotations/${quotation.id}/preview`}
            className="btn-secondary"
            title="Preview"
          >
            <FileText className="h-4 w-4" />
            Preview
          </Link>
          <form action={createRevisionAction}>
            <input type="hidden" name="id" value={quotation.id} />
            <button type="submit" className="btn-secondary">
              <RefreshCcw className="h-4 w-4" />
              Create Revision
            </button>
          </form>
          <ConfirmDeleteButton
            entity="quotation"
            id={quotation.id}
            itemName={quotation.quote_number}
            className="btn-danger"
            showLabel
          />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <div className="panel p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Status</div>
          <div className="mt-2">
            <StatusBadge status={quotation.status} />
          </div>
        </div>
        <div className="panel p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Grand Total</div>
          <div className="mt-2 text-xl font-black text-navy">{formatCurrency(quotation.grand_total)}</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Validity</div>
          <div className="mt-2 text-xl font-black text-slate-950">{quotation.validity_days} days</div>
        </div>
        <div className="panel p-4">
          <div className="text-xs font-semibold uppercase text-slate-500">Products</div>
          <div className="mt-2 text-xl font-black text-slate-950">{items.length}</div>
        </div>
      </section>

      <section className="panel p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-black text-slate-950">PDF and Sharing</h2>
          <QuotationActions
            quotationId={quotation.id}
            editHref={`/quotations/${quotation.id}/edit`}
            initialPdfUrl={quotation.pdf_url}
            customerName={formatCustomerName(customer)}
            quoteNumber={quotation.quote_number}
            grandTotal={Number(quotation.grand_total)}
          />
        </div>
      </section>

      <section className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px]">
            <thead className="table-head">
              <tr>
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Qty</th>
                <th className="px-4 py-3 text-right">Quote Price</th>
                <th className="px-4 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id}>
                  <td className="table-cell">
                    <div className="font-black text-slate-950">{item.product_name}</div>
                    <div className="text-xs text-slate-500">{item.sku}</div>
                  </td>
                  <td className="table-cell">{item.qty}</td>
                  <td className="table-cell text-right">{formatCurrency(item.special_price)}</td>
                  <td className="table-cell text-right font-black text-navy">
                    {formatCurrency(item.line_total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
