// Act: volunteer events, eco actions, service hours and the ambassador
// program. Everything here is written by the server, so it can check who is
// allowed to post, keep counts honest and grant rewards once.
//
//   event/save       { scope, classId?, id?, ...fields }  post or edit a listing
//   event/cancel     { scope, classId?, id }
//   event/review     { id, approve, note? }                admin: a suggestion
//   event/rsvp       { scope, classId?, id, going }
//   action/complete  { scope, classId?, id, text }         an eco action, once
//   hours/log        { event?, title?, orgName?, date, hours, text, classId? }
//   hours/delete     { id }                                unverified only
//   hours/review     { id, approve, note? }                the verifying teacher
//   ambassador/apply { fullName, school, grade, region, why, idea?, sponsor?, agree }
//   ambassador/review{ uid, approve, note? }               admin

import {
  ACT_REWARD,
  CATEGORY_IDS,
  EMAIL_RE,
  GRADES,
  LIMITS,
  PHONE_RE,
  actionOpen,
  eventDays,
  eventKey,
  eventPath,
  hoursReward,
  isValidHours,
  parseEventKey,
  safeUrl,
  type Category,
  type EventScope,
} from "../src/shared/act";
import { findAction } from "../src/shared/actions";
import { addDays, daysBetween, isDayKey, utcDayKey } from "../src/shared/dates";
import { cleanChatText } from "./chat";
import type { Ctx } from "./env";
import { FirestoreError, type Data, type Doc, type Write } from "./firestore";
import { optionalDay, publicState, requireUser } from "./handlers";
import { HttpError, asStringArray, int, num, str } from "./http";
import { hasBlockedLanguage } from "./moderation";
import { activityWrites, displayName, memberPaths, randomId, readRecord } from "./state";

type Body = Record<string, unknown>;
const ID_RE = /^[A-Za-z0-9]{1,40}$/;
const DAY_MS = 86_400_000;

// ─── helpers ────────────────────────────────────────────────────────────────

export async function isAdmin(ctx: Ctx): Promise<boolean> {
  return !!(await ctx.fs.get(`admins/${ctx.uid}`));
}

function id(body: Body, key = "id"): string {
  const v = str(body, key, { max: 40 });
  if (!ID_RE.test(v)) throw new HttpError(400, "invalid_input", `Unknown ${key}`);
  return v;
}

/** One line of text: collapses whitespace. */
function line(body: Body, key: string, min: number, max: number, optional = false): string {
  const raw = body[key];
  if ((raw === undefined || raw === null || raw === "") && optional) return "";
  if (typeof raw !== "string") throw new HttpError(400, "invalid_input", `${key} must be text`);
  const v = raw.replace(/\s+/g, " ").trim();
  if (!v && optional) return "";
  if (v.length < min) throw new HttpError(400, "invalid_input", `${label(key)} is too short`);
  if (v.length > max) throw new HttpError(400, "invalid_input", `${label(key)} is too long (${max} characters max)`);
  return v;
}

/** Paragraphs of text. */
function prose(body: Body, key: string, min: number, max: number): string {
  const raw = body[key];
  const v = typeof raw === "string" ? cleanChatText(raw) : "";
  if (v.length < min) throw new HttpError(400, "too_short", min > 1 ? `${label(key)} needs at least ${min} characters.` : `${label(key)} is missing`);
  if (v.length > max) throw new HttpError(400, "too_long", `${label(key)} is too long (${max} characters max).`);
  return v;
}

const LABELS: Record<string, string> = {
  title: "The title",
  summary: "The summary",
  details: "The description",
  location: "The location",
  region: "The region",
  orgName: "The organization name",
  text: "Your write-up",
  why: "Your answer",
  fullName: "Your name",
  school: "Your school",
};
const label = (key: string) => LABELS[key] ?? key;

function optionalEmail(body: Body, key: string): string {
  const v = typeof body[key] === "string" ? (body[key] as string).trim() : "";
  if (!v) return "";
  if (v.length > LIMITS.EMAIL || !EMAIL_RE.test(v)) throw new HttpError(400, "invalid_input", "That email address doesn't look right.");
  return v;
}

