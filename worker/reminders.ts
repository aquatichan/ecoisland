// Opt-in streak reminders, sent once a day by a Cron Trigger.
//
// A student who turned on "Email me if my island is about to wilt" and whose
// last daily set was yesterday (so the streak ends tonight) gets one short
// email. Nothing is sent unless RESEND_API_KEY and REMINDER_FROM are set.
// Every email carries a one-click unsubscribe link.

import { addDays, effectiveStreak, isDayKey, utcDayKey, type DayKey } from "../src/shared/dates";
import type { Env } from "./env";
import type { Firestore } from "./firestore";
import { base64UrlEncode } from "./jwt";
import { displayName, readRecord } from "./state";

const enc = new TextEncoder();

async function hmacKey(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", enc.encode(`ecoisland-unsubscribe:${secret}`));
  return crypto.subtle.importKey("raw", digest, { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function unsubscribeToken(secret: string, uid: string): Promise<string> {
  const key = await hmacKey(secret);
  return base64UrlEncode(await crypto.subtle.sign("HMAC", key, enc.encode(uid)));
}

export async function verifyUnsubscribe(secret: string, uid: string, token: string): Promise<boolean> {
  return token.length > 0 && token === (await unsubscribeToken(secret, uid));
}

export function remindersConfigured(env: Env): boolean {
  return !!env.RESEND_API_KEY && !!env.REMINDER_FROM;
}

function emailBody(name: string, streak: number, unsubscribeUrl: string, appUrl: string) {
  const subject = streak > 1 ? `Your ${streak}-day streak ends tonight` : "Your island could use some water";
  const lead = streak > 1 ? `You've studied ${streak} days in a row.` : "You studied yesterday, and today's daily set is waiting.";
  const text = `Hi ${name},\n\n${lead} One daily set (about five minutes) keeps your streak going and your island green.\n\nStart today's set: ${appUrl}/practice?mode=daily\n\nYou're getting this because you turned on reminders in Ecoisland. Stop these emails: ${unsubscribeUrl}\n`;
  const html = `<div style="font-family:-apple-system,Segoe UI,Inter,sans-serif;font-size:15px;line-height:1.55;color:#16201a;max-width:480px">
<p>Hi ${name.replace(/[<>&"]/g, "")},</p>
<p>${lead} One daily set (about five minutes) keeps your streak going and your island green.</p>
<p><a href="${appUrl}/practice?mode=daily" style="display:inline-block;background:#1c7c50;color:#ffffff;text-decoration:none;font-weight:600;padding:10px 16px;border-radius:10px">Start today's daily set</a></p>
<p style="font-size:12.5px;color:#59645c">You're getting this because you turned on reminders in Ecoisland. <a href="${unsubscribeUrl}" style="color:#59645c">Stop these emails</a>.</p>
</div>`;
  return { subject, text, html };
}

/** Sends today's reminders. Returns how many were sent. */
export async function sendReminders(env: Env, fs: Firestore, fetcher: typeof fetch, now = new Date(), appUrl = "https://ecoisland.xyz"): Promise<number> {
  if (!remindersConfigured(env)) return 0;
  const secret = env.FIREBASE_SERVICE_ACCOUNT ?? env.RESEND_API_KEY ?? "";
  const today = utcDayKey(now);
  const yesterday = addDays(today, -1);
  const users = await fs.query("", "users", [["email_reminders", true]], 1000);
  let sent = 0;
  for (const u of users) {
    const r = readRecord(u.data);
    const email = typeof u.data.email === "string" ? u.data.email : "";
    const lastReminder = isDayKey(u.data.last_reminder_day) ? (u.data.last_reminder_day as DayKey) : null;
    // Only students whose streak is still alive but ends tonight, once a day.
    if (!email || r.last_set_day !== yesterday || lastReminder === today) continue;
    const streak = effectiveStreak(r.streak, r.last_set_day, today);
    const token = await unsubscribeToken(secret, u.id);
    const unsubscribeUrl = `${appUrl}/api/unsubscribe?u=${encodeURIComponent(u.id)}&t=${token}`;
    const { subject, text, html } = emailBody(displayName(u.data), streak, unsubscribeUrl, appUrl);
    const res = await fetcher("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.REMINDER_FROM,
        to: [email],
        subject,
        text,
        html,
        headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
      }),
    });
    if (res.ok) {
      sent++;
      await fs.commit([fs.patch(u.path, { last_reminder_day: today }, true)]);
    } else {
      console.error("reminder failed", res.status);
    }
  }
  return sent;
}
