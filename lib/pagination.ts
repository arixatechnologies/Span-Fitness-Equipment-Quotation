export const LIST_PAGE_SIZE = 50;

export type ListSearchParams = Record<string, string | string[] | undefined>;

export function getPageNumber(value: string | string[] | undefined) {
  const raw = Array.isArray(value) ? value[0] : value;
  const page = Number.parseInt(raw || "1", 10);

  return Number.isFinite(page) && page > 0 ? page : 1;
}

export function buildPageHref(
  pathname: string,
  params: Record<string, string | undefined>,
  page: number
) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });

  if (page > 1) search.set("page", String(page));

  const query = search.toString();
  return query ? `${pathname}?${query}` : pathname;
}