function optionalUrl(body: Body, key: string): string {
  const v = typeof body[key] === "string" ? (body[key] as string).trim() : "";
  if (!v) return "";
  const url = safeUrl(v);
  if (!url) throw new HttpError(400, "invalid_input", "Links must be web addresses, like https://example.org.");
  return url;
}

function optionalPhone(body: Body, key: string): string {
  const v = typeof body[key] === "string" ? (body[key] as string).trim() : "";
  if (!v) return "";
  if (!PHONE_RE.test(v)) throw new HttpError(400, "invalid_input", "That phone number doesn't look right.");
  return v;
}

function iso(body: Body, key: string): Date {
  const v = body[key];
  const d = typeof v === "string" ? new Date(v) : null;
  if (!d || Number.isNaN(d.getTime())) throw new HttpError(400, "invalid_input", "Pick a start and end time.");
  return d;
}

function scopeOf(body: Body): EventScope {
  if (body.scope === "class" || body.scope === "community") return body.scope;
  throw new HttpError(400, "invalid_input", "Unknown listing");
}

type Access = { event: Doc; scope: EventScope; classId: string | null; teacher: boolean; member: boolean; cls: Doc | null };

/** Loads an event the caller is allowed to see. */
async function loadEvent(ctx: Ctx, body: Body): Promise<Access> {
  const scope = scopeOf(body);
  const eid = id(body);
  if (scope === "community") {
    const event = await ctx.fs.get(eventPath("community", null, eid));
    if (!event || (event.data.status !== "published" && event.data.status !== "cancelled" && event.data.created_by !== ctx.uid)) {
      throw new HttpError(404, "not_found", "That listing isn't available.");
    }
    return { event, scope, classId: null, teacher: false, member: false, cls: null };
  }
  const classId = id(body, "classId");
  const docs = await ctx.fs.getAll([`classes/${classId}`, `classes/${classId}/members/${ctx.uid}`, eventPath("class", classId, eid)]);
  const cls = docs.get(`classes/${classId}`) ?? null;
  const event = docs.get(eventPath("class", classId, eid)) ?? null;
  const teacher = cls?.data.teacher_id === ctx.uid;
  const member = !!docs.get(`classes/${classId}/members/${ctx.uid}`);
  if (!cls || !event || (!teacher && !member)) throw new HttpError(404, "not_found", "That listing isn't available.");
  return { event, scope, classId, teacher, member, cls };
}

async function bumpUsage(ctx: Ctx, field: string, cap: number, message: string): Promise<void> {
  const path = `users/${ctx.uid}/usage/${utcDayKey(ctx.now)}`;
  await ctx.fs.runTransaction(async (tx) => {
    const usage = await tx.get(path);
    const used = num(usage?.data[field]);
    if (used >= cap) throw new HttpError(429, "daily_limit", message);
    return { writes: [ctx.fs.patch(path, { day: utcDayKey(ctx.now), [field]: used + 1 })], result: null };
  });
}

// ─── listings ───────────────────────────────────────────────────────────────

