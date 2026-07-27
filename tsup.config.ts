import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/server.ts"],
  format: ["esm"],
  platform: "node",
  target: "node20",
  bundle: true,
  splitting: false,
  minifyWhitespace: true,
  sourcemap: false,
  clean: true,
  outDir: "dist",
  banner: {
    js:
      'import { createRequire as __createNodeRequire } from "node:module";' +
      "const require = __createNodeRequire(import.meta.url);",
  },
  noExternal: ["@modelcontextprotocol/sdk", "tar-stream", "zod"],
  outExtension: () => ({ js: ".mjs" }),
});
