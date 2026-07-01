/* eslint-disable jsx-a11y/alt-text */
import {
  Document,
  Font,
  Image,
  Page,
  StyleSheet,
  Text,
  View
} from "@react-pdf/renderer";
import { formatCustomerName, formatDate } from "@/lib/format";
import type { PdfChromeImages } from "@/lib/pdf-assets";
import type { CompanySettings, Customer, Quotation, QuotationItem } from "@/lib/types";

Font.registerHyphenationCallback((word) => [word]);

type QuotationPdfDocumentProps = {
  quotation: Quotation;
  items: QuotationItem[];
  settings: CompanySettings;
  chromeImages: PdfChromeImages;
  productImages: Record<string, string>;
};

const PAGE_WIDTH = 595.28;
const PAGE_PADDING_X = 33.17;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING_X * 2;
const COLUMNS = [24, 104, 210, 48, 49, 25, 69];

const styles = StyleSheet.create({
  page: {
    backgroundColor: "#ffffff",
    color: "#000000",
    fontFamily: "Times-Roman",
    fontSize: 7.4,
    paddingHorizontal: PAGE_PADDING_X,
    paddingBottom: 130,
    position: "relative"
  },
  firstPage: { paddingTop: 205 },
  continuationPage: { paddingTop: 175 },
  headerFirst: {
    position: "absolute",
    top: 22.68,
    left: PAGE_PADDING_X,
    width: CONTENT_WIDTH,
    height: 176.3
  },
  headerContinuation: {
    position: "absolute",
    top: 22.68,
    left: PAGE_PADDING_X,
    width: CONTENT_WIDTH,
    height: 147.4
  },
  footer: {
    position: "absolute",
    left: PAGE_PADDING_X,
    bottom: 22.68,
    width: CONTENT_WIDTH,
    height: 100
  },
  title: {
    fontFamily: "Times-Bold",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 7
  },
  customerRow: {
    minHeight: 62,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 26,
    marginBottom: 6
  },
  customerColumn: { width: "56%", lineHeight: 1.2 },
  quoteColumn: { width: "44%", textAlign: "right", lineHeight: 1.25, paddingTop: 4 },
  toLabel: { fontFamily: "Times-Bold", fontSize: 10, marginBottom: 12 },
  bold: { fontFamily: "Times-Bold" },
  table: { width: CONTENT_WIDTH },
  tableRow: { flexDirection: "row" },
  headerCell: {
    height: 25,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#000000",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 2,
    textAlign: "center",
    fontFamily: "Times-Bold",
    fontSize: 6.7,
    lineHeight: 1.05
  },
  cell: {
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#000000",
    padding: 4,
    overflow: "hidden"
  },
  lastCell: { borderRightWidth: 1 },
  centeredCell: { alignItems: "center", textAlign: "center" },
  description: { fontFamily: "Helvetica", fontSize: 6.4, lineHeight: 1.12 },
  productName: { fontFamily: "Helvetica-Bold", fontSize: 6.8, marginBottom: 7 },
  productCard: {
    width: 81.4,
    height: 83.6,
    borderWidth: 1,
    borderColor: "#111111",
    borderRadius: 5,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "flex-end",
    overflow: "hidden"
  },
  productImage: { width: 64, height: 66, objectFit: "contain" },
  productFallback: {
    width: 64,
    height: 66,
    alignItems: "center",
    justifyContent: "center",
    color: "#e30613",
    fontFamily: "Times-Bold",
    fontSize: 8
  },
  productBrand: { fontFamily: "Times-Bold", fontSize: 6.5, marginBottom: 4 },
  totals: {
    width: 191,
    marginLeft: "auto"
  },
  totalRow: { height: 18.7, flexDirection: "row" },
  totalLabel: {
    width: 122,
    borderLeftWidth: 1,
    borderTopWidth: 1,
    borderColor: "#000000",
    justifyContent: "center",
    paddingHorizontal: 6,
    fontSize: 7.7
  },
  totalValue: {
    width: 69,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderTopWidth: 1,
    borderColor: "#000000",
    justifyContent: "center",
    paddingHorizontal: 6,
    fontFamily: "Helvetica",
    fontSize: 7.7
  },
  totalBottom: { borderBottomWidth: 1 },
  termsEntry: {
    marginLeft: 26,
    width: 425,
    marginBottom: 3,
    fontSize: 8.1,
    lineHeight: 1.2
  },
  termsFirst: { marginTop: 6 },
  sectionHeading: { fontFamily: "Times-Bold", fontSize: 8.6, marginBottom: 1 },
  bank: {
    marginHorizontal: 26,
    marginTop: 3,
    paddingVertical: 3,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    fontSize: 7.3,
    lineHeight: 1.15
  },
  support: {
    marginTop: 3,
    paddingHorizontal: 26,
    paddingVertical: 4,
    borderBottomWidth: 1,
    fontSize: 7.6,
    lineHeight: 1.15
  },
  companyLine: { paddingHorizontal: 26, paddingVertical: 6, fontSize: 8 },
  signatureRow: {
    flexDirection: "row",
    paddingHorizontal: 26,
    paddingTop: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    fontSize: 8,
    lineHeight: 1.15
  },
  signatureLeft: { width: "55%" },
  signatureRight: { width: "45%", paddingLeft: 64 },
  officeRow: {
    flexDirection: "row",
    paddingHorizontal: 26,
    paddingTop: 8,
    fontSize: 7.2,
    lineHeight: 1.18
  },
  branchOffice: { width: "58%", paddingRight: 12 },
  corporateOffice: { width: "42%", paddingLeft: 12 },
  officeHeading: { fontFamily: "Times-Bold", fontSize: 10, marginBottom: 3 },
  iconLine: { flexDirection: "row", alignItems: "center", marginTop: 2 },
  icon: { width: 9, height: 9, marginRight: 3, objectFit: "contain" }
});

