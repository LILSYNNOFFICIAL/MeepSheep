# MeepSheep

**A secure bridge between AI clients and the computers their owners choose to connect.**

MeepSheep is being built as a local-first computer-control platform. The goal is to let compatible AI clients request approved actions on a user's Windows computer through a local agent, with clear permissions, human approval, an emergency stop, and an auditable task history.

**This is not yet a working remote-control product.** The repository contains a web dashboard prototype, a documented security design, an early .NET policy library, and a local-only console shell. It does not currently control a computer.

## Why MeepSheep

AI clients can help plan computer tasks, but securely carrying them out across a user's desktop requires a separate, carefully controlled execution layer. MeepSheep is intended to provide that layer without asking users to expose public RDP, PowerShell, or other inbound control ports.

Product principles:

- **The user owns the session.** The local agent should run as the signed-in user with least privilege.
- **Permissions are enforced outside the model.** Natural-language instructions are never a security boundary.
- **Default deny.** Every capability must be explicitly granted by policy.
- **Approval is specific.** Confirmation applies to one operation and target, not blanket future access.
- **Outbound-first connectivity.** The eventual agent should establish an authenticated outbound session rather than expose a public control port.
- **Stop and revoke.** Users need local stop controls and a clear way to revoke devices and clients.
- **Honest status.** The interface must never invent connected devices, live usage, issued credentials, or completed actions.

## Current status

### Web dashboard prototype

The Next.js app contains the proposed black-and-gold control-center experience, with navigation for Overview, Devices, Connect AI, Tasks, Plan & usage, and Security, plus explicit prototype/empty states. It is not connected to a live account system, device registry, agent, or MCP server. Sample client configuration is illustrative only.

### .NET agent security foundation

The `agent/` directory currently contains:

- A typed list of proposed agent capabilities.
- An immutable default-deny policy model and policy evaluator.
- Mandatory baseline approval gates for sensitive capabilities, removal of caller-asserted privilege flags, and hard denial of unimplemented high-impact capabilities (`RunCommand`, `InstallSoftware`, `ChangeFirewall`).
- A task authorization envelope and shape/time validator with required-field, field-size, lifetime, expiry, and clock-skew checks.
- An authorization-ticket consistency validator that binds tickets to the exact request, device, capability, target digest, lifetime, and approval-reference requirement. It does not authenticate or verify signatures.
- A bounded, process-local replay guard that atomically consumes a device-scoped nonce and request ID, expires old entries, and fails closed when its cache is full.
- A task lifecycle transition model that rejects invalid transitions and prevents terminal states from being reopened. It is a pure decision helper, not a durable task store or execution engine.
- Unit tests for policy decisions, envelope validation, replay rejection, expiry, capacity, and concurrent attempts.

The replay guard is only a local building block. It must be called after authentication and envelope validation. It is in-memory only, resets when the process restarts, and does not authenticate the sender, verify signatures, establish device identity, or prove approval. It is not wired to an operating-system action and is not a complete security boundary.

### Local agent shell prototype

`agent/MeepSheep.Agent.Host` is a small console program that displays local-only status and supports stopping with `STOP` or Ctrl+C. It opens no network listener, accepts no remote tasks, and cannot execute commands or control the desktop. It demonstrates a basic lifecycle and local stop path, not the Windows tray/service agent.

Build and run it from the repository root:

```bash
dotnet build agent/MeepSheep.Agent.Host/MeepSheep.Agent.Host.csproj --configuration Release
dotnet run --project agent/MeepSheep.Agent.Host/MeepSheep.Agent.Host.csproj
```

### Not implemented

- Windows desktop agent, installer, tray UI, or service lifecycle.
- Screen capture, mouse/keyboard input, clipboard, file operations, application launch, or shell execution.
- Account authentication, device pairing, credential issuance, secure transport, or revocation.
- Control API, persistent device registry, task queue, server-side audit storage, or usage metering.
- Hosted MCP endpoint or verified integration with ChatGPT, Claude, Grok, or another AI client.
- Durable replay protection across process restarts or multiple agent instances.
- Billing, production hosting, or deployment configuration.

Do not install or run this repository expecting it to control a computer. Passing unit tests is not proof of production security.

## Planned architecture

