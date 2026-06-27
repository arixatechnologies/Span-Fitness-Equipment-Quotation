"use client";

import { Download } from "lucide-react";
import type { Product } from "@/lib/types";

export function ProductsExportButton({ products }: { products: Product[] }) {
  function exportCsv() {
    const headers = [
      "SKU",
      "Product Name",
      "Brand",
      "Description",
      "Unit Price",
      "Image URL"
    ];
    const rows = products.map((product) => [
      product.sku,
      product.product_name,
      product.brand?.name || "",
      product.description || "",
      product.unit_price,
      product.image_url || ""
    ]);
    const csv = [headers, ...rows]
      .map((row) =>
        row
          .map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "span-fitness-products.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button type="button" onClick={exportCsv} className="btn-secondary w-full sm:w-auto">
      <Download className="h-4 w-4" />
      Export
    </button>
  );
}
