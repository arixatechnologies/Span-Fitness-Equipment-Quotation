// import { QuotationActions } from "@/components/quotation-actions";
// import { getQuotationWithItems } from "@/lib/data";
// import { formatCustomerName } from "@/lib/format";
// import { getPdfChromeImages } from "@/lib/pdf-assets";
// import { renderQuotationHtml } from "@/lib/pdf-template";
// import { isSafeProductImageUrl } from "@/lib/product-image-url";
// import { createServerSupabaseClient } from "@/lib/supabase/server";
// import type { CompanySettings, Customer } from "@/lib/types";

// export default async function QuotationPreviewPage({
//   params,
//   searchParams
// }: {
//   params: Promise<{ id: string }>;
//   searchParams: Promise<{ download?: string }>;
// }) {
//   const { id } = await params;
//   const { download } = await searchParams;
//   const supabase = await createServerSupabaseClient();
//   const [{ quotation, items }, chromeImages] = await Promise.all([
//     getQuotationWithItems(supabase, id),
//     getPdfChromeImages()
//   ]);
//   const settings = quotation.company_settings_snapshot as CompanySettings;
//   const customer = quotation.customer_snapshot as Partial<Customer>;
//   const previewItems = items.map((item) => ({
//     ...item,
//     image_url:
//       item.image_url && isSafeProductImageUrl(item.image_url)
//         ? `/api/quotations/${quotation.id}/preview-image/${item.id}`
//         : null
//   }));
//   const html = renderQuotationHtml({ quotation, items: previewItems, settings, chromeImages });

//   return (
//     <div className="grid gap-5">
//       <div className="flex flex-wrap items-center justify-between gap-4">
//         <div>
//           <h1 className="text-2xl font-black text-slate-950">Quotation Preview</h1>
//           <p className="text-sm text-slate-500">{quotation.quote_number}</p>
//         </div>
//         <div className="w-full sm:w-auto">
//           <QuotationActions
//             quotationId={quotation.id}
//             editHref={`/quotations/${quotation.id}/edit`}
//             initialPdfUrl={quotation.pdf_url}
//             previewFrameId="quotation-pdf-preview"
//             autoDownload={download === "1"}
//             customerName={formatCustomerName(customer)}
//             quoteNumber={quotation.quote_number}
//             grandTotal={Number(quotation.grand_total)}
//           />
//         </div>
//       </div>
//       <div className="panel overflow-hidden p-4">
//         <iframe
//           id="quotation-pdf-preview"
//           title={`Preview ${quotation.quote_number}`}
//           srcDoc={html}
//           className="h-[65vh] min-h-[420px] w-full rounded-md border border-line bg-white sm:min-h-[560px] lg:h-[calc(100vh-220px)] lg:min-h-[720px]"
//         />
//       </div>
//     </div>
//   );
// }





import { QuotationActions } from "@/components/quotation-actions";
import { getQuotationWithItems } from "@/lib/data";
import { formatCustomerName } from "@/lib/format";
import { getPdfChromeImages } from "@/lib/pdf-assets";
import { renderQuotationHtml } from "@/lib/pdf-template";
import { isSafeProductImageUrl } from "@/lib/product-image-url";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type { CompanySettings, Customer } from "@/lib/types";

export default async function QuotationPreviewPage({
  params,
  searchParams
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ download?: string }>;
}) {
  const { id } = await params;
  const { download } = await searchParams;

  const supabase = await createServerSupabaseClient();

  const [{ quotation, items }, chromeImages] = await Promise.all([
    getQuotationWithItems(supabase, id),
    getPdfChromeImages()
  ]);

  const settings = quotation.company_settings_snapshot as CompanySettings;
  const customer = quotation.customer_snapshot as Partial<Customer>;

  const previewItems = items.map((item) => ({
    ...item,
    image_url:
      item.image_url && isSafeProductImageUrl(item.image_url)
        ? `/api/quotations/${quotation.id}/preview-image/${item.id}`
        : null
  }));

  const html = renderQuotationHtml({
    quotation,
    items: previewItems,
    settings,
    chromeImages
  });
  const proformaHtml = renderQuotationHtml({
    quotation,
    items: previewItems,
    settings,
    chromeImages,
    documentVariant: "proforma"
  });
  const autoDownloadMode =
    download === "proforma" ? "proforma" : download === "1" ? "pdf" : false;

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950">
            Quotation Preview
          </h1>
          <p className="text-sm text-slate-500">{quotation.quote_number}</p>
        </div>

        <div className="w-full sm:w-auto">
          <QuotationActions
            quotationId={quotation.id}
            editHref={`/quotations/${quotation.id}/edit`}
            initialPdfUrl={quotation.pdf_url}
            previewFrameId="quotation-pdf-preview"
            proformaFrameId="quotation-proforma-preview"
            autoDownloadMode={autoDownloadMode}
            customerName={formatCustomerName(customer)}
            customerPhone={customer.phone}
            quoteNumber={quotation.quote_number}
            grandTotal={Number(quotation.grand_total)}
          />
        </div>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        <strong>PDF Download Note:</strong> Click{" "}
        <strong>Download PDF</strong>, then in the print window choose{" "}
        <strong>Destination: Save as PDF</strong> and click{" "}
        <strong>Save</strong>. This uses the browser print engine for better PDF
        output like the Mr-Testing quotation.
      </div>

      <div className="panel overflow-hidden p-4">
        <iframe
          id="quotation-pdf-preview"
          title={`Preview ${quotation.quote_number}`}
          srcDoc={html}
          className="h-[65vh] min-h-[420px] w-full rounded-md border border-line bg-white sm:min-h-[560px] lg:h-[calc(100vh-220px)] lg:min-h-[720px]"
        />
        <iframe
          id="quotation-proforma-preview"
          title={`Proforma Invoice ${quotation.quote_number}`}
          srcDoc={proformaHtml}
          aria-hidden="true"
          tabIndex={-1}
          style={{
            position: "fixed",
            left: "-10000px",
            top: 0,
            width: "210mm",
            height: "297mm",
            border: 0,
            opacity: 0,
            pointerEvents: "none"
          }}
        />
      </div>
    </div>
  );
}
