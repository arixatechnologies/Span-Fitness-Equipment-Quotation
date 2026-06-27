"use client";

import { useMemo, useState, useTransition } from "react";
import { Loader2, Upload } from "lucide-react";
import readXlsxFile from "read-excel-file";
import { bulkImportProducts } from "@/app/actions/products";

const fieldLabels = {
  sku: "SKU",
  product_name: "Product Name",
  brand: "Brand",
  description: "Description",
  unit_price: "Unit Price",
  image_url: "Image URL or Filename"
};

const requiredFields = ["sku", "product_name", "unit_price"];

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function guessField(header: string) {
  const normalized = normalizeHeader(header);
  const guesses: Record<string, string[]> = {
    sku: ["sku", "productid", "code"],
    product_name: ["productname", "name", "itemname"],
    brand: ["brand", "brandname"],
    description: ["description", "desc"],
    unit_price: ["unitprice", "listprice", "mrp"],
    image_url: ["imageurl", "imagefilename", "image"]
  };

  return Object.entries(guesses).find(([, names]) => names.includes(normalized))?.[0] || "";
}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      index += 1;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else {
      cell += char;
    }
  }

  row.push(cell);
  rows.push(row);

  const [headers = [], ...body] = rows.filter((line) => line.some((value) => value.trim()));
  return body.map((line) => {
    const record: Record<string, unknown> = {};
    headers.forEach((header, index) => {
      record[header] = line[index] ?? "";
    });
    return record;
  });
}

export function ImportProducts() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"success" | "error">("success");
  const [isPending, startTransition] = useTransition();

  const mappedRows = useMemo(() => {
    return rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      Object.entries(mapping).forEach(([field, header]) => {
        mapped[field] = row[header] ?? "";
      });
      return mapped;
    });
  }, [mapping, rows]);

  const errors = useMemo(() => {
    const issues: string[] = [];
    requiredFields.forEach((field) => {
      if (!mapping[field]) issues.push(`${fieldLabels[field as keyof typeof fieldLabels]} is required.`);
    });
    mappedRows.slice(0, 25).forEach((row, index) => {
      requiredFields.forEach((field) => {
        if (!row[field]) {
          issues.push(`Row ${index + 1}: ${fieldLabels[field as keyof typeof fieldLabels]} is missing.`);
        }
      });
    });
    return issues;
  }, [mappedRows, mapping]);

  async function onFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    let json: Record<string, unknown>[] = [];
    setMessage("");
    setMessageType("success");

    try {
      if (file.name.toLowerCase().endsWith(".csv")) {
        json = parseCsv(await file.text());
      } else {
        const sheetRows = await readXlsxFile(file);
        const [headerRow = [], ...bodyRows] = sheetRows;
        const sheetHeaders = headerRow.map((header) => String(header || ""));
        json = bodyRows.map((row) => {
          const record: Record<string, unknown> = {};
          sheetHeaders.forEach((header, index) => {
            record[header] = row[index] ?? "";
          });
          return record;
        });
      }
    } catch {
      setRows([]);
      setHeaders([]);
      setMapping({});
      setMessage("Unable to read this file. Please upload a valid CSV or Excel file.");
      setMessageType("error");
      return;
    }

    const nextHeaders = json.length ? Object.keys(json[0]) : [];
    const nextMapping: Record<string, string> = {};
    nextHeaders.forEach((header) => {
      const field = guessField(header);
      if (field) nextMapping[field] = header;
    });

    setRows(json);
    setHeaders(nextHeaders);
    setMapping(nextMapping);
    setMessage("");
    setMessageType("success");
  }

  function submitImport() {
    setMessage("");
    setMessageType("success");
    startTransition(async () => {
      try {
        const result = await bulkImportProducts(mappedRows);
        setMessage(result.message);
        setMessageType(result.ok ? "success" : "error");
      } catch {
        setMessage("Import failed. Please check the file and try again.");
        setMessageType("error");
      }
    });
  }

  return (
    <div className="grid gap-5">
      <div className="panel p-5">
        <label>
          <span className="field-label">Upload CSV or Excel file</span>
          <input
            className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-rose file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={onFile}
          />
        </label>
        {message && !rows.length ? (
          <div
            className={
              messageType === "success"
                ? "mt-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-700"
                : "mt-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            }
          >
            {message}
          </div>
        ) : null}
      </div>

      {rows.length ? (
        <>
          <div className="panel p-5">
            <h2 className="mb-4 text-base font-black text-slate-950">Column Mapping</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {Object.entries(fieldLabels).map(([field, label]) => (
                <label key={field}>
                  <span className="field-label">{label}</span>
                  <select
                    className="field-input"
                    value={mapping[field] || ""}
                    onChange={(event) =>
                      setMapping((current) => ({ ...current, [field]: event.target.value }))
                    }
                  >
                    <option value="">Do not import</option>
                    {headers.map((header) => (
                      <option key={header} value={header}>
                        {header}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </div>

          <div className="panel overflow-hidden">
            <div className="flex flex-col gap-3 border-b border-line px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-black text-slate-950">Import Preview</h2>
                <p className="text-sm text-slate-500">
                  Showing first 10 rows from {rows.length} uploaded rows.
                </p>
              </div>
              <button
                type="button"
                onClick={submitImport}
                disabled={isPending || errors.length > 0}
                aria-busy={isPending}
                className="btn-primary w-full sm:w-auto"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Upload className="h-4 w-4" />
                )}
                {isPending ? "Importing..." : "Confirm Import"}
              </button>
            </div>
            {errors.length ? (
              <div className="border-b border-red-200 bg-red-50 px-5 py-3 text-sm text-red-700">
                {errors.slice(0, 5).map((error) => (
                  <div key={error}>{error}</div>
                ))}
              </div>
            ) : null}
            {message ? (
              <div
                className={
                  messageType === "success"
                    ? "border-b border-line bg-emerald-50 px-5 py-3 text-sm font-semibold text-emerald-700"
                    : "border-b border-red-200 bg-red-50 px-5 py-3 text-sm font-semibold text-red-700"
                }
              >
                {message}
              </div>
            ) : null}
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead className="table-head">
                  <tr>
                    {Object.values(fieldLabels).slice(0, 8).map((label) => (
                      <th key={label} className="px-4 py-3">
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mappedRows.slice(0, 10).map((row, index) => (
                    <tr key={index}>
                      {Object.keys(fieldLabels)
                        .slice(0, 8)
                        .map((field) => (
                          <td key={field} className="table-cell">
                            {String(row[field] ?? "")}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
