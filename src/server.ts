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
      version: "0.5.3",
    },
    {
      instructions:
        "Search, inspect, and explicitly download selected AI Hub dataset files. When a user supplies a dataset URL or identifier and asks to download data or build from it, check full API download access before listing, downloading, or starting downstream model work. If access is not approved, stop and tell the user to apply on AI Hub. After approval, compare exact inventory bytes and selected-file bytes with free space on the intended destination filesystem before downloading. Keep exact bytes for calculations, but normally explain sizes to the user as rounded approximate MB, GB, or TB values; show exact bytes only when the user asks. Clearly report minimum, recommended, available, and shortfall sizes. Never substitute lightweight sample data unless the user explicitly asks for sample data; requests for a sample app, sample code, or usage example still follow the full-data flow. Keep each dataset's AI Hub URL in user-facing results. Read the personal AIHUB_API_KEY only from the local environment and never request or expose it in chat, results, URLs, or logs. List exact file keys and human-readable approximate sizes before downloading, never download every file by default, and call the download tool only after the user explicitly requests a resolved download.",
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
