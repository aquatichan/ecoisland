// =============================================
// Ecoisland AI Configuration
// =============================================
// Replace ADD_YOUR_API_KEY with your OpenRouter key from https://openrouter.ai
// Get a free key at: https://openrouter.ai/keys

export const OPENROUTER_API_KEY = import.meta.env.VITE_OPENROUTER_API_KEY || "YOUR_API_KEY_HERE";
export const OPENROUTER_MODEL = "google/gemini-2.5-flash-lite";

// =============================================
// HOW TO SET YOUR KEY:
// 1. Create a .env file in the project root
// 2. Add: VITE_OPENROUTER_API_KEY=your_key_here
// 3. Restart the dev server
// =============================================

// Shared AI request helper
export async function callAI(systemPrompt: string, userPrompt: string, temperature = 0.4): Promise<string> {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
      "HTTP-Referer": typeof window !== "undefined" ? window.location.origin : "https://ecoisland.app",
      "X-Title": "Ecoisland 2026",
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      temperature,
    }),
  });
  if (!res.ok) throw new Error(`OpenRouter API error: ${res.status}`);
  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

// Strip markdown fences and parse JSON safely
export function parseAIJson<T = any>(raw: string): T {
  const clean = raw.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  return JSON.parse(clean) as T;
}
