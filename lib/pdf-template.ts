import type { CompanySettings, Customer, Quotation, QuotationItem } from "@/lib/types";
import { formatCustomerName, formatDate } from "@/lib/format";
import type { PdfChromeImages } from "@/lib/pdf-assets";

type PdfTemplateInput = {
  quotation: Quotation;
  items: QuotationItem[];
  settings: CompanySettings;
  chromeImages?: PdfChromeImages;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function customerFromSnapshot(snapshot: Quotation["customer_snapshot"]) {
  return snapshot as Partial<Customer>;
}

function customerFullAddress(customer: Partial<Customer>) {
  const parts = [
    ...String(customer.address || "").split(","),
    customer.city,
    customer.state,
    customer.pincode
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean);
  const seen = new Set<string>();

  return parts
    .filter((part) => {
      const normalized = part.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    })
    .join(", ");
}

function amount(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0
  }).format(Number(value || 0));
}

function lines(value: unknown) {
  const text = String(value ?? "").trim();
  if (!text) return "";

  return escapeHtml(text).replace(/\r?\n/g, "<br>");
}

function labelLine(label: string, value: unknown) {
  const text = String(value ?? "").trim();
  return text ? `${escapeHtml(label)} : ${escapeHtml(text)}<br>` : "";
}

function productBrand(item: QuotationItem, settings: CompanySettings) {
  const brand = String(item.brand_name || "").trim();
  if (/welcare/i.test(brand)) return settings.company_name;
  return brand || "SPAN";
}

function productImage(item: QuotationItem) {
  if (!item.image_url) {
    return `<div class="product-fallback">SFE</div>`;
  }

  return `<img src="${escapeHtml(item.image_url)}" alt="${escapeHtml(item.product_name)}" />`;
}

function productDescription(item: QuotationItem) {
  const detail = [
    lines(item.description),
    labelLine("Dimensions", item.dimensions),
    labelLine("Machine Weight", item.machine_weight),
    labelLine("Stack Weight", item.stack_weight),
    lines(item.specifications)
  ]
    .filter(Boolean)
    .join("");

  return `<strong>${escapeHtml(item.product_name)}</strong>${detail ? `<br><br>${detail}` : ""}`;
}

function tableColumns() {
  return `
    <colgroup>
      <col class="c-no" />
      <col class="c-product" />
      <col class="c-desc" />
      <col class="c-unit" />
      <col class="c-special" />
      <col class="c-qty" />
      <col class="c-total" />
    </colgroup>
  `;
}

function tableHead() {
  return `
    <thead>
      <tr>
        <th>#</th>
        <th>Product</th>
        <th>Description</th>
        <th>Unit Price<br>(&#8377;)</th>
        <th>Special<br>Price (&#8377;)</th>
        <th>Qty</th>
        <th>Total<br>(&#8377;)</th>
      </tr>
    </thead>
  `;
}

function productRows(items: QuotationItem[], startIndex: number, settings: CompanySettings) {
  if (!items.length) {
    return `
      <tr class="p-row">
        <td class="center top" colspan="7">No products selected.</td>
      </tr>
    `;
  }

  return items
    .map(
      (item, index) => `
      <tr class="p-row">
        <td class="center top">${startIndex + index + 1}</td>
        <td>
          <div class="product-card">
            ${productImage(item)}
            <strong>${escapeHtml(productBrand(item, settings))}</strong>
          </div>
        </td>
        <td class="desc">${productDescription(item)}</td>
        <td class="center top">${amount(item.unit_price)}</td>
        <td class="center top">${amount(item.special_price)}</td>
        <td class="center top">${amount(item.qty)}</td>
        <td class="center top">${amount(item.line_total)}</td>
      </tr>
    `
    )
    .join("");
}

function productTable({
  items,
  startIndex,
  settings,
  className = "",
  showHead = true
}: {
  items: QuotationItem[];
  startIndex: number;
  settings: CompanySettings;
  className?: string;
  showHead?: boolean;
}) {
  return `
    <table class="product-table ${className}">
      ${tableColumns()}
      ${showHead ? tableHead() : ""}
      <tbody>${productRows(items, startIndex, settings)}</tbody>
    </table>
  `;
}

