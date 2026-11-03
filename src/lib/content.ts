// Loads the course content that ships in /public: lessons, question banks,
// vocabulary, FRQs and exam resources. Everything is fetched once and cached.
import { findLesson, getUnit, lessonAssetBase, lessonKey } from "@/shared/curriculum";

export type Stimulus = { type: string; title?: string; [key: string]: unknown };

export type Question = {
  /** Stable id, e.g. "L1_4_3" (lesson 1.4, question 3) or "U4_12" (unit 4 bank). */
  id: string;
  unit: number;
  lessonId?: string;
  prompt: string;
  choices: string[];
  answer: number;
  stimulus?: Stimulus;
};

const cache = new Map<string, Promise<unknown>>();

function getJson<T>(url: string): Promise<T> {
  let p = cache.get(url) as Promise<T> | undefined;
  if (!p) {
    p = fetch(url).then((r) => {
      if (!r.ok) throw new Error(`Couldn't load ${url} (${r.status})`);
      return r.json() as Promise<T>;
    });
    cache.set(url, p);
    p.catch(() => cache.delete(url));
  }
  return p;
}

const LETTERS = ["A", "B", "C", "D"];
const letter = (v: unknown) => LETTERS.indexOf(String(v ?? "").trim().toUpperCase());

type RawLessonQuestion = { question: string; answers: string[]; correct: string; stimulus?: Stimulus };
type RawBankQuestion = { question: string; A: string; B: string; C: string; D: string; answer: string; stimulus?: Stimulus };

export async function lessonQuestions(lessonId: string): Promise<Question[]> {
  const found = findLesson(lessonId);
  if (!found?.lesson.hasQuiz) return [];
  const raw = await getJson<RawLessonQuestion[]>(`${lessonAssetBase(lessonId)}/questions.json`);
  const key = lessonKey(lessonId);
  return raw
    .map((q, i) => ({
      id: `${key}_${i}`,
      unit: found.unit.n,
      lessonId,
      prompt: q.question,
      choices: (q.answers ?? []).slice(0, 4),
      answer: letter(q.correct),
      stimulus: q.stimulus,
    }))
    .filter((q) => q.answer >= 0 && q.choices.length === 4);
}

export async function unitBank(unit: number): Promise<Question[]> {
  const raw = await getJson<RawBankQuestion[]>(`/APES/APES_Unit${unit}.json`);
  return raw
    .map((q, i) => ({
      id: `U${unit}_${i}`,
      unit,
      prompt: q.question,
      choices: [q.A, q.B, q.C, q.D],
      answer: letter(q.answer),
      stimulus: q.stimulus,
    }))
    .filter((q) => q.answer >= 0 && q.choices.every((c) => typeof c === "string"));
}

/** Every practice question for a unit: its unit bank plus all lesson quizzes. */
export async function unitPool(unit: number): Promise<Question[]> {
  const u = getUnit(unit);
  if (!u) return [];
  const [bank, ...lessons] = await Promise.all([
    unitBank(unit).catch(() => [] as Question[]),
    ...u.lessons.filter((l) => l.hasQuiz).map((l) => lessonQuestions(l.id).catch(() => [] as Question[])),
  ]);
  return [...bank, ...lessons.flat()];
}

export function unitOfQuestion(id: string): number | null {
  const m = /^[LU](\d)/.exec(id);
  return m ? Number(m[1]) : null;
}

// ─── Lessons ────────────────────────────────────────────────────────────────

export type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; html: string }
  | { type: "list"; html: string; ordered?: boolean }
  | { type: "table"; html: string }
  | { type: "image"; src: string };

type RawBlock = { type: string; text?: string; html?: string | { __html: string }; src?: string; ordered?: boolean };

const html = (v: RawBlock["html"]) => (typeof v === "string" ? v : v?.__html ?? "");

