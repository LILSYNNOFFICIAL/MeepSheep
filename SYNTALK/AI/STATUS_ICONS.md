# MeepSheep Health Status Icon Contract

This document is the authoritative mapping for repository and workflow health indicators. The same mapping must be used by the Wellness Doctor, generated README summary, workflow annotations, and future dashboard surfaces.

## Status definitions

| Icon | Code | Severity | Meaning | Expected action |
|---|---|---:|---|---|
| 🟢 | `OK` | 0 | All configured checks passed. | No action required. |
| 🟡 | `ERROR_1` | 1 | Warning or one low-severity issue. The system remains usable, but attention is needed. | Review and schedule a repair. |
| 🔵 | `ERROR_2` | 2 | Significant error, multiple related warnings, or a broken non-critical component. | Investigate and repair promptly. |
| 🔴 | `MAJOR_FAILURE` | 3 | Critical failure, security incident, integrity loss, or release-blocking condition. | Stop affected work and follow incident response. |

## Deterministic mapping

The internal severity values are `ok`, `warning`, `error`, and `critical`. The visible labels are exactly:

- `ok` → 🟢
- `warning` → 🟡
- `error` → 🔵
- `critical` → 🔴

Overall status is the highest severity among all findings. Precedence is:

`🔴 critical > 🔵 error > 🟡 warning > 🟢 ok`

A higher-severity finding always overrides a lower-severity finding, regardless of count.

## Finding contract

Each finding must include:
- `id`: stable machine-readable check identifier.
- `severity`: one of `warning`, `error`, or `critical`.
- `message`: concise, actionable explanation.
- `path`: repository-relative file path when applicable; otherwise null.
- `details`: optional safe diagnostic context. Never include secrets or sensitive user content.

Passing checks are summarized as passed counts; they do not need individual finding objects.

## Scope and honest status

- 🟢 means all configured checks passed. It does not certify unimplemented features, unconfigured infrastructure, or external systems that were not checked.
- An unconfigured optional service is informational, not an error.
- A check that could not run is not a pass. Report it as a warning or error according to impact.
- A stale report must be labeled stale if a freshness mechanism is later introduced.
- The README must link to the latest workflow execution for detailed run logs.

## README generated block

The doctor owns only the region between exactly one pair of:
- `<!-- MEEPSHEEP_HEALTH_START -->`
- `<!-- MEEPSHEEP_HEALTH_END -->`

Manual edits inside this region may be overwritten. Content outside the markers must be preserved byte-for-byte by the updater.

## Change control

Changing icon meaning, severity precedence, or thresholds requires:
1. An explicit entry in `AI/DECISIONS.md`.
2. Updates to this document and doctor tests.
3. A failing test that demonstrates the old mapping is insufficient.
4. Verification of README rendering and workflow output.
