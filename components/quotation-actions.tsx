// "use client";

// import Link from "next/link";
// import { useEffect, useRef, useState } from "react";
// import {
//   Download,
//   FileSpreadsheet,
//   FileText,
//   Loader2,
//   MessageCircle,
//   Pencil
// } from "lucide-react";
// import { formatCurrency, quotationDownloadBaseName } from "@/lib/format";

// export function QuotationActions({
//   quotationId,
//   editHref,
//   initialPdfUrl,
//   previewFrameId,
//   autoDownload = false,
//   customerName,
//   quoteNumber,
//   grandTotal
// }: {
//   quotationId: string;
//   editHref: string;
//   initialPdfUrl?: string | null;
//   previewFrameId?: string;
//   autoDownload?: boolean;
//   customerName: string;
//   quoteNumber: string;
//   grandTotal: number;
// }) {
//   const [pdfUrl, setPdfUrl] = useState(initialPdfUrl || "");
//   const [pendingAction, setPendingAction] = useState<
//     "" | "generate" | "download" | "excel"
//   >("");
//   const loading = Boolean(pendingAction);
//   const downloadButtonRef = useRef<HTMLButtonElement>(null);
//   const autoDownloadStarted = useRef(false);

//   useEffect(() => {
//     if (!autoDownload || !previewFrameId || autoDownloadStarted.current) return;

//     const timer = window.setTimeout(() => {
//       if (autoDownloadStarted.current) return;
//       autoDownloadStarted.current = true;
//       window.history.replaceState(null, "", `/quotations/${quotationId}/preview`);
//       downloadButtonRef.current?.click();
//     }, 250);

//     return () => window.clearTimeout(timer);
//   }, [autoDownload, previewFrameId, quotationId]);

//   async function downloadPreviewPdf() {
//     const frame = document.getElementById(previewFrameId || "") as HTMLIFrameElement | null;
//     const previewDocument = frame?.contentDocument;

//     if (!previewDocument?.body) {
//       throw new Error("Quotation preview is not ready. Please try again.");
//     }

//     const readyDeadline = Date.now() + 10_000;
//     while (
//       previewDocument.documentElement.dataset.pdfPagination !== "ready" &&
//       Date.now() < readyDeadline
//     ) {
//       await new Promise((resolve) => window.setTimeout(resolve, 100));
//     }

//     if (previewDocument.documentElement.dataset.pdfPagination !== "ready") {
//       throw new Error("Quotation pagination is still loading. Please try again.");
//     }

//     await previewDocument.fonts?.ready;
//     const previewImages = Array.from(previewDocument.images);
//     await Promise.all(
//       previewImages.map(async (image) => {
//         if (!image.complete) {
//           await new Promise<void>((resolve) => {
//             const finish = () => resolve();
//             image.addEventListener("load", finish, { once: true });
//             image.addEventListener("error", finish, { once: true });
//             window.setTimeout(finish, 10_000);
//           });
//         }
//         await image.decode().catch(() => undefined);
//       })
//     );

//     if (previewImages.some((image) => !image.complete || image.naturalWidth === 0)) {
//       throw new Error("A quotation image did not finish loading. Please try again.");
//     }

//     await new Promise<void>((resolve) => {
//       const previewWindow = previewDocument.defaultView;
//       if (!previewWindow) {
//         resolve();
//         return;
//       }

//       previewWindow.requestAnimationFrame(() =>
//         previewWindow.requestAnimationFrame(() => resolve())
//       );
//     });

//     const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
//       import("html2canvas"),
//       import("jspdf")
//     ]);
//     const pages = Array.from(previewDocument.body.querySelectorAll<HTMLElement>(".page"));

//     if (!pages.length) {
//       throw new Error("Quotation preview pages are not ready. Please try again.");
//     }

//     const pdf = new jsPDF({
//       unit: "mm",
//       format: "a4",
//       orientation: "portrait",
//       compress: true,
//       precision: 16
//     });

//     const captureScale = 300 / 96;

//     for (const [index, page] of pages.entries()) {
//       const pageRect = page.getBoundingClientRect();
//       const canvas = await html2canvas(page, {
//         scale: captureScale,
//         useCORS: true,
//         allowTaint: false,
//         backgroundColor: "#ffffff",
//         logging: false,
//         windowWidth: previewDocument.documentElement.scrollWidth,
//         windowHeight: previewDocument.documentElement.scrollHeight,
//         width: pageRect.width,
//         height: pageRect.height,
//         scrollX: 0,
//         scrollY: 0
//       });

