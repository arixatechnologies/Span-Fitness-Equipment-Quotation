import Link from "next/link";
import { ImportProducts } from "@/components/import-products";

export default function ProductImportPage() {
  return (
    <div className="grid gap-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-950">Import Products</h1>
          <p className="text-sm text-slate-500">
            Upload CSV or Excel, map columns, preview errors, and import after validation.
          </p>
        </div>
        <Link href="/products" className="btn-secondary">
          Back to Products
        </Link>
      </div>
      <ImportProducts />
    </div>
  );
}
