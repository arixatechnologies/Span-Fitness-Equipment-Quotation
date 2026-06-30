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
export const maxDuration = 120;

async function launchPdfBrowser() {
  const isVercel = Boolean(process.env.VERCEL);
  serverlessChromium.setGraphicsMode = false;

  return chromium.launch({
    args: isVercel ? serverlessChromium.args : [],
    executablePath: isVercel
      ? await serverlessChromium.executablePath()
      : chromium.executablePath(),
    headless: true
  });
}

async function getStoredPdfDownload(supabase: any, id: string) {
  const { data: quotation, error } = await supabase
    .from("quotations")
    .select("id, quote_number, customer_snapshot, pdf_path")
    .eq("id", id)
    .single();

  if (error) throw new Error(error.message);
  if (!quotation.pdf_path) return null;

  const customer = quotation.customer_snapshot as Partial<Customer>;
  const filename = `${quotationDownloadBaseName(
    formatCustomerName(customer),
    quotation.quote_number
  )}.pdf`;
  const { data, error: signedUrlError } = await supabase.storage
    .from("quotation-pdfs")
    .createSignedUrl(quotation.pdf_path, 60 * 10, { download: filename });

  if (signedUrlError || !data?.signedUrl) {
    console.error("Stored quotation PDF signing failed", signedUrlError);
    return null;
  }

  return {
    quotation,
    path: quotation.pdf_path,
    downloadUrl: data.signedUrl,
    filename
  };
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
    await page.waitForFunction(
      () => document.documentElement.dataset.pdfPagination === "ready",
      null,
      { timeout: 10_000 }
    );
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

  if (quotation.pdf_path && quotation.pdf_path !== path) {
    await supabase.storage.from("quotation-pdfs").remove([quotation.pdf_path]);
  }

  return {
    quotation,
    path,
    shareUrl: shareResult.data.signedUrl,
    downloadUrl: downloadResult.data.signedUrl,
    filename
  };
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const isDownload = new URL(request.url).searchParams.get("download") === "1";

  try {
    const { supabase, user } = await requireUser();

    if (isDownload) {
      const storedPdf = await getStoredPdfDownload(supabase, id);

      if (storedPdf) {
        await logActivity(supabase, {
          userId: user.id,
          action: "Quotation PDF downloaded",
          entityType: "quotation",
          entityId: storedPdf.quotation.id
        });

        return NextResponse.json({
          url: storedPdf.downloadUrl,
          downloadUrl: storedPdf.downloadUrl,
          path: storedPdf.path,
          filename: storedPdf.filename
        });
      }
    }

    const { quotation, path, shareUrl, downloadUrl, filename } =
      await storeQuotationPdf(supabase, id);

    await logActivity(supabase, {
      userId: user.id,
      action: isDownload ? "Quotation PDF downloaded" : "Quotation PDF generated",
      entityType: "quotation",
      entityId: quotation.id
    });

    return NextResponse.json({
      url: isDownload ? downloadUrl : shareUrl,
      downloadUrl,
      path,
      filename
    });
  } catch (error) {
    console.error(
      isDownload ? "Quotation PDF download failed" : "Quotation PDF generation failed",
      error
    );
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : isDownload
              ? "Unable to download PDF"
              : "Unable to generate PDF"
      },
      { status: 500 }
    );
  }
}
