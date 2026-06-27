"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ChevronDown, Plus, Trash2 } from "lucide-react";
import { saveQuotationAction } from "@/app/actions/quotations";
import { StateCitySelects } from "@/components/state-city-selects";
import { SubmitButton } from "@/components/submit-button";
import { calculateQuotation } from "@/lib/calculations";
import { customerSuffixOptions } from "@/lib/customer-options";
import { formatCustomerName } from "@/lib/format";
import type {
  CompanySettings,
  Customer,
  Product,
  Quotation,
  QuotationItem,
  QuotationItemInput
} from "@/lib/types";

type BuilderProduct = Product & {
  brand?: { id: string; name: string } | null;
};

type QuotationBuilderProps = {
  products: BuilderProduct[];
  customers: Customer[];
  settings: CompanySettings;
  quotation?: Quotation;
  quotationItems?: QuotationItem[];
};

type ProductDropdownProps = {
  item: QuotationItemInput;
  products: BuilderProduct[];
  search: string;
  isOpen: boolean;
  onToggle: () => void;
  onSearchChange: (value: string) => void;
  onSelect: (product: BuilderProduct) => void;
  onClear: () => void;
};

function roundMoney(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function formatAmount(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0";
  return String(Math.round(amount));
}

function formatTaxAmount(value: number | string | null | undefined) {
  const amount = Number(value || 0);
  if (!Number.isFinite(amount)) return "0.00";
  return amount.toFixed(2);
}

function emptyQuotationItem(gstPercent: number): QuotationItemInput {
  return {
    product_id: null,
    sku: "",
    product_name: "",
    brand_name: "",
    image_url: null,
    description: "",
    specifications: null,
    dimensions: null,
    machine_weight: null,
    stack_weight: null,
    unit_price: 0,
    special_price: 0,
    qty: 1,
    gst_percent: gstPercent
  };
}

function itemFromProduct(product: BuilderProduct): QuotationItemInput {
  return {
    product_id: product.id,
    sku: product.sku,
    product_name: product.product_name,
    brand_name: product.brand?.name || "",
    image_url: product.image_url,
    description: product.description,
    specifications: null,
    dimensions: null,
    machine_weight: null,
    stack_weight: null,
    unit_price: Number(product.unit_price || 0),
    special_price: Number(product.unit_price || 0),
    qty: 1,
    gst_percent: Number(product.gst_percent || 18)
  };
}

function itemFromQuotation(item: QuotationItem): QuotationItemInput {
  return {
    product_id: item.product_id || null,
    sku: item.sku || "",
    product_name: item.product_name,
    brand_name: item.brand_name || "",
    image_url: item.image_url,
    description: item.description,
    specifications: item.specifications,
    dimensions: item.dimensions,
    machine_weight: item.machine_weight,
    stack_weight: item.stack_weight,
    unit_price: Number(item.unit_price || 0),
    special_price: Number(item.special_price || 0),
    qty: Number(item.qty || 1),
    gst_percent: Number(item.gst_percent || 18)
  };
}

function productMatchesSearch(product: BuilderProduct, search: string) {
  const term = search.trim().toLowerCase();
  if (!term) return true;

  return [product.sku, product.product_name]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .includes(term);
}

function getDiscountPercent(item: QuotationItemInput) {
  const unitPrice = Number(item.unit_price || 0);
  const specialPrice = Number(item.special_price || 0);
  if (unitPrice <= 0) return 0;
  return roundMoney(Math.max(0, ((unitPrice - specialPrice) / unitPrice) * 100));
}

function getLineTotal(item: QuotationItemInput) {
  return roundMoney(Number(item.special_price || 0) * Number(item.qty || 0));
}

function ProductDropdown({
  item,
  products,
  search,
  isOpen,
  onToggle,
  onSearchChange,
  onSelect,
  onClear
}: ProductDropdownProps) {
  const filteredProducts = useMemo(
    () => products.filter((product) => productMatchesSearch(product, search)).slice(0, 60),
    [products, search]
  );
  const selectedLabel = item.product_name
    ? `${item.product_name}${item.sku ? ` - ${item.sku}` : ""}`
    : "Select Product";

  return (
    <div className={`relative ${isOpen ? "z-50" : "z-0"}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex h-10 w-full items-center justify-between gap-2 rounded-md border border-slate-300 bg-white px-3 text-left text-xs font-semibold text-slate-900 outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/25"
        title={selectedLabel}
      >
        <span className="truncate">{selectedLabel}</span>
        <ChevronDown className={`h-4 w-4 shrink-0 transition ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen ? (
        <div className="absolute left-0 top-11 w-[min(78vw,360px)] min-w-0 rounded-md border border-slate-300 bg-white shadow-xl sm:w-full sm:min-w-[300px]">
          <div className="border-b border-line p-1.5">
            <input
              autoFocus
              className="h-9 w-full rounded-sm border border-slate-900 px-2 text-xs outline-none"
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search Product ID or Product Name"
            />
          </div>
          <div className="max-h-56 overflow-y-auto py-1">
            <button
              type="button"
              onClick={onClear}
              className="block w-full bg-mist px-2 py-2 text-left text-xs font-semibold text-ink"
            >
              Select Product
            </button>
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                type="button"
                onClick={() => onSelect(product)}
                className="block w-full px-2 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-rose"
              >
                <span className="block truncate">{product.product_name}</span>
                <span className="block truncate text-[11px] font-normal text-slate-500">
                  {product.sku}
                </span>
              </button>
            ))}
            {!filteredProducts.length ? (
              <div className="px-2 py-3 text-xs font-semibold text-slate-500">
                No products found.
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

type QuotationTotals = ReturnType<typeof calculateQuotation>["totals"];

function TotalsPanel({ totals, className = "" }: { totals: QuotationTotals; className?: string }) {
  const rows = [
    ["Total List Price", totals.total_list_price, true],
    ["Discount Value", totals.discount_amount, true],
    ["Total Special Price", totals.total_special_price, true],
    ["GST Value", totals.gst_amount, true],
    ["Round Off", totals.round_off, false],
    ["Net Total", totals.grand_total, true]
  ] as const;

  return (
    <div
      className={`grid grid-cols-1 gap-2 text-xs font-black text-black sm:grid-cols-[170px_1fr] sm:items-center sm:gap-y-0 ${className}`}
    >
      {rows.map(([label, value, muted]) => (
        <div key={label} className="contents">
          <div className="pt-1 sm:py-2 sm:pr-7 sm:text-right">{label}</div>
          <input
            className={`h-10 rounded-md border border-slate-300 px-3 font-normal ${
              muted ? "bg-slate-200" : "bg-white"
            }`}
            value={formatAmount(value)}
            readOnly
          />
        </div>
      ))}
    </div>
  );
}

export function QuotationBuilder({
  products,
  customers,
  settings,
  quotation,
  quotationItems = []
}: QuotationBuilderProps) {
  const snapshot = quotation?.customer_snapshot as Partial<Customer> | undefined;
  const [customerMode, setCustomerMode] = useState<"existing" | "new">(
    quotation && !quotation.customer_id ? "new" : "existing"
  );
  const [customerId, setCustomerId] = useState(quotation?.customer_id || customers[0]?.id || "");
  const [items, setItems] = useState<QuotationItemInput[]>(
    quotationItems.length ? quotationItems.map(itemFromQuotation) : []
  );
  const [openProductRow, setOpenProductRow] = useState<number | null>(null);
  const [productSearches, setProductSearches] = useState<Record<number, string>>({});
  const gstMode = quotation?.gst_mode || settings.default_gst_mode;
  const defaultGstPercent = Number(settings.default_gst_percent || 18);
  const hasSelectedCustomer = customers.some((customer) => customer.id === customerId);

  const selectedItems = useMemo(
    () => items.filter((item) => item.product_name.trim()),
    [items]
  );
  const calculated = useMemo(
    () => calculateQuotation(selectedItems, gstMode),
    [selectedItems, gstMode]
  );
  const gstSummaryRows = useMemo(() => {
    const rows = new Map<number, { taxable: number; gst: number }>();

    calculated.items.forEach((item) => {
      const current = rows.get(item.gst_percent) || { taxable: 0, gst: 0 };
      rows.set(item.gst_percent, {
        taxable: roundMoney(current.taxable + item.special_total),
        gst: roundMoney(current.gst + item.gst_amount)
      });
    });

    return Array.from(rows.entries()).map(([rate, values]) => ({
      rate,
      taxable: values.taxable,
      cgst: roundMoney(values.gst / 2),
      sgst: roundMoney(values.gst / 2),
      igst: 0
    }));
  }, [calculated.items]);

  function addEmptyProductRow() {
    const nextIndex = items.length;
    setItems((current) => [...current, emptyQuotationItem(defaultGstPercent)]);
    setOpenProductRow(nextIndex);
    setProductSearches((current) => ({ ...current, [nextIndex]: "" }));
  }

  function updateItem(index: number, patch: Partial<QuotationItemInput>) {
    setItems((current) =>
      current.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
    );
  }

  function selectProduct(index: number, product: BuilderProduct) {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return {
          ...itemFromProduct(product),
          qty: Number(item.qty || 1)
        };
      })
    );
    setOpenProductRow(null);
    setProductSearches((current) => ({ ...current, [index]: "" }));
  }

  function clearProduct(index: number) {
    setItems((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index
          ? {
              ...emptyQuotationItem(defaultGstPercent),
              qty: Number(item.qty || 1)
            }
          : item
      )
    );
    setOpenProductRow(null);
    setProductSearches((current) => ({ ...current, [index]: "" }));
  }

  function updateDiscount(index: number, value: string) {
    const discount = Math.min(100, Math.max(0, Number(value || 0)));

    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        const unitPrice = Number(item.unit_price || 0);
        return {
          ...item,
          special_price: roundMoney(unitPrice - (unitPrice * discount) / 100)
        };
      })
    );
  }

  function removeItem(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
    setOpenProductRow((current) => {
      if (current === null) return null;
      if (current === index) return null;
      if (current > index) return current - 1;
      return current;
    });
    setProductSearches((current) => {
      const next: Record<number, string> = {};

      Object.entries(current).forEach(([key, value]) => {
        const rowIndex = Number(key);
        if (rowIndex < index) next[rowIndex] = value;
        if (rowIndex > index) next[rowIndex - 1] = value;
      });

      return next;
    });
  }

  return (
    <form action={saveQuotationAction} className="grid min-w-0 gap-5">
      <input type="hidden" name="quotation_id" value={quotation?.id || ""} />
      <input type="hidden" name="items" value={JSON.stringify(selectedItems)} />
      <input type="hidden" name="customer_id" value={customerMode === "existing" ? customerId : ""} />
      <input
        type="hidden"
        name="quote_date"
        value={quotation?.quote_date || new Date().toISOString().slice(0, 10)}
      />
      <input
        type="hidden"
        name="validity_days"
        value={quotation?.validity_days || settings.default_validity_days}
      />
      <input type="hidden" name="gst_mode" value={gstMode} />
      <input
        type="hidden"
        name="prepared_by"
        value={quotation?.prepared_by || settings.authorized_person_name}
      />
      <input type="hidden" name="status" value={quotation?.status || "Draft"} />
      <input type="hidden" name="terms" value={quotation?.terms || settings.default_terms} />
      <input
        type="hidden"
        name="warranty_note"
        value={quotation?.warranty_note || settings.default_warranty}
      />
      <input
        type="hidden"
        name="delivery_note"
        value={quotation?.delivery_note || settings.default_delivery}
      />
      <input
        type="hidden"
        name="transportation_note"
        value={quotation?.transportation_note || settings.default_transportation}
      />
      <input
        type="hidden"
        name="payment_terms"
        value={quotation?.payment_terms || settings.default_payment_terms}
      />
      <input
        type="hidden"
        name="after_sales_support"
        value={quotation?.after_sales_support || settings.default_after_sales_support}
      />

      <section className="panel min-w-0 p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-black text-slate-950">Customer Details</h2>
          <div className="flex overflow-hidden rounded-md border border-line">
            <button
              type="button"
              onClick={() => setCustomerMode("existing")}
              className={`px-3 py-2 text-sm font-semibold ${
                customerMode === "existing" ? "bg-mist text-ink" : "bg-white text-slate-700"
              }`}
            >
              Existing
            </button>
            <button
              type="button"
              onClick={() => setCustomerMode("new")}
              className={`px-3 py-2 text-sm font-semibold ${
                customerMode === "new" ? "bg-mist text-ink" : "bg-white text-slate-700"
              }`}
            >
              New
            </button>
          </div>
        </div>

        {customerMode === "existing" ? (
          <label>
            <span className="field-label">Select Customer</span>
            <select
              className="field-input"
              value={customerId}
              onChange={(event) => setCustomerId(event.target.value)}
              required
            >
              <option value="">Select customer</option>
              {customerId && !hasSelectedCustomer ? (
                <option value={customerId}>
                  {formatCustomerName(snapshot)} - {snapshot?.phone || "Saved customer"}
                </option>
              ) : null}
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {formatCustomerName(customer)} - {customer.phone}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <label>
              <span className="field-label">Phone</span>
              <input
                className="field-input"
                name="new_phone"
                defaultValue={snapshot?.phone || ""}
                required={customerMode === "new"}
              />
            </label>
            <label>
              <span className="field-label">Suffix</span>
              <select className="field-input" name="new_suffix" defaultValue={snapshot?.suffix || ""}>
                <option value="">Select suffix</option>
                {customerSuffixOptions.map((suffix) => (
                  <option key={suffix} value={suffix}>
                    {suffix}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="field-label">Customer Name</span>
              <input
                className="field-input"
                name="new_customer_name"
                defaultValue={snapshot?.customer_name || ""}
                required={customerMode === "new"}
              />
            </label>
            <label>
              <span className="field-label">Alternate Phone Number</span>
              <input
                className="field-input"
                name="new_alternate_phone"
                defaultValue={snapshot?.alternate_phone || ""}
              />
            </label>
            <label>
              <span className="field-label">Email</span>
              <input
                className="field-input"
                name="new_email"
                type="email"
                defaultValue={snapshot?.email || ""}
              />
            </label>
            <StateCitySelects
              stateName="new_state"
              cityName="new_city"
              defaultState={snapshot?.state || ""}
              defaultCity={snapshot?.city || ""}
            />
            <label>
              <span className="field-label">Pin Code</span>
              <input className="field-input" name="new_pincode" defaultValue={snapshot?.pincode || ""} />
            </label>
            <label className="md:col-span-2">
              <span className="field-label">Address</span>
              <textarea
                className="field-input min-h-20"
                name="new_address"
                defaultValue={snapshot?.address || ""}
              />
            </label>
            <label>
              <span className="field-label">GST Number</span>
              <input className="field-input" name="new_gst_number" defaultValue={snapshot?.gst_number || ""} />
            </label>
            <label className="md:col-span-2">
              <span className="field-label">Notes</span>
              <textarea
                className="field-input min-h-20"
                name="new_notes"
                defaultValue={snapshot?.notes || ""}
              />
            </label>
          </div>
        )}
      </section>

      <section className="min-w-0 rounded-sm border border-line bg-white">
        <div className="hidden min-w-0 lg:block">
        <div className="max-w-full overflow-x-auto pb-64">
          <table className="w-full min-w-[1420px] border-collapse">
            <thead>
              <tr className="bg-mist text-xs font-black text-ink">
                <th className="px-4 py-3 text-center">#</th>
                <th className="px-4 py-3 text-center">Model No</th>
                <th className="px-4 py-3 text-center">Image</th>
                <th className="px-4 py-3 text-center">Unit Price</th>
                <th className="px-4 py-3 text-center">Discount (%)</th>
                <th className="px-4 py-3 text-center">Special Price</th>
                <th className="px-4 py-3 text-center">GST</th>
                <th className="px-4 py-3 text-center">Quantity</th>
                <th className="px-4 py-3 text-center">Total Amount</th>
                <th className="sticky right-0 z-20 w-32 bg-mist px-4 py-3 text-center shadow-[-8px_0_16px_rgba(36,50,58,0.08)]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.product_id || "empty"}-${index}`} className="border-b border-line bg-panel">
                  <td className="w-14 px-4 py-3 text-center text-xs font-black text-black">
                    {index + 1}
                  </td>
                  <td className="w-[300px] px-4 py-3">
                    <ProductDropdown
                      item={item}
                      products={products}
                      search={productSearches[index] || ""}
                      isOpen={openProductRow === index}
                      onToggle={() => setOpenProductRow(openProductRow === index ? null : index)}
                      onSearchChange={(value) =>
                        setProductSearches((current) => ({ ...current, [index]: value }))
                      }
                      onSelect={(product) => selectProduct(index, product)}
                      onClear={() => clearProduct(index)}
                    />
                  </td>
                  <td className="w-20 px-4 py-3 text-center">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name || "Product image"}
                        width={56}
                        height={48}
                        className="mx-auto h-12 w-14 object-contain"
                      />
                    ) : (
                      <div className="mx-auto flex h-12 w-14 items-center justify-center bg-white text-[10px] font-bold text-slate-400">
                        Image
                      </div>
                    )}
                  </td>
                  <td className="w-32 px-4 py-3">
                    <input
                      className="h-10 w-full rounded-md border border-slate-300 bg-slate-200 px-3 text-xs text-slate-900"
                      type="number"
                      min="0"
                      value={item.product_name ? item.unit_price : ""}
                      disabled
                      readOnly
                    />
                  </td>
                  <td className="w-36 px-4 py-3">
                    <input
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      value={getDiscountPercent(item)}
                      onChange={(event) => updateDiscount(index, event.target.value)}
                    />
                  </td>
                  <td className="w-60 px-4 py-3">
                    <input
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.product_name ? item.special_price : ""}
                      onChange={(event) =>
                        updateItem(index, { special_price: Math.max(0, Number(event.target.value || 0)) })
                      }
                    />
                  </td>
                  <td className="w-24 px-4 py-3 text-center text-xs font-black text-black">
                    {item.product_name ? `${formatAmount(item.gst_percent)}%` : ""}
                  </td>
                  <td className="w-32 px-4 py-3">
                    <input
                      className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
                      type="number"
                      min="1"
                      step="1"
                      value={item.qty}
                      onChange={(event) =>
                        updateItem(index, { qty: Math.max(1, Number(event.target.value || 1)) })
                      }
                    />
                  </td>
                  <td className="w-60 px-4 py-3">
                    <input
                      className="h-10 w-full rounded-md border border-slate-300 bg-slate-200 px-3 text-xs text-slate-900"
                      value={item.product_name ? formatAmount(getLineTotal(item)) : ""}
                      disabled
                      readOnly
                    />
                  </td>
                  <td className="sticky right-0 w-32 bg-panel px-4 py-3 text-center shadow-[-8px_0_16px_rgba(36,50,58,0.08)]">
                    <button
                      type="button"
                      onClick={() => removeItem(index)}
                      className="btn-danger h-9 px-3"
                      aria-label="Delete product row"
                      title="Delete product row"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {!items.length ? (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm font-semibold text-slate-500">
                    Click + to add a product row.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <div className="grid gap-4 border-t border-line bg-white px-5 py-3 lg:grid-cols-[1fr_420px]">
            <div>
              <button
                type="button"
                onClick={addEmptyProductRow}
                className="inline-flex h-8 min-w-10 items-center justify-center rounded-md bg-mist px-3 text-ink transition hover:bg-cloud"
                aria-label="Add product row"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <TotalsPanel totals={calculated.totals} />
          </div>
        </div>
        </div>

        <div className="grid min-w-0 gap-4 p-4 lg:hidden">
          {items.map((item, index) => (
            <div
              key={`${item.product_id || "empty-mobile"}-${index}`}
              className="rounded-md border border-line bg-panel p-3"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-mist text-xs font-black text-ink">
                  {index + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <span className="field-label">Model No</span>
                  <ProductDropdown
                    item={item}
                    products={products}
                    search={productSearches[index] || ""}
                    isOpen={openProductRow === index}
                    onToggle={() => setOpenProductRow(openProductRow === index ? null : index)}
                    onSearchChange={(value) =>
                      setProductSearches((current) => ({ ...current, [index]: value }))
                    }
                    onSelect={(product) => selectProduct(index, product)}
                    onClear={() => clearProduct(index)}
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="btn-danger h-10 shrink-0 px-3"
                  aria-label="Delete product row"
                  title="Delete product row"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="mt-4 flex items-center gap-3">
                {item.image_url ? (
                  <Image
                    src={item.image_url}
                    alt={item.product_name || "Product image"}
                    width={64}
                    height={56}
                    className="h-14 w-16 shrink-0 rounded-md border border-line bg-white object-contain"
                  />
                ) : (
                  <div className="flex h-14 w-16 shrink-0 items-center justify-center rounded-md border border-line bg-white text-[10px] font-bold text-slate-400">
                    Image
                  </div>
                )}
                <div className="min-w-0 text-xs text-slate-500">
                  <div className="truncate font-black text-slate-950">
                    {item.product_name || "Select a product"}
                  </div>
                  {item.sku ? <div className="truncate">{item.sku}</div> : null}
                </div>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label>
                  <span className="field-label">Unit Price</span>
                  <input
                    className="h-10 w-full rounded-md border border-slate-300 bg-slate-200 px-3 text-xs text-slate-900"
                    type="number"
                    min="0"
                    value={item.product_name ? item.unit_price : ""}
                    disabled
                    readOnly
                  />
                </label>
                <label>
                  <span className="field-label">Discount (%)</span>
                  <input
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
                    type="number"
                    min="0"
                    max="100"
                    step="0.01"
                    value={getDiscountPercent(item)}
                    onChange={(event) => updateDiscount(index, event.target.value)}
                  />
                </label>
                <label>
                  <span className="field-label">Special Price</span>
                  <input
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.product_name ? item.special_price : ""}
                    onChange={(event) =>
                      updateItem(index, { special_price: Math.max(0, Number(event.target.value || 0)) })
                    }
                  />
                </label>
                <label>
                  <span className="field-label">Quantity</span>
                  <input
                    className="h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-xs text-slate-900 outline-none focus:border-gold focus:ring-2 focus:ring-gold/25"
                    type="number"
                    min="1"
                    step="1"
                    value={item.qty}
                    onChange={(event) =>
                      updateItem(index, { qty: Math.max(1, Number(event.target.value || 1)) })
                    }
                  />
                </label>
                <label>
                  <span className="field-label">GST</span>
                  <input
                    className="h-10 w-full rounded-md border border-slate-300 bg-slate-200 px-3 text-xs font-black text-slate-900"
                    value={item.product_name ? `${formatAmount(item.gst_percent)}%` : ""}
                    readOnly
                  />
                </label>
                <label>
                  <span className="field-label">Total Amount</span>
                  <input
                    className="h-10 w-full rounded-md border border-slate-300 bg-slate-200 px-3 text-xs text-slate-900"
                    value={item.product_name ? formatAmount(getLineTotal(item)) : ""}
                    readOnly
                  />
                </label>
              </div>
            </div>
          ))}

          {!items.length ? (
            <div className="rounded-md border border-dashed border-line bg-panel px-4 py-8 text-center text-sm font-semibold text-slate-500">
              Click + to add a product row.
            </div>
          ) : null}

          <button
            type="button"
            onClick={addEmptyProductRow}
            className="inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-mist px-3 text-sm font-black text-ink transition hover:bg-cloud"
            aria-label="Add product row"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </button>

          <TotalsPanel totals={calculated.totals} className="rounded-md border border-line bg-white p-4" />
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,650px)_1fr]">
        <div className="min-w-0">
          <h2 className="mb-4 text-xl font-black text-slate-950">Summary of GST</h2>
          <div className="max-w-full overflow-x-auto">
            <table className="w-full min-w-[620px] border-collapse bg-white text-xs">
              <thead>
                <tr className="bg-mist text-ink">
                  <th className="px-4 py-3 text-center">GST Rate</th>
                  <th className="px-4 py-3 text-center">Taxable Value</th>
                  <th className="px-4 py-3 text-center">CGST</th>
                  <th className="px-4 py-3 text-center">SGST</th>
                  <th className="px-4 py-3 text-center">IGST</th>
                </tr>
              </thead>
              <tbody>
                {(gstSummaryRows.length
                  ? gstSummaryRows
                  : [
                      {
                        rate: defaultGstPercent,
                        taxable: 0,
                        cgst: 0,
                        sgst: 0,
                        igst: 0
                      }
                    ]
                ).map((row) => (
                  <tr key={row.rate} className="bg-panel text-center font-black text-ink">
                    <td className="px-4 py-3">{formatAmount(row.rate)}%</td>
                    <td className="px-4 py-3">{formatTaxAmount(row.taxable)}</td>
                    <td className="px-4 py-3">{formatTaxAmount(row.cgst)}</td>
                    <td className="px-4 py-3">{formatTaxAmount(row.sgst)}</td>
                    <td className="px-4 py-3">{formatTaxAmount(row.igst)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div className="flex justify-end">
        <SubmitButton
          disabled={!selectedItems.length}
          pendingLabel={quotation ? "Updating..." : "Creating..."}
          className="inline-flex min-w-40 items-center justify-center rounded-full border border-mist bg-mist px-8 py-3 text-xs font-black text-ink shadow-sm transition hover:bg-cloud disabled:cursor-not-allowed disabled:opacity-60"
        >
          {quotation ? "Update Quotation" : "Create Quotation"}
        </SubmitButton>
      </div>
    </form>
  );
}