function readListing(body: Body, now: Date, editing: boolean, community: boolean): Data {
  const kind = body.kind === "event" || body.kind === "action" ? body.kind : null;
  if (!kind) throw new HttpError(400, "invalid_input", "Choose an event or an eco action.");
  const category = body.category as Category;
  if (!CATEGORY_IDS.includes(category)) throw new HttpError(400, "invalid_input", "Choose a category.");
  const unit = body.unit === null || body.unit === undefined || body.unit === "" ? null : int(body, "unit", 1, 9);
  const actionId = typeof body.actionId === "string" && body.actionId ? body.actionId : null;
  if (actionId && !findAction(actionId)) throw new HttpError(400, "invalid_input", "Unknown eco action");

  const out: Data = {
    kind,
    category,
    title: line(body, "title", 3, LIMITS.TITLE),
    summary: line(body, "summary", 10, LIMITS.SUMMARY),
    details: prose(body, "details", 0, LIMITS.DETAILS),
    unit,
    action_id: actionId,
    location: line(body, "location", 2, LIMITS.LOCATION, kind === "action"),
    region: line(body, "region", 2, LIMITS.REGION, true),
    org_name: line(body, "orgName", 2, LIMITS.ORG, kind === "action"),
    org_email: optionalEmail(body, "orgEmail"),
    org_url: optionalUrl(body, "orgUrl"),
    org_phone: optionalPhone(body, "orgPhone"),
    signup_url: optionalUrl(body, "signupUrl"),
  };

  if (kind === "event") {
    const start = iso(body, "startsAt");
    const end = iso(body, "endsAt");
    if (end <= start) throw new HttpError(400, "invalid_input", "The event has to end after it starts.");
    if (end.getTime() - start.getTime() > LIMITS.MAX_EVENT_DAYS * DAY_MS) throw new HttpError(400, "invalid_input", `Events can last up to ${LIMITS.MAX_EVENT_DAYS} days.`);
    if (!editing && end.getTime() < now.getTime()) throw new HttpError(400, "invalid_input", "That event has already ended.");
    if (start.getTime() > now.getTime() + 400 * DAY_MS) throw new HttpError(400, "invalid_input", "Events can be posted up to a year ahead.");
    out.starts_at = start.toISOString();
    out.ends_at = end.toISOString();
    out.start_day = null;
    out.end_day = null;
    const hours = body.hours === null || body.hours === undefined || body.hours === "" ? null : body.hours;
    if (hours !== null && !isValidHours(hours)) throw new HttpError(400, "invalid_input", `Hours must be between 0.25 and ${LIMITS.MAX_HOURS_PER_LOG}, in quarter hours.`);
    out.hours = hours;
    const capacity = body.capacity === null || body.capacity === undefined || body.capacity === "" ? null : int(body, "capacity", 1, 10000);
    out.capacity = capacity;
    if (community && !out.org_email && !out.org_url && !out.org_phone && !out.signup_url) {
      throw new HttpError(400, "invalid_input", "Add at least one way to contact the organizer or sign up.");
    }
  } else {
    const startDay = body.startDay;
    const endDay = body.endDay;
    if (!isDayKey(startDay) || !isDayKey(endDay)) throw new HttpError(400, "invalid_input", "Pick a start and end day.");
    if (endDay < startDay) throw new HttpError(400, "invalid_input", "The last day has to be on or after the first.");
    if (daysBetween(startDay, endDay) > LIMITS.MAX_ACTION_DAYS) throw new HttpError(400, "invalid_input", `Eco actions can run up to ${LIMITS.MAX_ACTION_DAYS} days.`);
    if (!editing && endDay < addDays(utcDayKey(now), -1)) throw new HttpError(400, "invalid_input", "That window has already ended.");
    out.start_day = startDay;
    out.end_day = endDay;
    out.starts_at = null;
    out.ends_at = null;
    out.hours = null;
    out.capacity = null;
  }
  for (const key of ["title", "summary", "details", "location", "org_name"]) {
    if (typeof out[key] === "string" && hasBlockedLanguage(out[key] as string)) {
      throw new HttpError(400, "blocked_language", "Part of this listing has language that isn't allowed.");
    }
  }
  return out;
}

