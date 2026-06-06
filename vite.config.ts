import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";
import type { Plugin } from "vite";

function geminiDevProxy(): Plugin {
  let apiKey = "";
  return {
    name: "gemini-dev-proxy",
    configResolved(config) {
      const env = loadEnv(config.mode, config.root, "");
      apiKey = env.GEMINI_API_KEY ?? "";
    },
    configureServer(server) {
      server.middlewares.use("/api/ai", async (req, res) => {
        if (!apiKey) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "GEMINI_API_KEY not set in .env.local" }));
          return;
        }

        const chunks: Buffer[] = [];
        req.on("data", (chunk) => chunks.push(chunk));
        req.on("end", async () => {
          const { model, ...body } = JSON.parse(Buffer.concat(chunks).toString());
          const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

          const geminiRes = await fetch(geminiUrl, {
            method: "POST",
            headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
            body: JSON.stringify(body),
          });

          const data = await geminiRes.json();
          res.writeHead(geminiRes.status, { "Content-Type": "application/json" });
          res.end(JSON.stringify(data));
        });
      });
    },
  };
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), geminiDevProxy()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  css: {
    postcss: './postcss.config.cjs',
  },
});
