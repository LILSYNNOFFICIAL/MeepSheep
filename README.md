# MeepSheep

**Secure, permission-based computer control for AI clients.**

MeepSheep is being reworked into a bridge between compatible AI clients and computers their owners choose to connect. The long-term goal is to let an AI inspect a screen, interact with approved desktop applications, and run explicitly permitted tasks through a local agent, with the human remaining in control.

MeepSheep is not a public remote-desktop service and should not require exposing RDP, PowerShell, or other inbound control ports to the internet.

## Product direction

- **Local Windows agent:** runs on the computer the user owns and handles approved screen, mouse, keyboard, and command operations.
- **MCP integration:** a hosted Model Context Protocol service is planned so compatible AI clients can request tools through an authenticated interface.
- **Explicit permissions:** permissions are enforced by the agent and service, not by instructions to the AI model alone.
- **Approval gates:** high-impact actions such as deleting files, installing software, changing firewall rules, or publishing content should require confirmation.
- **Audit history:** record task requests, device identity, approvals, actions, and results.
- **Emergency stop and revocation:** stop task intake and revoke device or client access.
- **Usage and plans:** introduce transparent usage limits and optional paid tiers only after real costs and metering are understood.

## Current state

The repository currently contains a **front-end prototype** for the proposed control center. It is not yet a functioning remote-control product.

The prototype includes:
- Responsive black-and-gold dashboard and navigation
- Honest empty states for devices, tasks, and activity
- MCP client configuration example using placeholder host and token values
- Preview settings for approval policy and emergency stop
- Connection setup dialog that clearly explains what is not implemented

Not implemented yet:
- Windows local agent or installer
- Device pairing and secure session transport
- User authentication, server-side device registry, or credential issuance
- Hosted MCP endpoint or live integrations with ChatGPT, Claude, Grok, or other clients
- Screen capture, mouse/keyboard control, command execution, or approval enforcement
- Server-side audit log, quotas, billing, or account-abuse controls

Do not treat any prototype control, status, or sample configuration as a real security control or live connection.

## Security principles

1. **No default administrator access.** Run with the least privilege required and request elevation only for a specific justified operation.
2. **Outbound connections from the local agent.** Avoid asking users to expose public remote-access ports.
3. **Short-lived, revocable credentials.** Separate account authentication, client tokens, and device pairing secrets.
4. **Server and agent enforce policy.** The AI model cannot grant itself permissions or bypass an approval requirement.
5. **Human approval for consequential actions.** Examples include permanent deletion, installing or uninstalling software, modifying firewall or security settings, and changing account permissions.
6. **Auditable outcomes.** Record who requested an action, which device received it, the approval result, and whether it succeeded.
7. **Clear stop and disconnect paths.** Users must be able to revoke a client or device and stop accepting new tasks.
8. **Abuse prevention with proportional signals.** Account and usage controls should not rely on IP address alone.

These are product requirements and design goals, not claims that the prototype currently enforces them.

## Suggested architecture

1. **Web control center:** Next.js interface for account, device, permissions, task history, and usage.
2. **Control API:** authenticated service for pairing, policy, task routing, revocation, and metering.
3. **Local agent:** Windows process that initiates an outbound authenticated connection and executes a narrow set of policy-checked capabilities.
4. **MCP adapter:** exposes only authorized tools to connected AI clients and forwards requests through the control service.
5. **Persistence and operations:** durable device registry, encrypted secrets, audit records, quotas, monitoring, and incident response.

A production implementation must define and test the threat model, authentication and pairing protocol, transport security, command allowlists, consent model, data retention, and recovery behavior before connecting to a real computer.

## Development

Requirements: Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Open http://localhost:3000.

Production build:

```bash
npm run build
npm start
```

Lint:

```bash
npm run lint
```

GitHub Actions runs a production build on pushes to `main` and pull requests targeting `main`.

## Deployment

Deployment is intentionally not configured as part of this prototype phase. Choose and configure hosting only after the UI, API boundaries, authentication design, and agent pairing approach are ready. Never commit API keys, pairing secrets, private tokens, or credentials to the repository.

## Roadmap

1. Replace the previous creator-workspace interface with the control-center prototype.
2. Design and threat-model secure account authentication, device pairing, and local-agent permissions.
3. Build and test the Windows local agent with narrowly scoped capabilities and a safe stop path.
4. Implement the control API, device registry, revocation, audit records, and server-side usage accounting.
5. Add an authenticated MCP service and test it with compatible clients.
6. Complete security review, integration tests, operational monitoring, and documentation before public release.

## Technology

- Next.js App Router
- React and TypeScript
- Custom responsive CSS
- Lucide icons
- GitHub Actions build workflow

## Project status

MeepSheep is in the prototype and architecture phase. It is not ready to control a real computer, and it should not be represented as integrated with any AI provider until a working integration has been implemented and verified.