function amount(value: number | string | null | undefined) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Number(value || 0));
}

function customerFullAddress(customer: Partial<Customer>) {
  return [customer.address, customer.city, customer.state, customer.pincode]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join(", ");
}

function productBrand(item: QuotationItem, settings: CompanySettings) {
  const brand = String(item.brand_name || "").trim();
  return /welcare/i.test(brand) ? settings.company_name : brand || "SPAN";
}

function productDetails(item: QuotationItem) {
  return [
    item.description,
    item.dimensions ? `Dimensions : ${item.dimensions}` : "",
    item.machine_weight ? `Machine Weight : ${item.machine_weight}` : "",
    item.stack_weight ? `Stack Weight : ${item.stack_weight}` : "",
    item.specifications
  ]
    .map((value) => String(value || "").trim())
    .filter(Boolean)
    .join("\n");
}

function Chrome({ images, first }: { images: PdfChromeImages; first: boolean }) {
  return (
    <>
      {images.top ? (
        <Image fixed src={images.top} style={first ? styles.headerFirst : styles.headerContinuation} />
      ) : null}
      {images.bottom ? <Image fixed src={images.bottom} style={styles.footer} /> : null}
    </>
  );
}

function HeaderCell({ index, children }: { index: number; children: React.ReactNode }) {
  return (
    <View style={[styles.headerCell, { width: COLUMNS[index] }, index === 6 ? styles.lastCell : {}]}>
      <Text>{children}</Text>
    </View>
  );
}

