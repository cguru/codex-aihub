# Architecture

## Goals

- Run entirely on the user's machine as a bundled Node.js MCP server.
- Read `AIHUB_API_KEY` only from the local process environment.
- Keep unstable AI Hub HTTP contracts behind one adapter boundary.
- Return concise structured results without exposing credentials or complete raw error bodies.
- Keep metadata discovery read-only and make future downloads explicit write operations.

## Current flow

```text
Codex
  └─ plugin skill + MCP tools
       └─ dist/server.mjs (stdio, Node.js 20+)
            └─ src/adapters/aihub
                 └─ https://aihub.or.kr/mcp/*.do
```

The plugin root contains `.codex-plugin/plugin.json`, `.mcp.json`, and the `aihub` skill. `.mcp.json` starts `node ./dist/server.mjs --stdio` with the plugin root as its working directory and forwards only named environment variables.

## Boundaries

### MCP layer

`src/tools` owns user-facing names, schemas, descriptions, output summaries, and safety annotations. All current tools declare `readOnlyHint: true`, `destructiveHint: false`, and `idempotentHint: true`.

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

## Planned download architecture

Download support will be added separately under `src/download` and `src/security`. It must include a preview/confirmation boundary, collision-safe destinations, resumable temporary files, disk-space checks, TAR path traversal checks, symlink rejection, numeric `.partN` ordering, and atomic finalization. Download tools must not be marked read-only.