export async function handleEventSave(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid, now } = ctx;
  const scope = scopeOf(body);
  const editId = body.id ? id(body) : null;
  const listing = readListing(body, now, !!editId, scope === "community");
  const [user, admin] = await Promise.all([fs.get(`users/${uid}`), isAdmin(ctx)]);
  if (!user) throw new HttpError(404, "no_profile", "Your profile is still being set up. Refresh the page and try again.");

  let classId: string | null = null;
  let className: string | null = null;
  let teacher = false;
  if (scope === "class") {
    classId = id(body, "classId");
    const cls = await fs.get(`classes/${classId}`);
    teacher = cls?.data.teacher_id === uid;
    if (!cls || !teacher) throw new HttpError(403, "not_teacher", "Only this class's teacher can post class events.");
    className = String(cls.data.name ?? "");
  }
  const trusted = admin || user.data.ambassador === true;

  if (editId) {
    const path = eventPath(scope, classId, editId);
    const existing = await fs.get(path);
    if (!existing) throw new HttpError(404, "not_found", "That listing no longer exists.");
    if (existing.data.created_by !== uid && !admin && !teacher) throw new HttpError(403, "not_allowed", "You can only edit your own listings.");
    if (existing.data.status === "cancelled") throw new HttpError(409, "cancelled", "This listing was cancelled.");
    if (existing.data.kind !== listing.kind) throw new HttpError(400, "invalid_input", "An event can't become an eco action. Post a new listing instead.");
    const status = existing.data.status === "rejected" ? "pending" : existing.data.status;
    await fs.commit([fs.patch(path, { ...listing, status, ...(className ? { class_name: className } : {}), updated_at: now.toISOString() }, true)]);
    return { id: editId, status };
  }

  const status = scope === "class" || trusted ? "published" : "pending";
  if (status === "pending") {
    await bumpUsage(ctx, "suggestions", LIMITS.SUGGESTIONS_PER_DAY, `You can suggest up to ${LIMITS.SUGGESTIONS_PER_DAY} listings a day.`);
  }
  const eid = randomId();
  await fs.commit([
    fs.create(eventPath(scope, classId, eid), {
      ...listing,
      scope,
      status,
      class_id: classId,
      class_name: className,
      going_count: 0,
      done_count: 0,
      created_by: uid,
      created_by_name: displayName(user.data),
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      review_note: null,
    }),
  ]);
  return { id: eid, status };
}

export async function handleEventCancel(ctx: Ctx, body: Body): Promise<unknown> {
  const scope = scopeOf(body);
  const eid = id(body);
  const classId = scope === "class" ? id(body, "classId") : null;
  const event = await ctx.fs.get(eventPath(scope, classId, eid));
  if (!event) throw new HttpError(404, "not_found", "That listing no longer exists.");
  let allowed = event.data.created_by === ctx.uid || (await isAdmin(ctx));
  if (!allowed && classId) allowed = (await ctx.fs.get(`classes/${classId}`))?.data.teacher_id === ctx.uid;
  if (!allowed) throw new HttpError(403, "not_allowed", "You can only cancel your own listings.");
  await ctx.fs.commit([ctx.fs.patch(event.path, { status: "cancelled", updated_at: ctx.now.toISOString() }, true)]);
  return { ok: true };
}

export async function handleEventReview(ctx: Ctx, body: Body): Promise<unknown> {
  if (!(await isAdmin(ctx))) throw new HttpError(403, "not_admin", "Only Ecoisland admins can review listings.");
  const eid = id(body);
  if (typeof body.approve !== "boolean") throw new HttpError(400, "invalid_input", "approve must be true or false");
  const note = line(body, "note", 0, 300, true);
  const event = await ctx.fs.get(`events/${eid}`);
  if (!event) throw new HttpError(404, "not_found", "That listing no longer exists.");
  if (event.data.status !== "pending") throw new HttpError(409, "not_pending", "That listing was already reviewed.");
  await ctx.fs.commit([
    ctx.fs.patch(event.path, { status: body.approve ? "published" : "rejected", review_note: note || null, updated_at: ctx.now.toISOString() }, true),
  ]);
  return { ok: true };
}

