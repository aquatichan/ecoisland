// =============================================
// Ecoisland AI Configuration
// =============================================
// Add your Gemini API key to .env.local as:
// GEMINI_API_KEY=your_key_here  (no VITE_ prefix — never bundled)

export const GEMINI_MODEL = "gemini-2.5-flash-lite";

export type GeminiPart =
  | { text: string }
  | { inline_data: { mime_type: string; data: string } };

export type GeminiContent = {
  role: "user" | "model";
  parts: GeminiPart[];
};

type GeminiRequestOptions = {
  systemPrompt?: string;
  contents: GeminiContent[];
  temperature?: number;
  maxOutputTokens?: number;
  responseMimeType?: "text/plain" | "application/json";
};

function extractGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part: { text?: string }) => (typeof part?.text === "string" ? part.text : ""))
    .join("")
    .trim();
}

export async function callGemini({
  systemPrompt,
  contents,
  temperature = 0.4,
  maxOutputTokens = 1024,
  responseMimeType = "text/plain",
}: GeminiRequestOptions): Promise<string> {
  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
      contents,
      generationConfig: {
        temperature,
        maxOutputTokens,
        responseMimeType,
      },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API error: ${res.status}${body ? ` - ${body}` : ""}`);
  }

  const data = await res.json();
  return extractGeminiText(data);
}

// Shared AI request helper for one-shot text prompts.
export async function callAI(systemPrompt: string, userPrompt: string, temperature = 0.4): Promise<string> {
  return callGemini({
    systemPrompt,
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    temperature,
  });
}

// Strip markdown fences and parse JSON safely
export function parseAIJson<T = any>(raw: string): T {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  return JSON.parse(clean) as T;
}
