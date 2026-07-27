# Architecture

## Goals

- Run entirely on the user's machine as a bundled Node.js MCP server.
- Read `AIHUB_API_KEY` only from the local process environment.
- Keep unstable AI Hub HTTP contracts behind one adapter boundary.
- Return concise structured results without exposing credentials or complete raw error bodies.
- Keep metadata discovery read-only and make downloads explicit, selected write operations.

## Current flow

```text
Codex
  └─ plugin skill + MCP tools
       └─ dist/server.mjs (stdio, Node.js 20+)
            ├─ src/adapters/aihub/metadata-client
            │    └─ https://aihub.or.kr/mcp/*.do
            └─ src/download + download-client
                 └─ https://api.aihub.or.kr/down/{version}/{dataset}.do
```

The plugin root contains `.codex-plugin/plugin.json`, `.mcp.json`, and the `aihub` skill. `.mcp.json` starts `node ./dist/server.mjs --stdio` with the plugin root as its working directory and forwards only named environment variables.

## Boundaries

### MCP layer

`src/tools` owns user-facing names, schemas, descriptions, output summaries, and safety annotations. Metadata, access-check, capacity-check, and file inventory tools do not write local data. `download_dataset_files` is a non-destructive write operation and requires explicit file keys plus a new absolute destination.

### AI Hub adapter

`src/adapters/aihub` owns:

- endpoint paths and query parameter names;
- `X-API-KEY` authentication plus the official `X-MCP-Client` and
  `X-MCP-Tool` audit headers;
- timeouts and HTTP error classification;
- upstream envelope parsing;
- conversion of `{ value, label, description }` fields into plain structured data;
- response-shape diagnostics.

No other layer should construct AI Hub URLs or attach credentials.

### Configuration

`src/config.ts` validates the API key, optional base URL, and timeout at tool-call time. Starting the MCP server does not print or serialize the key. Missing configuration returns a user-actionable error through the requested tool.

## Response-change strategy

The AI Hub metadata endpoints are not stable public contracts. Parsers therefore:

1. validate only the envelope and fields each operation needs;
2. preserve unknown dataset fields after recursively unwrapping field metadata;
3. reject missing required structures with `AIHUB_API_CHANGED`;
4. describe only the response type and top-level keys in diagnostics;
5. never include the complete upstream body.

Synthetic contract tests capture the currently observed envelope without incorporating AI Hub source code or real dataset files.

## Download architecture

`src/download` implements:

- a preflight authorization check that opens the smallest API file response and immediately cancels it without saving dataset bytes;
- full-inventory and selected-file capacity plans that compare exact API bytes with the destination filesystem;
- hard-minimum workspace calculation for temporary transfer and final files, plus a larger recommendation for ZIP extraction and model outputs;
- structured file inventory from dataset detail metadata;
- exact file-key validation and size previews;
- collision-safe destinations and disk-space checks;
- bounded temporary TAR downloads;
- path traversal, absolute path, and link rejection;
- numeric `.partN` merging;
- atomic destination finalization and temporary cleanup.

The lightweight sample link is not part of this API-key download path. It is rendered only for an authenticated AI Hub web session. The bundled skill uses this browser path only when the user explicitly requests a sample and never asks for cookies. It never substitutes a sample for an unapproved full-data request.
