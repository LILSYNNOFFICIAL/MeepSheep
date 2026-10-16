# MeepSheep Windows agent foundation

**Status: early security library only. This is not a Windows desktop-control agent.**

## Current components

- `MeepSheep.Agent.Core`: capability enum, immutable default-deny policy, policy decision model, policy evaluator, task authorization envelope, and envelope shape/time validator.
- `MeepSheep.Agent.Core.Tests`: unit tests for capability allowlisting, approval gates, administrator-privilege rejection, policy immutability, required envelope fields, field bounds, expiry, maximum lifetime, and clock skew.

## Run tests

From the repository root:

```bash
dotnet test agent/MeepSheep.Agent.Core.Tests/MeepSheep.Agent.Core.Tests.csproj --configuration Release
```

## Security limitations

The policy evaluator is useful only when every real operation invokes it at the point of execution and cannot bypass its decision. The envelope validator checks shape and time bounds only. It does **not** authenticate a client, verify signatures, establish device identity, prevent replay, prove that a user approved an operation, or provide secure transport.

No Windows service, tray application, screen capture, mouse/keyboard injection, clipboard access, file access, process launch, shell execution, network listener, pairing, authentication, remote task transport, installer, or update system is implemented.

Do not run this library as a remote-control agent or present it as production security.

## Next engineering gates

1. Threat-model and review the device pairing and authenticated session protocol.
2. Define signed or MAC-authenticated, single-use task authorization bound to device, capability, target, and expiry.
3. Add replay protection and durable/atomic nonce consumption.
4. Add user-visible consent, local emergency stop, cancellation, and credential revocation.
5. Wire every operation through authorization checks immediately before execution.
6. Start with a narrow read-only Windows capability and test the actual call path on a Windows runner.
7. Add audit events with secret redaction and privacy-conscious retention.
8. Review signed releases, update integrity, and recovery behavior before distribution.

The current tests cover only the library behavior described above. They do not establish the security of an end-to-end system.