```text
Compatible AI client
        |
        | authenticated MCP tool request
        v
MCP adapter / control API
        |
        | device-bound, short-lived authorized task
        v
Outbound authenticated session
        |
        v
MeepSheep Windows agent
        |
        | local policy + fresh approval + replay guard + cancellation check
        v
Narrow, user-authorized Windows operation
```

This is a target design, not a deployed system.

1. **Web control center:** account, paired devices, permission scopes, approval settings, task history, and usage.
2. **Control API:** authentication, pairing, policy distribution, task routing, revocation, audit metadata, and quotas.
3. **MCP adapter:** publishes only the tools and scopes authorized for a connected client.
4. **Windows agent:** initiates an outbound authenticated connection, validates tasks locally, executes only narrow operations, and exposes a local stop path.
5. **Persistence and operations:** protected credentials, device registry, minimal audit records, monitoring, retention controls, and incident response.

## Security model

See [docs/SECURITY-BOUNDARIES.md](docs/SECURITY-BOUNDARIES.md) for trust boundaries, authorization flow, data handling, and release gates. See [docs/SECURITY-AUDIT-AND-REMAINING-WORK.md](docs/SECURITY-AUDIT-AND-REMAINING-WORK.md) for the dated audit log, current hardening changes, open risks, and build checklist.

Core requirements:

- No default administrator privileges or unrestricted administrator shell.
- Explicit capability allowlists enforced immediately before each real operation.
- Short-lived, single-use authorization bound to device, operation, and target.
- Authenticated transport and replay resistance that remains effective across restarts.
- Fresh confirmation for consequential or privacy-sensitive operations.
- Visible session state, local emergency stop, cancellation, and timeouts.
- Revocation that fails closed when an offline agent's authorization expires.
- Minimal logs, no secrets in logs, and no screen/clipboard retention by default.
- Narrow file roots and defenses against path traversal and Windows reparse-point escapes.
- Signed releases, update integrity, recovery procedures, and end-to-end security review.

A UI toggle, AI instruction, client-provided boolean, or unsigned task envelope must never authorize a sensitive operation.

## Development

### Requirements

- Node.js 20.9 or newer for the web application.
- .NET 10 SDK for the agent foundation and shell.

### Web dashboard

```bash
npm install
npm run dev
```

Open http://localhost:3000. Run checks with `npm run lint` and `npm run build`.

### Agent tests

```bash
dotnet test agent/MeepSheep.Agent.Core.Tests/MeepSheep.Agent.Core.Tests.csproj --configuration Release
```

These tests cover only current library behavior. They do not test Windows input control, authentication, transport, pairing, durable replay prevention, revocation, or real task execution.

### Continuous integration

GitHub Actions runs web lint, the production build, .NET agent-foundation tests, and a build of the local agent shell. Check the Actions result for the exact commit before claiming a revision is verified.

## Roadmap

1. Dashboard and architecture, with honest prototype states.
2. Policy and task contract. Initial library and tests exist.
3. Pairing/session protocol design and review, including identity, authentication, replay resistance, and revocation.
4. Expand the local agent shell into a visible Windows user-session application with a reliable local stop path and no default elevation.
5. Add a narrow read-only capability behind end-to-end authentication, policy enforcement, timeouts, and Windows integration tests.
6. Add operation-specific approval, cancellation, privacy-preserving audit, and truthful result reporting.
7. Expose a small authenticated MCP tool set and test real client connections.
8. Complete independent security review, signed distribution/update flow, abuse controls, observability, retention, and recovery.
9. Measure real operating costs before designing quotas or paid tiers.

Do not skip from the dashboard prototype directly to unrestricted shell or desktop control.

## Deployment

Deployment is intentionally not configured. Choose hosting only after authentication, pairing, transport, and API design have been reviewed. Never commit API keys, client tokens, pairing secrets, private keys, or user data.

## Technology

- Next.js App Router, React, TypeScript, custom responsive CSS, and Lucide icons.
- .NET 10 for the agent policy foundation and local shell.
- GitHub Actions for CI.

## Project status

MeepSheep is in active prototype and architecture development. It is not an integrated remote-control agent. Public release claims must be based on verified end-to-end behavior, not the existence of a dashboard or passing unit tests.
