// Cloudflare Worker entry point.
//
// Static files (the built app in ./dist) are served by Cloudflare before this
// code runs; only /api/* reaches the Worker (see wrangler.jsonc).
//
// Every API call must carry a Firebase ID token. The Worker verifies it, then
// reads and writes Firestore with a service account. The browser can never
// write Treecoins, XP, progress or class membership itself: Firestore rules
// (firestore.rules) forbid it.

import {
  handleActionComplete,
  handleAmbassadorApply,
  handleAmbassadorReview,
  handleEventCancel,
  handleEventReview,
  handleEventRsvp,
  handleEventSave,
  handleHoursDelete,
  handleHoursLog,
  handleHoursReview,
} from "./act";
import { handleAttemptAnswer, handleAttemptFinish, handleAttemptStart } from "./attempts";
import { handleChatDelete, handleChatDismiss, handleChatMute, handleChatReport, handleChatSend } from "./chat";
import type { Ctx, Env } from "./env";
import { Firestore, FirestoreError } from "./firestore";
import {
  handleAccountDelete,
  handleAssignmentsSync,
  handleClassCreate,
  handleClassDelete,
  handleClassJoin,
  handleClassLeave,
  handleClassRemove,
  handleFrq,
  handlePurchase,
  handleQuest,
  handleReward,
  handleSync,
} from "./handlers";
import { HttpError, errorResponse, json, readJson } from "./http";
import { AuthError, fetchGoogleJwks, verifyFirebaseIdToken, type Jwk } from "./jwt";
import { remindersConfigured, sendReminders, verifyUnsubscribe } from "./reminders";

type Handler = (ctx: Ctx, body: Record<string, unknown>) => Promise<unknown>;

const ROUTES: Record<string, Handler> = {
  sync: handleSync,
  reward: handleReward,
  "attempt/start": handleAttemptStart,
  "attempt/answer": handleAttemptAnswer,
  "attempt/finish": handleAttemptFinish,
  "frq/grade": handleFrq,
  "quest/submit": handleQuest,
  purchase: handlePurchase,
  "class/create": handleClassCreate,
  "class/join": handleClassJoin,
  "class/leave": handleClassLeave,
  "class/remove": handleClassRemove,
  "class/delete": handleClassDelete,
  "assignments/sync": handleAssignmentsSync,
  "chat/send": handleChatSend,
  "chat/delete": handleChatDelete,
  "chat/report": handleChatReport,
  "chat/dismiss": handleChatDismiss,
  "chat/mute": handleChatMute,
  "event/save": handleEventSave,
  "event/cancel": handleEventCancel,
  "event/review": handleEventReview,
  "event/rsvp": handleEventRsvp,
  "action/complete": handleActionComplete,
  "hours/log": handleHoursLog,
  "hours/delete": handleHoursDelete,
  "hours/review": handleHoursReview,
  "ambassador/apply": handleAmbassadorApply,
  "ambassador/review": handleAmbassadorReview,
  "account/delete": handleAccountDelete,
};

const DEFAULT_PROJECT_ID = "ecoisland-b9e34";
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "[::1]"]);

type ServiceAccount = { client_email: string; private_key: string; project_id?: string };
let saCache: { raw: string; sa: ServiceAccount | null } | null = null;

function serviceAccount(env: Env): ServiceAccount | null {
  const raw = env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;
  if (saCache?.raw === raw) return saCache.sa;
  let sa: ServiceAccount | null = null;
  try {
    const v = JSON.parse(raw);
    if (v && typeof v.client_email === "string" && typeof v.private_key === "string") sa = v;
  } catch {
    sa = null;
  }
  saCache = { raw, sa };
  return sa;
}

/** Emulators are only ever used for local requests with DEV_EMULATORS=true. */
function usesEmulators(env: Env, url: URL): boolean {
  return env.DEV_EMULATORS === "true" && !!env.FIRESTORE_EMULATOR_HOST && LOCAL_HOSTS.has(url.hostname);
}

export type Deps = {
  fetch?: typeof fetch;
  getKeys?: () => Promise<Jwk[]>;
  now?: () => Date;
};

