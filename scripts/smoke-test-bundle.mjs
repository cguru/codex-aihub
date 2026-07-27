const bundleUrl = new URL("../dist/server.mjs", import.meta.url);
const bundle = await import(`${bundleUrl.href}?smoke=${Date.now()}`);

if (typeof bundle.createAihubServer !== "function") {
  throw new Error("Bundled MCP server does not export createAihubServer.");
}

const server = bundle.createAihubServer();
if (!server || typeof server.connect !== "function") {
  throw new Error("Bundled MCP server could not be constructed.");
}
