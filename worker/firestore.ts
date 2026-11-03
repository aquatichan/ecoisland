// A small Firestore REST client for the Worker (the Admin SDK does not run on
// Workers). Supports what Ecoisland needs: reads, batched reads and writes,
// serializable transactions, simple queries and listing a collection.

import { signServiceAccountJwt } from "./jwt";

// ─── Value encoding ─────────────────────────────────────────────────────────

export type FsValue =
  | { nullValue: null }
  | { booleanValue: boolean }
  | { integerValue: string }
  | { doubleValue: number }
  | { stringValue: string }
  | { timestampValue: string }
  | { arrayValue: { values?: FsValue[] } }
  | { mapValue: { fields?: Record<string, FsValue> } }
  | { referenceValue: string }
  | { bytesValue: string }
  | { geoPointValue: { latitude: number; longitude: number } };

export type Data = Record<string, unknown>;

export function encodeValue(v: unknown): FsValue {
  if (v === null || v === undefined) return { nullValue: null };
  if (typeof v === "boolean") return { booleanValue: v };
  if (typeof v === "number") {
    if (!Number.isFinite(v)) return { nullValue: null };
    return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  }
  if (typeof v === "string") return { stringValue: v };
  if (v instanceof Date) return { timestampValue: v.toISOString() };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encodeValue) } };
  if (typeof v === "object") return { mapValue: { fields: encodeFields(v as Data) } };
  return { nullValue: null };
}

export function encodeFields(obj: Data): Record<string, FsValue> {
  const out: Record<string, FsValue> = {};
  for (const [k, v] of Object.entries(obj)) if (v !== undefined) out[k] = encodeValue(v);
  return out;
}

export function decodeValue(v: FsValue | undefined): unknown {
  if (!v) return undefined;
  if ("nullValue" in v) return null;
  if ("booleanValue" in v) return v.booleanValue;
  if ("integerValue" in v) return Number(v.integerValue);
  if ("doubleValue" in v) return Number(v.doubleValue);
  if ("stringValue" in v) return v.stringValue;
  if ("timestampValue" in v) return v.timestampValue;
  if ("arrayValue" in v) return (v.arrayValue.values ?? []).map(decodeValue);
  if ("mapValue" in v) return decodeFields(v.mapValue.fields ?? {});
  if ("referenceValue" in v) return v.referenceValue;
  if ("bytesValue" in v) return v.bytesValue;
  if ("geoPointValue" in v) return v.geoPointValue;
  return undefined;
}

export function decodeFields(fields: Record<string, FsValue>): Data {
  const out: Data = {};
  for (const [k, v] of Object.entries(fields)) out[k] = decodeValue(v);
  return out;
}

// ─── Client ─────────────────────────────────────────────────────────────────

export type Doc = { path: string; id: string; data: Data; updateTime?: string };

type RawDoc = { name: string; fields?: Record<string, FsValue>; updateTime?: string };

export type Write =
  | {
      update: { name: string; fields: Record<string, FsValue> };
      updateMask?: { fieldPaths: string[] };
      currentDocument?: { exists: boolean } | { updateTime: string };
    }
  | { delete: string; currentDocument?: { exists: boolean } };

export class FirestoreError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

export type FirestoreOptions = {
  projectId: string;
  /** Override for the Firestore emulator, e.g. "127.0.0.1:8080". */
  emulatorHost?: string;
  serviceAccount?: { client_email: string; private_key: string };
  fetcher?: typeof fetch;
};

const SCOPE = "https://www.googleapis.com/auth/datastore";
const tokenCache = new Map<string, { token: string; expires: number }>();

export class Firestore {
  readonly root: string; // projects/{p}/databases/(default)/documents
  private base: string;
  private fetcher: typeof fetch;

  constructor(private opts: FirestoreOptions) {
    this.root = `projects/${opts.projectId}/databases/(default)/documents`;
    this.base = opts.emulatorHost ? `http://${opts.emulatorHost}/v1` : "https://firestore.googleapis.com/v1";
    this.fetcher = opts.fetcher ?? ((input, init) => fetch(input, init));
  }

  /** Full resource name for a document path such as "users/abc". */
  name(path: string): string {
    return `${this.root}/${path}`;
  }