export async function handleApi(request: Request, env: Env, deps: Deps = {}): Promise<Response> {
  const url = new URL(request.url);
  const route = url.pathname.replace(/^\/api\//, "").replace(/\/+$/, "");
  const outbound = deps.fetch ?? ((input: RequestInfo | URL, init?: RequestInit) => fetch(input, init));
  try {
    const emulator = usesEmulators(env, url);
    const sa = emulator ? null : serviceAccount(env);

    if (route === "health") {
      return json({ ok: true, configured: emulator || !!sa, grading: !!env.GEMINI_API_KEY, reminders: remindersConfigured(env) });
    }
    if (route === "unsubscribe" && request.method === "GET") {
      return unsubscribe(url, env, emulator, sa, outbound);
    }
    if (request.method !== "POST") throw new HttpError(405, "method_not_allowed", "Use POST");
    const handler = ROUTES[route];
    if (!handler) throw new HttpError(404, "not_found", "Unknown endpoint");

    if (!emulator && !sa) {
      throw new HttpError(503, "server_not_configured", "Ecoisland's server isn't fully set up yet (missing FIREBASE_SERVICE_ACCOUNT).");
    }
    const projectId = env.FIREBASE_PROJECT_ID || sa?.project_id || DEFAULT_PROJECT_ID;

    const auth = request.headers.get("authorization") ?? "";
    const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
    if (!token) throw new HttpError(401, "unauthenticated", "Sign in to continue");
    let claims;
    try {
      claims = await verifyFirebaseIdToken(token, {
        projectId,
        getKeys: deps.getKeys ?? (() => fetchGoogleJwks(outbound)),
        allowUnsigned: emulator,
      });
    } catch (err) {
      if (err instanceof AuthError) throw new HttpError(401, "unauthenticated", "Your session expired. Sign in again.");
      throw err;
    }

    if (env.API_LIMITER) {
      const { success } = await env.API_LIMITER.limit({ key: claims.uid });
      if (!success) throw new HttpError(429, "slow_down", "Too many requests. Wait a moment and try again.");
    }

    const body = await readJson(request);
    const fs = new Firestore({
      projectId,
      emulatorHost: emulator ? env.FIRESTORE_EMULATOR_HOST : undefined,
      serviceAccount: sa ?? undefined,
      fetcher: outbound,
    });
    const ctx: Ctx = { env, uid: claims.uid, claims, fs, request, now: deps.now?.() ?? new Date(), fetch: outbound };
    return json(await handler(ctx, body));
  } catch (err) {
    if (err instanceof HttpError) return errorResponse(err);
    if (err instanceof FirestoreError) {
      console.error("firestore", err.status, err.code, err.message);
      if (err.code === "server_not_configured" || err.code === "token_failed") {
        return errorResponse(new HttpError(503, "server_not_configured", "Ecoisland's server can't reach the database right now."));
      }
      return errorResponse(new HttpError(500, "server_error", "Something went wrong on our side. Please try again."));
    }
    console.error("unhandled", err);
    return errorResponse(new HttpError(500, "server_error", "Something went wrong on our side. Please try again."));
  }
}

function page(title: string, body: string, status = 200): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><body style="font-family:-apple-system,Segoe UI,Inter,sans-serif;background:#f5f3ec;color:#16201a;display:grid;place-items:center;min-height:100vh;margin:0"><main style="max-width:420px;padding:32px;text-align:center"><h1 style="font-size:22px">${title}</h1><p style="color:#59645c">${body}</p><p><a href="/" style="color:#176a44;font-weight:600">Go to Ecoisland</a></p></main></body>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store" } },
  );
}

async function unsubscribe(url: URL, env: Env, emulator: boolean, sa: ServiceAccount | null, outbound: typeof fetch): Promise<Response> {
  const uid = url.searchParams.get("u") ?? "";
  const token = url.searchParams.get("t") ?? "";
  const secret = env.FIREBASE_SERVICE_ACCOUNT ?? env.RESEND_API_KEY ?? "";
  if (!uid || !secret || !(await verifyUnsubscribe(secret, uid, token))) {
    return page("That link didn't work", "You can turn reminders off any time in Settings.", 400);
  }
  const fs = new Firestore({
    projectId: env.FIREBASE_PROJECT_ID || sa?.project_id || DEFAULT_PROJECT_ID,
    emulatorHost: emulator ? env.FIRESTORE_EMULATOR_HOST : undefined,
    serviceAccount: sa ?? undefined,
    fetcher: outbound,
  });
  const user = await fs.get(`users/${uid}`);
  if (user) await fs.commit([fs.patch(user.path, { email_reminders: false }, true)]);
  return page("You're unsubscribed", "Ecoisland won't send you streak reminders anymore. You can turn them back on in Settings.");
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname.startsWith("/api/")) return handleApi(request, env);
    return env.ASSETS.fetch(request);
  },

  /** Daily Cron Trigger (see wrangler.jsonc): streak reminder emails. */
  async scheduled(_event: unknown, env: Env): Promise<void> {
    const sa = serviceAccount(env);
    if (!sa || !remindersConfigured(env)) return;
    const fs = new Firestore({ projectId: env.FIREBASE_PROJECT_ID || sa.project_id || DEFAULT_PROJECT_ID, serviceAccount: sa });
    const sent = await sendReminders(env, fs, (input, init) => fetch(input, init));
    console.log(`reminders sent: ${sent}`);
  },
};