export async function handleEventRsvp(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid, now } = ctx;
  if (typeof body.going !== "boolean") throw new HttpError(400, "invalid_input", "going must be true or false");
  const going = body.going;
  const access = await loadEvent(ctx, body);
  const e = access.event.data;
  if (e.kind !== "event") throw new HttpError(400, "invalid_input", "Eco actions don't need an RSVP. Just do it and mark it done.");
  if (going && e.status !== "published") throw new HttpError(409, "not_open", e.status === "cancelled" ? "This event was cancelled." : "This event isn't open yet.");
  if (going && typeof e.ends_at === "string" && Date.parse(e.ends_at) < now.getTime()) throw new HttpError(409, "ended", "This event has already ended.");
  const key = eventKey({ scope: access.scope, class_id: access.classId, id: access.event.id });
  const rsvpPath = `${access.event.path}/rsvps/${uid}`;

  return fs.runTransaction(async (tx) => {
    const event = await tx.get(access.event.path);
    const rsvp = await tx.get(rsvpPath);
    const user = await requireUser(tx, uid);
    if (!event) throw new HttpError(404, "not_found", "That listing no longer exists.");
    const r = readRecord(user.data);
    const count = Math.max(0, num(event.data.going_count));
    if (going === !!rsvp) return { writes: [] as Write[], result: { going, going_count: count } };
    if (going) {
      const capacity = num(event.data.capacity);
      if (capacity > 0 && count >= capacity) throw new HttpError(409, "full", "This event is full.");
      return {
        writes: [
          fs.create(rsvpPath, { uid, name: displayName(user.data), at: now.toISOString() }),
          fs.patch(event.path, { going_count: count + 1 }, true),
          fs.patch(user.path, { rsvp_events: [...r.rsvp_events.filter((k) => k !== key), key].slice(-200) }, true),
        ],
        result: { going: true, going_count: count + 1 },
      };
    }
    return {
      writes: [
        fs.delete(rsvpPath),
        fs.patch(event.path, { going_count: Math.max(0, count - 1) }, true),
        fs.patch(user.path, { rsvp_events: r.rsvp_events.filter((k) => k !== key) }, true),
      ],
      result: { going: false, going_count: Math.max(0, count - 1) },
    };
  });
}

// ─── eco actions ────────────────────────────────────────────────────────────

export async function handleActionComplete(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid, now } = ctx;
  const day = optionalDay(body, now);
  const access = await loadEvent(ctx, body);
  const e = access.event.data;
  if (e.kind !== "action") throw new HttpError(400, "invalid_input", "That listing isn't an eco action.");
  if (e.status !== "published") throw new HttpError(409, "not_open", "This eco action isn't open.");
  if (!actionOpen({ kind: "action", start_day: e.start_day as string, end_day: e.end_day as string }, day)) {
    throw new HttpError(409, "not_open", "This eco action isn't open right now.");
  }
  if (access.scope === "class" && access.teacher) throw new HttpError(400, "teacher", "Teachers can't complete their own class's eco actions.");
  const text = prose(body, "text", LIMITS.REFLECTION_MIN, LIMITS.REFLECTION_MAX);
  if (hasBlockedLanguage(text)) throw new HttpError(400, "blocked_language", "Your write-up has language that isn't allowed.");
  const key = eventKey({ scope: access.scope, class_id: access.classId, id: access.event.id });
  const title = String(e.title ?? "Eco action");

  const out = await fs.runTransaction(async (tx) => {
    const user = await requireUser(tx, uid);
    const event = await tx.get(access.event.path);
    if (!event) throw new HttpError(404, "not_found", "That listing no longer exists.");
    const r = readRecord(user.data);
    if (r.actions_done.includes(key)) throw new HttpError(409, "already_done", "You've already finished this eco action.");
    const members = await tx.getAll(memberPaths(uid, user.data));
    const { writes, data } = activityWrites(
      fs,
      user,
      { day, tc: ACT_REWARD.ACTION_TC, xp: ACT_REWARD.ACTION_XP, patch: { actions_done: [...r.actions_done, key].slice(-300) } },
      members,
    );
    writes.push(fs.patch(event.path, { done_count: num(event.data.done_count) + 1 }, true));
    writes.push(fs.set(`users/${uid}/actions/${key}`, { key, title, text, day, created_at: now.toISOString() }));
    return { writes, result: { data, members } };
  });

  // Share the write-up as a field note: with this class, or (for a
  // community action) with every class the student is in.
  const notes: Write[] = [];
  for (const [path, member] of out.members) {
    if (!member) continue;
    const cid = path.split("/")[1];
    if (access.scope === "class" && cid !== access.classId) continue;
    notes.push(
      fs.set(`classes/${cid}/notes/${uid}_${key}`, {
        uid,
        username: displayName(out.data),
        avatar_url: typeof out.data.avatar_url === "string" ? out.data.avatar_url : "",
        unit: typeof e.unit === "number" ? e.unit : null,
        kind: "action",
        event_key: key,
        title,
        text,
        created_at: now.toISOString(),
      }),
    );
  }
  await fs.commit(notes).catch((err) => console.error("action note share failed", err));
  return { reward: { tc: ACT_REWARD.ACTION_TC, xp: ACT_REWARD.ACTION_XP }, state: publicState(out.data) };
}

