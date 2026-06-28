import { readFile } from "node:fs/promises";
import path from "node:path";
import ExcelJS, {
  type Alignment,
  type Borders,
  type Cell,
  type CellValue,
  type Fill,
  type Font,
  type Image as ExcelJsImage,
  type Worksheet
} from "exceljs";
import { formatCustomerName } from "@/lib/format";
import type {
  CompanySettings,
  Customer,
  Quotation,
  QuotationItem
} from "@/lib/types";

type WorkbookImage = {
  buffer: Buffer;
  extension: "png" | "jpeg" | "gif";
};

type CellStyle = {
  alignment?: Partial<Alignment>;
  border?: Partial<Borders>;
  fill?: Fill;
  font?: Partial<Font>;
  numFmt?: string;
};

const BLACK = "FF000000";
const DARK_RED = "FF9F0F16";
const LIGHT_RED = "FFFFE3E3";
const WHITE = "FFFFFFFF";
const CURRENCY_FORMAT = '[$₹-en-IN]#,##0';
const INTEGER_FORMAT = "#,##0";
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const thinBlackBorder: Partial<Borders> = {
  top: { style: "thin", color: { argb: BLACK } },
  left: { style: "thin", color: { argb: BLACK } },
  bottom: { style: "thin", color: { argb: BLACK } },
  right: { style: "thin", color: { argb: BLACK } }
};

const bottomBlackBorder: Partial<Borders> = {
  bottom: { style: "thin", color: { argb: BLACK } }
};

const whiteFill: Fill = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: WHITE }
};

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function amount(value: unknown) {
  const numericValue = Number(value || 0);
  return Number.isFinite(numericValue) ? numericValue : 0;
}

function formatDateForSheet(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(date);
}

function customerAddress(customer: Partial<Customer>) {
  const parts = [
    ...text(customer.address).split(","),
    text(customer.city),
    text(customer.state),
    text(customer.pincode)
  ]
    .map((part) => part.trim())
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

function productBrand(item: QuotationItem, settings: CompanySettings) {
  const brand = text(item.brand_name);
  if (/welcare/i.test(brand)) return settings.company_name;
  return brand || "SPAN";
}

function productDescription(item: QuotationItem) {
  return [
    text(item.description),
    text(item.dimensions) ? `Dimensions : ${text(item.dimensions)}` : "",
    text(item.machine_weight) ? `Machine Weight : ${text(item.machine_weight)}` : "",
    text(item.stack_weight) ? `Stack Weight : ${text(item.stack_weight)}` : "",
    text(item.specifications)
  ]
    .filter(Boolean)
    .join("\n");
}

function gstText(quotation: Quotation) {
  if (quotation.gst_mode === "included") return "* GST Included.";
  if (quotation.gst_mode === "none") return "* No GST.";
  return "* GST Extra.";
}

function signerDetails(settings: CompanySettings) {
  const name =
    settings.authorized_person_name === "Authorized Signatory"
      ? "A Senthil Kumar"
      : settings.authorized_person_name || "A Senthil Kumar";
  const designation = /^for\s+/i.test(settings.authorized_person_designation)
    ? "National Head"
    : settings.authorized_person_designation || "National Head";

  return { name, designation };
}

function applyStyle(cell: Cell, style: CellStyle) {
  if (style.font) cell.font = style.font;
  if (style.fill) cell.fill = style.fill;
  if (style.border) cell.border = style.border;
  if (style.alignment) cell.alignment = style.alignment;
  if (style.numFmt) cell.numFmt = style.numFmt;
}

function styleRange(
  worksheet: Worksheet,
  startRow: number,
  startColumn: number,
  endRow: number,
  endColumn: number,
  style: CellStyle
) {
  for (let row = startRow; row <= endRow; row += 1) {
    for (let column = startColumn; column <= endColumn; column += 1) {
      applyStyle(worksheet.getCell(row, column), style);
    }
  }
}

function setMergedCell(
  worksheet: Worksheet,
  row: number,
  startColumn: number,
  endColumn: number,
  value: CellValue,
  style: CellStyle = {}
) {
  if (endColumn > startColumn) {
    worksheet.mergeCells(row, startColumn, row, endColumn);
  }

  const cell = worksheet.getCell(row, startColumn);
  cell.value = value;
  styleRange(worksheet, row, startColumn, row, endColumn, style);
  return cell;
}

function estimateSectionHeight(value: string) {
  const explicitLines = Math.max(1, value.split(/\r?\n/).length);
  const wrappedLines = Math.max(1, Math.ceil(value.length / 115));
  return Math.max(30, 19 + Math.max(explicitLines, wrappedLines) * 14);
}

function imageExtension(buffer: Buffer): WorkbookImage["extension"] | null {
  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    return "png";
  }

  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return "jpeg";
  }

  if (buffer.length >= 6 && buffer.subarray(0, 3).toString("ascii") === "GIF") {
    return "gif";
  }

  return null;
}

