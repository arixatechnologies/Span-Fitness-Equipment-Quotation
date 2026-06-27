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
import { formatCurrency } from "@/lib/format";

export function QuotationActions({
  quotationId,
  editHref,
  initialPdfUrl,
  customerName,
  quoteNumber,
  grandTotal
}: {
  quotationId: string;
  editHref: string;
  initialPdfUrl?: string | null;
  customerName: string;
  quoteNumber: string;
  grandTotal: number;
}) {
  const [pdfUrl, setPdfUrl] = useState(initialPdfUrl || "");
  const [pendingAction, setPendingAction] = useState<
    "" | "generate" | "download" | "excel"
  >("");
  const loading = Boolean(pendingAction);

  function cleanFilename(value: string) {
    return (
      value
        .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
        .replace(/[^a-zA-Z0-9-]+/g, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "") || "quotation"
    );
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
      const response = await fetch(`/api/quotations/${quotationId}/pdf`);

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        alert(result?.error || "Unable to download PDF");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${cleanFilename(quoteNumber)}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch {
      alert("Unable to download PDF");
    } finally {
      setPendingAction("");
    }
  }

  async function downloadExcel() {
    setPendingAction("excel");

    try {
      const response = await fetch(`/api/quotations/${quotationId}/excel`);

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        alert(result?.error || "Unable to download Excel");
        return;
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${cleanFilename(quoteNumber)}.xlsx`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
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
