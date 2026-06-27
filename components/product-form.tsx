import Link from "next/link";
import { saveProductAction } from "@/app/actions/products";
import { ProductImageInput } from "@/components/product-image-input";
import { SubmitButton } from "@/components/submit-button";
import type { Brand, Product } from "@/lib/types";

type ProductFormProps = {
  product?: Product;
  brands: Brand[];
};

export function ProductForm({ product, brands }: ProductFormProps) {
  return (
    <form action={saveProductAction} className="panel p-5">
      <input type="hidden" name="id" value={product?.id || ""} />
      <input type="hidden" name="gst_percent" value={product?.gst_percent || 18} />
      <input type="hidden" name="status" value={product?.status || "active"} />
      <input type="hidden" name="category_id" value={product?.category_id || ""} />
      <input type="hidden" name="sub_category_id" value={product?.sub_category_id || ""} />
      <input
        type="hidden"
        name="stock_availability"
        value={product?.stock_availability || "Available"}
      />
      <input
        type="hidden"
        name="technical_specifications"
        value={product?.technical_specifications || ""}
      />
      <input type="hidden" name="dimensions" value={product?.dimensions || ""} />
      <input type="hidden" name="machine_weight" value={product?.machine_weight || ""} />
      <input type="hidden" name="stack_weight" value={product?.stack_weight || ""} />
      <input type="hidden" name="warranty_note" value={product?.warranty_note || ""} />

      <div className="grid gap-4 md:grid-cols-2">
        <label>
          <span className="field-label">Product ID</span>
          <input className="field-input" name="sku" defaultValue={product?.sku} required />
        </label>
        <label>
          <span className="field-label">Product Name</span>
          <input
            className="field-input"
            name="product_name"
            defaultValue={product?.product_name}
            required
          />
        </label>
        <label>
          <span className="field-label">Brand</span>
          <select className="field-input" name="brand_id" defaultValue={product?.brand_id || ""}>
            <option value="">Select brand</option>
            {brands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="field-label">Unit Price</span>
          <input
            className="field-input"
            name="unit_price"
            type="number"
            min="0"
            step="0.01"
            defaultValue={product?.unit_price || 0}
            required
          />
        </label>
        <ProductImageInput existingImageUrl={product?.image_url} />
        <label className="md:col-span-2">
          <span className="field-label">Description</span>
          <textarea
            className="field-input min-h-40"
            name="description"
            defaultValue={product?.description || ""}
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/products" className="btn-secondary w-full sm:w-auto">
          Cancel
        </Link>
        <SubmitButton pendingLabel="Saving..." className="btn-primary w-full sm:w-auto">
          Save Product
        </SubmitButton>
      </div>
    </form>
  );
}
