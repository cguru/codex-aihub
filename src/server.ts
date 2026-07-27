import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { AihubMetadataClient } from "./adapters/aihub/metadata-client.js";
import { loadConfig } from "./config.js";
import { registerDatasetTools } from "./tools/datasets.js";

export function createAihubServer(): McpServer {
  const server = new McpServer(
    {
      name: "codex-aihub",
      version: "0.1.0",
    },
    {
      instructions:
        "Search and inspect AI Hub dataset metadata. Keep each dataset's AI Hub URL in user-facing results. The personal AIHUB_API_KEY is read only from the local environment and must never be requested in chat or exposed in results. This version provides metadata tools only and must not claim to have downloaded data.",
    },
  );

  const client = new AihubMetadataClient({
    config: () => loadConfig(process.env),
  });
  registerDatasetTools(server, client);
  return server;
}

async function main(): Promise<void> {
  const server = createAihubServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

const entryPath = process.argv[1]
  ? pathToFileURL(resolve(process.argv[1])).href
  : undefined;

if (entryPath === import.meta.url) {
  main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown startup error";
    process.stderr.write(`codex-aihub failed to start: ${message}\n`);
    process.exitCode = 1;
  });
}
