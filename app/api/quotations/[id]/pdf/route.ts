import { NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { createElement } from "react";
import { getQuotationWithItems, logActivity } from "@/lib/data";
import { formatCustomerName, quotationDownloadBaseName } from "@/lib/format";
import { getPdfChromeImages } from "@/lib/pdf-assets";
import { isSafeProductImageUrl } from "@/lib/product-image-url";
import { QuotationPdfDocument } from "@/lib/quotation-pdf-document";
import { requireUser } from "@/lib/supabase/server";
import type { CompanySettings, Customer, QuotationItem } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 120;

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

function imageMime(buffer: Buffer) {
  if (
    buffer.length >= 8 &&
    buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return "image/png";
  }

  if (buffer.length >= 3 && buffer[0] === 255 && buffer[1] === 216 && buffer[2] === 255) {
    return "image/jpeg";
  }

  return "";
}

async function getProductImage(item: QuotationItem) {
  if (!item.image_url || !isSafeProductImageUrl(item.image_url)) return null;

  try {
    const response = await fetch(item.image_url, {
      signal: AbortSignal.timeout(8_000),
      cache: "no-store"
    });
    if (!response.ok) return null;

    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize > 5 * 1024 * 1024) return null;

    const buffer = Buffer.from(await response.arrayBuffer());
    if (buffer.length > 5 * 1024 * 1024) return null;

    const mime = imageMime(buffer);
    return mime ? `data:${mime};base64,${buffer.toString("base64")}` : null;
  } catch (error) {
    console.warn(`Unable to load PDF product image for ${item.sku}`, error);
    return null;
  }
}

async function getProductImages(items: QuotationItem[]) {
  const entries = await Promise.all(
    items.map(async (item) => [item.id, await getProductImage(item)] as const)
  );

  return Object.fromEntries(entries.filter((entry): entry is [string, string] => Boolean(entry[1])));
}

async function createQuotationPdf(supabase: any, id: string) {
  const { quotation, items } = await getQuotationWithItems(supabase, id);
  const [chromeImages, productImages] = await Promise.all([
    getPdfChromeImages(),
    getProductImages(items)
  ]);
  const settings = quotation.company_settings_snapshot as CompanySettings;
  const customer = quotation.customer_snapshot as Partial<Customer>;
  const document = createElement(QuotationPdfDocument, {
    quotation,
    items,
    settings,
    chromeImages,
    productImages
  });
  const pdf = Buffer.from(
    await renderToBuffer(document as unknown as Parameters<typeof renderToBuffer>[0])
  );

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
