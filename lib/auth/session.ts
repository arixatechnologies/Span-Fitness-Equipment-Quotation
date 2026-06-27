import type { TeamMemberRole } from "@/lib/types";

export const ADMIN_SESSION_COOKIE = "sfe_admin_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 8;

export type AdminSession = {
  email: string;
  memberId?: string;
  name: string;
  role: TeamMemberRole;
  profilePhotoUrl?: string;
  iat: number;
  exp: number;
};

const encoder = new TextEncoder();

function base64UrlEncode(input: string | ArrayBuffer) {
  const bytes =
    typeof input === "string" ? encoder.encode(input) : new Uint8Array(input);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlDecode(input: string) {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new TextDecoder().decode(bytes);
}

function safeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;

  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }

  return result === 0;
}

async function hmac(message: string, secret: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
  return base64UrlEncode(signature);
}

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function getAuthSecret() {
  return process.env.AUTH_SECRET || "";
}

export function getAdminEmail() {
  return process.env.ADMIN_EMAIL || "";
}

export async function isAdminPasswordValid(password: string) {
  const plainPassword = process.env.ADMIN_PASSWORD;
  const passwordHash = process.env.ADMIN_PASSWORD_HASH;

  if (passwordHash?.startsWith("sha256:")) {
    const inputHash = await sha256Hex(password);
    return safeEqual(`sha256:${inputHash}`, passwordHash);
  }

  if (plainPassword) {
    return safeEqual(password, plainPassword);
  }

  return false;
}

export async function createSessionToken(
  email: string,
  member?: {
    id?: string;
    name?: string;
    role?: TeamMemberRole;
    profilePhotoUrl?: string;
  }
) {
  const secret = getAuthSecret();

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSession = {
    email,
    memberId: member?.id,
    name: member?.name || email,
    role: member?.role || "Admin",
    profilePhotoUrl: member?.profilePhotoUrl,
    iat: now,
    exp: now + SESSION_MAX_AGE_SECONDS
  };
  const body = base64UrlEncode(JSON.stringify(payload));
  const signature = await hmac(body, secret);

  return `${body}.${signature}`;
}

export async function verifySessionToken(token?: string | null) {
  const secret = getAuthSecret();

  if (!token || !secret) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;

  const expectedSignature = await hmac(body, secret);
  if (!safeEqual(signature, expectedSignature)) return null;

  try {
    const payload = JSON.parse(base64UrlDecode(body)) as AdminSession;
    const now = Math.floor(Date.now() / 1000);

    if (!payload.email || payload.exp <= now) return null;

    return {
      ...payload,
      name: payload.name || payload.email,
      role: payload.role || "Admin"
    };
  } catch {
    return null;
  }
}
