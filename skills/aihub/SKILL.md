---
name: aihub
description: Search, count, and inspect AI Hub dataset metadata through the bundled local MCP server. Use when a user asks to find AI Hub datasets by topic or filter, count matching datasets, inspect one dataset's details, or find datasets with readable manuals or construction/use guides.
---

# AI Hub

Use the bundled read-only metadata tools to answer dataset discovery questions.

## Choose a tool

- Call `search_datasets` to discover datasets or list recent matches. Apply the smallest useful `limit`.
- Call `count_datasets` when the user only asks how many datasets match.
- Call `get_dataset` when the user provides a dataset identifier or asks for complete details about a resolved dataset.
- Call `get_datasets_with_guide` to find datasets whose manual or construction/use guide can be read as Markdown.

## Present results

- State the full match count and the number shown when a search returns a page.
- Include each returned AI Hub dataset URL that is relevant to the answer.
- Preserve uncertainty when a field is absent or the upstream response has changed.
- Explain that this is an unofficial community integration when affiliation could be misunderstood.

## Protect access and data

- Never ask the user to paste `AIHUB_API_KEY` into the conversation. If it is missing, direct them to the official issuance page at `https://aihub.or.kr/devsport/apishell/list.do`. Clearly distinguish the environment-variable name (`AIHUB_API_KEY`) from its value (only the APIKEY value shown in the issuance email), then ask the user to restart Codex after registration.
- If the user explicitly provides a local key-file path and asks Codex to register it, read it locally without echoing its contents. Accept either a raw key or a single `AIHUB_API_KEY=<key>` / `AIHUB_KEY=<key>` assignment, register only the value as the user's `AIHUB_API_KEY`, verify presence without printing the value, and never copy the key into a prompt, source file, `.mcp.json`, or log.
- Never expose the key in tool results, logs, URLs, or error messages.
- Do not imply that metadata visibility grants download approval or dataset reuse rights.
- Do not download data unless the user explicitly requests it and a future download tool is available. This version exposes metadata tools only.
- Remind the user that dataset access and use remain subject to AI Hub approval and data usage policies when discussing downloads, redistribution, or overseas transfer.
