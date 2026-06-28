import { NextResponse } from "next/server";
import { chromium } from "playwright";
import { getQuotationWithItems, logActivity } from "@/lib/data";
import { formatCustomerName, quotationDownloadBaseName } from "@/lib/format";
import { getPdfChromeImages } from "@/lib/pdf-assets";
import { renderQuotationHtml } from "@/lib/pdf-template";
import { requireUser } from "@/lib/supabase/server";
import type { CompanySettings, Customer } from "@/lib/types";

async function createQuotationPdf(supabase: any, id: string) {
  const [{ quotation, items }, chromeImages] = await Promise.all([
    getQuotationWithItems(supabase, id),
    getPdfChromeImages()
  ]);
  const settings = quotation.company_settings_snapshot as CompanySettings;
  const customer = quotation.customer_snapshot as Partial<Customer>;
  const html = renderQuotationHtml({ quotation, items, settings, chromeImages });

  const browser = await chromium.launch({ headless: true });
  let pdf: Buffer;

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle" });
    pdf = await page.pdf({
      format: "A4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: "0",
        right: "0",
        bottom: "0",
        left: "0"
      }
    });
  } finally {
    await browser.close();
  }

  const filename = `${quotationDownloadBaseName(
    formatCustomerName(customer),
    quotation.quote_number
  )}.pdf`;

  return { quotation, pdf, filename };
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { supabase, user } = await requireUser();
    const { quotation, pdf, filename } = await createQuotationPdf(supabase, id);
    const path = `quotations/${quotation.id}/${filename}`;

    const { error: uploadError } = await supabase.storage
      .from("quotation-pdfs")
      .upload(path, pdf, {
        contentType: "application/pdf",
        upsert: true
      });

    if (uploadError) throw new Error(uploadError.message);

    const expiresIn = 60 * 60 * 24 * 30;
    const { data: signed, error: signedError } = await supabase.storage
      .from("quotation-pdfs")
      .createSignedUrl(path, expiresIn);

    if (signedError || !signed?.signedUrl) {
      throw new Error(signedError?.message || "Unable to create PDF link");
    }

    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const { error: updateError } = await supabase
      .from("quotations")
      .update({ pdf_url: signed.signedUrl, pdf_path: path, status: "Sent" })
      .eq("id", quotation.id);

    if (updateError) throw new Error(updateError.message);

    await supabase.from("pdf_files").insert({
      quotation_id: quotation.id,
      storage_path: path,
      signed_url: signed.signedUrl,
      expires_at: expiresAt
    });

    await logActivity(supabase, {
      userId: user.id,
      action: "Quotation PDF generated",
      entityType: "quotation",
      entityId: quotation.id
    });

    return NextResponse.json({ url: signed.signedUrl, path });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to generate PDF" },
      { status: 500 }
    );
  }
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { supabase, user } = await requireUser();
    const { quotation, pdf, filename } = await createQuotationPdf(supabase, id);

    await logActivity(supabase, {
      userId: user.id,
      action: "Quotation PDF downloaded",
      entityType: "quotation",
      entityId: quotation.id
    });

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to download PDF" },
      { status: 500 }
    );
  }
}
