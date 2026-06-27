import type { CompanySettings } from "@/lib/types";

export const DEFAULT_COMPANY_SETTINGS: Omit<CompanySettings, "id" | "updated_at"> = {
  company_name: "SPAN FITNESS EQUIPMENTS",
  logo_url: null,
  gst_number: "37EHKPK9679G1ZH",
  phone_numbers: "9703344483 | 9840639509",
  email: "spanfitnessequipments@gmail.com",
  address:
    "GROUND FLOOR, 50-81-26, SEETHAMMAPETA JUNCTION, MAIN ROAD, Visakhapatnam - 530016.",
  bank_name: "HDFC Bank",
  bank_account_no: "50200062043280",
  bank_branch: "Vishakhapatnam",
  bank_ifsc: "HDFC0006274",
  pdf_theme_color: "#93B5C6",
  default_gst_percent: 18,
  default_gst_mode: "add",
  default_validity_days: 30,
  default_terms: "The prices are valid only for 30 days.",
  default_warranty:
    "One year comprehensive warranty for parts and labor. Warranty does not cover plastic, rubber parts, upholstery, and physical damages. Treadmill warranty will be covered only on use of stabilizer.",
  default_delivery: "As per stock availability.",
  default_transportation:
    "Transportation charges extra. Unloading charges should be arranged by customer.",
  default_payment_terms: "100% advance payment along with purchase order.",
  default_after_sales_support:
    "Dedicated service support within 24 hours of complaint registration.",
  authorized_person_name: "Authorized Signatory",
  authorized_person_designation: "For SPAN FITNESS EQUIPMENTS",
  signature_url: null,
  brand_footer_heading: "ASSOCIATED FITNESS BRANDS",
  brand_footer_enabled: true
};

export const STOCK_OPTIONS = ["In Stock", "Limited Stock", "On Order", "Out of Stock"];

export const QUOTATION_STATUSES = [
  "Draft",
  "Sent",
  "Accepted",
  "Rejected",
  "Cancelled"
] as const;

export const GST_MODES = [
  { value: "add", label: "Add GST on quote price" },
  { value: "included", label: "GST included in price" },
  { value: "none", label: "No GST" }
] as const;
