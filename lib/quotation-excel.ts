import type { Customer, Quotation, QuotationItem } from "@/lib/types";
import { formatCustomerName } from "@/lib/format";

type WorkbookFile = {
  name: string;
  data: Buffer;
};

type Cell = {
  value?: string | number | null;
  style?: number;
};

const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

function crc32(data: Buffer) {
  let crc = 0xffffffff;

  for (const byte of data) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}

function zipWorkbook(files: WorkbookFile[]) {
  const localParts: Buffer[] = [];
  const centralParts: Buffer[] = [];
  let offset = 0;
  const now = new Date();
  const dosTime =
    (now.getHours() << 11) | (now.getMinutes() << 5) | Math.floor(now.getSeconds() / 2);
  const dosDate =
    (Math.max(now.getFullYear(), 1980) - 1980) * 512 +
    (now.getMonth() + 1) * 32 +
    now.getDate();

  for (const file of files) {
    const name = Buffer.from(file.name, "utf8");
    const checksum = crc32(file.data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt16LE(0, 6);
    localHeader.writeUInt16LE(0, 8);
    localHeader.writeUInt16LE(dosTime, 10);
    localHeader.writeUInt16LE(dosDate, 12);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(file.data.length, 18);
    localHeader.writeUInt32LE(file.data.length, 22);
    localHeader.writeUInt16LE(name.length, 26);
    localHeader.writeUInt16LE(0, 28);

    const localRecord = Buffer.concat([localHeader, name, file.data]);
    localParts.push(localRecord);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt16LE(0, 8);
    centralHeader.writeUInt16LE(0, 10);
    centralHeader.writeUInt16LE(dosTime, 12);
    centralHeader.writeUInt16LE(dosDate, 14);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(file.data.length, 20);
    centralHeader.writeUInt32LE(file.data.length, 24);
    centralHeader.writeUInt16LE(name.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(Buffer.concat([centralHeader, name]));

    offset += localRecord.length;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDirectory.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, centralDirectory, endRecord]);
}

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function columnName(index: number) {
  let name = "";
  let value = index;

  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }

  return name;
}

