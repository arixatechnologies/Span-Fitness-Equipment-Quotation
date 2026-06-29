import { NextResponse } from "next/server";
import { getQuotationWithItems, logActivity } from "@/lib/data";
import { formatCustomerName, quotationDownloadBaseName } from "@/lib/format";
import { createQuotationExcel } from "@/lib/quotation-excel";
import { requireUser } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  try {
    const { supabase, user } = await requireUser();
    const { quotation, items } = await getQuotationWithItems(supabase, id);
    const customer = quotation.customer_snapshot as Partial<Customer>;
    const filename = `${quotationDownloadBaseName(
      formatCustomerName(customer),
      quotation.quote_number
    )}.xlsx`;
    const workbook = await createQuotationExcel(quotation, items);
    const path = `quotations/${quotation.id}/${filename}`;
    const { error: uploadError } = await supabase.storage
      .from("quotation-excels")
      .upload(path, workbook, {
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        upsert: true
      });

    if (uploadError) throw new Error(uploadError.message);

    const { data: signed, error: signedError } = await supabase.storage
      .from("quotation-excels")
      .createSignedUrl(path, 60 * 60, { download: filename });

    if (signedError || !signed?.signedUrl) {
      throw new Error(signedError?.message || "Unable to create Excel download link");
    }

    const { error: updateError } = await supabase
      .from("quotations")
      .update({ excel_path: path })
      .eq("id", quotation.id);

    if (updateError) throw new Error(updateError.message);

    if (quotation.excel_path && quotation.excel_path !== path) {
      await supabase.storage.from("quotation-excels").remove([quotation.excel_path]);
    }

    await logActivity(supabase, {
      userId: user.id,
      action: "Quotation Excel downloaded",
      entityType: "quotation",
      entityId: quotation.id
    });

    return NextResponse.json({ url: signed.signedUrl, filename });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to download Excel" },
      { status: 500 }
    );
  }
}
