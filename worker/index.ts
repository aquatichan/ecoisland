// Cloudflare Worker entry point.
// Serves the built Vite SPA from ./dist and proxies AI calls to Gemini so the
// API key stays server-side (mirrors the old Vercel edge function in api/ai.ts).

type Env = {
  ASSETS: { fetch: (request: Request) => Promise<Response> };
  GEMINI_API_KEY: string;
};

async function handleAI(request: Request, env: Env): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  if (!env.GEMINI_API_KEY) {
    return new Response("API key not configured", { status: 500 });
  }

  const { model, ...body } = (await request.json()) as { model: string; [key: string]: unknown };
  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

  const geminiRes = await fetch(geminiUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": env.GEMINI_API_KEY,
    },
    body: JSON.stringify(body),
  });

  const data = await geminiRes.json();
  return new Response(JSON.stringify(data), {
    status: geminiRes.status,
    headers: { "Content-Type": "application/json" },
  });
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/ai") {
      return handleAI(request, env);
    }

    // Everything else is a static asset or an SPA route.
    return env.ASSETS.fetch(request);
  },
};
