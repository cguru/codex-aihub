# Security policy

## Secrets

`AIHUB_API_KEY` must be supplied through the local environment. Do not include a real key in an issue, prompt, screenshot, fixture, log, URL, or committed file.

The MCP server sends the key only in request headers. Metadata requests use `X-API-KEY` plus the non-secret `X-MCP-Client` and `X-MCP-Tool` audit headers. Official file downloads use the `apikey` header expected by AI Hub's downloader. Tool results and structured errors never include the key.

If a key is exposed, revoke or rotate it through AI Hub and remove the exposed material from every affected system.

## Dataset safety

This repository must not contain downloaded AI Hub datasets. Dataset access, storage, sharing, and transfer remain subject to AI Hub approval and data usage policies.

Downloads require explicit file keys and a new absolute destination. The downloader refuses existing destinations, checks available disk space, limits transfer and extracted sizes, rejects absolute/traversal TAR paths and links, merges `.partN` files numerically, and finalizes from a temporary directory. Downloaded datasets remain excluded from Git.

The lightweight sample button is a separate AI Hub web-login flow. Never request, export, or persist browser cookies to automate it.

## Reporting a vulnerability

Open a private security report with the repository maintainer when a private reporting channel is available. Do not include API keys, personal data, or downloaded dataset content in a report. If no private channel exists, open a minimal public issue that describes the affected component without exploit secrets.
