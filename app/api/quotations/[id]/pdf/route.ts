import { NextResponse } from "next/server";
import serverlessChromium from "@sparticuz/chromium";
import { chromium } from "playwright-core";
import { getQuotationWithItems, logActivity } from "@/lib/data";
import { formatCustomerName, quotationDownloadBaseName } from "@/lib/format";
import { getPdfChromeImages } from "@/lib/pdf-assets";
import { renderQuotationHtml } from "@/lib/pdf-template";
import { requireUser } from "@/lib/supabase/server";
import type { CompanySettings, Customer } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

async function launchPdfBrowser() {
  const isVercel = Boolean(process.env.VERCEL);

  return chromium.launch({
    args: isVercel ? serverlessChromium.args : [],
    executablePath: isVercel ? await serverlessChromium.executablePath() : chromium.executablePath(),
    headless: true
  });
}

async function createQuotationPdf(supabase: any, id: string) {
  const [{ quotation, items }, chromeImages] = await Promise.all([
    getQuotationWithItems(supabase, id),
    getPdfChromeImages()
  ]);
  const settings = quotation.company_settings_snapshot as CompanySettings;
  const customer = quotation.customer_snapshot as Partial<Customer>;
  const html = renderQuotationHtml({ quotation, items, settings, chromeImages });

  const browser = await launchPdfBrowser();
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

async function storeQuotationPdf(supabase: any, id: string) {
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
  const [shareResult, downloadResult] = await Promise.all([
    supabase.storage.from("quotation-pdfs").createSignedUrl(path, expiresIn),
    supabase.storage
      .from("quotation-pdfs")
      .createSignedUrl(path, expiresIn, { download: filename })
  ]);

  if (shareResult.error || !shareResult.data?.signedUrl) {
    throw new Error(shareResult.error?.message || "Unable to create PDF link");
  }

  if (downloadResult.error || !downloadResult.data?.signedUrl) {
    throw new Error(downloadResult.error?.message || "Unable to create PDF download link");
  }

  const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
  const { error: updateError } = await supabase
    .from("quotations")
    .update({ pdf_url: shareResult.data.signedUrl, pdf_path: path, status: "Sent" })
    .eq("id", quotation.id);

  if (updateError) throw new Error(updateError.message);

  await supabase.from("pdf_files").insert({
    quotation_id: quotation.id,
    storage_path: path,
    signed_url: shareResult.data.signedUrl,
    expires_at: expiresAt
  });

  return {
    quotation,
    path,
    shareUrl: shareResult.data.signedUrl,
    downloadUrl: downloadResult.data.signedUrl,
    filename
  };
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { supabase, user } = await requireUser();
    const { quotation, path, shareUrl, downloadUrl } = await storeQuotationPdf(supabase, id);

    await logActivity(supabase, {
      userId: user.id,
      action: "Quotation PDF generated",
      entityType: "quotation",
      entityId: quotation.id
    });

    return NextResponse.json({ url: shareUrl, downloadUrl, path });
  } catch (error) {
    console.error("Quotation PDF generation failed", error);
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
    const { quotation, downloadUrl, filename } = await storeQuotationPdf(supabase, id);

    await logActivity(supabase, {
      userId: user.id,
      action: "Quotation PDF downloaded",
      entityType: "quotation",
      entityId: quotation.id
    });

    return NextResponse.json({ url: downloadUrl, filename });
  } catch (error) {
    console.error("Quotation PDF download failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to download PDF" },
      { status: 500 }
    );
  }
}
