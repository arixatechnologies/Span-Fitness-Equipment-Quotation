import { QuotationActions } from "@/components/quotation-actions";
import { getQuotationWithItems } from "@/lib/data";
import { formatCustomerName } from "@/lib/format";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";

export default async function QuotationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const { quotation } = await getQuotationWithItems(supabase, id);
  const customer = quotation.customer_snapshot as Partial<Customer>;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Quotation Preview</h1>
          <p className="text-sm text-slate-500">{quotation.quote_number}</p>
        </div>
        <div className="w-full sm:w-auto">
          <QuotationActions
            quotationId={quotation.id}
            editHref={`/quotations/${quotation.id}/edit`}
            initialPdfUrl={quotation.pdf_url}
            customerName={formatCustomerName(customer)}
            quoteNumber={quotation.quote_number}
            grandTotal={Number(quotation.grand_total)}
          />
        </div>
      </div>
      <div className="panel overflow-hidden p-4">
        <iframe
          title={`Preview ${quotation.quote_number}`}
          src={`/api/quotations/${quotation.id}/pdf#view=FitH`}
          className="h-[65vh] min-h-[420px] w-full rounded-md border border-line bg-white sm:min-h-[560px] lg:h-[calc(100vh-220px)] lg:min-h-[720px]"
        />
      </div>
    </div>
  );
}
