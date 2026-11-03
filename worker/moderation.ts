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
