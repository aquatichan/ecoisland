// Language filter for class chat. Blocks profanity and slurs (with leetspeak
// and repeated letters), while allowing APES vocabulary that naive filters
// trip on. Teachers moderate everything else.

import { RegExpMatcher, englishDataset, englishRecommendedTransformers } from "obscenity";

// Words from the course (and common school words) that contain a flagged
// substring. Found by running the filter over every lesson, question and
// vocabulary file.
const ALLOWED = [
  "assess", // assessment, reassess
  "assorted",
  "fukushima",
  "retardant", // fire retardants
  "scat", // animal scat
  "sex ratio",
  "cockpit",
  "dickinson",
  "cumin",
  "titmouse",
  "penistone",
  "fagus", // beech genus
  "peacock",
  "shuttlecock",
  "scrapbook",
  "off (k", // "runoff (kg N/ha/yr)" reads as a slur once punctuation is skipped
];

const built = englishDataset.build();
const matcher = new RegExpMatcher({
  ...built,
  whitelistedTerms: [...(built.whitelistedTerms ?? []), ...ALLOWED],
  ...englishRecommendedTransformers,
});

export function hasBlockedLanguage(text: string): boolean {
  return matcher.hasMatch(text);
}

// ─── Beyond profanity ───────────────────────────────────────────────────────
// Class chat is for minors, so links and contact details are kept out of
// student messages, harassment is blocked, and messages suggesting a student
// may be at risk are posted but flagged straight to the teacher.

/** Sites students may link to: course and reference material. */
const LINK_ALLOW = [
  /(^|\.)collegeboard\.org$/,
  /(^|\.)khanacademy\.org$/,
  /(^|\.)wikipedia\.org$/,
  /(^|\.)ecoisland\.xyz$/,
  /(^|\.)noaa\.gov$/,
  /\.gov$/,
  /\.edu$/,
  /(^|\.)nationalgeographic\.(com|org)$/,
  /(^|\.)inaturalist\.org$/,
  /(^|\.)airnow\.gov$/,
];

const TLDS = "com|net|org|io|gg|co|me|ly|app|xyz|tv|link|info|us|biz|site|online|edu|gov|ai|dev|to|cc";
const URL_RE = new RegExp(`(?:https?:\\/\\/[^\\s<>]+|www\\.[^\\s<>]+|\\b[a-z0-9-]+(?:\\.[a-z0-9-]+)*\\.(?:${TLDS})\\b(?:\\/[^\\s<>]*)?)`, "gi");
const EMAIL_RE = /[^\s@<>]+@[^\s@<>]+\.[a-z]{2,}/i;
// Separators stay on one line, so columns of numbers in a data table don't match.
const PHONE_RE = /(?<![\d,.])(?:\+?1[ .-]?)?\(?\b\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}\b(?![\d,])/;
const CONTACT_RE =
  /\b(snap ?chat|my snap|insta(gram)?|my insta|discord|tik ?tok|whats ?app|telegram|kik|signal app|dm me|text me|call me|hmu|my number|phone number|my cell|add me on|follow me on)\b/i;
const ADDRESS_RE = /\b\d{1,5}\s+(?:[a-z]+\s){1,3}(?:st|street|ave|avenue|rd|road|blvd|boulevard|ln|lane|dr|drive|ct|court|way|pl|place|terrace|cir|circle)\b|\b(my address is|i live at)\b/i;
const HARASSMENT_RE =
  /\b(kys|kill (?:yo)?u?r ?self|go die|hope (?:you|u) die|you should die|nobody likes (?:you|u)|everyone hates (?:you|u)|i(?:'ll| will| am gonna| am going to| wanna) (?:kill|hurt|beat up|find|jump) (?:you|u)|you(?:'re| are) (?:worthless|pathetic|a waste))\b/i;
const WELLBEING_RE =
  /\b(i want to die|i wanna die|kill myself|killing myself|end it all|suicid\w*|self[- ]?harm|cut myself|cutting myself|don'?t want to (?:live|be alive|be here anymore)|no reason to live)\b/i;

function hostOf(raw: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export type ChatCheck =
  | { ok: false; code: "blocked_language" | "harassment" | "contact_info" | "personal_info" | "link"; message: string }
  | { ok: true; wellbeing: boolean };

/** Checks a chat message. Teachers may share links and their own contact details. */
export function checkChatMessage(text: string, opts: { teacher: boolean }): ChatCheck {
  if (HARASSMENT_RE.test(text)) {
    return { ok: false, code: "harassment", message: "That message could hurt someone, so it wasn't sent. Your teacher can see blocked messages like this." };
  }
  if (hasBlockedLanguage(text)) {
    return { ok: false, code: "blocked_language", message: "That message has language that isn't allowed in class chat." };
  }
  if (!opts.teacher) {
    if (EMAIL_RE.test(text) || PHONE_RE.test(text) || CONTACT_RE.test(text)) {
      return { ok: false, code: "contact_info", message: "To keep everyone safe, class chat can't be used to share phone numbers, emails or social media." };
    }
    if (ADDRESS_RE.test(text)) {
      return { ok: false, code: "personal_info", message: "Keep addresses and other personal details out of class chat." };
    }
    for (const match of text.match(URL_RE) ?? []) {
      const host = hostOf(match);
      if (!host || !LINK_ALLOW.some((re) => re.test(host))) {
        return { ok: false, code: "link", message: "Links in class chat are limited to course sites like College Board, Khan Academy, Wikipedia and .gov or .edu pages." };
      }
    }
  }
  return { ok: true, wellbeing: WELLBEING_RE.test(text) };
}