function isBlockedImageHost(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;

  const private172 = host.match(/^172\.(\d{1,3})\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) return true;

  return /^(fc|fd|fe80):/i.test(host);
}

async function loadProductImage(imageUrl: string): Promise<WorkbookImage | null> {
  try {
    const dataImage = imageUrl.match(
      /^data:image\/(png|jpe?g|gif);base64,([a-z0-9+/=\s]+)$/i
    );

    if (dataImage) {
      const buffer = Buffer.from(dataImage[2].replace(/\s/g, ""), "base64");
      if (buffer.length > MAX_IMAGE_BYTES) return null;
      const extension = imageExtension(buffer);
      return extension ? { buffer, extension } : null;
    }

    const url = new URL(imageUrl);
    if (!["http:", "https:"].includes(url.protocol) || isBlockedImageHost(url.hostname)) {
      return null;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    try {
      const response = await fetch(url, {
        cache: "no-store",
        redirect: "follow",
        signal: controller.signal
      });
      if (!response.ok) return null;

      const declaredLength = Number(response.headers.get("content-length") || 0);
      if (declaredLength > MAX_IMAGE_BYTES) return null;

      const buffer = Buffer.from(await response.arrayBuffer());
      if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) return null;

      const extension = imageExtension(buffer);
      return extension ? { buffer, extension } : null;
    } finally {
      clearTimeout(timeout);
    }
  } catch {
    return null;
  }
}

async function loadProductImages(items: QuotationItem[]) {
  const urls = Array.from(
    new Set(items.map((item) => text(item.image_url)).filter(Boolean))
  );
  const entries = await Promise.all(
    urls.map(async (url) => [url, await loadProductImage(url)] as const)
  );

  return new Map(entries);
}

async function loadPdfAsset(filename: string): Promise<WorkbookImage | null> {
  try {
    const buffer = await readFile(path.join(process.cwd(), "public", "pdf", filename));
    const extension = imageExtension(buffer);
    return extension ? { buffer, extension } : null;
  } catch {
    return null;
  }
}

function registerImage(workbook: ExcelJS.Workbook, image: WorkbookImage) {
  return workbook.addImage(image as unknown as ExcelJsImage);
}

function addBanner(
  workbook: ExcelJS.Workbook,
  worksheet: Worksheet,
  image: WorkbookImage | null,
  startRow: number,
  endRow: number
) {
  worksheet.mergeCells(startRow, 1, endRow, 7);
  for (let row = startRow; row <= endRow; row += 1) {
    worksheet.getRow(row).height = 31;
  }

  if (!image) return;

  const imageId = registerImage(workbook, image);
  worksheet.addImage(imageId, `A${startRow}:G${endRow}`);
}

function addSection(
  worksheet: Worksheet,
  row: number,
  heading: string,
  value: string,
  options: { borderBottom?: boolean } = {}
) {
  const content = value || "-";
  worksheet.getRow(row).height = estimateSectionHeight(content);
  const cell = setMergedCell(
    worksheet,
    row,
    1,
    7,
    {
      richText: [
        {
          font: { name: "Georgia", size: 10, bold: true, color: { argb: BLACK } },
          text: `${heading}:\n`
        },
        {
          font: { name: "Georgia", size: 10, color: { argb: BLACK } },
          text: content
        }
      ]
    },
    {
      alignment: { vertical: "top", wrapText: true },
      border: options.borderBottom ? bottomBlackBorder : undefined,
      fill: whiteFill
    }
  );
  cell.protection = { locked: true };
}

