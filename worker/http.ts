// HTTP helpers for the Worker's JSON API.

export class HttpError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export const MAX_BODY_BYTES = 64 * 1024;

const SECURITY_HEADERS: Record<string, string> = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: SECURITY_HEADERS });
}

export function errorResponse(err: HttpError): Response {
  return json({ error: { code: err.code, message: err.message } }, err.status);
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const length = Number(request.headers.get("content-length") ?? "0");
  if (length > MAX_BODY_BYTES) throw new HttpError(413, "too_large", "Request is too large");
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new HttpError(413, "too_large", "Request is too large");
  if (!text) return {};
  try {
    const value = JSON.parse(text);
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("not an object");
    return value as Record<string, unknown>;
  } catch {
    throw new HttpError(400, "bad_json", "Request body must be a JSON object");
  }
}

// ─── Input validation ───────────────────────────────────────────────────────

export function str(body: Record<string, unknown>, key: string, opts: { min?: number; max?: number; optional?: boolean } = {}): string {
  const v = body[key];
  if (v === undefined || v === null || v === "") {
    if (opts.optional) return "";
    throw new HttpError(400, "invalid_input", `Missing ${key}`);
  }
  if (typeof v !== "string") throw new HttpError(400, "invalid_input", `${key} must be text`);
  const t = v.trim();
  if (opts.min !== undefined && t.length < opts.min) throw new HttpError(400, "invalid_input", `${key} is too short`);
  if (opts.max !== undefined && t.length > opts.max) throw new HttpError(400, "invalid_input", `${key} is too long`);
  return t;
}

export function int(body: Record<string, unknown>, key: string, min: number, max: number): number {
  const v = body[key];
  if (typeof v !== "number" || !Number.isInteger(v) || v < min || v > max) {
    throw new HttpError(400, "invalid_input", `${key} must be a whole number from ${min} to ${max}`);
  }
  return v;
}

export function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function asNumberArray(v: unknown): number[] {
  return Array.isArray(v) ? v.filter((x): x is number => typeof x === "number" && Number.isFinite(x)) : [];
}

export function asRecord(v: unknown): Record<string, number> {
  const out: Record<string, number> = {};
  if (v && typeof v === "object" && !Array.isArray(v)) {
    for (const [k, x] of Object.entries(v)) if (typeof x === "number" && Number.isFinite(x)) out[k] = x;
  }
  return out;
}

export function num(v: unknown, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}