  private async token(): Promise<string> {
    if (this.opts.emulatorHost) return "owner";
    const sa = this.opts.serviceAccount;
    if (!sa) throw new FirestoreError(503, "server_not_configured", "FIREBASE_SERVICE_ACCOUNT is not set");
    const cached = tokenCache.get(sa.client_email);
    if (cached && cached.expires > Date.now() + 60_000) return cached.token;
    const assertion = await signServiceAccountJwt(sa, SCOPE);
    const res = await this.fetcher("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: `grant_type=${encodeURIComponent("urn:ietf:params:oauth:grant-type:jwt-bearer")}&assertion=${assertion}`,
    });
    if (!res.ok) throw new FirestoreError(503, "token_failed", `Could not get an access token (${res.status})`);
    const body = (await res.json()) as { access_token: string; expires_in: number };
    tokenCache.set(sa.client_email, { token: body.access_token, expires: Date.now() + body.expires_in * 1000 });
    return body.access_token;
  }

  private async call<T>(method: string, url: string, body?: unknown): Promise<T> {
    const res = await this.fetcher(`${this.base}/${url}`, {
      method,
      headers: { authorization: `Bearer ${await this.token()}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) {
      let code = "firestore_error";
      let message = `Firestore ${method} failed (${res.status})`;
      try {
        const err = (await res.json()) as { error?: { status?: string; message?: string } };
        code = err.error?.status ?? code;
        message = err.error?.message ?? message;
      } catch {
        /* keep defaults */
      }
      throw new FirestoreError(res.status, code, message);
    }
    return (await res.json()) as T;
  }

  private toDoc(raw: RawDoc): Doc {
    const path = raw.name.slice(this.root.length + 1);
    return { path, id: path.split("/").pop() ?? "", data: decodeFields(raw.fields ?? {}), updateTime: raw.updateTime };
  }

  async get(path: string, transaction?: string): Promise<Doc | null> {
    const map = await this.getAll([path], transaction);
    return map.get(path) ?? null;
  }

  async getAll(paths: string[], transaction?: string): Promise<Map<string, Doc | null>> {
    const out = new Map<string, Doc | null>();
    if (paths.length === 0) return out;
    const unique = [...new Set(paths)];
    const rows = await this.call<Array<{ found?: RawDoc; missing?: string }>>("POST", `${this.root}:batchGet`, {
      documents: unique.map((p) => this.name(p)),
      ...(transaction ? { transaction } : {}),
    });
    for (const p of unique) out.set(p, null);
    for (const row of rows) {
      if (row.found) {
        const doc = this.toDoc(row.found);
        out.set(doc.path, doc);
      }
    }
    return out;
  }

  async commit(writes: Write[], transaction?: string): Promise<void> {
    if (writes.length === 0 && !transaction) return;
    for (let i = 0; i < Math.max(1, writes.length); i += 450) {
      const chunk = writes.slice(i, i + 450);
      await this.call("POST", `${this.root}:commit`, { writes: chunk, ...(transaction && i === 0 ? { transaction } : {}) });
      if (transaction) break; // a transaction commits in one request
    }
  }

  async beginTransaction(): Promise<string> {
    const res = await this.call<{ transaction: string }>("POST", `${this.root}:beginTransaction`, { options: { readWrite: {} } });
    return res.transaction;
  }

  async rollback(transaction: string): Promise<void> {
    try {
      await this.call("POST", `${this.root}:rollback`, { transaction });
    } catch {
      /* best effort */
    }
  }

  /**
   * Run `fn` in a serializable transaction. Reads go through `tx.get/getAll`;
   * `fn` returns the writes to commit plus a result. Retries on contention.
   */
  async runTransaction<T>(
    fn: (tx: { get: (path: string) => Promise<Doc | null>; getAll: (paths: string[]) => Promise<Map<string, Doc | null>> }) => Promise<{ writes: Write[]; result: T }>,
    attempts = 5,
  ): Promise<T> {
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      const transaction = await this.beginTransaction();
      try {
        const { writes, result } = await fn({
          get: (path) => this.get(path, transaction),
          getAll: (paths) => this.getAll(paths, transaction),
        });
        if (writes.length > 450) throw new FirestoreError(500, "too_many_writes", "Transaction too large");
        await this.call("POST", `${this.root}:commit`, { writes, transaction });
        return result;
      } catch (err) {
        await this.rollback(transaction);
        lastError = err;
        const retryable = err instanceof FirestoreError && (err.status === 409 || err.code === "ABORTED");
        if (!retryable) throw err;
        await new Promise((r) => setTimeout(r, 40 * (attempt + 1) + Math.random() * 60));
      }
    }
    throw lastError;
  }

  /** All documents in a collection (paged). `collectionPath` like "classes/abc/members". */
  async list(collectionPath: string, opts: { pageSize?: number; max?: number } = {}): Promise<Doc[]> {
    const out: Doc[] = [];
    let pageToken = "";
    const max = opts.max ?? 2000;
    do {
      const qs = new URLSearchParams({ pageSize: String(opts.pageSize ?? 300) });
      if (pageToken) qs.set("pageToken", pageToken);
      const res = await this.call<{ documents?: RawDoc[]; nextPageToken?: string }>(
        "GET",
        `${this.root}/${collectionPath}?${qs.toString()}`,
      );
      for (const d of res.documents ?? []) out.push(this.toDoc(d));
      pageToken = res.nextPageToken ?? "";
    } while (pageToken && out.length < max);
    return out;
  }

  /** Equality-filtered query on one collection under `parentPath` ("" for the root). */
  async query(
    parentPath: string,
    collectionId: string,
    filters: Array<[string, unknown]>,
    limit = 500,
  ): Promise<Doc[]> {
    const parent = parentPath ? this.name(parentPath) : this.root;
    const fieldFilters = filters.map(([field, value]) => ({
      fieldFilter: { field: { fieldPath: field }, op: "EQUAL", value: encodeValue(value) },
    }));
    const where =
      fieldFilters.length === 0 ? undefined : fieldFilters.length === 1 ? fieldFilters[0] : { compositeFilter: { op: "AND", filters: fieldFilters } };
    const rows = await this.call<Array<{ document?: RawDoc }>>("POST", `${parent}:runQuery`, {
      structuredQuery: { from: [{ collectionId }], ...(where ? { where } : {}), limit },
    });
    return rows.filter((r) => r.document).map((r) => this.toDoc(r.document as RawDoc));
  }

  /**
   * Documents in every collection named `collectionId` (a collection group)
   * whose `field` is less than `before`. Used for retention cleanup.
   */
  async groupBefore(collectionId: string, field: string, before: string, limit = 500): Promise<Doc[]> {
    const rows = await this.call<Array<{ document?: RawDoc }>>("POST", `${this.root}:runQuery`, {
      structuredQuery: {
        from: [{ collectionId, allDescendants: true }],
        where: { fieldFilter: { field: { fieldPath: field }, op: "LESS_THAN", value: { stringValue: before } } },
        limit,
      },
    });
    return rows.filter((r) => r.document).map((r) => this.toDoc(r.document as RawDoc));
  }

  async listCollectionIds(docPath: string): Promise<string[]> {
    const res = await this.call<{ collectionIds?: string[] }>("POST", `${this.name(docPath)}:listCollectionIds`, { pageSize: 100 });
    return res.collectionIds ?? [];
  }

  // ─── Write builders ───────────────────────────────────────────────────────

  /** Create a document; fails the commit if it already exists. */
  create(path: string, data: Data): Write {
    return { update: { name: this.name(path), fields: encodeFields(data) }, currentDocument: { exists: false } };
  }

  /** Replace a document entirely (creating it if needed). */
  set(path: string, data: Data): Write {
    return { update: { name: this.name(path), fields: encodeFields(data) } };
  }

  /** Set only the given top-level fields. Creates the document if missing unless `mustExist`. */
  patch(path: string, data: Data, mustExist = false): Write {
    const fields = encodeFields(data);
    return {
      update: { name: this.name(path), fields },
      updateMask: { fieldPaths: Object.keys(data).map(quoteField) },
      ...(mustExist ? { currentDocument: { exists: true } } : {}),
    };
  }

  delete(path: string): Write {
    return { delete: this.name(path) };
  }
}

/** Quote a single top-level field name for a field path when needed. */
export function quoteField(name: string): string {
  return /^[A-Za-z_][A-Za-z_0-9]*$/.test(name) ? name : `\`${name.replace(/\\/g, "\\\\").replace(/`/g, "\\`")}\``;
}
