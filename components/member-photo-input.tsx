"use client";

import { Camera } from "lucide-react";
import { useEffect, useState } from "react";
import {
  imageUploadError,
  MAX_FORM_IMAGE_BYTES
} from "@/lib/upload-limits";

export function MemberPhotoInput({
  existingPhotoUrl = ""
}: {
  existingPhotoUrl?: string | null;
}) {
  const [previewUrl, setPreviewUrl] = useState(existingPhotoUrl || "");
  const [fileError, setFileError] = useState("");

  useEffect(() => {
    return () => {
      if (previewUrl.startsWith("blob:")) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function onPhotoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    const validationError = file ? imageUploadError(file, MAX_FORM_IMAGE_BYTES) : "";

    if (validationError) {
      event.target.value = "";
      setFileError(validationError);
      setPreviewUrl(existingPhotoUrl || "");
      return;
    }

    setFileError("");

    setPreviewUrl((current) => {
      if (current.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }

      return file ? URL.createObjectURL(file) : existingPhotoUrl || "";
    });
  }

  return (
    <div className="md:col-span-2 xl:col-span-4">
      <span className="field-label">Profile Photo</span>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-line bg-panel text-slate-400">
          {previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewUrl} alt="Member profile preview" className="h-full w-full object-cover" />
          ) : (
            <Camera className="h-7 w-7" aria-hidden="true" />
          )}
          <span className="sr-only">Member profile photo preview</span>
        </label>
        <label htmlFor="member-photo" className="min-w-0 flex-1">
          <span className="field-label">Upload Photo</span>
          <input
            id="member-photo"
            className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-rose file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
            name="profile_photo"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={onPhotoChange}
          />
          {fileError ? (
            <p className="mt-1 text-xs font-semibold text-red-600" role="alert">
              {fileError}
            </p>
          ) : null}
        </label>
      </div>
    </div>
  );
}
