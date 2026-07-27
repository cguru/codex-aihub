import { readFile, writeFile } from "node:fs/promises";

const bundleUrl = new URL("../dist/server.mjs", import.meta.url);
const source = await readFile(bundleUrl, "utf8");
const normalized = source
  .replace(/\r\n/g, "\n")
  .replace(/[ \t]+$/gm, "");

await writeFile(
  bundleUrl,
  normalized.endsWith("\n") ? normalized : `${normalized}\n`,
  "utf8",
);
