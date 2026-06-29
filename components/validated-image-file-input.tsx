"use client";

import { useState } from "react";
import { imageUploadError } from "@/lib/upload-limits";

export function ValidatedImageFileInput({
  name,
  maxBytes
}: {
  name: string;
  maxBytes: number;
}) {
  const [error, setError] = useState("");

  return (
    <>
      <input
        className="field-input file:mr-3 file:rounded-md file:border-0 file:bg-rose file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-ink"
        name={name}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        onChange={(event) => {
          const file = event.target.files?.[0];
          const validationError = file ? imageUploadError(file, maxBytes) : "";

          if (validationError) {
            event.target.value = "";
          }

          setError(validationError);
        }}
      />
      {error ? (
        <p className="mt-1 text-xs font-semibold text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </>
  );
}