function chunk<T>(items: T[], size: number) {
  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
}

function splitProductPages(items: QuotationItem[]) {
  const first = items.slice(0, 4);
  const remaining = items.slice(4);

  if (!remaining.length) {
    return { first, middle: [] as QuotationItem[][], final: [] as QuotationItem[] };
  }

  const finalCount = remaining.length % 4;
  if (finalCount === 0) {
    return { first, middle: chunk(remaining, 4), final: [] as QuotationItem[] };
  }

  const middleItems = remaining.slice(0, remaining.length - finalCount);
  const final = remaining.slice(remaining.length - finalCount);

  return { first, middle: chunk(middleItems, 4), final };
}

function headerImage(chromeImages: PdfChromeImages) {
  return chromeImages.top
    ? `<img class="top-banner" src="${escapeHtml(chromeImages.top)}" alt="Span Fitness header banner" />`
    : "";
}

function footerImage(chromeImages: PdfChromeImages, className: string) {
  return chromeImages.bottom
    ? `<img class="brand-footer ${className}" src="${escapeHtml(
        chromeImages.bottom
      )}" alt="International brands footer" />`
    : "";
}

function iconMarkup(src: string | undefined, alt: string) {
  return src ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(alt)}">` : "";
}

function gstText(quotation: Quotation) {
  if (quotation.gst_mode === "included") return "* GST Included.";
  if (quotation.gst_mode === "none") return "* No GST.";
  return "* GST Extra.";
}

function termsBlock(quotation: Quotation) {
  return `
    <div class="terms-block">
      <p><strong>Terms and Conditions:</strong><br>${lines(quotation.terms)}</p>
      <p><strong>Warranty:</strong><br>${lines(quotation.warranty_note)}</p>
      <p><strong>Delivery:</strong><br>${lines(quotation.delivery_note)}</p>
      <p><strong>Transportation:</strong><br>${lines(quotation.transportation_note)}</p>
      <p><strong>GST:</strong><br>${gstText(quotation)}</p>
      <p><strong>Payment:</strong><br>${lines(quotation.payment_terms)}</p>
    </div>
  `;
}

function afterSalesBlock(quotation: Quotation) {
  return `
    <div class="support-block line-bottom">
      <strong>After sales Support:</strong><br>
      ${lines(quotation.after_sales_support)}
    </div>
  `;
}

function totalsTable(quotation: Quotation) {
  return `
    <table class="total-table">
      <tr><td>Total List Price</td><td>${amount(quotation.total_list_price)}</td></tr>
      <tr><td>Discount</td><td>${amount(quotation.discount_amount)}</td></tr>
      <tr><td>Total Special Price</td><td>${amount(quotation.total_special_price)}</td></tr>
      <tr><td>GST</td><td>${amount(quotation.gst_amount)}</td></tr>
      <tr><td>Net Total</td><td>${amount(quotation.net_total)}</td></tr>
      <tr><td>Round Off</td><td>${amount(quotation.round_off)}</td></tr>
      <tr><td>Grand Total</td><td>${amount(quotation.grand_total)}</td></tr>
    </table>
  `;
}

function bankBlock(settings: CompanySettings) {
  return `
    <div class="bank-block">
      <strong>Bank Details - NEFT, RTGS, UPI, IMPS:</strong><br>
      Firm Name - ${escapeHtml(settings.company_name)}<br>
      Bank Name : ${escapeHtml(settings.bank_name)}<br>
      Account No : ${escapeHtml(settings.bank_account_no)}<br>
      Branch : ${escapeHtml(settings.bank_branch)}<br>
      IFSC Code : ${escapeHtml(settings.bank_ifsc)}
    </div>
  `;
}

