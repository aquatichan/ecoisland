// Worker bindings and per-request context.

import type { FirebaseClaims } from "./jwt";
import type { Firestore } from "./firestore";

type RateLimiter = { limit: (opts: { key: string }) => Promise<{ success: boolean }> };

export type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  /** Gemini key, used only for FRQ grading. Secret. */
  GEMINI_API_KEY?: string;
  GEMINI_MODEL?: string;
  FIREBASE_PROJECT_ID?: string;
  /** Service account JSON with Firestore access. Secret. */
  FIREBASE_SERVICE_ACCOUNT?: string;
  /** Optional streak reminder emails (Resend). Both must be set to send. */
  RESEND_API_KEY?: string;
  REMINDER_FROM?: string;
  /** Local development only: talk to the Firebase emulators. */
  DEV_EMULATORS?: string;
  FIRESTORE_EMULATOR_HOST?: string;
  API_LIMITER?: RateLimiter;
  AI_LIMITER?: RateLimiter;
};

export type Ctx = {
  env: Env;
  uid: string;
  claims: FirebaseClaims;
  fs: Firestore;
  request: Request;
  now: Date;
  /** Outbound fetch (Gemini). Injectable for tests. */
  fetch: typeof fetch;
};
