---
name: aihub
description: Search, inspect, authorize, select, and download AI Hub datasets for analysis or model-building workflows. Use when a user supplies an AI Hub dataset URL or identifier, asks to download AI Hub data, build a model or program from it, inspect downloadable files, or explicitly requests lightweight sample data.
---

# AI Hub

Use the bundled tools to discover data, verify full-data access, inspect exact files, and perform explicitly requested downloads. Treat full API data and lightweight samples as separate user intents.

## Interpret the request

- Extract `dataSetSn` from an AI Hub dataset URL and use it as `dataset_id`.
- Treat an unqualified request such as "download this dataset and build a model" as a full-data request.
- Treat the request as a sample request only when the user explicitly says `샘플`, `경량 샘플`, `sample`, or an equivalent unambiguous phrase.
- Do not infer sample intent from phrases such as `작은 모델`, `빠른 실습`, `테스트`, `프로토타입`, or from a desire to reduce download size.

## Handle a full-data request

1. Call `check_dataset_download_access` before listing files, opening a browser, downloading anything, or starting downstream model/program work.
2. If it returns `AIHUB_DOWNLOAD_NOT_APPROVED`, state:

   `승인받지 않은 데이터는 다운로드할 수 없습니다. AI Hub에서 데이터 사용 신청과 승인을 완료한 뒤 다시 요청해 주세요.`

   Include the returned dataset URL, then stop. Do not download a sample, propose a sample fallback, or create the requested training/evaluation/inference program.
3. If the API key is missing, direct the user to the official issuance page and stop until the key is configured.
4. After approval is confirmed, call `list_dataset_files` and report the selected names, file keys, exact sizes, total size, destination, and dataset URL.
5. Never select every file by default. Choose only files needed for the requested task, and obtain clarification when the correct training/validation/test set cannot be determined safely.
6. Treat an explicit download request for resolved files as sufficient intent. Pass a new absolute destination directory to `download_dataset_files`; never overwrite an existing path.
7. Start training, evaluation, or inference implementation only after the required files have downloaded successfully and their contents have been verified.

The access check opens the smallest full-data API response only long enough to verify authorization, cancels it immediately, and saves no dataset file.

## Handle an explicit sample request

1. Use the sample path only when the user explicitly requested sample data.
2. Search with `detail_condition: DETAILCND003` when dataset discovery is still needed.
3. Inspect the selected dataset and identify the intended ML task, formats, and labels.
4. Open the returned dataset URL in an available signed-in browser and use the exact `샘플(경량) 데이터` link. This link uses the AI Hub web-login session, not `AIHUB_API_KEY`.
5. If the page requests authentication, ask the user to sign in to AI Hub in that browser and continue after confirmation. Never ask for a password or browser cookies.
6. Verify the archive's size and contents before extracting or training.
7. Explain that sample performance only checks the pipeline.

If browser control is unavailable, give the dataset URL and ask the user to download `샘플(경량) 데이터` manually. Do not substitute a full API download or claim that the sample was downloaded.

## Choose a metadata tool

- Call `search_datasets` to discover datasets or list recent matches. Apply the smallest useful `limit`.
- Call `count_datasets` when the user only asks how many datasets match.
- Call `get_dataset` when the user provides a dataset identifier or asks for complete details about a resolved dataset.
- Call `get_datasets_with_guide` to find datasets whose manual or construction/use guide can be read as Markdown.
- Call `check_dataset_download_access` first for every full-data download or downstream build request.
- Call `list_dataset_files` after approval is confirmed to resolve exact file keys and byte sizes. Prefer `size_asc` for exploration.
- Call `download_dataset_files` only for explicitly selected file keys and a new absolute destination path.

## Present results

- State the full match count and the number shown when a search returns a page.
- Include each relevant AI Hub dataset URL.
- Show human-readable sizes alongside exact byte counts.
- Preserve uncertainty when a field is absent or the upstream response has changed.
- Explain that this is an unofficial community integration when affiliation could be misunderstood.

## Protect access and data

- Never ask the user to paste `AIHUB_API_KEY` into the conversation. If it is missing, direct them to `https://aihub.or.kr/devsport/apishell/list.do`. Distinguish the environment-variable name from the APIKEY value, then ask the user to restart Codex after registration.
- If the user explicitly provides a local key-file path and asks Codex to register it, read it locally without echoing its contents. Accept either a raw key or a single `AIHUB_API_KEY=<key>` / `AIHUB_KEY=<key>` assignment, register only the value as the user's `AIHUB_API_KEY`, verify presence without printing it, and never copy the key into a prompt, source file, `.mcp.json`, or log.
- Never expose the key in tool results, logs, URLs, or error messages.
- Do not imply that metadata or file-list visibility grants download approval.
- Do not confuse the web-login lightweight sample with approved API files.
- Do not download data unless the user explicitly requests it.
- Remind the user that dataset access and use remain subject to AI Hub approval and data usage policies when discussing downloads, redistribution, or overseas transfer.
