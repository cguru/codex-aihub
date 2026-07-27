# Security policy

## Secrets

`AIHUB_API_KEY` must be supplied through the local environment. Do not include a real key in an issue, prompt, screenshot, fixture, log, URL, or committed file.

The MCP server sends the key only in request headers. Metadata requests use `X-API-KEY` plus the non-secret `X-MCP-Client` and `X-MCP-Tool` audit headers. Official file downloads use the `apikey` header expected by AI Hub's downloader. Tool results and structured errors never include the key.

If a key is exposed, do not publish the affected conversation, log, screenshot,
or repository history. Issuing an additional AI Hub API key must not be assumed
to invalidate the exposed key. The current public API guide documents key
issuance but does not document a self-service revocation procedure, so contact
AI Hub support at `aihub@aihub.kr` (or through the official contact page) and
ask whether the exposed key can be disabled. Remove the exposed material from
every affected local and remote system without copying the key into a public
issue.

## Dataset safety

This repository must not contain downloaded AI Hub datasets. Dataset access, storage, sharing, and transfer remain subject to AI Hub approval and data usage policies.

Full-data workflows first perform an authorization probe against the smallest listed API file. The response is cancelled immediately after authorization is verified and no dataset file is saved. After approval, a read-only capacity plan compares exact inventory or selected-file bytes with the prospective destination filesystem. It reports the safe downloader's hard minimum, a larger ZIP-extraction recommendation, current free space, and shortfall before files are written. Downloads then require explicit file keys and a new absolute destination. The downloader refuses existing destinations, checks available disk space again, limits transfer and extracted sizes, rejects absolute/traversal TAR paths and links, merges `.partN` files numerically, and finalizes from a temporary directory. Downloaded datasets remain excluded from Git.

The lightweight sample button is a separate AI Hub web-login flow. Use it only after an explicit sample request. Never request, export, or persist browser cookies to automate it.

## Reporting a vulnerability

Open a private security report with the repository maintainer when a private reporting channel is available. Do not include API keys, personal data, or downloaded dataset content in a report. If no private channel exists, open a minimal public issue that describes the affected component without exploit secrets.
