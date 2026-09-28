import { defineConfig } from "vitest/config";

// Resolve "#core/*" to src/ instead of dist/ (see "imports" in package.json).
// Tests run in Vite's SSR mode, which reads ssr.resolve.conditions.
const conditions = ["source"];

export default defineConfig({
  resolve: { conditions },
  ssr: { resolve: { conditions } },
});
