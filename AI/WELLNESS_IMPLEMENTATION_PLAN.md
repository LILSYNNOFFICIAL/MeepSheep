# MeepSheep GitHub Automation and Wellness Doctor Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Establish enforceable repository automation and a scheduled, auditable Wellness Doctor that inspects project files and workflow definitions and publishes a truthful four-level health summary in README.md.

**Architecture:** A dependency-free Python doctor runs against a checked-out repository, emits structured findings, and updates only a clearly delimited README health block when the computed status changes. A read-only CI workflow validates pull requests; a trusted-branch scheduled/manual/push workflow runs the doctor and may commit the generated README block. The doctor never executes application code, fetches arbitrary URLs, reads secrets, or changes repository settings.

**Tech Stack:** GitHub Actions, Python 3.12 standard library, unittest, Ruby/Psych YAML parser available on GitHub-hosted Ubuntu runners, Markdown, GitHub REST workflow-run links.

## Global Constraints

- Keep all project operating and memory documents under `AI/`; GitHub Actions definitions belong under `.github/workflows/`.
- The root `README.md` remains the user-facing project landing page and contains a generated health section.
- Status precedence is 🔴 critical > 🔵 error > 🟡 warning > 🟢 healthy.
- A green status means every configured check passed, not that unimplemented product features exist.
- Missing optional/future infrastructure must be reported as not configured or informational, not as a failure.
- Pull-request validation has read-only repository permissions. Only trusted default-branch, schedule, or manually dispatched runs may update README.
- Scheduled checks run every 15 minutes, but README commits occur only when generated health content changes. This prevents timestamp-only commit churn.
- Every check has an explicit scope and severity. Unknown or skipped checks must not be silently counted as passing.
- No secrets, credentials, full research queries, or source page contents are written to health reports.
- Repository settings such as rulesets and branch protection are documented recommendations; do not claim they were enabled unless the GitHub settings API confirms it.
- A checkbox is marked complete only after the relevant file is fetched from GitHub and workflow/test behavior is observed.

---

### Task 1: Define health contracts and persistent operating rules

**Files:**
- Create: `AI/GITHUB_RULES.md`
- Create: `AI/ACTIONS.md`
- Create: `AI/WELLNESS_DOCTOR.md`
- Create: `AI/STATUS_ICONS.md`
- Create: `AI/INCIDENTS.md`
- Create: `AI/AUTOMATION_LOG.md`
- Create: `AI/WELLNESS_IMPLEMENTATION_PLAN.md`
- Modify: `AI/WF.md`, `AI/CONTRIBUTING.md`, `AI/SECURITY.md`, `AI/DECISIONS.md`, `AI/INTEGRATIONS.md`

**Interfaces:**
- Consumes: repository paths, documented severity mapping, README marker contract.
- Produces: stable check identifiers, status severity model, workflow permissions model, incident response rules.

- [x] **Step 1: Specify deterministic status mapping and check inventory**

Use stable severities `ok`, `warning`, `error`, `critical`. Map them respectively to 🟢, 🟡, 🔵, 🔴. Overall severity is the maximum severity present. Record all findings with check ID, severity, concise message, and file path when applicable.

- [x] **Step 2: Specify README generated-region contract**

Use exactly one `<!-- MEEPSHEEP_HEALTH_START -->` and one `<!-- MEEPSHEEP_HEALTH_END -->` marker. The doctor owns only the content between them. Missing, duplicate, or reversed markers are a critical doctor failure; it must not overwrite the rest of README.

- [x] **Step 3: Specify permission separation**

PR validation uses `contents: read`. The trusted doctor uses `contents: write` only on the default branch, schedule, or manual dispatch. Never checkout or execute an untrusted PR head in a write-enabled job.

- [x] **Step 4: Review and fetch all new operating documents**

Confirm each is under `AI/`, linked from README, and does not claim repository settings or deployment infrastructure that have not been verified.

### Task 2: Implement the deterministic Wellness Doctor with tests

**Files:**
- Create: `scripts/wellness_doctor.py`
- Create: `tests/test_wellness_doctor.py`

**Interfaces:**
- Consumes: repository root path, README markers, required documentation list, workflow directory.
- Produces: `inspect_repository(root) -> dict`, `render_health_block(report) -> str`, `update_readme(root, report) -> bool`, and CLI flags `--root`, `--write-readme`, `--json`.

- [x] **Step 1: Add tests for status precedence and all four mappings**

Assert warning-only => 🟡; error => 🔵; critical => 🔴; no findings => 🟢; mixed findings use the highest severity.

- [x] **Step 2: Add tests for repository inspection**

Assert required files are found, a missing required operating document is detected, broken relative Markdown links are reported, unbalanced Markdown fences are detected, and missing/duplicate health markers are critical.

