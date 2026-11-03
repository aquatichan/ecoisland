import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkChatMessage } from "../../worker/moderation";

const verdict = (text: string, teacher = false) => {
  const r = checkChatMessage(text, { teacher });
  return r.ok ? (r.wellbeing ? "wellbeing" : "ok") : r.code;
};

describe("class chat checks", () => {
  it("lets ordinary class talk and course facts through", () => {
    for (const t of [
      "Is the test on Friday?",
      "Fukushima was in 2011",
      "the sex ratio in the age pyramid",
      "Population is about 7 800 000 000 people",
      "10% rule: 1000 kcal becomes 100 kcal",
      "e.g. the U.S. still burns coal, i.e. pH 7.5",
      "see https://apcentral.collegeboard.org/courses",
      "en.wikipedia.org/wiki/El_Niño",
      "epa.gov has the AQI data",
    ]) {
      expect(verdict(t), t).toBe("ok");
    }
  });

  it("keeps contact details, personal info and outside links out of student messages", () => {
    expect(verdict("join discord.gg/abc")).toBe("contact_info");
    expect(verdict("my email is a@b.com")).toBe("contact_info");
    expect(verdict("text me 206-555-0142")).toBe("contact_info");
    expect(verdict("add me on snap")).toBe("contact_info");
    expect(verdict("i live at 123 Maple Street")).toBe("personal_info");
    expect(verdict("check bit.ly/xyz")).toBe("link");
    expect(verdict("go to youtube.com/watch?v=1")).toBe("link");
    // Teachers may share links and their school email.
    expect(verdict("Email me at rivera@school.org, slides at docs.google.com/x", true)).toBe("ok");
  });

  it("blocks harassment for everyone and flags students who may be at risk", () => {
    expect(verdict("kys")).toBe("harassment");
    expect(verdict("nobody likes you")).toBe("harassment");
    expect(verdict("i will find you", true)).toBe("harassment");
    expect(verdict("what the f*ck")).toBe("blocked_language");
    expect(verdict("honestly i want to die")).toBe("wellbeing");
  });

  it("has no false alarms on any course question", () => {
    const root = join(__dirname, "../../content");
    const texts: string[] = [];
    const walk = (dir: string) => {
      for (const f of readdirSync(dir, { withFileTypes: true })) {
        const p = join(dir, f.name);
        if (f.isDirectory()) walk(p);
        else if (f.name.endsWith(".json") && f.name !== "APES_FRQs.json") {
          for (const q of JSON.parse(readFileSync(p, "utf8"))) texts.push(q.question);
        }
      }
    };
    walk(root);
    expect(texts.length).toBeGreaterThan(1000);
    const bad = texts.map((t) => [t.slice(0, 80), verdict(t)]).filter(([, v]) => ["harassment", "contact_info", "personal_info", "wellbeing", "blocked_language"].includes(v));
    expect(bad).toEqual([]);
  });
});
