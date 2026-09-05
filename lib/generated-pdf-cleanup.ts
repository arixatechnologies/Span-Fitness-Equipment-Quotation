const PDF_BUCKET = "quotation-pdfs";
const DAY_MS = 24 * 60 * 60 * 1000;
const PAGE_SIZE = 1000;

type PdfFileRow = {
  id: string;
  quotation_id: string;
  storage_path: string | null;
  created_at: string;
};

type CleanupClient = {
  from: (table: string) => any;
  storage: {
    from: (bucket: string) => any;
  };
};

function batch<T>(items: T[], size: number) {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

async function fetchPdfFileRows(supabase: CleanupClient) {
  const rows: PdfFileRow[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from("pdf_files")
      .select("id, quotation_id, storage_path, created_at")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1);

    if (error) throw new Error(error.message);

    const page = (data || []) as PdfFileRow[];
    rows.push(...page);

    if (page.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  return rows;
}

export async function cleanupOldGeneratedPdfs(
  supabase: CleanupClient,
  retentionDays = 5
) {
  const cutoffTime = Date.now() - retentionDays * DAY_MS;
  const rows = await fetchPdfFileRows(supabase);
  const latestByPath = new Map<string, PdfFileRow>();

  for (const row of rows) {
    const path = row.storage_path?.trim();

    if (path && !latestByPath.has(path)) {
      latestByPath.set(path, row);
    }
  }

  const expiredPaths = Array.from(latestByPath.entries())
    .filter(([, row]) => new Date(row.created_at).getTime() < cutoffTime)
    .map(([path]) => path);

  if (!expiredPaths.length) {
    return {
      retentionDays,
      scannedPdfRows: rows.length,
      deletedPdfFiles: 0,
      clearedQuotationLinks: 0,
      deletedPdfMetadataRows: 0
    };
  }

  let deletedPdfFiles = 0;
  let clearedQuotationLinks = 0;
  let deletedPdfMetadataRows = 0;

  for (const paths of batch(expiredPaths, 100)) {
    const { error } = await supabase.storage.from(PDF_BUCKET).remove(paths);

    if (error) throw new Error(error.message);
    deletedPdfFiles += paths.length;
  }

  for (const paths of batch(expiredPaths, 100)) {
    const { data, error } = await supabase
      .from("quotations")
      .update({ pdf_path: null, pdf_url: null })
      .in("pdf_path", paths)
      .select("id");

    if (error) throw new Error(error.message);
    clearedQuotationLinks += data?.length || 0;
  }

  for (const paths of batch(expiredPaths, 100)) {
    const { data, error } = await supabase
      .from("pdf_files")
      .delete()
      .in("storage_path", paths)
      .select("id");

    if (error) throw new Error(error.message);
    deletedPdfMetadataRows += data?.length || 0;
  }

  return {
    retentionDays,
    scannedPdfRows: rows.length,
    deletedPdfFiles,
    clearedQuotationLinks,
    deletedPdfMetadataRows
  };
}
