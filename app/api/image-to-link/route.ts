import { NextResponse } from "next/server";
import { logActivity } from "@/lib/data";
import { requireUser } from "@/lib/supabase/server";

const DEFAULT_WORKER_URL =
  "https://span-fitness-image-uploader.arixatechnologies.workers.dev/upload";
const MAX_FILE_SIZE = 15 * 1024 * 1024;
const outputExtensions: Record<string, string> = {
  "image/webp": "webp",
  "image/jpeg": "jpg",
  "image/png": "png"
};

function cleanBaseFilename(value: string) {
  return (
    value
      .trim()
      .replace(/\.(webp|jpe?g|png)$/i, "")
      .replace(/[<>:"|?*\\/]+/g, "-")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-+|-+$/g, "") || "product-image"
  );
}

export async function POST(request: Request) {
  try {
    const { supabase, user } = await requireUser();
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "Processed image is required." }, { status: 400 });
    }

    const extension = outputExtensions[file.type];
    if (!extension) {
      return NextResponse.json(
        { error: "Only WebP, JPG, and PNG images are allowed." },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Image must be 15 MB or smaller." }, { status: 413 });
    }

    const baseName = cleanBaseFilename(String(formData.get("fileName") || file.name));
    const filename = `${baseName}.${extension}`;
    const key = `Hercules Fitness/${filename}`;
    const upstreamForm = new FormData();
    upstreamForm.append("file", file, filename);
    upstreamForm.append("key", key);

    const workerUrl = (
      process.env.IMAGE_UPLOAD_WORKER_URL || DEFAULT_WORKER_URL
    ).replace(/\/+$/, "");
    const uploadUrl = workerUrl.endsWith("/upload") ? workerUrl : `${workerUrl}/upload`;
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: upstreamForm,
      signal: AbortSignal.timeout(45_000)
    });
    const result = await response.json().catch(() => ({}));

    if (!response.ok || !result.ok || !result.url) {
      return NextResponse.json(
        { error: result.error || `Image upload failed with status ${response.status}.` },
        { status: response.ok ? 502 : response.status }
      );
    }

    await logActivity(supabase, {
      userId: user.id,
      action: "Image converted to link",
      entityType: "image",
      metadata: {
        filename,
        key: result.key || key,
        size: result.size || file.size
      }
    });

    return NextResponse.json({
      ok: true,
      fileName: filename,
      key: result.key || key,
      url: result.url,
      size: result.size || file.size
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to convert image to link." },
      { status: 500 }
    );
  }
}
