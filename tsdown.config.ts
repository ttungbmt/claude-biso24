import { defineConfig } from "tsdown";

// The plugin runs the committed dist/index.js with plain Node (docs/adr/0003),
// so every dependency is inlined and the output must be reproducible byte for
// byte (the bundle staleness check compares it with a fresh build). It is
// minified to keep the committed file small; debug from source (`pnpm dev`).
export default defineConfig({
  entry: ["src/index.ts"],
  platform: "node",
  format: "esm",
  target: "node20",
  minify: true,
  // Emit dist/index.js (package is "type": "module"), matching "bin" and "start".
  fixedExtension: false,
  deps: {
    alwaysBundle: [/.*/],
    onlyBundle: false,
    // Fail the build if anything but a Node built-in is left as an import.
    onlyImport: [],
  },
});
