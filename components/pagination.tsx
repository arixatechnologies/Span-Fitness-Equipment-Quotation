import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { buildPageHref } from "@/lib/pagination";

type PaginationProps = {
  pathname: string;
  currentPage: number;
  pageSize: number;
  totalItems: number;
  query?: Record<string, string | undefined>;
};

type PageItem = number | "start-ellipsis" | "end-ellipsis";

function visiblePages(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "end-ellipsis", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [
      1,
      "start-ellipsis",
      totalPages - 4,
      totalPages - 3,
      totalPages - 2,
      totalPages - 1,
      totalPages
    ];
  }

  return [
    1,
    "start-ellipsis",
    currentPage - 2,
    currentPage - 1,
    currentPage,
    currentPage + 1,
    currentPage + 2,
    "end-ellipsis",
    totalPages
  ];
}

export function Pagination({
  pathname,
  currentPage,
  pageSize,
  totalItems,
  query = {}
}: PaginationProps) {
  if (totalItems === 0) return null;

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = (currentPage - 1) * pageSize + 1;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const pages = visiblePages(currentPage, totalPages);

  return (
    <nav
      className="panel flex flex-col gap-3 bg-white px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
      aria-label="Pagination"
    >
      <p className="text-sm font-semibold text-slate-600">
        Showing {firstItem}-{lastItem} of {totalItems}
      </p>

      {totalPages > 1 ? (
        <div className="flex flex-wrap items-center gap-1">
          {currentPage > 1 ? (
            <Link
              href={buildPageHref(pathname, query, currentPage - 1)}
              className="btn-secondary min-h-10 px-3"
              aria-label="Previous page"
            >
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
            </Link>
          ) : (
            <span className="btn-secondary min-h-10 cursor-not-allowed px-3 opacity-50">
              <ChevronLeft className="h-4 w-4" aria-hidden="true" />
              <span className="hidden sm:inline">Previous</span>
            </span>
          )}

          {pages.map((page) =>
            typeof page === "number" ? (
              <Link
                key={page}
                href={buildPageHref(pathname, query, page)}
                className={
                  page === currentPage
                    ? "btn-primary h-10 min-w-10 px-3"
                    : "btn-secondary h-10 min-w-10 px-3"
                }
                aria-current={page === currentPage ? "page" : undefined}
                aria-label={`Page ${page}`}
              >
                {page}
              </Link>
            ) : (
              <span
                key={page}
                className="inline-flex h-10 min-w-7 items-center justify-center px-1 font-bold text-slate-500"
                aria-hidden="true"
              >
                ...
              </span>
            )
          )}

          {currentPage < totalPages ? (
            <Link
              href={buildPageHref(pathname, query, currentPage + 1)}
              className="btn-secondary min-h-10 px-3"
              aria-label="Next page"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          ) : (
            <span className="btn-secondary min-h-10 cursor-not-allowed px-3 opacity-50">
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          )}
        </div>
      ) : null}
    </nav>
  );
}
