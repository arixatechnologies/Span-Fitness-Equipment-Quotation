"use client";

import { Link2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  imageUploadError,
  MAX_FORM_IMAGE_BYTES
} from "@/lib/upload-limits";

type ProductImageInputProps = {
  existingImageUrl?: string | null;
};

export function ProductImageInput({ existingImageUrl }: ProductImageInputProps) {
  const initialImageUrl = existingImageUrl || "";
  const [mode, setMode] = useState<"upload" | "link">("upload");
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [previewUrl, setPreviewUrl] = useState(initialImageUrl);
  const [previewFailed, setPreviewFailed] = useState(false);
  const [fileError, setFileError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function onImageChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const validationError = file ? imageUploadError(file, MAX_FORM_IMAGE_BYTES) : "";

    if (validationError) {
      event.target.value = "";
      setFileError(validationError);
      setPreviewFailed(false);
      setPreviewUrl(imageUrl);
      return;
    }

    setFileError("");
    setPreviewFailed(false);

    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }

      return file ? URL.createObjectURL(file) : imageUrl;
    });
  }

  function selectMode(nextMode: "upload" | "link") {
    if (nextMode === mode) return;

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }

      return imageUrl;
    });
    setPreviewFailed(false);
    setFileError("");
    setMode(nextMode);
  }

  function onLinkChange(event: React.ChangeEvent<HTMLInputElement>) {
    const value = event.target.value.trim();
    setImageUrl(value);
    setPreviewUrl(value);
    setPreviewFailed(false);
  }

  return (
    <div className="md:col-span-2">
      <input type="hidden" name="image_url" value={imageUrl ?? ""} />
      <span className="field-label">Product Image</span>
      <div className="grid gap-3 sm:grid-cols-[1fr_140px] sm:items-end">
        <div className="grid gap-3">
          <div className="inline-flex w-fit rounded-md border border-line bg-panel p-1">
            <button
              type="button"
              onClick={() => selectMode("upload")}
              className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-semibold transition ${
                mode === "upload" ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:bg-white/70"
              }`}
              aria-pressed={mode === "upload"}
            >
              <Upload className="h-4 w-4" aria-hidden="true" />
              Upload
            </button>
            <button
              type="button"
              onClick={() => selectMode("link")}
              className={`inline-flex items-center gap-2 rounded px-3 py-1.5 text-sm font-semibold transition ${
                mode === "link" ? "bg-white text-ink shadow-sm" : "text-slate-600 hover:bg-white/70"
              }`}
              aria-pressed={mode === "link"}
            >
              <Link2 className="h-4 w-4" aria-hidden="true" />
              Link
            </button>
          </div>

          {mode === "upload" ? (
            <input
              key="upload-input"
              ref={fileInputRef}
              className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-rose file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
              name="image"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={onImageChange}
            />
          ) : (
            <input
              key="link-input"
              className="field-input"
              type="url"
              inputMode="url"
              value={imageUrl ?? ""}
              onChange={onLinkChange}
              placeholder="https://example.com/product-image.jpg"
              aria-label="Product image link"
            />
          )}
          {fileError ? (
            <p className="text-xs font-semibold text-red-600" role="alert">
              {fileError}
            </p>
          ) : null}
        </div>
        <div
          className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-md border border-line bg-panel text-center text-xs font-black text-slate-400 sm:h-32 sm:w-32"
          aria-label="Product image preview"
          title="Product image preview"
        >
          {previewUrl && !previewFailed ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={previewUrl}
              src={previewUrl}
              alt="Product preview"
              className="h-full w-full object-contain p-2"
              onError={() => setPreviewFailed(true)}
            />
          ) : previewFailed ? (
            <span className="px-2">Image not available</span>
          ) : (
            "Preview"
          )}
        </div>
      </div>
    </div>
  );
}
