import { NextResponse } from "next/server";
import { getQuotationWithItems, logActivity } from "@/lib/data";
import { formatCustomerName, quotationDownloadBaseName } from "@/lib/format";
import { createQuotationExcel } from "@/lib/quotation-excel";
import { requireUser } from "@/lib/supabase/server";
import type { Customer } from "@/lib/types";

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
    const workbook = createQuotationExcel(quotation, items);

    await logActivity(supabase, {
      userId: user.id,
      action: "Quotation Excel downloaded",
      entityType: "quotation",
      entityId: quotation.id
    });

    return new NextResponse(new Uint8Array(workbook), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to download Excel" },
      { status: 500 }
    );
  }
}