function ProductTable({
  items,
  startIndex,
  settings,
  productImages,
  continuation
}: {
  items: QuotationItem[];
  startIndex: number;
  settings: CompanySettings;
  productImages: Record<string, string>;
  continuation: boolean;
}) {
  return (
    <View style={styles.table}>
      <View style={styles.tableRow} wrap={false}>
        <HeaderCell index={0}>#</HeaderCell>
        <HeaderCell index={1}>Product</HeaderCell>
        <HeaderCell index={2}>Description</HeaderCell>
        <HeaderCell index={3}>{"Unit Price\n(Rs.)"}</HeaderCell>
        <HeaderCell index={4}>{"Special Price\n(Rs.)"}</HeaderCell>
        <HeaderCell index={5}>Qty</HeaderCell>
        <HeaderCell index={6}>{"Total\n(Rs.)"}</HeaderCell>
      </View>

      {items.map((item, index) => {
        const rowHeight = continuation ? 89.3 : 92.1;
        const cellStyle = (column: number, centered = false) => [
          styles.cell,
          { width: COLUMNS[column], height: rowHeight },
          centered ? styles.centeredCell : {},
          column === 6 ? styles.lastCell : {}
        ];

        return (
          <View key={item.id || `${item.sku}-${index}`} style={styles.tableRow} wrap={false}>
            <View style={cellStyle(0, true)}><Text>{startIndex + index + 1}</Text></View>
            <View style={cellStyle(1)}>
              <View style={styles.productCard}>
                {productImages[item.id] ? (
                  <Image src={productImages[item.id]} style={styles.productImage} />
                ) : (
                  <View style={styles.productFallback}><Text>SFE</Text></View>
                )}
                <Text style={styles.productBrand}>{productBrand(item, settings)}</Text>
              </View>
            </View>
            <View style={cellStyle(2)}>
              <Text style={styles.productName}>{item.product_name}</Text>
              <Text style={styles.description}>{productDetails(item)}</Text>
            </View>
            <View style={cellStyle(3, true)}><Text>{amount(item.unit_price)}</Text></View>
            <View style={cellStyle(4, true)}><Text>{amount(item.special_price)}</Text></View>
            <View style={cellStyle(5, true)}><Text>{amount(item.qty)}</Text></View>
            <View style={cellStyle(6, true)}><Text>{amount(item.line_total)}</Text></View>
          </View>
        );
      })}
    </View>
  );
}

