---
name: aihub
description: Search, inspect, select, and download AI Hub datasets for analysis or model-building workflows. Use when a user asks to find AI Hub data, locate sample/lightweight data, inspect metadata or guides, list exact downloadable files, download approved files, or use an AI Hub sample to prototype a model.
---

# AI Hub

Use the bundled tools to discover data, inspect exact files, and perform explicitly requested downloads. Treat lightweight samples and approved API files as separate paths.

## Choose a tool

- Call `search_datasets` to discover datasets or list recent matches. Apply the smallest useful `limit`.
- Call `count_datasets` when the user only asks how many datasets match.
- Call `get_dataset` when the user provides a dataset identifier or asks for complete details about a resolved dataset.
- Call `get_datasets_with_guide` to find datasets whose manual or construction/use guide can be read as Markdown.
- Call `list_dataset_files` before an API download to resolve exact file keys and byte sizes. Prefer `size_asc` for exploration.
- Call `download_dataset_files` only for explicitly selected file keys and a new absolute destination path.

## Build from a sample

1. Search with `detail_condition: DETAILCND003` to find datasets with lightweight samples.
2. Inspect the selected dataset and identify the intended ML task, formats, and labels.
3. Open the returned dataset URL in an available signed-in browser and use the exact `샘플(경량) 데이터` link. This sample link uses the AI Hub web-login session, not `AIHUB_API_KEY`.
4. If the page requests authentication, ask the user to sign in to AI Hub in that browser and continue after they confirm. Never ask for their password or browser cookies.
5. Verify the downloaded archive's size and contents before extracting or training.
6. Build the smallest useful training and inference pipeline from the sample. Explain that sample performance is only a pipeline check.

If browser control is unavailable, give the dataset URL and ask the user to download `샘플(경량) 데이터` manually. Do not substitute a full API download or claim the sample was downloaded.

## Download approved API files

1. Call `list_dataset_files` and report the selected names, file keys, exact sizes, total size, destination, and dataset URL.
2. Never select every file by default. Prefer the smallest files that satisfy the request.
3. Treat a user's explicit request to download already-resolved files as sufficient intent. Otherwise obtain confirmation after presenting the preview.
4. Pass a new absolute destination directory to `download_dataset_files`; never overwrite an existing path.
5. If `AIHUB_DOWNLOAD_NOT_APPROVED` is returned, state that metadata and file-list access worked but the selected dataset is not approved for API download. Link the dataset page and ask the user to press **다운로드**, complete the application/approval, and retry.

## Present results

- State the full match count and the number shown when a search returns a page.
- Include each returned AI Hub dataset URL that is relevant to the answer.
- Show human-readable sizes alongside exact byte counts when discussing downloads.
- Preserve uncertainty when a field is absent or the upstream response has changed.
- Explain that this is an unofficial community integration when affiliation could be misunderstood.

## Protect access and data

- Never ask the user to paste `AIHUB_API_KEY` into the conversation. If it is missing, direct them to the official issuance page at `https://aihub.or.kr/devsport/apishell/list.do`. Clearly distinguish the environment-variable name (`AIHUB_API_KEY`) from its value (only the APIKEY value shown in the issuance email), then ask the user to restart Codex after registration.
- If the user explicitly provides a local key-file path and asks Codex to register it, read it locally without echoing its contents. Accept either a raw key or a single `AIHUB_API_KEY=<key>` / `AIHUB_KEY=<key>` assignment, register only the value as the user's `AIHUB_API_KEY`, verify presence without printing the value, and never copy the key into a prompt, source file, `.mcp.json`, or log.
- Never expose the key in tool results, logs, URLs, or error messages.
- Do not imply that metadata visibility grants download approval or dataset reuse rights.
- Do not confuse the web-login lightweight sample with approved API files. `download_dataset_files` downloads only the selected API file keys.
- Do not download data unless the user explicitly requests it.
- Remind the user that dataset access and use remain subject to AI Hub approval and data usage policies when discussing downloads, redistribution, or overseas transfer.
