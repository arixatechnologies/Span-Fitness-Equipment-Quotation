export const MAX_FORM_IMAGE_BYTES = 4 * 1024 * 1024;
export const MAX_COMPANY_ASSET_BYTES = 2 * 1024 * 1024;

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp"
};

function megabytes(bytes: number) {
  return Number((bytes / (1024 * 1024)).toFixed(1));
}

export function imageUploadError(
  file: { size: number; type: string },
  maxBytes: number
) {
  if (!imageExtensions[file.type]) {
    return "Image must be a JPEG, PNG, or WebP file.";
  }

  if (file.size > maxBytes) {
    return `Image must be ${megabytes(maxBytes)} MB or smaller.`;
  }

  return "";
}

export function imageExtension(file: { type: string }) {
  return imageExtensions[file.type] || null;
}