function worksheetRow(rowNumber: number, cells: Cell[], height?: number) {
  const attributes = height ? ` ht="${height}" customHeight="1"` : "";
  const content = cells
    .map((cell, index) => {
      if (cell.value === null || cell.value === undefined || cell.value === "") return "";

      const reference = `${columnName(index + 1)}${rowNumber}`;
      const style = cell.style === undefined ? "" : ` s="${cell.style}"`;

      if (typeof cell.value === "number") {
        const value = Number.isFinite(cell.value) ? cell.value : 0;
        return `<c r="${reference}"${style}><v>${value}</v></c>`;
      }

      return `<c r="${reference}"${style} t="inlineStr"><is><t xml:space="preserve">${escapeXml(
        cell.value
      )}</t></is></c>`;
    })
    .join("");

  return `<row r="${rowNumber}"${attributes}>${content}</row>`;
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function customerAddress(customer: Partial<Customer>) {
  return [
    text(customer.address),
    text(customer.city),
    text(customer.state),
    text(customer.pincode)
  ]
    .filter(Boolean)
    .join(", ");
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

function createWorksheet(
  quotation: Quotation,
  items: QuotationItem[],
  customer: Partial<Customer>
) {
  const rows: string[] = [];
  const merges = ["A1:J1", "B4:C4", "H4:J4", "B5:J5"];
  let row = 1;

  rows.push(
    worksheetRow(row++, [{ value: "SPAN FITNESS EQUIPMENTS - QUOTATION", style: 1 }], 28)
  );
  rows.push(worksheetRow(row++, []));
  rows.push(
    worksheetRow(row++, [
      { value: "Quotation No", style: 2 },
      { value: quotation.quote_number, style: 6 },
      {},
      { value: "Quotation Date", style: 2 },
      { value: formatDateForSheet(quotation.quote_date), style: 6 },
      {},
      { value: "Status", style: 2 },
      { value: quotation.status, style: 6 }
    ])
  );
  rows.push(
    worksheetRow(row++, [
      { value: "Customer", style: 2 },
      { value: formatCustomerName(customer), style: 6 },
      {},
      { value: "Phone", style: 2 },
      { value: text(customer.phone), style: 6 },
      {},
      { value: "Email", style: 2 },
      { value: text(customer.email), style: 6 }
    ])
  );
  rows.push(
    worksheetRow(
      row++,
      [
        { value: "Address", style: 2 },
        { value: customerAddress(customer), style: 11 }
      ],
      30
    )
  );
  rows.push(worksheetRow(row++, []));
  rows.push(
    worksheetRow(
      row++,
      [
        { value: "#", style: 3 },
        { value: "Product ID", style: 3 },
        { value: "Product Name", style: 3 },
        { value: "Brand", style: 3 },
        { value: "Unit Price", style: 3 },
        { value: "Discount (%)", style: 3 },
        { value: "Quote Price", style: 3 },
        { value: "Quantity", style: 3 },
        { value: "GST (%)", style: 3 },
        { value: "Total Amount", style: 3 }
      ],
      24
    )
  );

  for (const [index, item] of items.entries()) {
    const unitPrice = Number(item.unit_price) || 0;
    const quotePrice = Number(item.special_price) || 0;
    const discount = unitPrice > 0 ? ((unitPrice - quotePrice) / unitPrice) * 100 : 0;

    rows.push(
      worksheetRow(
        row++,
        [
          { value: index + 1, style: 7 },
          { value: item.sku, style: 6 },
          { value: item.product_name, style: 11 },
          { value: item.brand_name, style: 6 },
          { value: unitPrice, style: 4 },
          { value: discount, style: 5 },
          { value: quotePrice, style: 4 },
          { value: Number(item.qty) || 0, style: 7 },
          { value: Number(item.gst_percent) || 0, style: 5 },
          { value: Number(item.special_total) || 0, style: 4 }
        ],
        30
      )
    );
  }

  row += 1;
  const summaryStart = row;
  const summaryRows: Array<[string, number]> = [
    ["Total List Price", Number(quotation.total_list_price) || 0],
    ["Discount Value", Number(quotation.discount_amount) || 0],
    ["Total Quote Price", Number(quotation.total_special_price) || 0],
    ["GST Value", Number(quotation.gst_amount) || 0],
    ["Round Off", Number(quotation.round_off) || 0],
    ["Grand Total", Number(quotation.grand_total) || 0]
  ];

  for (const [index, [label, value]] of summaryRows.entries()) {
    const isGrandTotal = index === summaryRows.length - 1;
    merges.push(`I${row}:J${row}`);
    rows.push(
      worksheetRow(row++, [
        {},
        {},
        {},
        {},
        {},
        {},
        {},
        { value: label, style: isGrandTotal ? 10 : 8 },
        { value, style: isGrandTotal ? 10 : 9 }
      ])
    );
  }

  const details = [
    ["Warranty", quotation.warranty_note],
    ["Delivery", quotation.delivery_note],
    ["Transportation", quotation.transportation_note],
    ["Payment Terms", quotation.payment_terms],
    ["Terms and Conditions", quotation.terms]
  ].filter(([, value]) => text(value));

  if (details.length > 0) {
    row += 1;
    merges.push(`A${row}:J${row}`);
    rows.push(worksheetRow(row++, [{ value: "Terms and Conditions", style: 1 }], 24));

    for (const [label, value] of details) {
      merges.push(`B${row}:J${row}`);
      rows.push(
        worksheetRow(
          row++,
          [
            { value: label, style: 2 },
            { value: text(value), style: 11 }
          ],
          34
        )
      );
    }
  }

  const lastRow = Math.max(row - 1, summaryStart + summaryRows.length - 1);

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <dimension ref="A1:J${lastRow}"/>
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="7" topLeftCell="A8" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <sheetFormatPr defaultRowHeight="18"/>
  <cols>
    <col min="1" max="1" width="6" customWidth="1"/>
    <col min="2" max="2" width="18" customWidth="1"/>
    <col min="3" max="3" width="38" customWidth="1"/>
    <col min="4" max="4" width="18" customWidth="1"/>
    <col min="5" max="5" width="16" customWidth="1"/>
    <col min="6" max="6" width="14" customWidth="1"/>
    <col min="7" max="7" width="16" customWidth="1"/>
    <col min="8" max="8" width="11" customWidth="1"/>
    <col min="9" max="9" width="11" customWidth="1"/>
    <col min="10" max="10" width="18" customWidth="1"/>
  </cols>
  <sheetData>${rows.join("")}</sheetData>
  <mergeCells count="${merges.length}">${merges
    .map((reference) => `<mergeCell ref="${reference}"/>`)
    .join("")}</mergeCells>
  <autoFilter ref="A7:J${Math.max(7, 7 + items.length)}"/>
  <pageMargins left="0.25" right="0.25" top="0.5" bottom="0.5" header="0.2" footer="0.2"/>
  <pageSetup orientation="landscape" fitToWidth="1" fitToHeight="0"/>
</worksheet>`;
}

const STYLES_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="2">
    <numFmt numFmtId="164" formatCode="&quot;₹&quot;#,##0.00"/>
    <numFmt numFmtId="165" formatCode="0.00&quot;%&quot;"/>
  </numFmts>
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="15"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="4">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF93B5C6"/><bgColor indexed="64"/></patternFill></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FFD71920"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFC9CCD5"/></left>
      <right style="thin"><color rgb="FFC9CCD5"/></right>
      <top style="thin"><color rgb="FFC9CCD5"/></top>
      <bottom style="thin"><color rgb="FFC9CCD5"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="12">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="1" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="164" fontId="3" fillId="3" borderId="1" xfId="0" applyNumberFormat="1" applyAlignment="1"><alignment horizontal="right" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyAlignment="1"><alignment vertical="center" wrapText="1"/></xf>
  </cellXfs>
  <cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>
</styleSheet>`;

export function createQuotationExcel(quotation: Quotation, items: QuotationItem[]) {
  const customer = quotation.customer_snapshot as Partial<Customer>;
  const worksheet = createWorksheet(quotation, items, customer);
  const files: WorkbookFile[] = [
    {
      name: "[Content_Types].xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`)
    },
    {
      name: "_rels/.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`)
    },
    {
      name: "xl/workbook.xml",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <bookViews><workbookView xWindow="0" yWindow="0" windowWidth="24000" windowHeight="12000"/></bookViews>
  <sheets><sheet name="Quotation" sheetId="1" r:id="rId1"/></sheets>
  <calcPr calcId="191029"/>
</workbook>`)
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: Buffer.from(`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`)
    },
    {
      name: "xl/worksheets/sheet1.xml",
      data: Buffer.from(worksheet)
    },
    {
      name: "xl/styles.xml",
      data: Buffer.from(STYLES_XML)
    }
  ];

  return zipWorkbook(files);
}
