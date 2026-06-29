const encoder = new TextEncoder();
const HASH_ALGORITHM = "SHA-256";
const ITERATIONS = 210_000;
const SALT_BYTES = 16;
const HASH_BYTES = 32;

export const DUMMY_PASSWORD_HASH =
  "pbkdf2:sha256:210000:4rV2_gCEftgv_zhtyNsQmA:zCkwQ2OevYBX9pr_y9jonOCkLkOLIwV9Aa9mO2zp6KQ";

function encodeBase64Url(bytes: Uint8Array) {
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function decodeBase64Url(value: string) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

async function derivePasswordHash(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: HASH_ALGORITHM,
      salt: salt as BufferSource,
      iterations
    },
    key,
    HASH_BYTES * 8
  );

  return new Uint8Array(bits);
}

function safeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index += 1) {
    difference |= left[index] ^ right[index];
  }

  return difference === 0;
}

export async function hashMemberPassword(password: string) {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derivePasswordHash(password, salt, ITERATIONS);

  return `pbkdf2:sha256:${ITERATIONS}:${encodeBase64Url(salt)}:${encodeBase64Url(hash)}`;
}

export async function verifyMemberPassword(password: string, storedHash: string) {
  const [method, algorithm, iterationsText, saltText, hashText] = storedHash.split(":");
  const iterations = Number(iterationsText);

  if (
    method !== "pbkdf2" ||
    algorithm !== "sha256" ||
    !Number.isInteger(iterations) ||
    iterations < 100_000 ||
    iterations > 1_000_000 ||
    !saltText ||
    !hashText
  ) {
    return false;
  }

  try {
    const salt = decodeBase64Url(saltText);
    const expectedHash = decodeBase64Url(hashText);
    const actualHash = await derivePasswordHash(password, salt, iterations);
    return safeEqual(actualHash, expectedHash);
  } catch {
    return false;
  }
}
