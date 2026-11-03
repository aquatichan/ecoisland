// Retention: deletes class chat messages after CHAT_RETENTION_DAYS and
// moderation records after MODERATION_RETENTION_DAYS. Runs from the daily
// Cron Trigger (see worker/index.ts and wrangler.jsonc), so what the privacy
// policy promises is what Firestore actually holds.

import { CHAT_RETENTION_DAYS, MODERATION_RETENTION_DAYS } from "./chat";
import type { Firestore } from "./firestore";

const DAY_MS = 86_400_000;
const BATCH = 400;
const MAX_ROUNDS = 25; // up to 10,000 documents per collection per day

async function purge(fs: Firestore, collectionId: string, field: string, cutoff: string): Promise<number> {
  let removed = 0;
  for (let round = 0; round < MAX_ROUNDS; round++) {
    const docs = await fs.groupBefore(collectionId, field, cutoff, BATCH);
    // Only class chat collections: classes/{id}/messages and classes/{id}/moderation.
    const mine = docs.filter((d) => /^classes\/[^/]+\/(messages|moderation)\/[^/]+$/.test(d.path));
    if (mine.length) await fs.commit(mine.map((d) => fs.delete(d.path)));
    removed += mine.length;
    if (docs.length < BATCH) break;
  }
  return removed;
}

export async function runRetention(fs: Firestore, now: Date = new Date()): Promise<{ messages: number; moderation: number }> {
  const messages = await purge(fs, "messages", "created_at", new Date(now.getTime() - CHAT_RETENTION_DAYS * DAY_MS).toISOString());
  const moderation = await purge(fs, "moderation", "at", new Date(now.getTime() - MODERATION_RETENTION_DAYS * DAY_MS).toISOString());
  return { messages, moderation };
}