function firstPage({
  quotation,
  items,
  customer,
  settings,
  chromeImages
}: {
  quotation: Quotation;
  items: QuotationItem[];
  customer: Partial<Customer>;
  settings: CompanySettings;
  chromeImages: PdfChromeImages;
}) {
  return `
    <section class="page page-1">
      ${headerImage(chromeImages)}

      <h1 class="quote-title">QUOTATION</h1>

      <div class="customer-block">
        <div class="customer-left">
          <div class="label">To:</div>
          <div class="customer-name">${escapeHtml(formatCustomerName(customer))},</div>
          <div>${escapeHtml(customer.phone || "")},</div>
          <div>${escapeHtml(customerFullAddress(customer) || ".")}</div>
        </div>
        <div class="customer-right">
          <div><strong>DATE: ${formatDate(quotation.quote_date)}</strong></div>
          <div><strong>QUOTATION NO: ${escapeHtml(quotation.quote_number)}</strong></div>
        </div>
      </div>

      ${productTable({ items, startIndex: 0, settings })}
      ${footerImage(chromeImages, "page1-footer")}
    </section>
  `;
}

function productOnlyPage({
  items,
  startIndex,
  settings,
  chromeImages
}: {
  items: QuotationItem[];
  startIndex: number;
  settings: CompanySettings;
  chromeImages: PdfChromeImages;
}) {
  return `
    <section class="page product-only-page">
      ${headerImage(chromeImages)}
      ${productTable({ items, startIndex, settings, className: "page2-products" })}
      ${footerImage(chromeImages, "page2-footer")}
    </section>
  `;
}

function summaryPage({
  quotation,
  items,
  startIndex,
  settings,
  chromeImages
}: {
  quotation: Quotation;
  items: QuotationItem[];
  startIndex: number;
  settings: CompanySettings;
  chromeImages: PdfChromeImages;
}) {
  const useCompactDetailsGrid = items.length === 3;

  return `
    <section class="page page-2 summary-products-${items.length}">
      ${headerImage(chromeImages)}
      ${
        items.length
          ? productTable({
              items,
              startIndex,
              settings,
              className: "page2-products",
              showHead: false
            })
          : ""
      }
      ${
        useCompactDetailsGrid
          ? `<div class="summary-details-grid">
              ${totalsTable(quotation)}
              ${termsBlock(quotation)}
            </div>
            ${bankBlock(settings)}`
          : `${totalsTable(quotation)}
            ${termsBlock(quotation)}
            ${bankBlock(settings)}`
      }
      ${footerImage(chromeImages, "page2-footer")}
    </section>
  `;
}

function supportPage({
  quotation,
  settings,
  chromeImages
}: {
  quotation: Quotation;
  settings: CompanySettings;
  chromeImages: PdfChromeImages;
}) {
  const phoneIconBig = iconMarkup(chromeImages.phoneIconBig, "phone");
  const phoneIcon = iconMarkup(chromeImages.phoneIcon, "phone");
  const webIcon = iconMarkup(chromeImages.webIcon, "web");
  const signerName =
    settings.authorized_person_name === "Authorized Signatory"
      ? ""
      : settings.authorized_person_name;
  const signerDesignation = /^for\s+/i.test(settings.authorized_person_designation)
    ? ""
    : settings.authorized_person_designation;

  return `
    <section class="page page-3">
      ${headerImage(chromeImages)}

      ${afterSalesBlock(quotation)}

      <div class="company-line line-bottom">
        <strong>For ${escapeHtml(settings.company_name)}</strong>
      </div>

      <div class="signature-row line-bottom">
        <div><strong>${escapeHtml(settings.bank_branch || "Visakhapatnam")}</strong></div>
        <div><strong>${escapeHtml(signerName)}</strong>${signerDesignation ? `<br>${escapeHtml(signerDesignation)}` : ""}</div>
      </div>

      <div class="office-row">
        <div class="office-col">
          <h3>Branch Office :</h3>
          ${lines(settings.address)}<br>
          <span class="icon-text">${phoneIconBig} ${escapeHtml(settings.phone_numbers)} | ${escapeHtml(settings.email)}</span><br>
          <strong>GST NO : ${escapeHtml(settings.gst_number)}</strong>
        </div>
        <div class="office-col right-office">
          <h3>Corporate Office :</h3>
          <strong>${escapeHtml(settings.company_name)}</strong><br>
          ${escapeHtml(settings.address)}<br><br>
          <span class="icon-text">${webIcon} spanfitnessequipments.com</span>
          <span class="sep">|</span>
          <span class="icon-text">${phoneIcon} ${escapeHtml(settings.phone_numbers.split("|")[0]?.trim() || settings.phone_numbers)}</span>
        </div>
      </div>

      ${footerImage(chromeImages, "page3-footer")}
    </section>
  `;
}

