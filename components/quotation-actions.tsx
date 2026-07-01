"use client";

import Link from "next/link";
import { useState } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  MessageCircle,
  Pencil
} from "lucide-react";
import { formatCurrency, quotationDownloadBaseName } from "@/lib/format";

export function QuotationActions({
  quotationId,
  editHref,
  initialPdfUrl,
  previewFrameId,
  customerName,
  quoteNumber,
  grandTotal
}: {
  quotationId: string;
  editHref: string;
  initialPdfUrl?: string | null;
  previewFrameId?: string;
  customerName: string;
  quoteNumber: string;
  grandTotal: number;
}) {
  const [pdfUrl, setPdfUrl] = useState(initialPdfUrl || "");
  const [pendingAction, setPendingAction] = useState<
    "" | "generate" | "download" | "excel"
  >("");
  const loading = Boolean(pendingAction);

  async function downloadPreviewPdf() {
    const frame = document.getElementById(previewFrameId || "") as HTMLIFrameElement | null;
    const previewDocument = frame?.contentDocument;

    if (!previewDocument?.body) {
      throw new Error("Quotation preview is not ready. Please try again.");
    }

    const readyDeadline = Date.now() + 10_000;
    while (
      previewDocument.documentElement.dataset.pdfPagination !== "ready" &&
      Date.now() < readyDeadline
    ) {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    await previewDocument.fonts?.ready;
    await Promise.all(
      Array.from(previewDocument.images).map(async (image) => {
        if (image.complete) return;
        await image.decode().catch(() => undefined);
      })
    );

    const exportRoot = document.createElement("div");
    exportRoot.style.position = "absolute";
    exportRoot.style.left = "0";
    exportRoot.style.top = "0";
    exportRoot.style.zIndex = "2147483647";
    exportRoot.style.width = "210mm";
    exportRoot.style.background = "#ffffff";

    const injectedStyles: HTMLStyleElement[] = [];
    for (const sourceStyle of Array.from(previewDocument.head.querySelectorAll("style"))) {
      const style = document.createElement("style");
      style.textContent = sourceStyle.textContent;
      document.head.appendChild(style);
      injectedStyles.push(style);
    }

    const exportOverrides = document.createElement("style");
    exportOverrides.textContent = `
      .page { margin: 0 !important; box-shadow: none !important; }
    `;
    document.head.appendChild(exportOverrides);
    injectedStyles.push(exportOverrides);

    for (const page of Array.from(previewDocument.body.querySelectorAll<HTMLElement>(".page"))) {
      exportRoot.appendChild(document.importNode(page, true));
    }

    document.body.appendChild(exportRoot);

    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import("html2canvas"),
        import("jspdf")
      ]);
      const pages = Array.from(exportRoot.querySelectorAll<HTMLElement>(".page"));
      const pdf = new jsPDF({
        unit: "mm",
        format: "a4",
        orientation: "portrait",
        compress: true
      });

      for (const [index, page] of pages.entries()) {
        const canvas = await html2canvas(page, {
            scale: 2,
            useCORS: true,
            allowTaint: false,
            backgroundColor: "#ffffff",
            logging: false,
          windowWidth: page.scrollWidth,
          width: page.scrollWidth,
          height: page.scrollHeight
        });

        if (index > 0) pdf.addPage("a4", "portrait");
        pdf.addImage(canvas.toDataURL("image/jpeg", 0.98), "JPEG", 0, 0, 210, 297);
      }

      pdf.save(`${quotationDownloadBaseName(customerName, quoteNumber)}.pdf`);
    } finally {
      exportRoot.remove();
      for (const style of injectedStyles) style.remove();
    }
  }

  async function generatePdf() {
    setPendingAction("generate");

    try {
      const response = await fetch(`/api/quotations/${quotationId}/pdf`, {
        method: "POST"
      });
      const result = await response.json();

      if (!response.ok) {
        alert(result.error || "Unable to generate PDF");
        return "";
      }

      setPdfUrl(result.url);
      return result.url as string;
    } catch {
      alert("Unable to generate PDF");
      return "";
    } finally {
      setPendingAction("");
    }
  }

  async function downloadPdf() {
    setPendingAction("download");

    try {
      if (previewFrameId) {
        await downloadPreviewPdf();
        return;
      }

      const response = await fetch(`/api/quotations/${quotationId}/pdf?download=1`, {
        method: "POST"
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        alert(result?.error || "Unable to download PDF");
        return;
      }

      const result = await response.json();
      const anchor = document.createElement("a");
      anchor.href = result.url;
      anchor.download = `${quotationDownloadBaseName(customerName, quoteNumber)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to download PDF");
    } finally {
      setPendingAction("");
    }
  }

  async function downloadExcel() {
    setPendingAction("excel");

    try {
      const response = await fetch(`/api/quotations/${quotationId}/excel`, {
        method: "POST"
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        alert(result?.error || "Unable to download Excel");
        return;
      }

      const result = await response.json();
      const anchor = document.createElement("a");
      anchor.href = result.url;
      anchor.download = `${quotationDownloadBaseName(customerName, quoteNumber)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    } catch {
      alert("Unable to download Excel");
    } finally {
      setPendingAction("");
    }
  }

  async function shareWhatsApp() {
    const url = pdfUrl || (await generatePdf());
    if (!url) return;
    const message = `Hello ${customerName},\nPlease find attached your quotation from Span Fitness Equipments.\nQuotation No: ${quoteNumber}\nGrand Total: ${formatCurrency(
      grandTotal
    )}\nPDF Link: ${url}\nThank you.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
      <button
        type="button"
        onClick={generatePdf}
        disabled={loading}
        aria-busy={pendingAction === "generate"}
        className="btn-primary w-full sm:w-auto"
      >
        {pendingAction === "generate" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {pendingAction === "generate" ? "Generating..." : "Generate PDF"}
      </button>
      <Link href={editHref} className="btn-secondary w-full sm:w-auto">
        <Pencil className="h-4 w-4" />
        Edit PDF
      </Link>
      <button
        type="button"
        onClick={downloadPdf}
        disabled={loading}
        aria-busy={pendingAction === "download"}
        className="btn-secondary w-full sm:w-auto"
      >
        {pendingAction === "download" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <Download className="h-4 w-4" />
        )}
        {pendingAction === "download" ? "Downloading..." : "Download PDF"}
      </button>
      <button
        type="button"
        onClick={downloadExcel}
        disabled={loading}
        aria-busy={pendingAction === "excel"}
        className="btn-secondary w-full sm:w-auto"
      >
        {pendingAction === "excel" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileSpreadsheet className="h-4 w-4" />
        )}
        {pendingAction === "excel" ? "Downloading..." : "Download Excel"}
      </button>
      <button
        type="button"
        onClick={shareWhatsApp}
        disabled={loading}
        className="btn-secondary w-full sm:w-auto"
      >
        <MessageCircle className="h-4 w-4" />
        WhatsApp
      </button>
    </div>
  );
}
