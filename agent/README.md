# MeepSheep agent foundation

**Status: local lifecycle shell plus early security library. This is not a Windows desktop-control agent.**

## Components

- `MeepSheep.Agent.Core`: capability enum, immutable default-deny policy, policy decision model, policy evaluator, task authorization envelope, envelope shape/time validator, authorization-ticket consistency validator, and a bounded process-local replay guard.
- `MeepSheep.Agent.Core.Tests`: tests for policy allowlisting, fail-closed approval gates, administrator-privilege rejection, immutability, envelope validation, replay attempts, capacity, expiry cleanup, and concurrency.
- `MeepSheep.Agent.Host`: a cross-platform console shell that displays local-only status and supports stopping with `STOP` or Ctrl+C. It opens no network listener, accepts no remote tasks, and cannot execute commands or control the desktop.

## Build and run the local shell

From the repository root:

```bash
dotnet build agent/MeepSheep.Agent.Host/MeepSheep.Agent.Host.csproj --configuration Release
dotnet run --project agent/MeepSheep.Agent.Host/MeepSheep.Agent.Host.csproj
```

The shell reports that remote sessions are not configured and all computer-control capabilities are disabled. It is a lifecycle/stop-control prototype only.

## Run tests

```bash
dotnet test agent/MeepSheep.Agent.Core.Tests/MeepSheep.Agent.Core.Tests.csproj --configuration Release
```

## Replay guard contract

`ReplayProtectionStore.TryConsume` atomically records a device-scoped nonce and a request ID until the supplied expiry. It rejects duplicate values, invalid inputs, expired requests, and new requests when the bounded cache cannot safely accept them. It prunes expired records before checking capacity and does not evict unexpired records to make room.

The store is **process-local and memory-only**. A process restart clears its state, so it cannot by itself provide replay resistance across restarts or multiple agent instances. The caller must first authenticate the sender and validate the envelope, then consume the nonce/request ID, and only then proceed through policy and approval checks. All checks must be performed in the actual operation path, immediately before execution. The current policy core intentionally denies every capability marked approval-required, even if allowlisted: there is no trusted, operation-bound local approval issuer/verifier yet. The ticket validator only checks consistency and binding; it does not authenticate the issuer or verify signatures. Do not reintroduce a caller-supplied approval boolean as a shortcut.

## Security limitations

The policy evaluator is useful only when every real operation invokes it at the point of execution and cannot bypass its decision. The envelope validator checks shape and time bounds only. The replay guard does not authenticate envelopes, verify signatures, establish device identity, persist consumed identifiers, or prove that a user approved an operation. None of these pieces currently controls an operating-system action.

No Windows tray app/service, screen capture, mouse/keyboard injection, clipboard access, file access, process launch, shell execution, pairing, authentication, remote task transport, installer, or update system is implemented.

Do not run this as a remote-control agent or present it as production security.

## Next engineering gates

1. Threat-model and review the device pairing and authenticated session protocol.
2. Choose and review a standard authenticated protocol and key lifecycle. Bind task authorization to the authenticated device, capability, target, expiry, and request identifier.
3. Replace process-local replay tracking with atomic, durable consumption scoped to the device/session, including safe restart and multi-instance behavior.
4. Add user-visible consent, local emergency stop, cancellation, and credential revocation.
5. Wire every operation through authentication, replay checks, policy, approval, and cancellation immediately before execution.
6. Start with a narrow read-only Windows capability and test the actual call path on a Windows runner.
7. Add audit events with secret redaction and privacy-conscious retention.
8. Review signed releases, update integrity, and recovery behavior before distribution.

The current tests cover only the library behavior described above. They do not establish the security of an end-to-end system.