export function renderQuotationHtml({
  quotation,
  items,
  settings,
  chromeImages = {}
}: PdfTemplateInput) {
  const customer = customerFromSnapshot(quotation.customer_snapshot);
  const { first, middle, final } = splitProductPages(items);
  let nextIndex = first.length;

  const middlePages = middle
    .map((pageItems) => {
      const html = productOnlyPage({
        items: pageItems,
        startIndex: nextIndex,
        settings,
        chromeImages
      });
      nextIndex += pageItems.length;
      return html;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(quotation.quote_number)}</title>
  <style>
@font-face {
  font-family: "Quotation Numbers";
  src: local("Arial"), local("Liberation Sans"), local("DejaVu Sans");
  font-style: normal;
  font-weight: 400 600;
  unicode-range: U+0025, U+002C-0039, U+003A, U+20B9;
}

@font-face {
  font-family: "Quotation Numbers";
  src: local("Arial Bold"), local("Liberation Sans Bold"), local("DejaVu Sans Bold");
  font-style: normal;
  font-weight: 700 900;
  unicode-range: U+0025, U+002C-0039, U+003A, U+20B9;
}

* { box-sizing: border-box; }

html, body {
  margin: 0;
  padding: 0;
  background: #e8e8e8;
  color: #000;
  font-family: "Quotation Numbers", Georgia, "Times New Roman", Times, serif;
  letter-spacing: 0;
}

.page {
  width: 210mm;
  height: 297mm;
  margin: 16px auto;
  padding: 8mm 11.7mm 12mm 11.7mm;
  background: #fff;
  position: relative;
  overflow: hidden;
  box-shadow: 0 0 8px rgba(0,0,0,.22);
  page-break-after: always;
}

.page:last-child { page-break-after: auto; }

.top-banner {
  display: block;
  width: 100%;
  height: auto;
  margin: 0 0 3.2mm 0;
}

.page-2 .top-banner {
  height: 52mm;
  object-fit: fill;
}

.quote-title {
  font-size: 14pt;
  line-height: 1;
  margin: 1mm 0 2.5mm 0;
  text-align: center;
  font-weight: 900;
}

.customer-block {
  min-height: 22mm;
  display: grid;
  grid-template-columns: 1fr 1fr;
  font-size: 8.3pt;
  line-height: 1.15;
  margin-bottom: 2mm;
}

.customer-left { padding-left: 9mm; }
.customer-left .label { font-size: 10pt; font-weight: 800; margin-bottom: 4.2mm; }
.customer-right { text-align: right; padding-top: 1.3mm; padding-right: 9mm; font-size: 8pt; }

.product-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 7.1pt;
  line-height: 1.12;
}

.product-table th,
.product-table td {
  border: 1.35px solid #000;
  padding: 1.6mm 1.5mm;
  vertical-align: top;
}

.product-table th {
  height: 8.8mm;
  text-align: center;
  font-weight: 900;
  vertical-align: middle;
}

.product-table .p-row td { height: 32.5mm; }
.product-table .desc {
  padding-top: 1.9mm;
  font-family: "Quotation Numbers", Verdana, "DejaVu Sans", sans-serif;
}
.center { text-align: center; }
.top { vertical-align: top !important; }

.c-no { width: 4.6%; }
.c-product { width: 19.7%; }
.c-desc { width: 39.7%; }
.c-unit { width: 9%; }
.c-special { width: 9.2%; }
.c-qty { width: 4.8%; }
.c-total { width: 13%; }

.product-card {
  width: 28.7mm;
  height: 29.5mm;
  margin: -0.2mm auto 0 auto;
  border: 1.2px solid #111;
  border-radius: 5px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  overflow: hidden;
  background: #fff;
}

.product-card img {
  width: 22.5mm;
  height: 23.5mm;
  object-fit: contain;
  display: block;
}

.product-fallback {
  width: 22.5mm;
  height: 23.5mm;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  color: #e30613;
}

.product-card strong {
  font-size: 6.8pt;
  line-height: 1;
  padding: 0 0 1.5mm 0;
}

.brand-footer {
  display: block;
  width: 100%;
  object-fit: fill;
  object-position: center;
  background: #fff;
}

.page1-footer,
.page2-footer {
  position: absolute;
  left: 11.7mm;
  right: 11.7mm;
  bottom: 8mm;
  width: calc(100% - 23.4mm);
  height: 35.25mm;
}

.page2-products {
  margin-top: .3mm;
}
.page2-products .p-row td {
  height: 31.5mm;
  padding-top: .8mm;
  padding-bottom: .8mm;
}

.total-table {
  width: 69.6mm;
  margin: 0 0 0 auto;
  border-collapse: collapse;
  table-layout: fixed;
  font-size: 7.8pt;
  line-height: 1.08;
}

.total-table td {
  border: 1.35px solid #000;
  height: 6.6mm;
  padding: 1.4mm 2mm;
}

.total-table td:first-child { width: 63%; }
.total-table td:last-child { width: 37%; }

.summary-details-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 69.6mm;
  align-items: start;
}

