import { Download } from "lucide-react";

export function ProductsExportButton({ q, brand }: { q?: string; brand?: string }) {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (brand) params.set("brand", brand);
  const query = params.toString();

  return (
    <a
      href={`/api/products/export${query ? `?${query}` : ""}`}
      className="btn-secondary w-full sm:w-auto"
    >
      <Download className="h-4 w-4" />
      Export
    </a>
  );
}
