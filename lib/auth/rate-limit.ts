import { getAuthSecret } from "@/lib/auth/session";

type LoginLimit = {
  keyHash: string;
  maxAttempts: number;
  windowSeconds: number;
  blockSeconds: number;
  clearOnSuccess: boolean;
};

export type LoginRateLimitContext = {
  limits: LoginLimit[];
  blockedUntil: string | null;
};

const encoder = new TextEncoder();

function clientAddress(request: Request) {
  const forwardedFor = (
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-forwarded-for")
  )
    ?.split(",")[0]
    ?.trim();
  return (
    forwardedFor ||
    request.headers.get("x-real-ip")?.trim() ||
    request.headers.get("cf-connecting-ip")?.trim() ||
    "unknown"
  ).slice(0, 128);
}

async function hashIdentifier(value: string) {
  const secret = getAuthSecret();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function getLoginRateLimitContext(
  supabase: any,
  request: Request,
  email: string
): Promise<LoginRateLimitContext> {
  const ipAddress = clientAddress(request);
  const [pairHash, accountHash, ipHash] = await Promise.all([
    hashIdentifier(`login:pair:${email}:${ipAddress}`),
    hashIdentifier(`login:account:${email}`),
    hashIdentifier(`login:ip:${ipAddress}`)
  ]);
  const limits: LoginLimit[] = [
    {
      keyHash: pairHash,
      maxAttempts: 5,
      windowSeconds: 15 * 60,
      blockSeconds: 15 * 60,
      clearOnSuccess: true
    },
    {
      keyHash: accountHash,
      maxAttempts: 10,
      windowSeconds: 30 * 60,
      blockSeconds: 30 * 60,
      clearOnSuccess: true
    },
    {
      keyHash: ipHash,
      maxAttempts: 30,
      windowSeconds: 30 * 60,
      blockSeconds: 30 * 60,
      clearOnSuccess: false
    }
  ];
  const { data, error } = await supabase.rpc("get_login_blocked_until", {
    p_key_hashes: limits.map((limit) => limit.keyHash)
  });

  if (error) throw new Error(error.message);

  return {
    limits,
    blockedUntil: typeof data === "string" ? data : null
  };
}

export async function registerLoginFailure(
  supabase: any,
  context: LoginRateLimitContext
) {
  const results = await Promise.all(
    context.limits.map((limit) =>
      supabase.rpc("register_login_failure", {
        p_key_hash: limit.keyHash,
        p_max_attempts: limit.maxAttempts,
        p_window_seconds: limit.windowSeconds,
        p_block_seconds: limit.blockSeconds
      })
    )
  );
  const error = results.find((result) => result.error)?.error;

  if (error) throw new Error(error.message);

  return results.some(
    (result) => typeof result.data === "string" && new Date(result.data).getTime() > Date.now()
  );
}

export async function clearSuccessfulLogin(
  supabase: any,
  context: LoginRateLimitContext
) {
  const { error } = await supabase.rpc("clear_login_failures", {
    p_key_hashes: context.limits
      .filter((limit) => limit.clearOnSuccess)
      .map((limit) => limit.keyHash)
  });

  if (error) throw new Error(error.message);
}