export async function lessonContent(lessonId: string): Promise<{ title: string; blocks: Block[] }> {
  const raw = await getJson<{ title: string; content: RawBlock[] }>(`${lessonAssetBase(lessonId)}/content.json`);
  const blocks: Block[] = [];
  for (const b of raw.content ?? []) {
    if (b.type === "heading" && b.text) blocks.push({ type: "heading", text: b.text });
    else if (b.type === "paragraph") blocks.push({ type: "paragraph", html: html(b.html) });
    else if (b.type === "list") blocks.push({ type: "list", html: html(b.html), ordered: b.ordered });
    else if (b.type === "table") blocks.push({ type: "table", html: html(b.html) });
    else if (b.type === "image" && b.src) blocks.push({ type: "image", src: b.src });
  }
  return { title: raw.title, blocks };
}

/**
 * Lesson HTML ships with the app, but it was imported from older sources and
 * carries stray inline styles and classes. Strip everything except plain
 * structure so it reads well in both themes.
 */
export function cleanLessonHtml(input: string): string {
  if (typeof DOMParser === "undefined") return input;
  const doc = new DOMParser().parseFromString(`<div>${input}</div>`, "text/html");
  const root = doc.body.firstElementChild;
  if (!root) return "";
  root.querySelectorAll("script, style, iframe, object, embed, form").forEach((el) => el.remove());
  root.querySelectorAll("*").forEach((el) => {
    for (const attr of [...el.attributes]) {
      const name = attr.name.toLowerCase();
      const keep = (el.tagName === "A" && name === "href") || (el.tagName === "IMG" && (name === "src" || name === "alt")) || name === "colspan" || name === "rowspan";
      if (!keep || name.startsWith("on") || /^\s*javascript:/i.test(attr.value)) el.removeAttribute(attr.name);
    }
    if (el.tagName === "A") {
      el.setAttribute("target", "_blank");
      el.setAttribute("rel", "noopener noreferrer");
    }
  });
  return root.innerHTML;
}

// ─── Vocabulary, FRQs, resources ────────────────────────────────────────────

export type Card = { term: string; definition: string; unit?: number };

export async function lessonVocab(lessonId: string): Promise<Card[]> {
  if (!findLesson(lessonId)?.lesson.hasQuiz) return [];
  const raw = await getJson<Record<string, string>>(`${lessonAssetBase(lessonId)}/vocab.json`).catch(() => ({}));
  return Object.entries(raw).map(([term, definition]) => ({ term: term.charAt(0).toUpperCase() + term.slice(1), definition: String(definition) }));
}

export async function courseVocab(): Promise<Card[]> {
  const raw = await getJson<Array<{ term: string; definition: string; unit: string | number }>>("/APES/APES_Vocab.json");
  return raw.map((c) => ({ term: c.term, definition: c.definition, unit: Number(c.unit) || undefined }));
}

export type FrqPart = { label: string; prompt: string; points: number };
export type Frq = { id: string; unit: number; title: string; prompt: string; stimulus?: Stimulus; parts: FrqPart[] };

export async function frqs(): Promise<Frq[]> {
  const raw = await getJson<Array<Frq & { parts: Array<FrqPart & { rubric?: string }> }>>("/APES/APES_FRQs.json");
  // Rubrics stay on the server, which grades the answers.
  return raw.map((f) => ({ ...f, parts: f.parts.map(({ label, prompt, points }) => ({ label, prompt, points })) }));
}

export type Resources = {
  tips_and_tricks?: string[];
  helpful_websites?: Array<{ name: string; url?: string; note?: string }>;
  exam_structure?: Record<string, { questions?: number; minutes?: number; weight?: string; note?: string; types?: string[] }>;
  unit_weights?: Array<{ unit: number; title: string; examWeight: string }>;
};

export function resources(): Promise<Resources> {
  return getJson<Resources>("/APES/APES_Resources.json");
}

/** Warm the cache for a unit in the background. */
export function prefetchUnit(unit: number) {
  void unitPool(unit).catch(() => undefined);
}

export { lessonKey };