function Totals({ quotation }: { quotation: Quotation }) {
  const rows = [
    ["Total List Price", quotation.total_list_price],
    ["Discount", quotation.discount_amount],
    ["Total Special Price", quotation.total_special_price],
    ["GST", quotation.gst_amount],
    ["Net Total", quotation.net_total],
    ["Round Off", quotation.round_off],
    ["Grand Total", quotation.grand_total]
  ] as const;

  return (
    <View style={styles.totals} wrap={false}>
      {rows.map(([label, value], index) => (
        <View key={label} style={styles.totalRow}>
          <View style={[styles.totalLabel, index === rows.length - 1 ? styles.totalBottom : {}]}>
            <Text>{label}</Text>
          </View>
          <View style={[styles.totalValue, index === rows.length - 1 ? styles.totalBottom : {}]}>
            <Text>{amount(value)}</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

function TermsEntry({ heading, children, first = false }: { heading: string; children: string; first?: boolean }) {
  return (
    <View style={[styles.termsEntry, first ? styles.termsFirst : {}]} wrap={false}>
      <Text style={styles.sectionHeading}>{heading}</Text>
      <Text>{children}</Text>
    </View>
  );
}

function IconLine({ icon, children }: { icon?: string; children: string }) {
  return (
    <View style={styles.iconLine}>
      {icon ? <Image src={icon} style={styles.icon} /> : null}
      <Text>{children}</Text>
    </View>
  );
}

function DetailsFlow({
  quotation,
  settings,
  images
}: {
  quotation: Quotation;
  settings: CompanySettings;
  images: PdfChromeImages;
}) {
  const gstText =
    quotation.gst_mode === "included"
      ? "* GST Included."
      : quotation.gst_mode === "none"
        ? "* No GST."
        : "* GST Extra.";
  const signerName =
    settings.authorized_person_name === "Authorized Signatory"
      ? "A Senthil Kumar"
      : settings.authorized_person_name || "A Senthil Kumar";
  const signerDesignation = /^for\s+/i.test(settings.authorized_person_designation)
    ? "National Head"
    : settings.authorized_person_designation || "National Head";
  const primaryPhone = settings.phone_numbers.split("|")[0]?.trim() || settings.phone_numbers;

  return (
    <>
      <Totals quotation={quotation} />
      <TermsEntry heading="Terms and Conditions:" first>{quotation.terms}</TermsEntry>
      <TermsEntry heading="Warranty:">{quotation.warranty_note}</TermsEntry>
      <TermsEntry heading="Delivery:">{quotation.delivery_note}</TermsEntry>
      <TermsEntry heading="Transportation:">{quotation.transportation_note}</TermsEntry>
      <TermsEntry heading="GST:">{gstText}</TermsEntry>
      <TermsEntry heading="Payment:">{quotation.payment_terms}</TermsEntry>

      <View style={styles.bank} wrap={false}>
        <Text style={styles.sectionHeading}>Bank Details - NEFT, RTGS, UPI, IMPS:</Text>
        <Text>{`Firm Name - ${settings.company_name}\nBank Name : ${settings.bank_name}\nAccount No : ${settings.bank_account_no}\nBranch : ${settings.bank_branch}\nIFSC Code : ${settings.bank_ifsc}`}</Text>
      </View>

      <View style={styles.support} wrap={false}>
        <Text style={styles.sectionHeading}>After sales Support:</Text>
        <Text>{quotation.after_sales_support}</Text>
      </View>

      <View wrap={false}>
        <View style={styles.companyLine}><Text style={styles.bold}>For {settings.company_name}</Text></View>
        <View style={styles.signatureRow}>
          <View style={styles.signatureLeft}><Text style={styles.bold}>{settings.bank_branch || "Visakhapatnam"}</Text></View>
          <View style={styles.signatureRight}>
            <Text style={styles.bold}>{signerName}</Text>
            <Text>{signerDesignation}</Text>
          </View>
        </View>
      </View>

      <View style={styles.officeRow} wrap={false}>
        <View style={styles.branchOffice}>
          <Text style={styles.officeHeading}>Branch Office :</Text>
          <Text>{settings.address}</Text>
          <IconLine icon={images.phoneIconBig}>{`${settings.phone_numbers} | ${settings.email}`}</IconLine>
          <Text style={[styles.bold, { marginTop: 2 }]}>GST NO : {settings.gst_number}</Text>
        </View>
        <View style={styles.corporateOffice}>
          <Text style={styles.officeHeading}>Corporate Office :</Text>
          <Text style={styles.bold}>{settings.company_name}</Text>
          <Text>{settings.address}</Text>
          <IconLine icon={images.webIcon}>spanfitnessequipments.in</IconLine>
          <IconLine icon={images.phoneIcon}>{primaryPhone}</IconLine>
        </View>
      </View>
    </>
  );
}

function FirstPageIntro({ quotation }: { quotation: Quotation }) {
  const customer = quotation.customer_snapshot as Partial<Customer>;
  return (
    <>
      <Text style={styles.title}>QUOTATION</Text>
      <View style={styles.customerRow} wrap={false}>
        <View style={styles.customerColumn}>
          <Text style={styles.toLabel}>To:</Text>
          <Text>{formatCustomerName(customer)},</Text>
          <Text>{customer.phone || ""},</Text>
          <Text>{customerFullAddress(customer) || "."}</Text>
        </View>
        <View style={styles.quoteColumn}>
          <Text style={styles.bold}>DATE: {formatDate(quotation.quote_date)}</Text>
          <Text style={styles.bold}>QUOTATION NO: {quotation.quote_number}</Text>
        </View>
      </View>
    </>
  );
}

function chunk<T>(items: T[], size: number) {
  const result: T[][] = [];
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size));
  return result;
}

export function QuotationPdfDocument({
  quotation,
  items,
  settings,
  chromeImages,
  productImages
}: QuotationPdfDocumentProps) {
  const firstItems = items.slice(0, 4);
  const continuationGroups = chunk(items.slice(4), 5);

  return (
    <Document title={quotation.quote_number} author={settings.company_name}>
      <Page size="A4" style={[styles.page, styles.firstPage]} wrap>
        <Chrome images={chromeImages} first />
        <FirstPageIntro quotation={quotation} />
        <ProductTable
          items={firstItems}
          startIndex={0}
          settings={settings}
          productImages={productImages}
          continuation={false}
        />
        {!continuationGroups.length ? (
          <DetailsFlow quotation={quotation} settings={settings} images={chromeImages} />
        ) : null}
      </Page>

      {continuationGroups.map((group, index) => (
        <Page key={`products-${index}`} size="A4" style={[styles.page, styles.continuationPage]} wrap>
          <Chrome images={chromeImages} first={false} />
          <ProductTable
            items={group}
            startIndex={4 + index * 5}
            settings={settings}
            productImages={productImages}
            continuation
          />
          {index === continuationGroups.length - 1 ? (
            <DetailsFlow quotation={quotation} settings={settings} images={chromeImages} />
          ) : null}
        </Page>
      ))}
    </Document>
  );
}
