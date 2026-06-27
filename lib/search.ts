export type SearchParamValue = string | string[] | undefined;

export function getSearchText(value: SearchParamValue) {
  const raw = Array.isArray(value) ? value[0] || "" : value || "";

  return raw
    .trim()
    .replace(/[%,()]/g, " ")
    .replace(/\s+/g, " ");
}
