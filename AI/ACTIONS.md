# MeepSheep GitHub Actions Operating Specification

## Workflow inventory

### `.github/workflows/quality.yml`

Purpose: fast, read-only quality gate for pushes and pull requests.

Required behavior:
- Trigger on pull requests and pushes to `main`.
- Set workflow/job permissions to `contents: read`.
- Use a bounded timeout.
- Check out the event commit.
- Set up the pinned Python version.
- Run standard-library unit tests.
- Run the Wellness Doctor in read-only mode.
- Parse all workflow YAML files with Ruby/Psych on the GitHub-hosted Ubuntu runner.
- Fail when the doctor reports error or critical findings.
- Never commit or modify the repository.

### `.github/workflows/wellness-doctor.yml`

Purpose: publish the latest verified repository-health summary.

Required behavior:
- Trigger on pushes to `main`, manual dispatch, and a 15-minute cron schedule.
- Never declare a pull_request trigger.
- Run against the trusted default branch.
- Use explicit minimal `contents: write` permission only for the job that may update README.
- Use a concurrency group to prevent overlapping runs.
- Run tests and doctor inspection before attempting an update.
- Update only the README marker region.
- Configure bot identity and commit only if README actually changed.
- Avoid automation loops from the bot's own generated README commit.
- Expose logs through the GitHub Actions run page.

## Permission separation

The read-only quality workflow and write-enabled wellness workflow are separate on purpose. A forked or untrusted pull request must never gain the write-enabled workflow token by supplying a malicious workflow change or script.

The wellness workflow checks out the trusted `main` ref, not a pull-request head. It must not run on pull_request events.

## Schedule

Cron expression: `*/15 * * * *` (every 15 minutes).

GitHub scheduled workflows can be delayed and are not a continuous monitoring service. A scheduled run is best-effort. The README reflects the last published health state; the workflow page provides the latest run and exact timestamp.

## README update and commit behavior

- Health content is generated deterministically.
- The updater preserves everything outside the two markers.
- The workflow commits only when the health block changes.
- No timestamp-only or heartbeat-only commit is allowed.
- If the status remains unchanged, the scheduled run produces no commit.
- A missing/duplicate/reversed marker fails safely and must not overwrite README.
- The README links to the workflow page for current run details.

## Failure behavior

- Unit-test failure stops publication.
- Doctor error/critical status stops publication and fails the run.
- YAML parse failure stops publication.
- README update failure fails the run.
- Workflow cancellation is visible as a canceled run, not green.
- Do not swallow a failed check merely to publish a green README.

## Maintenance

- Update this file when triggers, permissions, schedule, actions, or job dependencies change.
- Review third-party action versions and pin SHAs.
- Inspect actual workflow runs after changing workflow files.
- Record workflow run URLs and commit SHAs in `AI/AUTOMATION_LOG.md` and `AI/STATE.md`.