function addProductRows(
  workbook: ExcelJS.Workbook,
  worksheet: Worksheet,
  items: QuotationItem[],
  settings: CompanySettings,
  productImages: Map<string, WorkbookImage | null>,
  startRow: number
) {
  const headers = [
    "#",
    "Product",
    "Description",
    "Unit Price\n(₹)",
    "Special Price\n(₹)",
    "Qty",
    "Total\n(₹)"
  ];
  const headerRow = worksheet.getRow(startRow);
  headerRow.height = 34;

  headers.forEach((header, index) => {
    const cell = headerRow.getCell(index + 1);
    cell.value = header;
    applyStyle(cell, {
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: thinBlackBorder,
      fill: whiteFill,
      font: { name: "Georgia", size: 9, bold: true, color: { argb: BLACK } }
    });
  });

  let row = startRow + 1;

  items.forEach((item, index) => {
    const itemRow = worksheet.getRow(row);
    itemRow.height = 92;
    const description = productDescription(item);
    const brand = productBrand(item, settings);
    const image = productImages.get(text(item.image_url)) || null;

    itemRow.getCell(1).value = index + 1;
    itemRow.getCell(2).value = image
      ? brand
      : {
          richText: [
            {
              font: { name: "Georgia", size: 11, bold: true, color: { argb: DARK_RED } },
              text: "SFE\n\n"
            },
            {
              font: { name: "Georgia", size: 8, bold: true, color: { argb: BLACK } },
              text: brand
            }
          ]
        };
    itemRow.getCell(3).value = {
      richText: [
        {
          font: { name: "Georgia", size: 10, bold: true, color: { argb: BLACK } },
          text: item.product_name
        },
        ...(description
          ? [
              {
                font: { name: "Georgia", size: 9, color: { argb: BLACK } },
                text: `\n\n${description}`
              }
            ]
          : [])
      ]
    };
    itemRow.getCell(4).value = amount(item.unit_price);
    itemRow.getCell(5).value = amount(item.special_price);
    itemRow.getCell(6).value = amount(item.qty);
    itemRow.getCell(7).value = amount(item.line_total);

    styleRange(worksheet, row, 1, row, 7, {
      alignment: { vertical: "top", wrapText: true },
      border: thinBlackBorder,
      fill: whiteFill,
      font: { name: "Arial", size: 9, color: { argb: BLACK } }
    });
    itemRow.getCell(1).alignment = { horizontal: "center", vertical: "top" };
    itemRow.getCell(2).alignment = {
      horizontal: "center",
      vertical: image ? "bottom" : "middle",
      wrapText: true
    };
    itemRow.getCell(3).alignment = { vertical: "top", wrapText: true };

    [4, 5, 7].forEach((column) => {
      itemRow.getCell(column).numFmt = CURRENCY_FORMAT;
      itemRow.getCell(column).alignment = { horizontal: "right", vertical: "top" };
    });
    itemRow.getCell(6).numFmt = INTEGER_FORMAT;
    itemRow.getCell(6).alignment = { horizontal: "center", vertical: "top" };

    if (image) {
      const imageId = registerImage(workbook, image);
      worksheet.addImage(imageId, {
        tl: { col: 1.18, row: row - 0.94 },
        ext: { width: 96, height: 88 },
        editAs: "oneCell"
      });
    }

    row += 1;
  });

  return row;
}

function addTotals(worksheet: Worksheet, quotation: Quotation, startRow: number) {
  const totals: Array<[string, number]> = [
    ["Total List Price", amount(quotation.total_list_price)],
    ["Discount", amount(quotation.discount_amount)],
    ["Total Special Price", amount(quotation.total_special_price)],
    ["GST", amount(quotation.gst_amount)],
    ["Net Total", amount(quotation.net_total)],
    ["Round Off", amount(quotation.round_off)],
    ["Grand Total", amount(quotation.grand_total)]
  ];

  let row = startRow;

  totals.forEach(([label, value], index) => {
    const grandTotal = index === totals.length - 1;
    worksheet.getRow(row).height = 23;
    setMergedCell(worksheet, row, 4, 6, label, {
      alignment: { vertical: "middle" },
      border: thinBlackBorder,
      fill: grandTotal
        ? {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: LIGHT_RED }
          }
        : whiteFill,
      font: { name: "Georgia", size: 9, bold: grandTotal, color: { argb: BLACK } }
    });
    const valueCell = worksheet.getCell(row, 7);
    valueCell.value = value;
    applyStyle(valueCell, {
      alignment: { horizontal: "right", vertical: "middle" },
      border: thinBlackBorder,
      fill: grandTotal
        ? {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: LIGHT_RED }
          }
        : whiteFill,
      font: { name: "Arial", size: 9, bold: grandTotal, color: { argb: BLACK } },
      numFmt: CURRENCY_FORMAT
    });
    row += 1;
  });

  return row;
}

