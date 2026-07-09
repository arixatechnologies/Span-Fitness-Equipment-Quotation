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
  Pencil
} from "lucide-react";
import { formatCurrency, quotationDownloadBaseName } from "@/lib/format";

function WhatsAppIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      aria-hidden="true"
      className={className}
      focusable="false"
    >
      <circle cx="16" cy="16" r="16" fill="#25D366" />
      <path
        fill="#fff"
        d="M16.03 6.4a9.45 9.45 0 0 0-8.11 14.3L6.8 25.2l4.63-1.08a9.45 9.45 0 1 0 4.6-17.72Zm0 1.68a7.77 7.77 0 0 1 6.66 11.76 7.76 7.76 0 0 1-10.43 2.82l-.3-.18-2.74.64.66-2.65-.2-.31A7.77 7.77 0 0 1 16.03 8.08Zm-3.26 3.86c-.17 0-.44.06-.67.32-.23.26-.88.86-.88 2.1s.9 2.44 1.03 2.61c.13.17 1.75 2.8 4.34 3.82 2.15.85 2.59.68 3.06.64.47-.04 1.51-.62 1.72-1.21.21-.6.21-1.11.15-1.22-.06-.11-.23-.17-.49-.3-.25-.13-1.51-.75-1.75-.83-.23-.08-.4.09-.56.32-.16.23-.65.82-.98.98-.18.23-.33.26-.55.13-.23-.13-.96-.35-1.83-1.12-.68-.6-1.14-1.35-1.27-1.58-.13-.23-.01-.36.1-.49.1-.1.23-.26.34-.39.11-.13.15-.22.23-.38.08-.15.04-.29-.02-.41-.06-.13-.58-1.39-.79-1.9-.21-.5-.42-.43-.58-.44h-.5Z"
      />
    </svg>
  );
}

function whatsAppPhoneNumber(phone: string) {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10) return `91${digits}`;
  if (digits.length > 10) return digits.replace(/^0+/, "");

  return "";
}

export function QuotationActions({
  quotationId,
  editHref,
  initialPdfUrl,
  previewFrameId,
  proformaFrameId,
  autoDownload = false,
  autoDownloadMode,
  customerName,
  customerPhone,
  quoteNumber,
  grandTotal
}: {
  quotationId: string;
  editHref: string;
  initialPdfUrl?: string | null;
  previewFrameId?: string;
  proformaFrameId?: string;
  autoDownload?: boolean;
  autoDownloadMode?: "pdf" | "proforma" | false;
  customerName: string;
  customerPhone?: string | null;
  quoteNumber: string;
  grandTotal: number;
}) {
  const [pdfUrl, setPdfUrl] = useState(initialPdfUrl || "");
  const [pendingAction, setPendingAction] = useState<
    "" | "generate" | "download" | "proforma" | "excel"
  >("");
  const loading = Boolean(pendingAction);
  const downloadButtonRef = useRef<HTMLButtonElement>(null);
  const proformaButtonRef = useRef<HTMLButtonElement>(null);
  const autoDownloadStarted = useRef(false);
  const resolvedAutoDownloadMode = autoDownloadMode || (autoDownload ? "pdf" : false);

  useEffect(() => {
    if (!resolvedAutoDownloadMode || autoDownloadStarted.current) return;

    const timer = window.setTimeout(() => {
      if (autoDownloadStarted.current) return;
      autoDownloadStarted.current = true;
      window.history.replaceState(null, "", `/quotations/${quotationId}/preview`);

      if (resolvedAutoDownloadMode === "proforma") {
        proformaButtonRef.current?.click();
        return;
      }

      downloadButtonRef.current?.click();
    }, 250);

    return () => window.clearTimeout(timer);
  }, [quotationId, resolvedAutoDownloadMode]);

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

  async function downloadPreviewPdf({
    frameId,
    title
  }: {
    frameId?: string;
    title: string;
  }) {
    const frame = document.getElementById(frameId || "") as HTMLIFrameElement | null;

    const previewDocument = frame?.contentDocument;

    if (!frame || !previewDocument?.body) {
      throw new Error("Quotation preview is not ready. Please try again.");
    }

    const previewWindow = previewDocument.defaultView;

    if (!previewWindow) {
      throw new Error("Unable to open PDF print preview.");
    }

    await waitForPreviewReady(previewDocument);

    const previousPageTitle = document.title;
    const previousPreviewTitle = previewDocument.title;
    const previousFrameTitle = frame.getAttribute("title");
    let restoredTitle = false;

    const restoreTitle = () => {
      if (restoredTitle) return;

      restoredTitle = true;
      document.title = previousPageTitle;
      previewDocument.title = previousPreviewTitle;

      if (previousFrameTitle === null) {
        frame.removeAttribute("title");
      } else {
        frame.setAttribute("title", previousFrameTitle);
      }
    };

    previewDocument.title = title;
    document.title = title;
    frame.setAttribute("title", title);

    previewWindow.focus();
    previewWindow.addEventListener("afterprint", restoreTitle, { once: true });
    window.addEventListener("afterprint", restoreTitle, { once: true });
    window.setTimeout(restoreTitle, 60_000);

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

      await downloadPreviewPdf({
        frameId: previewFrameId,
        title: quotationDownloadBaseName(customerName, quoteNumber)
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to download PDF");
    } finally {
      setPendingAction("");
    }
  }

  async function downloadProformaInvoice() {
    setPendingAction("proforma");

    try {
      if (!proformaFrameId) {
        window.location.assign(`/quotations/${quotationId}/preview?download=proforma`);
        return;
      }

      await downloadPreviewPdf({
        frameId: proformaFrameId,
        title: `${quotationDownloadBaseName(customerName, quoteNumber)}-Proforma-Invoice`
      });
    } catch (error) {
      alert(error instanceof Error ? error.message : "Unable to download Proforma Invoice");
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
    const phoneNumber = whatsAppPhoneNumber(customerPhone || "");

    if (!phoneNumber) {
      alert("Customer phone number is missing or invalid.");
      return;
    }

    const url = await generatePdf();

    if (!url) return;

    const message = `Hello ${customerName},
Please find attached your quotation from Span Fitness Equipments.
Quotation No: ${quoteNumber}
Grand Total: ${formatCurrency(grandTotal)}
PDF Link: ${url}
Thank you.`;

    window.open(
      `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`,
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
        ref={proformaButtonRef}
        type="button"
        onClick={downloadProformaInvoice}
        disabled={loading}
        aria-busy={pendingAction === "proforma"}
        className="btn-secondary w-full sm:w-auto"
      >
        {pendingAction === "proforma" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : (
          <FileText className="h-4 w-4" />
        )}
        {pendingAction === "proforma" ? "Preparing..." : "Download Proforma Invoice"}
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
        className="btn-secondary w-full justify-center sm:w-10 sm:px-0"
        title="WhatsApp"
        aria-label="WhatsApp"
      >
        <WhatsAppIcon className="h-6 w-6" />
      </button>
    </div>
  );
}
