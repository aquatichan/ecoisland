// JWT helpers for the Worker, built on WebCrypto only.
//  - verifyFirebaseIdToken: checks a Firebase Auth ID token (RS256, Google's
//    securetoken keys) the way the Admin SDK does.
//  - signServiceAccountJwt: mints the assertion used to get a Google OAuth
//    access token for Firestore from a service account key.

export type FirebaseClaims = {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export type Jwk = JsonWebKey & { kid?: string };

export class AuthError extends Error {}

const enc = new TextEncoder();
const dec = new TextDecoder();

export function base64UrlEncode(data: ArrayBuffer | Uint8Array | string): string {
  const bytes = typeof data === "string" ? enc.encode(data) : data instanceof Uint8Array ? data : new Uint8Array(data);
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function base64UrlDecode(input: string): Uint8Array<ArrayBuffer> {
  const b64 = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function decodeJson(part: string): Record<string, unknown> {
  try {
    const value = JSON.parse(dec.decode(base64UrlDecode(part)));
    if (!value || typeof value !== "object") throw new Error("not an object");
    return value as Record<string, unknown>;
  } catch {
    throw new AuthError("Malformed token");
  }
}

const RS256 = { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" } as const;

export type VerifyOptions = {
  projectId: string;
  /** Returns Google's current signing keys. */
  getKeys: () => Promise<Jwk[]>;
  /** Accept unsigned tokens from the Firebase Auth emulator. Never enable in production. */
  allowUnsigned?: boolean;
  nowSeconds?: number;
};

export async function verifyFirebaseIdToken(token: string, opts: VerifyOptions): Promise<FirebaseClaims> {
  const parts = token.split(".");
  if (parts.length !== 3) throw new AuthError("Malformed token");
  const [h, p, s] = parts;
  const header = decodeJson(h);
  const payload = decodeJson(p);
  const now = opts.nowSeconds ?? Math.floor(Date.now() / 1000);

  if (opts.allowUnsigned && header.alg === "none") {
    // Auth emulator tokens are unsigned; still validate the claims below.
  } else {
    if (header.alg !== "RS256" || typeof header.kid !== "string") throw new AuthError("Unsupported token");
    const keys = await opts.getKeys();
    const jwk = keys.find((k) => k.kid === header.kid);
    if (!jwk) throw new AuthError("Unknown signing key");
    const key = await crypto.subtle.importKey("jwk", { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", ext: true }, RS256, false, ["verify"]);
    const ok = await crypto.subtle.verify(RS256, key, base64UrlDecode(s), enc.encode(`${h}.${p}`));
    if (!ok) throw new AuthError("Bad signature");
  }

  const exp = Number(payload.exp);
  const iat = Number(payload.iat);
  const authTime = Number(payload.auth_time ?? iat);
  if (!Number.isFinite(exp) || exp <= now) throw new AuthError("Token expired");
  if (!Number.isFinite(iat) || iat > now + 300) throw new AuthError("Token issued in the future");
  if (!Number.isFinite(authTime) || authTime > now + 300) throw new AuthError("Bad auth time");
  if (payload.aud !== opts.projectId) throw new AuthError("Wrong audience");
  if (payload.iss !== `https://securetoken.google.com/${opts.projectId}`) throw new AuthError("Wrong issuer");
  const sub = payload.sub;
  if (typeof sub !== "string" || sub.length === 0 || sub.length > 128) throw new AuthError("Bad subject");

  return {
    uid: sub,
    email: typeof payload.email === "string" ? payload.email : undefined,
    email_verified: payload.email_verified === true,
    name: typeof payload.name === "string" ? payload.name : undefined,
    picture: typeof payload.picture === "string" ? payload.picture : undefined,
  };
}

const JWKS_URL = "https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com";
let jwksCache: { keys: Jwk[]; expires: number } | null = null;

/** Google's Firebase ID-token signing keys, cached for as long as Google allows. */
export async function fetchGoogleJwks(fetcher: typeof fetch = fetch): Promise<Jwk[]> {
  if (jwksCache && jwksCache.expires > Date.now()) return jwksCache.keys;
  const res = await fetcher(JWKS_URL);
  if (!res.ok) throw new Error(`JWKS fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys?: Jwk[] };
  const maxAge = Number(/max-age=(\d+)/.exec(res.headers.get("cache-control") ?? "")?.[1] ?? 3600);
  jwksCache = { keys: body.keys ?? [], expires: Date.now() + Math.max(60, maxAge) * 1000 };
  return jwksCache.keys;
}

function pemToDer(pem: string): ArrayBuffer {
  const body = pem
    .replace(/\\n/g, "\n")
    .replace(/-----BEGIN [^-]+-----/, "")
    .replace(/-----END [^-]+-----/, "")
    .replace(/\s+/g, "");
  const bin = atob(body);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export async function signServiceAccountJwt(
  sa: { client_email: string; private_key: string },
  scope: string,
  nowSeconds = Math.floor(Date.now() / 1000),
): Promise<string> {
  const header = base64UrlEncode(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64UrlEncode(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: nowSeconds,
      exp: nowSeconds + 3600,
    }),
  );
  const key = await crypto.subtle.importKey("pkcs8", pemToDer(sa.private_key), RS256, false, ["sign"]);
  const sig = await crypto.subtle.sign(RS256, key, enc.encode(`${header}.${payload}`));
  return `${header}.${payload}.${base64UrlEncode(sig)}`;
}
