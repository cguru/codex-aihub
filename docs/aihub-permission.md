# AI Hub permission and policy record

## Status

This document records the project handover summary of a written AI Hub response dated 2026-07-27. It is not a software license for AI Hub code and is not legal advice.

The redacted original inquiry and response should be attached here when available. Until then, this summary is the project record.

## Summary of the response

AI Hub stated, in substance, that:

- AIHub-MCP and `aihubshell` do not carry a separately stated open-source license or redistribution condition.
- An independently written Node.js program may call the related endpoints if it does not copy or redistribute AI Hub source code or JAR files.
- AI Hub has not defined an additional restriction on independently reimplementing user-facing `aihubshell` functionality in Node.js and publishing that implementation as open source.
- Development and publication do not require a separate AI Hub license or approval, and remain the developer's responsibility.
- The endpoints are not guaranteed public API specifications and may change or stop without prior notice.
- Downloads require each user's normal dataset approval and personal API key.
- Lightweight sample downloads are exposed separately through the signed-in AI Hub website and do not use the API-key download endpoint.
- Downloaded data remains subject to AI Hub restrictions, including rules concerning third-party provision, overseas transfer, and redistribution.

## Project interpretation

The project will:

- implement behavior independently in TypeScript;
- avoid copying AIHub-MCP source, JAR contents, or `aihubshell` code;
- use only synthetic API responses and fake keys in committed tests;
- keep real downloaded data out of source control, releases, and fixtures;
- avoid features that bypass approval or facilitate dataset redistribution;
- keep lightweight-sample browser access separate from approved API file downloads;
- verify full-data approval before file selection or downstream model work;
- never substitute a lightweight sample unless the user explicitly requests one;
- treat the plugin's MIT license as applying only to this repository's original source code.

## Public notice

Use this notice in public-facing documentation:

> This is an unofficial community project and is not affiliated with or endorsed by AI Hub or NIA. Dataset access and use remain subject to the AI Hub approval process and applicable data usage policies. AI Hub endpoints are not guaranteed public APIs and may change or become unavailable without notice.

## References

- [AI Hub MCP repository](https://github.com/aihub-git/AIHub-MCP)
- [AI Hub Open API and aihubshell guide](https://aihub.or.kr/devsport/apishell/list.do)
- [AI Hub data usage policy](https://aihub.or.kr/intrcn/guid/usagepolicy.do)
