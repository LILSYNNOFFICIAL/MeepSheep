# MeepSheep Wellness Doctor

## Mission

The Wellness Doctor is an automated repository and workflow integrity inspector. It provides a repeatable answer to: "Are the files and configured engineering workflows in a healthy state right now?"

It is not a medical feature, a general-purpose production uptime monitor, a security certification, or proof that unfinished product functionality works.

## Execution model

The initial doctor is a deterministic Python command-line program using only the Python standard library. GitHub Actions executes it against a clean checkout. The doctor must not need provider API keys, database credentials, or production secrets.

Proposed entry point: `scripts/wellness_doctor.py`.

Expected public functions:
- `inspect_repository(root) -> dict`
- `render_health_block(report) -> str`
- `update_readme(root, report) -> bool`

Expected CLI:
- `--root PATH`: inspect a repository root; defaults to the current working directory.
- `--write-readme`: update only the delimited README health region.
- `--json`: emit a machine-readable report to stdout.
- Default mode: inspect and print a concise human-readable report without modifying files.

Exit behavior:
- Exit 0 when the inspection completes with no error/critical findings. Warning-only status is permitted with exit 0.
- Exit 1 when one or more error/critical findings exist.
- Exit 2 for invocation or inspection failures that prevent a trustworthy report.
- A JSON report must still be emitted when possible on a non-zero inspection result.

## Inspection inventory

### Repository integrity
- Confirm required root and AI operating documents exist.
- Confirm required workflow files exist.
- Confirm required script and test entry points exist after this doctor is installed.
- Detect unexpected empty or unreadable required files.
- Do not treat planned product code as missing until its implementation phase begins.

### Markdown integrity
- Inspect Markdown files in repository root and all descendants of `AI/`.
- Check fenced code blocks are balanced.
- Check local relative Markdown links resolve to an existing file or directory.
- Ignore external HTTP(S), mailto, protocol-relative, and same-page fragment links.
- Resolve links relative to the document containing the link.
- Strip URL fragments and query strings before checking the local path.
- Do not follow symlinks outside the repository root.

### Workflow integrity
- Confirm at least the quality and wellness workflow files exist.
- Check that the workflow definitions declare the expected triggers and explicit permissions.
- GitHub Actions execution performs YAML parsing separately. The doctor must not pretend its lightweight textual checks are a full Actions schema validator.
- The quality workflow runs on pull requests with read-only permissions.
- The write-enabled wellness workflow must never trigger on pull_request.
- Scheduled/manual triggers and concurrency behavior must match `AI/ACTIONS.md`.

### Documentation contract
- Confirm the project state ledger does not mark the automated test suite or CI workflow as absent when their required files exist.
- Report stale state-ledger checkboxes as 🟡 warnings with stable finding IDs.
- Confirm README contains exactly one start and end marker in the correct order.
- Confirm README links to all required AI operating documents.
- Report broken links and missing documents with stable finding IDs.
- Avoid auto-repairing source documentation. The doctor reports; maintainers fix the source.

## Health report

The report contains:
- schema version;
- generated timestamp in UTC for machine-readable artifacts/logs;
- overall status code, icon, label, and severity;
- passed-check count;
- warning/error/critical counts;
- findings array;
- inspected file counts;
- links to workflow runs where supplied by the workflow environment.

The generated README block intentionally avoids per-run timestamps so a 15-minute schedule does not create a commit every 15 minutes. It shows current aggregate status and a link to the workflow page for the latest execution. The workflow run itself supplies the precise timestamp.

## Severity rules

Use `AI/STATUS_ICONS.md` as the sole icon mapping. Missing health markers or an unsafe README update are critical because publishing could overwrite unrelated README content. Missing essential automation or broken required links are errors. A minor documentation style defect is a warning only if it cannot affect navigation, correctness, or execution.

## Safety boundaries

- Read repository files only.
- Do not execute repository scripts other than the explicitly invoked doctor/test commands.
- Do not fetch arbitrary URLs.
- Do not inspect or print environment variables.
- Do not read secrets.
- Do not change branch protection, rulesets, repository settings, DNS, or deployments.
- Do not rewrite README content outside the health markers.
- Do not create a commit when the generated health block is unchanged.

## Known limits of the first version

- It checks repository content and workflow definitions, not the actual health of a production web application.
- It does not validate Cloudflare, Supabase, GitLab, MCP clients, external providers, or domain DNS until dedicated authenticated probes are explicitly designed.
- It does not replace actionlint or GitHub's own workflow validation.
- Scheduled GitHub Actions execution is near-real-time, not continuous. GitHub may delay scheduled runs.
- Branch protection and rulesets remain owner-configured settings unless a permitted settings API confirms them.

## Acceptance criteria

- Unit tests cover all four icon levels and precedence.
- Unit tests cover missing files, broken links, malformed fences, and malformed README markers.
- README updates preserve all bytes outside the marker region.
- Identical health output causes no file write and no commit.
- A clean repository inspection returns 🟢.
- A warning-only inspection returns 🟡.
- An error returns 🔵.
- A critical failure returns 🔴.
- Workflow execution and logs are inspected before the system is called operational.
