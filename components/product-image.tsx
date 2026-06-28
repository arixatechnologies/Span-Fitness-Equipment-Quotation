"use client";

import { useState } from "react";

type ProductImageProps = {
  src?: string | null;
  alt: string;
  className: string;
  fallbackClassName: string;
  fallbackLabel?: string;
};

export function ProductImage({
  src,
  alt,
  className,
  fallbackClassName,
  fallbackLabel = "Image"
}: ProductImageProps) {
  const [failedSrc, setFailedSrc] = useState("");

  if (!src || failedSrc === src) {
    return <div className={fallbackClassName}>{fallbackLabel}</div>;
  }

  return (
    // Product links can use any remote image host, so Next Image host allowlists do not apply here.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setFailedSrc(src)}
    />
  );
}