//       const pngBlob = await new Promise<Blob>((resolve, reject) => {
//         canvas.toBlob((blob) => {
//           if (blob) resolve(blob);
//           else reject(new Error("Unable to render a quotation page."));
//         }, "image/png");
//       });
//       const png = new Uint8Array(await pngBlob.arrayBuffer());

//       if (index > 0) pdf.addPage("a4", "portrait");
//       pdf.addImage(png, "PNG", 0, 0, 210, 297, `quotation-page-${index}`, "FAST");
//     }

//     pdf.save(`${quotationDownloadBaseName(customerName, quoteNumber)}.pdf`);
//   }

//   async function generatePdf() {
//     setPendingAction("generate");

//     try {
//       const response = await fetch(`/api/quotations/${quotationId}/pdf`, {
//         method: "POST"
//       });
//       const result = await response.json();

//       if (!response.ok) {
//         alert(result.error || "Unable to generate PDF");
//         return "";
//       }

//       setPdfUrl(result.url);
//       return result.url as string;
//     } catch {
//       alert("Unable to generate PDF");
//       return "";
//     } finally {
//       setPendingAction("");
//     }
//   }

//   async function downloadPdf() {
//     setPendingAction("download");

//     try {
//       if (!previewFrameId) {
//         window.location.assign(`/quotations/${quotationId}/preview?download=1`);
//         return;
//       }

//       await downloadPreviewPdf();
//     } catch (error) {
//       alert(error instanceof Error ? error.message : "Unable to download PDF");
//     } finally {
//       setPendingAction("");
//     }
//   }

//   async function downloadExcel() {
//     setPendingAction("excel");

//     try {
//       const response = await fetch(`/api/quotations/${quotationId}/excel`, {
//         method: "POST"
//       });

//       if (!response.ok) {
//         const result = await response.json().catch(() => null);
//         alert(result?.error || "Unable to download Excel");
//         return;
//       }

//       const result = await response.json();
//       const anchor = document.createElement("a");
//       anchor.href = result.url;
//       anchor.download = `${quotationDownloadBaseName(customerName, quoteNumber)}.xlsx`;
//       document.body.appendChild(anchor);
//       anchor.click();
//       anchor.remove();
//     } catch {
//       alert("Unable to download Excel");
//     } finally {
//       setPendingAction("");
//     }
//   }

//   async function shareWhatsApp() {
//     const url = pdfUrl || (await generatePdf());
//     if (!url) return;
//     const message = `Hello ${customerName},\nPlease find attached your quotation from Span Fitness Equipments.\nQuotation No: ${quoteNumber}\nGrand Total: ${formatCurrency(
//       grandTotal
//     )}\nPDF Link: ${url}\nThank you.`;
//     window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, "_blank", "noopener,noreferrer");
//   }

//   return (
//     <div className="grid w-full gap-2 sm:flex sm:w-auto sm:flex-wrap">
//       <button
//         type="button"
//         onClick={generatePdf}
//         disabled={loading}
//         aria-busy={pendingAction === "generate"}
//         className="btn-primary w-full sm:w-auto"
//       >
//         {pendingAction === "generate" ? (
//           <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
//         ) : (
//           <FileText className="h-4 w-4" />
//         )}
//         {pendingAction === "generate" ? "Generating..." : "Generate PDF"}
//       </button>
//       <Link href={editHref} className="btn-secondary w-full sm:w-auto">
//         <Pencil className="h-4 w-4" />
//         Edit PDF
//       </Link>
//       <button
//         ref={downloadButtonRef}
//         type="button"
//         onClick={downloadPdf}
//         disabled={loading}
//         aria-busy={pendingAction === "download"}
//         className="btn-secondary w-full sm:w-auto"
//       >
//         {pendingAction === "download" ? (
//           <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
//         ) : (
//           <Download className="h-4 w-4" />
//         )}
//         {pendingAction === "download" ? "Downloading..." : "Download PDF"}
//       </button>
//       <button
//         type="button"
//         onClick={downloadExcel}
//         disabled={loading}
//         aria-busy={pendingAction === "excel"}
//         className="btn-secondary w-full sm:w-auto"
//       >
//         {pendingAction === "excel" ? (
//           <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
//         ) : (
//           <FileSpreadsheet className="h-4 w-4" />
//         )}
//         {pendingAction === "excel" ? "Downloading..." : "Download Excel"}
//       </button>
//       <button
//         type="button"
//         onClick={shareWhatsApp}
//         disabled={loading}
//         className="btn-secondary w-full sm:w-auto"
//       >
//         <MessageCircle className="h-4 w-4" />
//         WhatsApp
//       </button>
//     </div>
//   );
// }







