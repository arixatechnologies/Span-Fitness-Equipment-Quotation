"use client";

import Link from "next/link";
import { AlertTriangle, Check, Edit, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  bulkSoftDeleteProductsAction,
  softDeleteProductAction
} from "@/app/actions/products";
import { ProductImage } from "@/components/product-image";
import { SubmitButton } from "@/components/submit-button";
import { formatCurrency } from "@/lib/format";
import type { Product } from "@/lib/types";

type DeleteRequest =
  | { kind: "single"; id: string; name: string }
  | { kind: "bulk"; ids: string[] };

export function ProductsList({ products }: { products: Product[] }) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleteRequest, setDeleteRequest] = useState<DeleteRequest | null>(null);
  const allSelected = products.length > 0 && selectedIds.size === products.length;

  function toggleProduct(id: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelectedIds(new Set(products.map((product) => product.id)));
  }

  function cancelSelection() {
    setSelectedIds(new Set());
    setSelectionMode(false);
  }

  function requestBulkDelete() {
    if (!selectedIds.size) return;
    setDeleteRequest({ kind: "bulk", ids: Array.from(selectedIds) });
  }

  async function confirmDelete(formData: FormData) {
    if (!deleteRequest) return;

    if (deleteRequest.kind === "single") {
      await softDeleteProductAction(formData);
      setSelectedIds((current) => {
        const next = new Set(current);
        next.delete(deleteRequest.id);
        return next;
      });
    } else {
      await bulkSoftDeleteProductsAction(formData);
      setSelectedIds(new Set());
      setSelectionMode(false);
    }

    setDeleteRequest(null);
  }

  const deleteCount = deleteRequest?.kind === "bulk" ? deleteRequest.ids.length : 1;

  return (
    <>
      <section className="panel overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line bg-white px-4 py-3">
          {selectionMode ? (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={toggleAll}
                  disabled={allSelected}
                >
                  <Check className="h-4 w-4" aria-hidden="true" />
                  Select All
                </button>
                <button type="button" className="btn-muted" onClick={cancelSelection}>
                  <X className="h-4 w-4" aria-hidden="true" />
                  Cancel
                </button>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-3">
                <span className="text-sm text-slate-500">
                  {selectedIds.size
                    ? `${selectedIds.size} product${selectedIds.size === 1 ? "" : "s"} selected`
                    : "Select products to delete"}
                </span>
                <button
                  type="button"
                  className="btn-danger min-w-[148px]"
                  disabled={!selectedIds.size}
                  onClick={requestBulkDelete}
                >
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete Selected
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setSelectionMode(true)}
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              Select
            </button>
          )}
        </div>

        <div className="grid gap-3 p-3 md:hidden">
          {products.map((product) => {
            const isSelected = selectedIds.has(product.id);

            return (
              <div
                key={product.id}
                className={`rounded-md border bg-white p-3 transition ${
                  isSelected ? "border-mist ring-2 ring-mist/30" : "border-line"
                }`}
              >
                {selectionMode ? (
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleProduct(product.id)}
                        className="h-4 w-4 rounded border-line accent-[#93B5C6]"
                        aria-label={`Select ${product.product_name}`}
                      />
                      Select
                    </label>
                    {isSelected ? (
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-600">
                        <Check className="h-3.5 w-3.5" aria-hidden="true" />
                        Selected
                      </span>
                    ) : null}
                  </div>
                ) : null}
                <div className="flex gap-3">
                  <ProductImage
                    src={product.image_url}
                    alt={product.product_name}
                    className="h-16 w-16 shrink-0 rounded-md border border-line object-contain"
                    fallbackClassName="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-xs font-black text-navy"
                    fallbackLabel="SFE"
                  />
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/products/${product.id}/edit`}
                      className="block truncate font-black text-slate-950 hover:text-navy"
                    >
                      {product.product_name}
                    </Link>
                    <div className="mt-1 text-xs text-slate-500">{product.sku}</div>
                    <div className="mt-2 text-sm text-slate-600">{product.brand?.name || "-"}</div>
                    <div className="mt-1 font-black text-navy">{formatCurrency(product.unit_price)}</div>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Link href={`/products/${product.id}/edit`} className="btn-secondary w-full px-3">
                    <Edit className="h-4 w-4" aria-hidden="true" />
                    Edit
                  </Link>
                  <button
                    className="btn-danger w-full px-3"
                    type="button"
                    onClick={() =>
                      setDeleteRequest({
                        kind: "single",
                        id: product.id,
                        name: product.product_name
                      })
                    }
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px]">
            <thead className="table-head">
              <tr>
                {selectionMode ? <th className="w-14 px-4 py-3 text-center">Select</th> : null}
                <th className="px-4 py-3">Product</th>
                <th className="px-4 py-3">Brand</th>
                <th className="px-4 py-3 text-right">Unit Price</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => {
                const isSelected = selectedIds.has(product.id);

                return (
                  <tr key={product.id} className={isSelected ? "bg-blush/60" : undefined}>
                    {selectionMode ? (
                      <td className="table-cell text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleProduct(product.id)}
                          className="h-4 w-4 rounded border-line accent-[#93B5C6]"
                          aria-label={`Select ${product.product_name}`}
                        />
                      </td>
                    ) : null}
                    <td className="table-cell">
                      <div className="flex items-center gap-3">
                        <ProductImage
                          src={product.image_url}
                          alt={product.product_name}
                          className="h-16 w-16 shrink-0 rounded-md border border-line object-contain"
                          fallbackClassName="flex h-16 w-16 shrink-0 items-center justify-center rounded-md border border-line bg-panel text-xs font-black text-navy"
                          fallbackLabel="SFE"
                        />
                        <div>
                          <Link
                            href={`/products/${product.id}/edit`}
                            className="font-black text-slate-950 hover:text-navy"
                          >
                            {product.product_name}
                          </Link>
                          <div className="text-xs text-slate-500">{product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="table-cell">{product.brand?.name || "-"}</td>
                    <td className="table-cell text-right font-semibold">
                      {formatCurrency(product.unit_price)}
                    </td>
                    <td className="table-cell">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/products/${product.id}/edit`}
                          className="btn-secondary px-3"
                          aria-label={`Edit ${product.product_name}`}
                          title="Edit product"
                        >
                          <Edit className="h-4 w-4" aria-hidden="true" />
                        </Link>
                        <button
                          className="btn-danger px-3"
                          type="button"
                          aria-label={`Delete ${product.product_name}`}
                          title="Delete product"
                          onClick={() =>
                            setDeleteRequest({
                              kind: "single",
                              id: product.id,
                              name: product.product_name
                            })
                          }
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {deleteRequest ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setDeleteRequest(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-lg border border-line bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-products-title"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-700">
                  <AlertTriangle className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="delete-products-title" className="text-lg font-black text-slate-950">
                    {deleteRequest.kind === "single"
                      ? "Delete this product?"
                      : `Delete ${deleteCount} selected products?`}
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {deleteRequest.kind === "single"
                      ? `"${deleteRequest.name}" will be removed from the active product list.`
                      : "The selected products will be removed from the active product list."}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-md p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-900"
                onClick={() => setDeleteRequest(null)}
                aria-label="Close delete confirmation"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className="btn-secondary"
                onClick={() => setDeleteRequest(null)}
              >
                Cancel
              </button>
              <form action={confirmDelete}>
                {deleteRequest.kind === "single" ? (
                  <input type="hidden" name="id" value={deleteRequest.id} />
                ) : (
                  <input type="hidden" name="ids" value={JSON.stringify(deleteRequest.ids)} />
                )}
                <SubmitButton className="btn-danger" pendingLabel="Deleting...">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                  Delete
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
