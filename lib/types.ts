export type Status = "active" | "inactive";
export type TeamMemberRole = "Admin" | "Manager" | "Sales Executive";

export type TeamMember = {
  id: string;
  member_name: string;
  phone_number: string;
  email: string;
  password_hash: string;
  role: TeamMemberRole;
  branch_location: string;
  max_discount_percent: number;
  status: Status;
  profile_photo_url: string | null;
  profile_photo_path: string | null;
  created_at: string;
  updated_at: string;
};

export type QuotationStatus =
  | "Draft"
  | "Sent"
  | "Accepted"
  | "Rejected"
  | "Cancelled";
export type GstMode = "add" | "included" | "none";

export type Brand = {
  id: string;
  name: string;
  slug: string;
  is_active: boolean;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  is_active: boolean;
};

export type Product = {
  id: string;
  sku: string;
  product_name: string;
  brand_id: string | null;
  category_id: string | null;
  sub_category_id: string | null;
  image_url: string | null;
  unit_price: number;
  special_price: number;
  gst_percent: number;
  stock_availability: string | null;
  description: string | null;
  technical_specifications: string | null;
  dimensions: string | null;
  machine_weight: string | null;
  stack_weight: string | null;
  warranty_note: string | null;
  status: Status;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  brand?: Pick<Brand, "id" | "name"> | null;
  category?: Pick<Category, "id" | "name"> | null;
  sub_category?: Pick<Category, "id" | "name"> | null;
};

export type Customer = {
  id: string;
  customer_name: string;
  business_name: string | null;
  phone: string;
  suffix: string | null;
  alternate_phone: string | null;
  email: string | null;
  gst_number: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  pincode: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CompanySettings = {
  id: string;
  company_name: string;
  logo_url: string | null;
  gst_number: string;
  phone_numbers: string;
  email: string;
  address: string;
  bank_name: string;
  bank_account_no: string;
  bank_branch: string;
  bank_ifsc: string;
  pdf_theme_color: string;
  default_gst_percent: number;
  default_gst_mode: GstMode;
  default_validity_days: number;
  default_terms: string;
  default_warranty: string;
  default_delivery: string;
  default_transportation: string;
  default_payment_terms: string;
  default_after_sales_support: string;
  authorized_person_name: string;
  authorized_person_designation: string;
  signature_url: string | null;
  brand_footer_heading: string;
  brand_footer_enabled: boolean;
  updated_at: string;
};

export type BrandFooterLogo = {
  id: string;
  label: string;
  image_url: string | null;
  sort_order: number;
  is_active: boolean;
};

export type QuotationItemInput = {
  product_id?: string | null;
  sku: string;
  product_name: string;
  brand_name: string;
  image_url?: string | null;
  description?: string | null;
  specifications?: string | null;
  dimensions?: string | null;
  machine_weight?: string | null;
  stack_weight?: string | null;
  unit_price: number;
  special_price: number;
  qty: number;
  gst_percent: number;
};

export type CalculatedQuotationItem = QuotationItemInput & {
  list_total: number;
  special_total: number;
  gst_amount: number;
  line_total: number;
};

export type QuotationTotals = {
  total_list_price: number;
  total_special_price: number;
  discount_amount: number;
  gst_amount: number;
  net_total: number;
  round_off: number;
  grand_total: number;
};

export type Quotation = {
  id: string;
  base_quote_number: string;
  revision: number;
  quote_number: string;
  quote_date: string;
  validity_days: number;
  customer_id: string | null;
  customer_snapshot: Customer | Record<string, unknown>;
  total_list_price: number;
  discount_amount: number;
  total_special_price: number;
  gst_amount: number;
  net_total: number;
  round_off: number;
  grand_total: number;
  gst_mode: GstMode;
  terms: string;
  payment_terms: string;
  transportation_note: string;
  delivery_note: string;
  warranty_note: string;
  after_sales_support: string;
  bank_details: Record<string, unknown>;
  company_settings_snapshot: Record<string, unknown>;
  prepared_by: string;
  status: QuotationStatus;
  pdf_url: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
};

export type QuotationItem = CalculatedQuotationItem & {
  id: string;
  quotation_id: string;
};