// ─── volunteer hours ────────────────────────────────────────────────────────

export async function handleHoursLog(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid, now } = ctx;
  const today = utcDayKey(now);
  const date = body.date;
  if (!isDayKey(date) || date > addDays(today, 1) || date < addDays(today, -LIMITS.HOURS_LOOKBACK_DAYS)) {
    throw new HttpError(400, "invalid_input", "Pick the day you volunteered (within the last year).");
  }
  if (!isValidHours(body.hours)) throw new HttpError(400, "invalid_input", `Hours must be between 0.25 and ${LIMITS.MAX_HOURS_PER_LOG}, in quarter hours.`);
  const hours = body.hours;
  const text = prose(body, "text", LIMITS.HOURS_TEXT_MIN, LIMITS.HOURS_TEXT_MAX);
  if (hasBlockedLanguage(text)) throw new HttpError(400, "blocked_language", "Your description has language that isn't allowed.");

  let title: string;
  let org: string;
  let key: string | null = null;
  if (body.event && typeof body.event === "object") {
    const access = await loadEvent(ctx, body.event as Body);
    const e = access.event.data;
    if (e.kind !== "event" || e.status !== "published") throw new HttpError(400, "invalid_input", "You can log hours for published volunteer events.");
    const days = eventDays({ kind: "event", starts_at: e.starts_at as string, ends_at: e.ends_at as string });
    if (!days || Date.parse(String(e.starts_at)) > now.getTime()) throw new HttpError(409, "not_started", "You can log hours once the event has started.");
    if (date < addDays(days.start, -1)) throw new HttpError(400, "invalid_input", "That's before the event started.");
    title = String(e.title);
    org = String(e.org_name || e.created_by_name || "");
    key = eventKey({ scope: access.scope, class_id: access.classId, id: access.event.id });
  } else {
    title = line(body, "title", 3, LIMITS.TITLE);
    org = line(body, "orgName", 2, LIMITS.ORG);
  }

  const user = await fs.get(`users/${uid}`);
  if (!user) throw new HttpError(404, "no_profile", "Your profile is still being set up.");
  let verifier: { class_id: string; class_name: string; teacher_uid: string; teacher_name: string } | null = null;
  if (body.classId) {
    const cid = id(body, "classId");
    if (!readRecord(user.data).class_ids.includes(cid)) throw new HttpError(400, "invalid_input", "Choose one of your classes.");
    const cls = await fs.get(`classes/${cid}`);
    if (!cls) throw new HttpError(404, "not_found", "That class no longer exists.");
    verifier = { class_id: cid, class_name: String(cls.data.name ?? ""), teacher_uid: String(cls.data.teacher_id), teacher_name: String(cls.data.teacher_name ?? "") };
  }

  await bumpUsage(ctx, "hours_logs", LIMITS.HOURS_LOGS_PER_DAY, `You can log hours up to ${LIMITS.HOURS_LOGS_PER_DAY} times a day.`);
  const logId = key ? `${uid}_${key}` : randomId();
  const log: Data = {
    uid,
    name: displayName(user.data),
    event_key: key,
    title,
    org_name: org,
    date,
    hours,
    text,
    class_id: verifier?.class_id ?? null,
    class_name: verifier?.class_name ?? null,
    teacher_uid: verifier?.teacher_uid ?? null,
    teacher_name: verifier?.teacher_name ?? null,
    status: verifier ? "pending" : "self",
    review_note: null,
    reviewed_at: null,
    created_at: now.toISOString(),
  };
  try {
    await fs.commit([fs.create(`hours/${logId}`, log)]);
  } catch (err) {
    if (err instanceof FirestoreError && (err.status === 409 || err.code === "ALREADY_EXISTS")) {
      throw new HttpError(409, "already_logged", "You've already logged hours for this event.");
    }
    throw err;
  }
  return { id: logId, status: log.status };
}

