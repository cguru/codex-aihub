import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { pathToFileURL } from "node:url";
import { resolve } from "node:path";
import { AihubDownloadClient } from "./adapters/aihub/download-client.js";
import { AihubMetadataClient } from "./adapters/aihub/metadata-client.js";
import { loadConfig } from "./config.js";
import { DatasetDownloader } from "./download/dataset-downloader.js";
import { registerDatasetTools } from "./tools/datasets.js";
import { registerDownloadTools } from "./tools/downloads.js";

export function createAihubServer(): McpServer {
  const server = new McpServer(
    {
      name: "codex-aihub",
      version: "0.3.0",
    },
    {
      instructions:
        "Search, inspect, and explicitly download selected AI Hub dataset files. Keep each dataset's AI Hub URL in user-facing results. Read the personal AIHUB_API_KEY only from the local environment and never request or expose it in chat, results, URLs, or logs. List exact file keys and sizes before downloading, never download every file by default, and call the download tool only after the user explicitly requests a resolved download. A file-list result does not prove download approval.",
    },
  );

  const config = () => loadConfig(process.env);
  const client = new AihubMetadataClient({
    config,
  });
  const downloadClient = new AihubDownloadClient({
    config,
  });
  const downloader = new DatasetDownloader(client, downloadClient);
  registerDatasetTools(server, client);
  registerDownloadTools(server, downloader);
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