"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
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
  autoDownload = false,
  customerName,
  quoteNumber,
  grandTotal
}: {
  quotationId: string;
  editHref: string;
  initialPdfUrl?: string | null;
  previewFrameId?: string;
  autoDownload?: boolean;
  customerName: string;
  quoteNumber: string;
  grandTotal: number;
}) {
  const [pdfUrl, setPdfUrl] = useState(initialPdfUrl || "");
  const [pendingAction, setPendingAction] = useState<
    "" | "generate" | "download" | "excel"
  >("");
  const loading = Boolean(pendingAction);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  const autoDownloadStarted = useRef(false);

  useEffect(() => {
    if (!autoDownload || !previewFrameId || autoDownloadStarted.current) return;

    const timer = window.setTimeout(() => {
      if (autoDownloadStarted.current) return;
      autoDownloadStarted.current = true;
      window.history.replaceState(null, "", `/quotations/${quotationId}/preview`);
      downloadButtonRef.current?.click();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [autoDownload, previewFrameId, quotationId]);

  async function waitForPreviewReady(previewDocument: Document) {
    const readyDeadline = Date.now() + 10_000;

    while (
      previewDocument.documentElement.dataset.pdfPagination !== "ready" &&
      Date.now() < readyDeadline
    ) {
      await new Promise((resolve) => window.setTimeout(resolve, 100));
    }

    if (previewDocument.documentElement.dataset.pdfPagination !== "ready") {
      throw new Error("Quotation pagination is still loading. Please try again.");
    }

    await previewDocument.fonts?.ready;

    const previewImages = Array.from(previewDocument.images);

    await Promise.all(
      previewImages.map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            const finish = () => resolve();
            image.addEventListener("load", finish, { once: true });
            image.addEventListener("error", finish, { once: true });
            window.setTimeout(finish, 10_000);
          });
        }

        await image.decode().catch(() => undefined);
      })
    );

    if (previewImages.some((image) => !image.complete || image.naturalWidth === 0)) {
      throw new Error("A quotation image did not finish loading. Please try again.");
    }

    const previewWindow = previewDocument.defaultView;

    if (previewWindow) {
      await new Promise<void>((resolve) => {
        previewWindow.requestAnimationFrame(() =>
          previewWindow.requestAnimationFrame(() => resolve())
        );
      });
    }
  }

  async function downloadPreviewPdf() {
    const frame = document.getElementById(
      previewFrameId || ""
    ) as HTMLIFrameElement | null;

    const previewDocument = frame?.contentDocument;

    if (!previewDocument?.body) {
      throw new Error("Quotation preview is not ready. Please try again.");
    }

    const previewWindow = previewDocument.defaultView;

    if (!previewWindow) {
      throw new Error("Unable to open PDF print preview.");
    }

    await waitForPreviewReady(previewDocument);

    previewDocument.title = quotationDownloadBaseName(customerName, quoteNumber);

    previewWindow.focus();

    /*
      This uses the browser Chrome/Edge print engine.
      User must choose "Save as PDF" in the print window.
      This gives output close to Mr-Testing-SFEQ-26-0006.pdf.
      Do not use html2canvas + jsPDF here.
    */
    previewWindow.print();
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
      if (!previewFrameId) {
        window.location.assign(`/quotations/${quotationId}/preview?download=1`);
        return;
      }

      await downloadPreviewPdf();
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

    const message = `Hello ${customerName},
Please find attached your quotation from Span Fitness Equipments.
Quotation No: ${quoteNumber}
Grand Total: ${formatCurrency(grandTotal)}
PDF Link: ${url}
Thank you.`;

    window.open(
      `https://wa.me/?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer"
    );
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
        ref={downloadButtonRef}
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
        {pendingAction === "download" ? "Preparing..." : "Download PDF"}
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