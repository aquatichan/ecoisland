// Class chat. Messages are written only here, so every one is checked: the
// sender belongs to the class, chat is on, they aren't muted, the text passes
// the safety checks (language, harassment, links, contact details) and they
// aren't flooding. Members read messages live from Firestore
// (classes/{id}/messages, see firestore.rules). There are no private
// messages: every message is visible to the whole class and its teacher.
//
// Every moderation event (a delete, a report, a mute, chat switched on or
// off, a blocked harassment attempt, a wellbeing flag) is written to
// classes/{id}/moderation, which only the teacher (and Ecoisland admins) can
// read. Records keep a copy of the message text, so removing a message
// doesn't erase the evidence. Messages are deleted after CHAT_RETENTION_DAYS
// and moderation records after MODERATION_RETENTION_DAYS (worker/retention.ts).
//
//   chat/send    { classId, text }
//   chat/delete  { classId, messageId }            teacher, or the author
//   chat/report  { classId, messageId, reason }    any member, not their own
//   chat/dismiss { classId, messageId }            teacher: keep a reported message
//   chat/mute    { classId, uid, muted }           teacher
//   chat/toggle  { classId, enabled }              teacher

import type { Ctx } from "./env";
import { FirestoreError, type Data, type Doc, type Write } from "./firestore";
import { HttpError, num, str } from "./http";
import { checkChatMessage } from "./moderation";
import { displayName, randomId } from "./state";

type Body = Record<string, unknown>;

export const CHAT_MAX_CHARS = 500;
export const CHAT_RETENTION_DAYS = 90;
export const MODERATION_RETENTION_DAYS = 365;
const PER_MINUTE = 10;
const MIN_GAP_MS = 1200;
const ID_RE = /^[A-Za-z0-9]{1,40}$/;