export async function handleHoursDelete(ctx: Ctx, body: Body): Promise<unknown> {
  const logId = str(body, "id", { max: 200 });
  if (!/^[A-Za-z0-9_]{1,200}$/.test(logId)) throw new HttpError(400, "invalid_input", "Unknown entry");
  const log = await ctx.fs.get(`hours/${logId}`);
  if (!log || log.data.uid !== ctx.uid) throw new HttpError(404, "not_found", "That entry no longer exists.");
  if (log.data.status === "verified") throw new HttpError(409, "verified", "Verified hours stay on your record.");
  await ctx.fs.commit([ctx.fs.delete(log.path)]);
  return { ok: true };
}

export async function handleHoursReview(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid, now } = ctx;
  const logId = str(body, "id", { max: 200 });
  if (!/^[A-Za-z0-9_]{1,200}$/.test(logId)) throw new HttpError(400, "invalid_input", "Unknown entry");
  if (typeof body.approve !== "boolean") throw new HttpError(400, "invalid_input", "approve must be true or false");
  const approve = body.approve;
  const note = line(body, "note", 0, 300, true);
  const day = optionalDay(body, now);
  const reviewer = await fs.get(`users/${uid}`);
  const reviewerName = reviewer ? displayName(reviewer.data) : "Your teacher";

  type Result = { status: "verified" | "rejected"; reward?: { tc: number; xp: number } };
  return fs.runTransaction<Result>(async (tx) => {
    const log = await tx.get(`hours/${logId}`);
    if (!log || log.data.teacher_uid !== uid) throw new HttpError(404, "not_found", "That entry isn't waiting for you.");
    if (log.data.status !== "pending") throw new HttpError(409, "reviewed", "That entry was already reviewed.");
    const review: Data = { status: approve ? "verified" : "rejected", review_note: note || null, reviewed_at: now.toISOString(), teacher_name: reviewerName };
    if (!approve) return { writes: [fs.patch(log.path, review, true)], result: { status: "rejected" } };
    const student = await tx.get(`users/${log.data.uid}`);
    if (!student) return { writes: [fs.patch(log.path, review, true)], result: { status: "verified" } };
    const hours = num(log.data.hours);
    const reward = hoursReward(hours);
    const r = readRecord(student.data);
    const members = await tx.getAll(memberPaths(student.id, student.data));
    const { writes } = activityWrites(
      fs,
      student,
      { day, tc: reward.tc, xp: reward.xp, touch: false, patch: { hours_verified: Math.round((r.hours_verified + hours) * 100) / 100 } },
      members,
    );
    writes.push(fs.patch(log.path, review, true));
    return { writes, result: { status: "verified", reward } };
  });
}

// ─── ambassadors ────────────────────────────────────────────────────────────

export async function handleAmbassadorApply(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, uid, now, claims } = ctx;
  if (body.agree !== true) throw new HttpError(400, "invalid_input", "Please agree to the ambassador guidelines.");
  const grade = String(body.grade ?? "");
  if (!(GRADES as readonly string[]).includes(grade)) throw new HttpError(400, "invalid_input", "Choose your grade.");
  const application: Data = {
    uid,
    full_name: line(body, "fullName", 2, 80),
    school: line(body, "school", 2, 100),
    grade,
    region: line(body, "region", 2, LIMITS.REGION),
    why: prose(body, "why", LIMITS.AMBASSADOR_WHY_MIN, LIMITS.AMBASSADOR_WHY_MAX),
    idea: prose(body, "idea", 0, LIMITS.AMBASSADOR_IDEA_MAX),
    sponsor: line(body, "sponsor", 0, 80, true),
  };
  if ([application.why, application.idea, application.full_name, application.school].some((t) => hasBlockedLanguage(String(t)))) {
    throw new HttpError(400, "blocked_language", "Part of your application has language that isn't allowed.");
  }
  const path = `ambassador_applications/${uid}`;
  return fs.runTransaction(async (tx) => {
    const user = await requireUser(tx, uid);
    const existing = await tx.get(path);
    if (existing && (existing.data.status === "pending" || existing.data.status === "approved")) {
      throw new HttpError(409, "already_applied", existing.data.status === "approved" ? "You're already an ambassador." : "Your application is already being reviewed.");
    }
    const data: Data = {
      ...application,
      email: claims.email ?? (typeof user.data.email === "string" ? user.data.email : ""),
      username: displayName(user.data),
      status: "pending",
      review_note: null,
      created_at: now.toISOString(),
      reviewed_at: null,
    };
    return { writes: [fs.set(path, data)], result: { status: "pending" } };
  });
}

