# MeepSheep Incident and Recovery Rules

## Severity

Use the authoritative mapping in `AI/STATUS_ICONS.md`.

- 🟡 Warning: limited defect, stale or optional item, no material integrity or security impact.
- 🔵 Error: broken required workflow, significant repository defect, or multiple related warnings.
- 🔴 Major failure: suspected credential exposure, unauthorized write, destructive repository change, integrity compromise, or a release-blocking critical failure.

## Immediate response

1. Stop the affected automation or release activity.
2. Preserve the failing workflow run URL, commit SHA, job name, and relevant logs.
3. Determine whether the issue is reproducible and identify the first failing step.
4. Check for unintended writes, leaked credentials, or changes outside the intended scope.
5. If a secret may be exposed, revoke/rotate it through the owning provider immediately. Do not paste the secret into chat, issues, or logs.
6. Repair the smallest root cause and add a regression test.
7. Re-run the exact failed check and the relevant full workflow.
8. Independently inspect the resulting repository and workflow state.
9. Record cause, impact, repair, and verification in `AI/AUTOMATION_LOG.md`.

## Recovery boundaries

- Do not automatically revert arbitrary commits. First inspect the diff and identify the safe recovery point.
- Do not disable security checks just to obtain a green status.
- Do not change branch protection or secrets as an unreviewed response.
- Do not erase logs or evidence of an incident.
- Do not claim a service is restored until its actual downstream behavior is verified.

## Wellness Doctor failure

If the doctor cannot produce a trustworthy report:
- The workflow must fail visibly.
- The README must retain the last known report rather than being overwritten with guessed green status.
- The workflow logs must identify the failing check.
- The next successful run should publish the corrected status.
- A missing or malformed README marker must be repaired manually and reviewed before rerunning.

## Post-incident review

Record:
- incident identifier and UTC time;
- severity;
- affected commit/workflow/files;
- observed impact;
- root cause and contributing factors;
- whether data, credentials, or user privacy were affected;
- remediation and regression tests;
- verification evidence;
- follow-up tasks and owner.
