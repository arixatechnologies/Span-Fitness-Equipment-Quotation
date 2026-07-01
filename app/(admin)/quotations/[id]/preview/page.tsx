import { QuotationActions } from "@/components/quotation-actions";
import { getQuotationWithItems } from "@/lib/data";
import { formatCustomerName } from "@/lib/format";
import { getPdfChromeImages } from "@/lib/pdf-assets";
import { renderQuotationHtml } from "@/lib/pdf-template";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CompanySettings, Customer } from "@/lib/types";

export default async function QuotationPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createServerSupabaseClient();
  const [{ quotation, items }, chromeImages] = await Promise.all([
    getQuotationWithItems(supabase, id),
    getPdfChromeImages()
  ]);
  const settings = quotation.company_settings_snapshot as CompanySettings;
  const customer = quotation.customer_snapshot as Partial<Customer>;
  const html = renderQuotationHtml({ quotation, items, settings, chromeImages });

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
            previewFrameId="quotation-pdf-preview"
            customerName={formatCustomerName(customer)}
            quoteNumber={quotation.quote_number}
            grandTotal={Number(quotation.grand_total)}
          />
        </div>
      </div>
      <div className="panel overflow-hidden p-4">
        <iframe
          id="quotation-pdf-preview"
          title={`Preview ${quotation.quote_number}`}
          srcDoc={html}
          className="h-[65vh] min-h-[420px] w-full rounded-md border border-line bg-white sm:min-h-[560px] lg:h-[calc(100vh-220px)] lg:min-h-[720px]"
        />
      </div>
    </div>
  );
}
