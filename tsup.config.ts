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
  noExternal: ["@modelcontextprotocol/sdk", "zod"],
  outExtension: () => ({ js: ".mjs" }),
});
