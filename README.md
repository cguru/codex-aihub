# AI Hub for Codex

`codex-aihub` is an unofficial, open-source Codex plugin for searching and inspecting [AI Hub](https://aihub.or.kr/) dataset metadata in natural language. It bundles a local Node.js MCP server; the user's API key stays in a local environment variable.

The current `0.1.0` milestone implements read-only metadata discovery. File listing and safe, approval-aware downloads are planned but are not included yet.

## Available tools

| Tool | Purpose | State |
| --- | --- | --- |
| `search_datasets` | Search with keyword, realm, classification, type, year, and detail filters | Read-only |
| `count_datasets` | Count all datasets matching the same filters | Read-only |
| `get_dataset` | Read complete metadata for one `dataSetSn` | Read-only |
| `get_datasets_with_guide` | Find datasets with a readable manual or construction/use guide | Read-only |

## Requirements

- Node.js 20 or newer for development
- A personal `AIHUB_API_KEY` issued by AI Hub
- Dataset approval where AI Hub requires it

Do not put the API key in prompts, source files, `.mcp.json`, or logs. Set it in the local environment before starting Codex:

```powershell
$env:AIHUB_API_KEY = "your-personal-key"
```

For a persistent environment variable on Windows, use the normal Windows environment settings and restart Codex afterward.

## Develop

```powershell
npm install
npm run check
```

`npm run build` creates the bundled `dist/server.mjs`. The plugin launches that file with Node, so an installed release does not need a separate `npm install`.

The MCP configuration is in `.mcp.json`; the plugin manifest is in `.codex-plugin/plugin.json`.

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `AIHUB_API_KEY` | required | Personal AI Hub API key |
| `AIHUB_METADATA_BASE_URL` | `https://aihub.or.kr` | Development override for the metadata service |
| `AIHUB_REQUEST_TIMEOUT_MS` | `20000` | Request timeout, from 1,000 to 120,000 ms |

Only synthetic responses and fake keys are used by automated tests. A real API key is never required by the default test suite.

## API stability

The metadata adapter keeps HTTP details under `src/adapters/aihub`. AI Hub has stated that these endpoints are not guaranteed public API contracts and may change or become unavailable without notice. Unexpected shapes produce a bounded diagnostic that says the API may have changed; the response body and API key are not copied into the error.

Current metadata endpoints:

- `/mcp/dataSetList.do`
- `/mcp/dataSetCnt.do`
- `/mcp/dataSetDetail.do`
- `/mcp/getDataSetsWithGuide.do`

## Important notice

> This is an unofficial community project and is not affiliated with or endorsed by AI Hub or NIA. Dataset access and use remain subject to the AI Hub approval process and applicable data usage policies. AI Hub endpoints are not guaranteed public APIs and may change or become unavailable without notice.

The plugin does not bypass data access approval. Do not add downloaded datasets to this repository, releases, or test fixtures. Review the [AI Hub data usage policy](https://aihub.or.kr/intrcn/guid/usagepolicy.do) before using or transferring data.

## Documentation

- [Architecture](docs/architecture.md)
- [AI Hub permission and policy record](docs/aihub-permission.md)
- [Implementation roadmap](docs/roadmap.md)
- [Security policy](SECURITY.md)

Codex plugin packaging follows the current [OpenAI plugin documentation](https://developers.openai.com/plugins/build/plugins) and the MCP tools follow the current [OpenAI MCP server guidance](https://developers.openai.com/plugins/build/mcp-server).

## License

The plugin source is available under the [MIT License](LICENSE). Dataset content is not covered by this license.
