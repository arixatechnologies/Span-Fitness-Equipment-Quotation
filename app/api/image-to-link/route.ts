import { NextResponse } from "next/server";
import { z } from "zod";
import { logActivity } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";

const conversionSchema = z.object({
  fileName: z.string().trim().min(1).max(200),
  key: z.string().trim().min(1).max(500),
  url: z.string().url().max(2000),
  size: z.coerce.number().int().min(1).max(25 * 1024 * 1024)
});

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const parsed = conversionSchema.parse(await request.json());
    const imageUrl = new URL(parsed.url);

    if (imageUrl.protocol !== "https:") {
      return NextResponse.json({ error: "Image URL must use HTTPS." }, { status: 400 });
    }

    await logActivity(supabase, {
      userId: user.id,
      action: "Image converted to link",
      entityType: "image",
      metadata: parsed
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to record image conversion." },
      { status: 400 }
    );
  }
}