- [x] **Step 3: Add tests for safe README updates**

Assert only the marked region changes, content outside the markers is byte-for-byte preserved, and a second identical update returns unchanged without rewriting.

- [x] **Step 4: Run focused tests before implementation**

Run: `python -m unittest discover -s tests -v`.
Expected: focused tests fail because the doctor module/behaviors are absent, not because of test setup errors.

- [x] **Step 5: Implement the minimum standard-library doctor**

Use `pathlib`, `re`, `json`, and `argparse`. Inspect every tracked-looking Markdown file in root and `AI/`, validate relative links and fence balance, verify required files and workflow files, and produce deterministic findings. Do not follow symlinks outside the repository root.

- [x] **Step 6: Re-run focused tests**

Run: `python -m unittest discover -s tests -v`.
Expected: all tests pass.

- [x] **Step 7: Run negative/edge tests and CLI smoke checks**

Verified missing and duplicate markers, broken links, encoded paths with fragments, paths escaping the repository root, empty workflow directory, and JSON CLI output. The empty-repository JSON smoke test returned exit 1 and critical status. The GitHub Actions suite passed all nine tests.

### Task 3: Add CI and scheduled README health publishing

**Files:**
- Create: `.github/workflows/quality.yml`
- Create: `.github/workflows/wellness-doctor.yml`
- Modify: `README.md`

**Interfaces:**
- Quality workflow consumes repository checkout and runs tests, doctor read-only, and YAML syntax validation.
- Wellness workflow consumes trusted default-branch checkout, runs the same tests and doctor, and commits README only if the generated health block changed.

- [x] **Step 1: Add read-only quality workflow**

Trigger on pull requests and pushes to main. Set `permissions: contents: read`. Run Python unit tests, doctor inspection, and Ruby/Psych parsing of all workflow YAML files.

- [x] **Step 2: Add trusted wellness workflow**

Trigger on pushes to main, manual dispatch, and a 15-minute schedule. Set minimal `contents: write` permissions. Use concurrency to prevent overlapping runs. Never run a write-enabled job on pull_request events.

- [x] **Step 3: Prevent automation loops and noisy commits**

Configure bot identity. Commit only when `git diff --quiet -- README.md` reports a change. Do not put per-run timestamps in the generated block; link to the workflow page for the latest execution. Bot-authored README commits must not recursively start another doctor run.

- [x] **Step 4: Run workflow YAML parser and local test suite**

Run: `ruby -e 'require "yaml"; Dir.glob(".github/workflows/*.yml").each { |f| YAML.load_file(f); puts "OK #{f}" }'` and `python -m unittest discover -s tests -v`.
Expected: every workflow parses and all tests pass.

- [x] **Step 5: Verify GitHub Actions execution**

After push, inspect the actual workflow run, jobs, and logs. A workflow file existing in GitHub is not proof it ran. Repair failures and rerun.

### Task 4: Verify, document, and hand off

**Files:**
- Modify: `README.md`, `AI/WF.md`, `AI/STATE.md`, `AI/AUTOMATION_LOG.md`
- Inspect: every new and modified file plus GitHub Actions run records.

**Interfaces:**
- Produces: final verified status, latest run link, commit SHA, known limitations, and updated workflow checkboxes.

- [x] **Step 1: Fetch all changed files from GitHub**

Verify paths, content, marker uniqueness, README links, and no unintended changes.

- [x] **Step 2: Inspect workflow runs and logs**

Confirm PR/push validation and trusted wellness execution separately. Verify the README update behavior and that a no-change run does not create an unnecessary commit.

- [x] **Step 3: Try to disprove the doctor**

Check that malformed markers fail safely, broken links are detected, warnings do not masquerade as clean status, and critical status outranks all lower statuses.

- [x] **Step 4: Update persistent state and automation log**

Record exact commit SHA, workflow run URLs, test commands/results, remaining limitations, and settings that still require owner-side configuration.

- [x] **Step 5: Mark only evidence-backed checkboxes complete**

Do not claim branch protection, deployment health, domain health, external provider health, or production application checks until those systems are configured and actually inspected.


## Verified implementation outcome

- Push-triggered quality and Wellness Doctor workflows passed on the verified source checkpoint.
- The generated README health region showed 🟢 Healthy with 82 passed checks and zero findings.
- A no-change run made no README commit.
- The cron and manual-dispatch triggers are configured but have not yet been observed executing.
- Branch protection and rulesets remain owner-side configuration and were not changed.
- The doctor currently inspects repository inventory, required files, Markdown links/fences, README health markers, and workflow contracts. It is not a production uptime or external-service monitor.
