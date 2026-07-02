import { NextResponse } from "next/server";
import { isSafeProductImageUrl } from "@/lib/product-image-url";
import { requireUser } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const MAX_PREVIEW_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const { id, itemId } = await params;
  const { supabase } = await requireUser();
  const { data: item, error } = await supabase
    .from("quotation_items")
    .select("image_url")
    .eq("id", itemId)
    .eq("quotation_id", id)
    .single();

  if (error || !item?.image_url || !isSafeProductImageUrl(item.image_url)) {
    return NextResponse.json({ error: "Product image not found" }, { status: 404 });
  }

  try {
    const response = await fetch(item.image_url, {
      cache: "no-store",
      signal: AbortSignal.timeout(10_000)
    });
    const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase() || "";
    const declaredSize = Number(response.headers.get("content-length") || 0);

    if (!response.ok || !ALLOWED_IMAGE_TYPES.has(contentType)) {
      return NextResponse.json({ error: "Unsupported product image" }, { status: 415 });
    }

    if (declaredSize > MAX_PREVIEW_IMAGE_BYTES) {
      return NextResponse.json({ error: "Product image is too large" }, { status: 413 });
    }

    const image = await response.arrayBuffer();
    if (image.byteLength > MAX_PREVIEW_IMAGE_BYTES) {
      return NextResponse.json({ error: "Product image is too large" }, { status: 413 });
    }

    return new NextResponse(image, {
      headers: {
        "Cache-Control": "private, max-age=3600",
        "Content-Type": contentType,
        "Content-Length": String(image.byteLength)
      }
    });
  } catch (error) {
    console.warn(`Unable to load quotation preview image ${itemId}`, error);
    return NextResponse.json({ error: "Unable to load product image" }, { status: 502 });
  }
}
