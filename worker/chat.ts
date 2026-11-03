// Class chat. Messages are written only here, so every one is checked:
// the sender belongs to the class, chat is on, they aren't muted, the text is
// clean and they aren't flooding. Members read messages live from Firestore
// (classes/{id}/messages, see firestore.rules).
//
//   chat/send    { classId, text }
//   chat/delete  { classId, messageId }        teacher, or the author
//   chat/report  { classId, messageId }        any member, not their own
//   chat/dismiss { classId, messageId }        teacher: keep a reported message
//   chat/mute    { classId, uid, muted }       teacher

import type { Ctx } from "./env";
import type { Data, Doc } from "./firestore";
import { HttpError, asStringArray, num, str } from "./http";
import { hasBlockedLanguage } from "./moderation";
import { displayName, randomId } from "./state";

type Body = Record<string, unknown>;

export const CHAT_MAX_CHARS = 500;
const PER_MINUTE = 10;
const MIN_GAP_MS = 1200;
const ID_RE = /^[A-Za-z0-9]{1,40}$/;

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

export async function handleChatSend(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid, now } = ctx;
  const classId = str(body, "classId", { max: 40 });
  const raw = typeof body.text === "string" ? body.text : "";
  const text = cleanChatText(raw);
  if (!text) throw new HttpError(400, "empty", "Write a message first.");
  if (text.length > CHAT_MAX_CHARS) throw new HttpError(400, "too_long", `Messages can be up to ${CHAT_MAX_CHARS} characters.`);

  const { cls, teacher, member } = await access(ctx, classId);
  if (cls.data.chat_enabled !== true) throw new HttpError(403, "chat_off", "Chat is turned off for this class.");
  if (!teacher && member?.data.muted === true) throw new HttpError(403, "muted", "Your teacher has muted you in this chat.");
  if (hasBlockedLanguage(text)) throw new HttpError(400, "blocked_language", "That message has language that isn't allowed in class chat.");

  // Flood control: a short gap between messages and a per-minute cap.
  const usagePath = `users/${uid}/usage/chat_${classId}`;
  const user = await fs.getAll([usagePath, `users/${uid}`]);
  const usage = user.get(usagePath)?.data ?? {};
  const profile = user.get(`users/${uid}`)?.data ?? {};
  const minute = now.toISOString().slice(0, 16);
  const count = usage.minute === minute ? num(usage.count) : 0;
  const lastAt = typeof usage.last_at === "string" ? Date.parse(usage.last_at) : 0;
  if (now.getTime() - lastAt < MIN_GAP_MS || count >= PER_MINUTE) {
    throw new HttpError(429, "slow_down", "You're sending messages too fast. Wait a few seconds.");
  }

  const id = randomId();
  const message: Data = {
    uid,
    name: displayName(profile),
    avatar_url: typeof profile.avatar_url === "string" ? profile.avatar_url : "",
    role: teacher ? "teacher" : "student",
    text,
    created_at: now.toISOString(),
    deleted: false,
    reported: false,
    reports: [],
  };
  await fs.commit([
    fs.create(`classes/${classId}/messages/${id}`, message),
    fs.set(usagePath, { minute, count: count + 1, last_at: now.toISOString() }),
  ]);
  return { id, message };
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
  // Keep a tombstone so the conversation still reads in order.
  await ctx.fs.commit([
    ctx.fs.patch(msg.path, { deleted: true, deleted_by: own ? "author" : "teacher", text: "", reported: false, reports: [], deleted_at: ctx.now.toISOString() }, true),
  ]);
  return { ok: true };
}

export async function handleChatReport(ctx: Ctx, body: Body): Promise<unknown> {
  const classId = str(body, "classId", { max: 40 });
  const id = messageId(body);
  await access(ctx, classId);
  const msg = await loadMessage(ctx, classId, id);
  if (msg.data.uid === ctx.uid) throw new HttpError(400, "own_message", "You can't report your own message.");
  if (msg.data.deleted === true) return { ok: true };
  const reports = asStringArray(msg.data.reports);
  if (!reports.includes(ctx.uid)) {
    await ctx.fs.commit([ctx.fs.patch(msg.path, { reported: true, reports: [...reports, ctx.uid].slice(-50) }, true)]);
  }
  return { ok: true };
}

export async function handleChatDismiss(ctx: Ctx, body: Body): Promise<unknown> {
  const classId = str(body, "classId", { max: 40 });
  const id = messageId(body);
  const { teacher } = await access(ctx, classId);
  if (!teacher) throw new HttpError(403, "not_teacher", "Only the teacher can do that.");
  const msg = await loadMessage(ctx, classId, id);
  await ctx.fs.commit([ctx.fs.patch(msg.path, { reported: false, reports: [] }, true)]);
  return { ok: true };
}

export async function handleChatMute(ctx: Ctx, body: Body): Promise<unknown> {
  const classId = str(body, "classId", { max: 40 });
  const target = str(body, "uid", { max: 128 });
  if (typeof body.muted !== "boolean") throw new HttpError(400, "invalid_input", "muted must be true or false");
  const { teacher } = await access(ctx, classId);
  if (!teacher) throw new HttpError(403, "not_teacher", "Only the teacher can mute students.");
  const member = await ctx.fs.get(`classes/${classId}/members/${target}`);
  if (!member) throw new HttpError(404, "not_found", "That student isn't in this class.");
  await ctx.fs.commit([ctx.fs.patch(member.path, { muted: body.muted }, true)]);
  return { ok: true, muted: body.muted };
}