.summary-details-grid .total-table {
  grid-column: 2;
  grid-row: 1;
}

.summary-details-grid .terms-block {
  grid-column: 1;
  grid-row: 1;
  width: auto;
  margin-top: 0;
  margin-right: 6mm;
}

.terms-block {
  margin-left: 9mm;
  margin-top: 2mm;
  width: 150mm;
  font-size: 8.25pt;
  line-height: 1.2;
}

.terms-block p {
  margin: 0 0 1mm 0;
  break-inside: avoid;
}

.terms-block strong {
  display: inline-block;
  margin-bottom: .35mm;
  font-size: 8.6pt;
  line-height: 1.1;
}

.bank-block {
  margin: 1mm 9mm 0 9mm;
  padding-top: .9mm;
  padding-bottom: .9mm;
  border-top: 1.35px solid #000;
  border-bottom: 1.35px solid #000;
  font-size: 7.2pt;
  line-height: 1.15;
  min-height: 17mm;
}

.support-block {
  margin-top: 1mm;
  padding: 1.5mm 9mm 1mm 9mm;
  font-size: 7.6pt;
  line-height: 1.15;
}

.line-top { border-top: 1.35px solid #000; }
.line-bottom { border-bottom: 1.35px solid #000; }

.company-line {
  padding: 2.1mm 9mm;
  font-size: 8pt;
}

.signature-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  padding: 3.2mm 9mm 3.8mm 9mm;
  font-size: 8pt;
  line-height: 1.15;
}
.signature-row div:nth-child(2) { padding-left: 34mm; }

.office-row {
  display: grid;
  grid-template-columns: 1.35fr .85fr;
  column-gap: 12mm;
  padding: 2.5mm 9mm 0 9mm;
  font-size: 7.45pt;
  line-height: 1.18;
}

.office-row h3 {
  font-size: 10pt;
  margin: 0 0 1mm 0;
}

.icon-text {
  display: inline-flex;
  align-items: center;
  gap: 1mm;
}

.icon-text img {
  width: 3.1mm;
  height: 3.1mm;
  object-fit: contain;
}

.sep { margin: 0 1.5mm; }

.page3-footer {
  position: absolute;
  left: 11.7mm;
  right: 11.7mm;
  bottom: 10mm;
  width: calc(100% - 23.4mm);
  height: 35.25mm;
}

@media print {
  html, body { background: #fff; }
  .page {
    margin: 0;
    box-shadow: none;
    page-break-after: always;
  }
  .page:last-child { page-break-after: auto; }
  @page {
    size: A4;
    margin: 0;
  }
}
  </style>
</head>
<body>
  ${firstPage({ quotation, items: first, customer, settings, chromeImages })}
  ${middlePages}
  ${summaryPage({ quotation, items: final, startIndex: nextIndex, settings, chromeImages })}
  ${supportPage({
    quotation,
    settings,
    chromeImages
  })}
</body>
</html>`;
}
