# Implementation roadmap

## Milestone 0.1 — metadata discovery

Status: implemented in the initial repository.

- Codex plugin manifest and bundled `aihub` skill
- Local Node.js stdio MCP server
- API key and configuration validation
- Search, count, detail, and Markdown-guide discovery tools
- Synthetic response contract tests
- Single-file runtime bundle
- Public project, policy, and security documentation

## Milestone 0.2 — file inventory

- `list_dataset_files`
- `list_data_packages`
- `list_package_files`
- `check_api_key`
- independent parsers for dataset and data-package file trees
- safe size parsing and normalized file identifiers

## Milestone 0.3 — controlled downloads

- preview the dataset/package, selected files, estimated size, and destination;
- require an explicit user download request;
- avoid overwriting existing files by default;
- check available disk space where possible;
- download into temporary files and finalize atomically;
- resume only when the server contract safely supports it;
- validate TAR entries against absolute paths, traversal, and unsafe links;
- merge `.partN` files in numeric order;
- preserve incomplete artifacts as incomplete, never as finished files.

## Milestone 1.0 — public release

- validate behavior with approved real-data access outside the default test suite;
- document endpoint compatibility and known failure modes;
- add cross-platform packaging verification;
- complete public privacy, terms, and project URLs for the plugin manifest;
- prepare universal plugin directory submission materials.
