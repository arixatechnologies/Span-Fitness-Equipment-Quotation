function isPrivateHostname(hostname: string) {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");

  if (host === "localhost" || host === "::1" || host.endsWith(".local")) return true;
  if (/^127\./.test(host) || /^10\./.test(host) || /^192\.168\./.test(host)) return true;
  if (/^169\.254\./.test(host)) return true;

  const private172 = host.match(/^172\.(\d{1,3})\./);
  if (private172 && Number(private172[1]) >= 16 && Number(private172[1]) <= 31) {
    return true;
  }

  return /^(fc|fd|fe80):/i.test(host);
}

export function isSafeProductImageUrl(value: string) {
  try {
    const url = new URL(value);
    const localDevelopmentUrl =
      process.env.NODE_ENV !== "production" &&
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1", "::1"].includes(
        url.hostname.toLowerCase().replace(/^\[|\]$/g, "")
      );

    if (url.protocol !== "https:" && !localDevelopmentUrl) return false;
    if (url.username || url.password) return false;
    if (!localDevelopmentUrl && isPrivateHostname(url.hostname)) return false;

    return true;
  } catch {
    return false;
  }
}
