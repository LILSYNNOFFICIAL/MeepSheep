# MeepSheep

**A secure bridge between AI clients and the computers their owners choose to connect.**

MeepSheep is being built as a local-first computer-control platform. The goal is to let compatible AI clients request approved actions on a user's Windows computer through a local agent, with clear permissions, human approval, an emergency stop, and an auditable task history.

MeepSheep is **not yet a working remote-control product**. This repository contains a web dashboard prototype, a documented security design, and an early .NET policy and task-envelope validation library. It does not currently control a computer.

## Why MeepSheep

Today's AI clients can help plan computer tasks, but securely carrying out those tasks across a user's own desktop requires a separate, carefully controlled execution layer. MeepSheep is intended to provide that layer without asking users to expose public RDP, PowerShell, or other inbound control ports.

Product principles:

- **The user owns the session.** The local agent should run as the signed-in user with least privilege.
- **Permissions are enforced outside the model.** Natural-language instructions are never a security boundary.
- **Default deny.** Every capability must be explicitly granted by policy.
- **Approval is specific.** A confirmation must be tied to one operation and target, not treated as blanket permission.
- **Outbound-first connectivity.** The agent should establish an authenticated outbound session rather than expose a public control port.
- **Stop and revoke.** Users need local stop controls and a clear way to revoke devices and clients.
- **Honest status.** The interface must never invent connected devices, live usage, issued credentials, or completed actions.

## Current status

### Web dashboard prototype

The Next.js app contains the proposed black-and-gold control-center experience, navigation for Overview, Devices, Connect AI, Tasks, Plan & usage, and Security, plus explicit prototype/empty states.

The interface is not connected to a live account system, device registry, agent, or MCP server. Sample client configuration is illustrative only.

### .NET agent security foundation

The `agent/` directory contains an early library that currently provides:

- A typed list of proposed agent capabilities.
- A default-deny policy model with immutable snapshots of capability sets.
- A policy evaluator that rejects capabilities outside the allowlist, requires approval for capabilities marked sensitive, and rejects requests requiring administrator privileges.
- A task authorization envelope type.
- Validation of required envelope fields, field-size limits, issue/expiry ordering, maximum lifetime, expiry, and allowed clock skew.
- Unit tests for the policy and envelope validation rules.

**Important:** envelope validation checks structure and time bounds only. It does not authenticate the sender, verify a signature, prevent replay, establish device identity, or prove that approval was granted. These components are not yet wired to any operating-system action and are not, by themselves, a complete security boundary.

### Not implemented

- Windows desktop agent, installer, tray UI, or service lifecycle.
- Screen capture, mouse/keyboard input, clipboard, file operations, application launch, or shell execution.
- Account authentication, device pairing, credential issuance, secure transport, or revocation.
- Control API, persistent device registry, task queue, server-side audit storage, or usage metering.
- Hosted MCP endpoint or verified integration with ChatGPT, Claude, Grok, or another AI client.
- Billing, production hosting, or deployment configuration.

Do not install or run this repository expecting it to control a computer. Do not treat prototype controls, example credentials, or passing unit tests as proof of production security.

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
        | local policy + fresh approval + cancellation check
        v
Narrow, user-authorized Windows operation
```

The architecture is a target design, not a deployed system.

1. **Web control center:** account, paired devices, permission scopes, approval settings, task history, and usage.
2. **Control API:** authentication, pairing, policy distribution, task routing, revocation, audit metadata, and quotas.
3. **MCP adapter:** publishes only the tools and scopes authorized for a connected client.
4. **Windows agent:** initiates an outbound authenticated connection, validates each task locally, executes only narrow operations, and exposes a local stop path.
5. **Persistence and operations:** protected credentials, device registry, minimal audit records, monitoring, retention controls, and incident response.

## Security model

The complete security design and release requirements are documented in [docs/SECURITY-BOUNDARIES.md](docs/SECURITY-BOUNDARIES.md).

Core requirements include:

- No default administrator privileges or unrestricted administrator shell.
- Explicit capability allowlists, enforced immediately before every real operation.
- Short-lived, single-use task authorization bound to the device, operation, and target.
- Authentication and integrity protection for transport, with replay resistance.
- Fresh user confirmation for consequential or privacy-sensitive operations.
- Visible session state and a local emergency stop.
- Cancellation and timeouts, with truthful reporting when an action cannot be interrupted.
- Revocation that fails closed when an offline agent's authorization expires.
- Minimal logs: never store secrets, and do not retain screen or clipboard content by default.
- Narrow file roots and defenses against path traversal and Windows reparse-point escapes.
- Signed releases, update integrity, recovery procedures, and an end-to-end security review.

A UI toggle, an AI instruction, a client-provided boolean, or an unsigned task envelope must never be sufficient to authorize a sensitive operation.

## Development

### Requirements

- Node.js 20.9 or newer for the web application.
- .NET 10 SDK for the agent foundation and its tests.

### Web dashboard

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Run the web checks:

```bash
npm run lint
npm run build
```

### Agent policy and envelope tests

From the repository root:

```bash
dotnet test agent/MeepSheep.Agent.Core.Tests/MeepSheep.Agent.Core.Tests.csproj --configuration Release
```

These tests validate the current library's policy and envelope rules only. They do not test Windows input control, authentication, transport security, pairing, replay prevention, revocation, or real task execution because those systems do not yet exist.

### Continuous integration

GitHub Actions runs the web lint and production build, then runs the .NET agent-foundation tests on pull requests and pushes to `main`. Check the Actions result for the exact commit before claiming a revision is verified.

## Roadmap

1. **Dashboard and architecture** - establish the product UI, README, threat boundaries, and honest prototype states.
2. **Policy and task contract** - define typed capabilities, fail-closed policy decisions, and bounded task envelopes. (Initial library and tests now exist.)
3. **Pairing and session protocol** - design and review device identity, client authentication, short-lived task authorization, replay resistance, and revocation before implementing transport.
4. **Windows agent shell** - create a user-session agent with visible status, local stop control, safe lifecycle, and no default elevation.
5. **First narrow capability** - add a read-only capability behind end-to-end authentication, policy enforcement, timeouts, and Windows integration tests before expanding to input or file changes.
6. **Approval and audit** - implement operation-specific confirmation, cancellation, privacy-preserving audit events, and clear result reporting.
7. **MCP integration** - expose a small, authenticated tool set to compatible AI clients and test real client connections.
8. **Production readiness** - complete independent security review, signed distribution/update flow, abuse controls, observability, data retention, and recovery plans.
9. **Usage and plans** - measure real operating costs before designing quotas, free allowances, or paid tiers.

Do not skip from the dashboard prototype directly to unrestricted shell or desktop control.

## Deployment

Deployment is intentionally not configured yet. Select and configure hosting only after the authentication, pairing, transport, and API design have been reviewed. Never commit API keys, client tokens, pairing secrets, private keys, or user data.

## Technology

- Next.js App Router
- React and TypeScript
- Custom responsive CSS and Lucide icons
- .NET 10 for the agent policy foundation
- GitHub Actions for CI

## Project status

MeepSheep is in active prototype and architecture development. The current build is a foundation for future work, not an integrated remote-control agent. Public release claims must be based on verified end-to-end behavior, not the existence of a dashboard or passing unit tests.
