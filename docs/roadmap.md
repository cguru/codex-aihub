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

Status: implemented.

- `list_dataset_files`
- structured file inventory from dataset details
- safe size parsing and normalized file identifiers

Still planned:

- `list_data_packages`
- `list_package_files`
- `check_api_key`

## Milestone 0.3 — controlled downloads

Status: implemented for selected dataset files.

- preview the dataset/package, selected files, estimated size, and destination;
- require an explicit user download request;
- avoid overwriting existing files by default;
- check available disk space where possible;
- download into temporary files and finalize atomically;
- resume only when the server contract safely supports it;
- validate TAR entries against absolute paths, traversal, and unsafe links;
- merge `.partN` files in numeric order;
- preserve incomplete artifacts as incomplete, never as finished files.

Still planned:

- background download jobs and progress reporting for very large files;
- safe resume across process restarts;
- data-package downloads.

## Milestone 0.4 — approval-first workflow

Status: implemented.

- `check_dataset_download_access` preflight before full-data work;
- no local dataset file written during the approval probe;
- unapproved requests stop before download and downstream model work;
- lightweight samples are used only after an explicit sample request;
- dataset URLs are interpreted through their `dataSetSn` identifier.

## Milestone 0.5 — capacity-first planning

Status: implemented.

- `check_download_capacity` for all inventory files or selected file keys;
- exact API inventory byte totals instead of relying on approximate page sizes;
- prospective destination filesystem and current free-space inspection;
- hard minimum, recommended space, and shortfall reporting;
- rounded approximate MB, GB, or TB user-facing summaries while retaining exact bytes for calculations;
- capacity check before file selection and again before the final download.

## Milestone 1.0 — public release

- validate behavior with approved real-data access outside the default test suite;
- document endpoint compatibility and known failure modes;
- add cross-platform packaging verification;
- complete public privacy, terms, and project URLs for the plugin manifest;
- prepare universal plugin directory submission materials.