export const REPORT_REASONS = ["harassment", "inappropriate", "personal_info", "spam", "wellbeing", "other"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

type Access = { cls: Doc; teacher: boolean; member: Doc | null };

async function access(ctx: Ctx, classId: string): Promise<Access> {
  if (!ID_RE.test(classId)) throw new HttpError(400, "invalid_input", "Unknown class");
  const docs = await ctx.fs.getAll([`classes/${classId}`, `classes/${classId}/members/${ctx.uid}`]);
  const cls = docs.get(`classes/${classId}`) ?? null;
  if (!cls) throw new HttpError(404, "not_found", "That class no longer exists.");
  const member = docs.get(`classes/${classId}/members/${ctx.uid}`) ?? null;
  const teacher = cls.data.teacher_id === ctx.uid;
  if (!teacher && !member) throw new HttpError(403, "not_member", "You're not in this class.");
  return { cls, teacher, member };
}

function messageId(body: Body): string {
  const id = str(body, "messageId", { max: 40 });
  if (!ID_RE.test(id)) throw new HttpError(400, "invalid_input", "Unknown message");
  return id;
}

/** Normalizes whitespace: trims, and keeps at most two blank lines in a row. */
export function cleanChatText(raw: string): string {
  return raw
    .replace(/\r\n?/g, "\n")
    // Control characters, zero-width and bidirectional overrides.
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b-\u001f\u007f\u200b-\u200f\u202a-\u202e\u2066-\u2069]/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type ModerationAction = "deleted" | "reported" | "dismissed" | "muted" | "unmuted" | "blocked" | "flagged" | "chat_on" | "chat_off";

/** A write to the teacher-only moderation log. */
export function moderationRecord(
  ctx: Ctx,
  classId: string,
  record: { action: ModerationAction; actor_role: "teacher" | "student" | "system"; message_id?: string; author_uid?: string; author_name?: string; text?: string; reason?: string },
  id = randomId(),
): Write {
  return ctx.fs.create(`classes/${classId}/moderation/${id}`, {
    ...record,
    text: (record.text ?? "").slice(0, CHAT_MAX_CHARS),
    actor_uid: ctx.uid,
    at: ctx.now.toISOString(),
  });
}

export async function handleChatSend(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid, now } = ctx;
  const classId = str(body, "classId", { max: 40 });
  const raw = typeof body.text === "string" ? body.text : "";
  const text = cleanChatText(raw);
  if (!text) throw new HttpError(400, "empty", "Write a message first.");
  if (text.length > CHAT_MAX_CHARS) throw new HttpError(400, "too_long", `Messages can be up to ${CHAT_MAX_CHARS} characters.`);

  const { cls, teacher } = await access(ctx, classId);
  if (cls.data.chat_enabled !== true) throw new HttpError(403, "chat_off", "Chat is turned off for this class.");

  // Mutes live on the class, not the membership, so leaving and rejoining
  // (or opening a new tab) doesn't lift them.
  const usagePath = `users/${uid}/usage/chat_${classId}`;
  const docs = await fs.getAll([usagePath, `users/${uid}`, `classes/${classId}/mutes/${uid}`]);
  if (!teacher && docs.get(`classes/${classId}/mutes/${uid}`)) throw new HttpError(403, "muted", "Your teacher has muted you in this chat.");
  const usage = docs.get(usagePath)?.data ?? {};
  const profile = docs.get(`users/${uid}`)?.data ?? {};
  const name = displayName(profile);

  const check = checkChatMessage(text, { teacher });
  if (!check.ok) {
    // Harassment attempts are kept for the teacher even though they never post.
    if (check.code === "harassment" && !teacher) {
      await fs.commit([moderationRecord(ctx, classId, { action: "blocked", actor_role: "system", author_uid: uid, author_name: name, text, reason: "harassment" })]).catch(() => undefined);
    }
    throw new HttpError(400, check.code, check.message);
  }

  // Flood control: a short gap between messages and a per-minute cap.
  const minute = now.toISOString().slice(0, 16);
  const count = usage.minute === minute ? num(usage.count) : 0;
  const lastAt = typeof usage.last_at === "string" ? Date.parse(usage.last_at) : 0;
  if (now.getTime() - lastAt < MIN_GAP_MS || count >= PER_MINUTE) {
    throw new HttpError(429, "slow_down", "You're sending messages too fast. Wait a few seconds.");
  }

  const id = randomId();
  const wellbeing = check.wellbeing && !teacher;
  const message: Data = {
    uid,
    name,
    avatar_url: typeof profile.avatar_url === "string" ? profile.avatar_url : "",
    role: teacher ? "teacher" : "student",
    text,
    created_at: now.toISOString(),
    deleted: false,
    // A message that suggests a student may be at risk goes straight to the
    // teacher's attention, without blocking the student from reaching out.
    reported: wellbeing,
    report_count: wellbeing ? 1 : 0,
    report_reasons: wellbeing ? ["wellbeing"] : [],
  };
  const writes: Write[] = [fs.create(`classes/${classId}/messages/${id}`, message), fs.set(usagePath, { minute, count: count + 1, last_at: now.toISOString() })];
  if (wellbeing) writes.push(moderationRecord(ctx, classId, { action: "flagged", actor_role: "system", message_id: id, author_uid: uid, author_name: name, text, reason: "wellbeing" }));
  await fs.commit(writes);
  return { id, message, support: wellbeing };
}

async function loadMessage(ctx: Ctx, classId: string, id: string): Promise<Doc> {
  const msg = await ctx.fs.get(`classes/${classId}/messages/${id}`);
  if (!msg) throw new HttpError(404, "not_found", "That message was already removed.");
  return msg;
}

export async function handleChatDelete(ctx: Ctx, body: Body): Promise<unknown> {
  const classId = str(body, "classId", { max: 40 });
  const id = messageId(body);
  const { teacher } = await access(ctx, classId);
  const msg = await loadMessage(ctx, classId, id);
  const own = msg.data.uid === ctx.uid;
  if (!teacher && !own) throw new HttpError(403, "not_allowed", "You can only delete your own messages.");
  if (msg.data.deleted === true) return { ok: true };
  // Keep a tombstone so the conversation still reads in order, and a copy of
  // the text in the moderation log.
  await ctx.fs.commit([
    ctx.fs.patch(msg.path, { deleted: true, deleted_by: own ? "author" : "teacher", text: "", reported: false, deleted_at: ctx.now.toISOString() }, true),
    moderationRecord(ctx, classId, {
      action: "deleted",
      actor_role: own && !teacher ? "student" : "teacher",
      message_id: id,
      author_uid: String(msg.data.uid ?? ""),
      author_name: String(msg.data.name ?? ""),
      text: String(msg.data.text ?? ""),
      reason: own ? "deleted by its author" : undefined,
    }),
  ]);
  return { ok: true };
}

