// AI-graded FRQ scoring — sends the student's response for each part against
// its rubric and returns a structured, per-part score. Uses the existing
// Gemini proxy (src/config/ai.ts); never calls a model API directly.
import { callGemini, parseAIJson } from "@/config/ai";

export type FRQPart = {
  label: string;
  prompt: string;
  points: number;
  rubric: string;
};

export type FRQ = {
  id: string;
  unit: number;
  title: string;
  stimulus?: any;
  prompt: string;
  parts: FRQPart[];
};

export type PartGrade = {
  label: string;
  pointsEarned: number;
  pointsPossible: number;
  feedback: string;
};

export type FRQGradeResult = {
  parts: PartGrade[];
  totalEarned: number;
  totalPossible: number;
  overallFeedback: string;
};

const GRADING_SYSTEM_PROMPT = `You are an experienced AP Environmental Science reader grading a student's Free Response Question (FRQ) answer using official College Board-style rubric scoring.

For EACH part, award points strictly according to the rubric provided — a point is earned only if the student's response satisfies that specific rubric criterion (correct concept AND correct reasoning/mechanism, not just a keyword match). Partial credit within a part is not allowed beyond what the rubric's own point breakdown specifies. Be fair but rigorous, exactly as a real AP reader would be — vague or incorrect reasoning does not earn the point even if the final conclusion happens to be right.

Return ONLY valid JSON (no markdown fences, no text outside the JSON) matching this exact schema:
{
  "parts": [
    { "label": "(a)", "pointsEarned": number, "pointsPossible": number, "feedback": "1-2 sentences: what earned or didn't earn credit, specifically" }
  ],
  "overallFeedback": "2-3 sentences of holistic, encouraging but honest feedback and one concrete tip to improve"
}`;

function buildGradingPrompt(frq: FRQ, responses: Record<string, string>): string {
  const stimulusText = frq.stimulus
    ? `\n\nStimulus data provided to the student: ${JSON.stringify(frq.stimulus)}`
    : "";

  const partsText = frq.parts.map(p => {
    const answer = (responses[p.label] || "").trim() || "(no response provided)";
    return `Part ${p.label} [${p.points} point(s) possible]
Prompt: ${p.prompt}
Rubric: ${p.rubric}
Student's response: ${answer}`;
  }).join("\n\n");

  return `FRQ Title: ${frq.title}
Scenario: ${frq.prompt}${stimulusText}

${partsText}

Grade every part above and return the JSON result.`;
}

export async function gradeFRQ(frq: FRQ, responses: Record<string, string>): Promise<FRQGradeResult> {
  const raw = await callGemini({
    systemPrompt: GRADING_SYSTEM_PROMPT,
    contents: [{ role: "user", parts: [{ text: buildGradingPrompt(frq, responses) }] }],
    temperature: 0.2,
    responseMimeType: "application/json",
    maxOutputTokens: 1500,
  });

  const parsed = parseAIJson<{ parts: PartGrade[]; overallFeedback: string }>(raw);

  // Defensive clamp — never trust the model to respect point ceilings, and
  // fall back to the FRQ's own point values if a part is missing/misnamed.
  const parts: PartGrade[] = frq.parts.map(p => {
    const graded = parsed.parts?.find(g => g.label === p.label);
    const earned = typeof graded?.pointsEarned === "number" ? graded.pointsEarned : 0;
    return {
      label: p.label,
      pointsEarned: Math.max(0, Math.min(p.points, earned)),
      pointsPossible: p.points,
      feedback: graded?.feedback || "No feedback returned for this part.",
    };
  });

  const totalEarned = parts.reduce((s, p) => s + p.pointsEarned, 0);
  const totalPossible = parts.reduce((s, p) => s + p.pointsPossible, 0);

  return {
    parts,
    totalEarned,
    totalPossible,
    overallFeedback: parsed.overallFeedback || "",
  };
}
