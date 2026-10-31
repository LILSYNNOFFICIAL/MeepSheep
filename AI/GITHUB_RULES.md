# MeepSheep GitHub Repository Rules

## Source of truth

- Canonical repository: `LILSYNNOFFICIAL/MeepSheep`.
- Default branch: `main`, subject to periodic verification.
- GitHub is the canonical source of code and project documents unless the owner explicitly changes this.
- Do not assume GitLab is a mirror or deployment source without an explicit decision.

## Branch strategy

- Use focused feature branches for substantial application or infrastructure changes.
- Direct commits to `main` are acceptable for owner-directed documentation maintenance and narrowly scoped repository administration when explicitly requested.
- Prefer pull requests for application code, security-sensitive changes, dependencies, and workflow permission changes.
- Never force-push, rewrite history, delete branches, or delete repository content without explicit authorization.

## Recommended branch protection / ruleset

Recommended settings for `main`, to be configured only after checking current GitHub capabilities and owner preference:

1. Require pull requests for application code.
2. Require the quality workflow to pass before merge.
3. Require conversation resolution.
4. Block force pushes.
5. Block branch deletion.
6. Require linear history only if it fits the chosen merge workflow.
7. Restrict bypass permissions to the repository owner and explicitly authorized administrators.
8. Do not require signed commits unless signing is configured and tested.

These are recommendations, not claims that GitHub settings have been applied. The available repository connection may not have administration endpoints or sufficient permissions to change rulesets.

## Commit rules

- Use concise conventional commit messages where practical: `docs:`, `ci:`, `test:`, `feat:`, `fix:`, `security:`.
- Keep commits focused and reviewable.
- Never commit secrets, production exports, private user data, or generated caches.
- Generated README health content may be committed by the Wellness Doctor only within its protected marker region.
- Do not commit a health report if its generated README block is unchanged.

## Pull request requirements

Before merge:
- [ ] Scope and acceptance criteria are stated.
- [ ] Relevant tests pass.
- [ ] Formatting, lint, typecheck, and build pass when configured.
- [ ] Security implications and permission changes are reviewed.
- [ ] Documentation and AI memory files are updated where behavior or decisions changed.
- [ ] Generated artifacts are reproducible.
- [ ] No unrelated files changed.
- [ ] Workflow logs are inspected for hidden warnings or skipped required steps.

## GitHub Actions permissions

- Workflows declare the smallest explicit permissions required.
- Pull-request validation uses `contents: read`.
- Only trusted default-branch, schedule, and manual wellness runs receive `contents: write`.
- Do not run untrusted pull-request code in a write-enabled job.
- Pin third-party actions to immutable commit SHAs when practical and record why any mutable tag is used.
- Avoid secrets in job outputs, logs, artifacts, or commit messages.
- Use concurrency groups to prevent competing README health commits.

## Repository settings verification

A workflow file is not proof of branch protection. A commit is not proof of a required status check. Record the actual GitHub settings and permissions evidence in `AI/STATE.md` when settings are inspected.

## Owner approval boundary

The owner retains control over destructive operations, public releases, repository visibility, billing, secrets, branch protection bypass, domain/DNS changes, and production deployment. An AI agent must not silently change these.
