import { readFile } from "node:fs/promises";
import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv, type Plugin } from "vite";

/**
 * Runs the Cloudflare Worker (worker/index.ts) inside the Vite dev server, so
 * `pnpm dev` serves the app and its /api/* routes together. Secrets come
 * from .env.local (GEMINI_API_KEY, FIREBASE_SERVICE_ACCOUNT, or the emulator
 * settings: DEV_EMULATORS=true, FIRESTORE_EMULATOR_HOST, FIREBASE_PROJECT_ID).
 */
function workerApi(): Plugin {
  let env: Record<string, string> = {};
  let root = process.cwd();
  return {
    name: "ecoisland-worker-api",
    configResolved(config) {
      root = config.root;
      env = loadEnv(config.mode, config.root, "");
    },
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith("/api/")) return next();
        try {
          const chunks: Buffer[] = [];
          for await (const chunk of req) chunks.push(chunk as Buffer);
          const headers = new Headers();
          for (const [k, v] of Object.entries(req.headers)) {
            if (typeof v === "string") headers.set(k, v);
            else if (Array.isArray(v)) headers.set(k, v.join(", "));
          }
          const url = new URL(req.url, `http://${req.headers.host ?? "localhost"}`);
          const request = new Request(url, {
            method: req.method,
            headers,
            body: req.method === "GET" || req.method === "HEAD" ? undefined : Buffer.concat(chunks),
          });
          const assets = {
            async fetch(r: Request) {
              const file = path.join(root, "public", decodeURIComponent(new URL(r.url).pathname));
              try {
                return new Response(await readFile(file));
              } catch {
                return new Response("Not found", { status: 404 });
              }
            },
          };
          const mod = await server.ssrLoadModule("/worker/index.ts");
          const response: Response = await mod.handleApi(request, { ...env, ASSETS: assets });
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (err) {
          next(err);
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), workerApi()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (/[\\/](react|react-dom|scheduler|react-router|react-router-dom)[\\/]/.test(id)) return "react";
          if (/[\\/](firebase|@firebase|idb|tslib)[\\/]/.test(id) && !id.includes("analytics") && !id.includes("storage")) return "firebase";
          if (/[\\/](framer-motion|motion-dom|motion-utils)[\\/]/.test(id)) return "motion";
          if (id.includes("@radix-ui")) return "radix";
          return undefined;
        },
      },
    },
  },
});