export async function handleAmbassadorReview(ctx: Ctx, body: Body): Promise<unknown> {
  const { fs, now } = ctx;
  if (!(await isAdmin(ctx))) throw new HttpError(403, "not_admin", "Only Ecoisland admins can review applications.");
  const target = str(body, "uid", { max: 128 });
  if (typeof body.approve !== "boolean") throw new HttpError(400, "invalid_input", "approve must be true or false");
  const approve = body.approve;
  const note = line(body, "note", 0, 300, true);
  const day = optionalDay(body, now);
  return fs.runTransaction(async (tx) => {
    const app = await tx.get(`ambassador_applications/${target}`);
    if (!app) throw new HttpError(404, "not_found", "That application no longer exists.");
    if (app.data.status !== "pending") throw new HttpError(409, "reviewed", "That application was already reviewed.");
    const review: Data = { status: approve ? "approved" : "declined", review_note: note || null, reviewed_at: now.toISOString() };
    if (!approve) return { writes: [fs.patch(app.path, review, true)], result: { status: "declined" } };
    const user = await tx.get(`users/${target}`);
    if (!user) throw new HttpError(404, "not_found", "That student's account no longer exists.");
    const members = await tx.getAll(memberPaths(user.id, user.data));
    const { writes } = activityWrites(
      fs,
      user,
      { day, tc: ACT_REWARD.AMBASSADOR_TC, xp: 0, touch: false, patch: { ambassador: true, ambassador_region: String(app.data.region ?? "") } },
      members,
    );
    writes.push(fs.patch(app.path, review, true));
    return { writes, result: { status: "approved" } };
  });
}

// ─── cleanup ────────────────────────────────────────────────────────────────

/** Drops a student's RSVPs (and fixes the counts) for the given event keys. */
export async function dropRsvps(ctx: Ctx, uid: string, keys: string[]): Promise<void> {
  for (const key of keys) {
    const ref = parseEventKey(key);
    if (!ref) continue;
    const path = eventPath(ref.scope, ref.classId, ref.id);
    await ctx.fs
      .runTransaction(async (tx) => {
        const rsvp = await tx.get(`${path}/rsvps/${uid}`);
        const event = await tx.get(path);
        if (!rsvp) return { writes: [] as Write[], result: null };
        const writes: Write[] = [ctx.fs.delete(rsvp.path)];
        if (event) writes.push(ctx.fs.patch(path, { going_count: Math.max(0, num(event.data.going_count) - 1) }, true));
        return { writes, result: null };
      })
      .catch((err) => console.error("rsvp cleanup failed", key, err));
  }
}

/** Everything a deleted account leaves in Act. */
export async function deleteActData(ctx: Ctx, uid: string, userData: Data | null): Promise<void> {
  const { fs } = ctx;
  if (userData) await dropRsvps(ctx, uid, asStringArray(userData.rsvp_events));
  const writes: Write[] = [];
  for (const h of await fs.query("", "hours", [["uid", uid]], 2000).catch(() => [] as Doc[])) writes.push(fs.delete(h.path));
  writes.push(fs.delete(`ambassador_applications/${uid}`));
  // Their pending suggestions go; published community listings stay up for
  // the organizations running them, without the poster's name.
  for (const e of await fs.query("", "events", [["created_by", uid]], 500).catch(() => [] as Doc[])) {
    if (e.data.status === "published" || e.data.status === "cancelled") writes.push(fs.patch(e.path, { created_by_name: "Former member" }, true));
    else writes.push(fs.delete(e.path));
  }
  await fs.commit(writes);
}
