# Security policy

## Secrets

`AIHUB_API_KEY` must be supplied through the local environment. Do not include a real key in an issue, prompt, screenshot, fixture, log, URL, or committed file.

The MCP server sends the key only in the `X-API-KEY` request header. It also sends the non-secret `X-MCP-Client` and `X-MCP-Tool` audit headers required by the AI Hub metadata service. Tool results and structured errors never include the key.

If a key is exposed, revoke or rotate it through AI Hub and remove the exposed material from every affected system.

## Dataset safety

This repository must not contain downloaded AI Hub datasets. Dataset access, storage, sharing, and transfer remain subject to AI Hub approval and data usage policies.

The current version does not implement downloads. Future download code must receive a dedicated security review covering path traversal, symlinks, archive extraction, partial files, overwrite behavior, disk exhaustion, and secret-safe diagnostics.

## Reporting a vulnerability

Open a private security report with the repository maintainer when a private reporting channel is available. Do not include API keys, personal data, or downloaded dataset content in a report. If no private channel exists, open a minimal public issue that describes the affected component without exploit secrets.
