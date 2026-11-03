import { defineConfig } from "vitest/config";

// Runs against the Firebase emulators. Use `pnpm test:emulator`.
export default defineConfig({
  test: {
    environment: "node",
    include: ["test/emulator/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    fileParallelism: false,
  },
});
