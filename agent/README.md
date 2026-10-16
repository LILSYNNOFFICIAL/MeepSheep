# MeepSheep Windows agent foundation

**Status: early security library only. This is not a Windows desktop-control agent.**

## Current components

- `MeepSheep.Agent.Core`: capability enum, immutable default-deny policy, policy decision model, policy evaluator, task authorization envelope, envelope shape/time validator, and a bounded process-local replay guard.
- `MeepSheep.Agent.Core.Tests`: unit tests for capability allowlisting, approval gates, administrator-privilege rejection, policy immutability, required envelope fields, field bounds, expiry, maximum lifetime, clock skew, replay attempts, cache capacity, expiry cleanup, and concurrent replay attempts.

## Run tests

From the repository root:

```bash
dotnet test agent/MeepSheep.Agent.Core.Tests/MeepSheep.Agent.Core.Tests.csproj --configuration Release
```

## Replay guard contract

`ReplayProtectionStore.TryConsume` atomically records a device-scoped nonce and a request ID until the supplied expiry. It rejects duplicate values, invalid inputs, expired requests, and new requests when the bounded cache cannot safely accept them. It prunes expired records before checking capacity and does not evict unexpired records to make room.

The store is **process-local and memory-only**. A process restart clears its state, so it cannot by itself provide replay resistance across restarts or multiple agent instances. The caller must first authenticate the sender and validate the envelope, then consume the nonce/request ID, and only then proceed through policy and approval checks. All checks must be performed in the actual operation path, immediately before execution.

## Security limitations

The policy evaluator is useful only when every real operation invokes it at the point of execution and cannot bypass its decision. The envelope validator checks shape and time bounds only. The replay guard does not authenticate envelopes, verify signatures, establish device identity, persist consumed identifiers, or prove that a user approved an operation. None of these pieces currently controls an operating-system action.

No Windows service, tray application, screen capture, mouse/keyboard injection, clipboard access, file access, process launch, shell execution, network listener, pairing, authentication, remote task transport, installer, or update system is implemented.

Do not run this library as a remote-control agent or present it as production security.

## Next engineering gates

1. Threat-model and review the device pairing and authenticated session protocol.
2. Choose and review a standard authenticated protocol and key lifecycle. Bind task authorization to the authenticated device, capability, target, expiry, and request identifier.
3. Replace process-local replay tracking with atomic, durable consumption scoped to the device/session, and define safe behavior across restarts and concurrent agent instances.
4. Add user-visible consent, local emergency stop, cancellation, and credential revocation.
5. Wire every operation through authentication, replay checks, policy, approval, and cancellation immediately before execution.
6. Start with a narrow read-only Windows capability and test the actual call path on a Windows runner.
7. Add audit events with secret redaction and privacy-conscious retention.
8. Review signed releases, update integrity, and recovery behavior before distribution.

The current tests cover only the library behavior described above. They do not establish the security of an end-to-end system.
