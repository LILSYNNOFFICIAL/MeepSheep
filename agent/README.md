# MeepSheep Windows agent foundation

This directory starts the local-agent security core. It is intentionally **not yet a desktop-control agent**.

## Implemented

- Explicit capability names for screen, input, clipboard, file, application, command, installer, and firewall operations.
- A fail-closed policy evaluator that denies capabilities unless explicitly allowlisted.
- Separate approval checks for capabilities marked sensitive.
- Automated unit tests for those policy rules.

## Not implemented

There is no Windows service, screen capture, mouse or keyboard injection, process launch, shell execution, network listener, pairing, authentication, remote task transport, or installer. The policy library is not yet wired to any system operation and must not be treated as a security boundary for a running agent.

## Required next steps

1. Define the threat model and signed pairing protocol.
2. Implement user-visible consent and short-lived task authorization.
3. Connect every operation to the policy evaluator at the point of execution.
4. Add cancellation, audit events, and credential revocation.
5. Add integration tests on a supported Windows runner before enabling any desktop-control capability.

The policy evaluator is only a starting component. Production readiness requires review of the entire call path, not just passing these unit tests.