export async function handleChatReport(ctx: Ctx, body: Body): Promise<unknown> {
  const classId = str(body, "classId", { max: 40 });
  const id = messageId(body);
  const reason = (REPORT_REASONS as readonly string[]).includes(String(body.reason)) ? (body.reason as ReportReason) : "other";
  await access(ctx, classId);
  const msg = await loadMessage(ctx, classId, id);
  if (msg.data.uid === ctx.uid) throw new HttpError(400, "own_message", "You can't report your own message.");
  if (msg.data.deleted === true) return { ok: true };
  // One report per person per message. Who reported is only in the
  // teacher-only log, never on the message classmates can read.
  try {
    await ctx.fs.commit([
      moderationRecord(
        ctx,
        classId,
        { action: "reported", actor_role: "student", message_id: id, author_uid: String(msg.data.uid ?? ""), author_name: String(msg.data.name ?? ""), text: String(msg.data.text ?? ""), reason },
        `report_${id}_${ctx.uid}`.replace(/[^A-Za-z0-9_]/g, "").slice(0, 120),
      ),
    ]);
  } catch (err) {
    if (err instanceof FirestoreError && (err.status === 409 || err.code === "ALREADY_EXISTS")) return { ok: true };
    throw err;
  }
  await ctx.fs.runTransaction(async (tx) => {
    const m = await tx.get(msg.path);
    if (!m) return { writes: [] as Write[], result: null };
    const reasons = Array.isArray(m.data.report_reasons) ? (m.data.report_reasons as string[]) : [];
    return {
      writes: [ctx.fs.patch(m.path, { reported: true, report_count: num(m.data.report_count) + 1, report_reasons: [...new Set([...reasons, reason])] }, true)],
      result: null,
    };
  });
  return { ok: true };
}

export async function handleChatDismiss(ctx: Ctx, body: Body): Promise<unknown> {
  const classId = str(body, "classId", { max: 40 });
  const id = messageId(body);
  const { teacher } = await access(ctx, classId);
  if (!teacher) throw new HttpError(403, "not_teacher", "Only the teacher can do that.");
  const msg = await loadMessage(ctx, classId, id);
  await ctx.fs.commit([
    ctx.fs.patch(msg.path, { reported: false }, true),
    moderationRecord(ctx, classId, { action: "dismissed", actor_role: "teacher", message_id: id, author_uid: String(msg.data.uid ?? ""), author_name: String(msg.data.name ?? ""), text: String(msg.data.text ?? "") }),
  ]);
  return { ok: true };
}

export async function handleChatMute(ctx: Ctx, body: Body): Promise<unknown> {
  const classId = str(body, "classId", { max: 40 });
  const target = str(body, "uid", { max: 128 });
  if (typeof body.muted !== "boolean") throw new HttpError(400, "invalid_input", "muted must be true or false");
  const muted = body.muted;
  const { teacher } = await access(ctx, classId);
  if (!teacher) throw new HttpError(403, "not_teacher", "Only the teacher can mute students.");
  const member = await ctx.fs.get(`classes/${classId}/members/${target}`);
  if (!member && muted) throw new HttpError(404, "not_found", "That student isn't in this class.");
  const mutePath = `classes/${classId}/mutes/${target}`;
  const writes: Write[] = [
    muted ? ctx.fs.set(mutePath, { uid: target, at: ctx.now.toISOString(), by: ctx.uid }) : ctx.fs.delete(mutePath),
    moderationRecord(ctx, classId, { action: muted ? "muted" : "unmuted", actor_role: "teacher", author_uid: target, author_name: String(member?.data.username ?? "") }),
  ];
  if (member) writes.push(ctx.fs.patch(member.path, { muted }, true));
  await ctx.fs.commit(writes);
  return { ok: true, muted };
}

export async function handleChatToggle(ctx: Ctx, body: Body): Promise<unknown> {
  const classId = str(body, "classId", { max: 40 });
  if (typeof body.enabled !== "boolean") throw new HttpError(400, "invalid_input", "enabled must be true or false");
  const { cls, teacher } = await access(ctx, classId);
  if (!teacher) throw new HttpError(403, "not_teacher", "Only the teacher can turn chat on or off.");
  await ctx.fs.commit([
    ctx.fs.patch(cls.path, { chat_enabled: body.enabled, updated_at: ctx.now.toISOString() }, true),
    moderationRecord(ctx, classId, { action: body.enabled ? "chat_on" : "chat_off", actor_role: "teacher" }),
  ]);
  return { ok: true, enabled: body.enabled };
}
