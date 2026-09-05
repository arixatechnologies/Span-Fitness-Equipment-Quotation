import { NextResponse } from "next/server";
import { cleanupOldGeneratedPdfs } from "@/lib/generated-pdf-cleanup";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const maxDuration = 60;

function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export async function GET(request: Request) {
  const cronSecret = process.env.CRON_SECRET;

  if (process.env.NODE_ENV === "production") {
    if (!cronSecret) {
      return NextResponse.json(
        { error: "CRON_SECRET is not configured." },
        { status: 500 }
      );
    }

    if (request.headers.get("authorization") !== `Bearer ${cronSecret}`) {
      return unauthorized();
    }
  } else if (
    cronSecret &&
    request.headers.get("authorization") !== `Bearer ${cronSecret}`
  ) {
    return unauthorized();
  }

  try {
    const supabase = createSupabaseAdminClient();
    const result = await cleanupOldGeneratedPdfs(supabase, 5);

    return NextResponse.json({
      ok: true,
      ...result
    });
  } catch (error) {
    console.error("Generated PDF cleanup failed", error);

    return NextResponse.json(
      {
        ok: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to cleanup generated PDFs."
      },
      { status: 500 }
    );
  }
}