export async function createQuotationExcel(
  quotation: Quotation,
  items: QuotationItem[]
) {
  const customer = quotation.customer_snapshot as Partial<Customer>;
  const settings = quotation.company_settings_snapshot as CompanySettings;
  const [{ header, footer }, productImages] = await Promise.all([
    Promise.all([
      loadPdfAsset("header-banner.png"),
      loadPdfAsset("brands-footer.png")
    ]).then(([header, footer]) => ({ header, footer })),
    loadProductImages(items)
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Span Fitness Equipments";
  workbook.company = settings.company_name;
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.subject = `Quotation ${quotation.quote_number}`;
  workbook.title = `${formatCustomerName(customer)} - ${quotation.quote_number}`;
  workbook.calcProperties.fullCalcOnLoad = true;

  const worksheet = workbook.addWorksheet("Quotation", {
    pageSetup: {
      paperSize: 9,
      orientation: "landscape",
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      margins: {
        left: 0.25,
        right: 0.25,
        top: 0.3,
        bottom: 0.3,
        header: 0.1,
        footer: 0.1
      }
    },
    properties: {
      defaultRowHeight: 18
    },
    views: [
      {
        showGridLines: false,
        zoomScale: 80
      }
    ]
  });

  worksheet.columns = [
    { key: "serial", width: 6 },
    { key: "product", width: 21 },
    { key: "description", width: 48 },
    { key: "unitPrice", width: 15 },
    { key: "specialPrice", width: 15 },
    { key: "quantity", width: 8 },
    { key: "total", width: 18 }
  ];

  addBanner(workbook, worksheet, header, 1, 6);

  worksheet.getRow(7).height = 29;
  setMergedCell(worksheet, 7, 1, 7, "QUOTATION", {
    alignment: { horizontal: "center", vertical: "middle" },
    fill: whiteFill,
    font: { name: "Georgia", size: 15, bold: true, color: { argb: BLACK } }
  });

  worksheet.getRow(8).height = 22;
  setMergedCell(worksheet, 8, 1, 3, "To:", {
    alignment: { vertical: "middle" },
    font: { name: "Georgia", size: 11, bold: true, color: { argb: BLACK } }
  });
  setMergedCell(
    worksheet,
    8,
    5,
    7,
    `DATE: ${formatDateForSheet(quotation.quote_date)}`,
    {
      alignment: { horizontal: "right", vertical: "middle" },
      font: { name: "Arial", size: 10, bold: true, color: { argb: BLACK } }
    }
  );

  worksheet.getRow(9).height = 22;
  setMergedCell(worksheet, 9, 1, 3, `${formatCustomerName(customer)},`, {
    alignment: { vertical: "middle" },
    font: { name: "Georgia", size: 10, bold: true, color: { argb: BLACK } }
  });
  setMergedCell(
    worksheet,
    9,
    5,
    7,
    `QUOTATION NO: ${quotation.quote_number}`,
    {
      alignment: { horizontal: "right", vertical: "middle" },
      font: { name: "Arial", size: 10, bold: true, color: { argb: BLACK } }
    }
  );

  worksheet.getRow(10).height = 20;
  setMergedCell(worksheet, 10, 1, 3, `${text(customer.phone)},`, {
    alignment: { vertical: "middle" },
    font: { name: "Arial", size: 10, color: { argb: BLACK } }
  });

  worksheet.getRow(11).height = estimateSectionHeight(customerAddress(customer));
  setMergedCell(worksheet, 11, 1, 4, customerAddress(customer) || ".", {
    alignment: { vertical: "top", wrapText: true },
    font: { name: "Georgia", size: 10, color: { argb: BLACK } }
  });

  worksheet.getRow(12).height = 7;
  let row = addProductRows(
    workbook,
    worksheet,
    items,
    settings,
    productImages,
    13
  );

  worksheet.getRow(row).height = 8;
  row += 1;
  row = addTotals(worksheet, quotation, row);
  worksheet.getRow(row).height = 8;
  row += 1;

  const detailSections: Array<[string, string]> = [
    ["Terms and Conditions", text(quotation.terms)],
    ["Warranty", text(quotation.warranty_note)],
    ["Delivery", text(quotation.delivery_note)],
    ["Transportation", text(quotation.transportation_note)],
    ["GST", gstText(quotation)],
    ["Payment", text(quotation.payment_terms)]
  ];

  detailSections.forEach(([heading, value]) => {
    addSection(worksheet, row, heading, value);
    row += 1;
  });

  const bankDetails = [
    `Firm Name - ${settings.company_name}`,
    `Bank Name : ${settings.bank_name}`,
    `Account No : ${settings.bank_account_no}`,
    `Branch : ${settings.bank_branch}`,
    `IFSC Code : ${settings.bank_ifsc}`
  ].join("\n");
  addSection(
    worksheet,
    row,
    "Bank Details - NEFT, RTGS, UPI, IMPS",
    bankDetails,
    { borderBottom: true }
  );
  row += 1;

  addSection(
    worksheet,
    row,
    "After sales Support",
    text(quotation.after_sales_support),
    { borderBottom: true }
  );
  row += 1;

  worksheet.getRow(row).height = 25;
  setMergedCell(worksheet, row, 1, 7, `For ${settings.company_name}`, {
    alignment: { vertical: "middle" },
    font: { name: "Georgia", size: 10, bold: true, color: { argb: BLACK } }
  });
  row += 1;

  const signer = signerDetails(settings);
  worksheet.getRow(row).height = 40;
  setMergedCell(
    worksheet,
    row,
    1,
    3,
    settings.bank_branch || "Vishakhapatnam",
    {
      alignment: { vertical: "middle" },
      border: bottomBlackBorder,
      font: { name: "Georgia", size: 10, bold: true, color: { argb: BLACK } }
    }
  );
  styleRange(worksheet, row, 4, row, 4, { border: bottomBlackBorder });
  setMergedCell(
    worksheet,
    row,
    5,
    7,
    `${signer.name}\n${signer.designation}`,
    {
      alignment: { horizontal: "center", vertical: "middle", wrapText: true },
      border: bottomBlackBorder,
      font: { name: "Georgia", size: 10, bold: true, color: { argb: BLACK } }
    }
  );
  row += 1;

  worksheet.getRow(row).height = 92;
  const branchDetails = [
    "Branch Office :",
    settings.address,
    `${settings.phone_numbers} | ${settings.email}`,
    `GST NO : ${settings.gst_number}`
  ].join("\n");
  const primaryPhone =
    settings.phone_numbers.split("|")[0]?.trim() || settings.phone_numbers;
  const corporateDetails = [
    "Corporate Office :",
    settings.company_name,
    settings.address,
    "",
    `spanfitnessequipments.in | ${primaryPhone}`
  ].join("\n");
  setMergedCell(worksheet, row, 1, 4, branchDetails, {
    alignment: { vertical: "top", wrapText: true },
    font: { name: "Georgia", size: 9, color: { argb: BLACK } }
  });
  setMergedCell(worksheet, row, 5, 7, corporateDetails, {
    alignment: { vertical: "top", wrapText: true },
    font: { name: "Georgia", size: 9, color: { argb: BLACK } }
  });
  worksheet.getCell(row, 1).font = {
    name: "Georgia",
    size: 9,
    color: { argb: BLACK }
  };
  row += 2;

  const footerStart = row;
  const footerEnd = row + 4;
  addBanner(workbook, worksheet, footer, footerStart, footerEnd);

  worksheet.pageSetup.printArea = `A1:G${footerEnd}`;
  worksheet.pageSetup.horizontalCentered = true;
  worksheet.pageSetup.verticalCentered = false;

  const output = await workbook.xlsx.writeBuffer();
  return Buffer.from(output);
}
