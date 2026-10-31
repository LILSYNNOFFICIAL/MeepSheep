# MCP Relay Laboratory Implementation Plan

> **For agentic workers:** Use the host's available task-by-task implementation workflow. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first executable MeepSheep MCP relay proof, where a real MCP caller invokes MeepSheep and MeepSheep forwards an authorized tool call to an independent mock MCP agent and returns the remote result with provenance.

**Architecture:** The first lab is a local Node.js service using the official MCP TypeScript SDK v2.4.0. MeepSheep exposes an inbound MCP server and uses an outbound MCP client to connect to a separately instantiated remote MCP server. A small in-memory registry and test-only authenticated principal make the protocol and authorization boundary testable without production credentials or infrastructure.

**Tech Stack:** Node.js 26.13.0 LTS, JavaScript ES modules, `@modelcontextprotocol/server@2.4.0`, `@modelcontextprotocol/client@2.4.0`, `zod@4.6.7`, Node's built-in test runner, GitHub Actions. A generated `package-lock.json` is committed and CI uses `npm ci`.

## Global Constraints

- MeepSheep is an MCP-first agent-to-agent relay, not a research engine.
- Implement both MCP roles: inbound server and outbound client.
- The remote agent performs its own work using its own declared tools. MeepSheep transports the request and response.
- The relay must never trust caller or tenant identity supplied in tool arguments. The inbound authentication boundary supplies principal context.
- Discovery and invocation are separate permissions.
- A remote tool must be explicitly approved for a connection before invocation.
- Remote tool metadata and outputs are untrusted. Preserve provenance and sanitize failures.
- Do not accept arbitrary remote endpoint URLs through model-callable tools.
- No secrets, production credentials, DNS changes, Cloudflare resources, database provisioning, or deployment in this lab.
- Mock-agent tests prove protocol plumbing and relay behavior only. They do not prove a live external AI integration.
- Pin direct dependency versions. CI must install and test the project on Node 26.
- Use the current official MCP TypeScript SDK v2 packages, not the legacy monolithic v1 package.
- Keep the existing Python Wellness Doctor and its tests intact.

---

### Task 1: Establish the executable test harness and lock the relay behavior

**Files:**
- Create: `package.json`
- Create: `.nvmrc`
- Create: `tests/mcp-relay.integration.test.mjs`
- Modify: `.github/workflows/quality.yml`
- Create: `docs/plans/2026-10-31-mcp-relay-lab.md`

**Interfaces:**
- Test subject: exported `createRelayHandler({ registry, resolvePrincipal })`.
- Test subject: `AgentRegistry.register(agent)`, `AgentRegistry.discover(principal)`, and `AgentRegistry.getAuthorized(principal, agentId, toolName)`.
- The remote MCP client is a connected SDK `Client`; the remote server is an independently created `McpServer` served through `createMcpHandler`.
- Test caller identity is injected as validated `authInfo` by the test transport wrapper, never included in tool arguments.

- [x] **Step 1: Add the focused failing tests**

Create tests that exercise the relay through an actual MCP Client calling the MeepSheep MCP handler, and an outbound MCP Client calling a separately created mock-agent MCP handler.

Required assertions:
1. `discover_agents` returns only same-tenant agents visible to the authenticated principal and never returns endpoint credentials or secret references.
2. `send_message` invokes the exact approved remote tool, passes the requested structured arguments, and returns the remote result with source agent, target agent, trace ID, and remote tool provenance.
3. A target from another tenant is not discoverable and cannot be invoked.
4. A remote tool not on the connection's approved allowlist is rejected and the remote handler is not called.
5. A tool removed or renamed remotely is rejected as a schema/allowlist mismatch, not silently invoked.
6. A remote tool error is returned as a sanitized relay error without exposing a stack trace or credential.
7. A caller without the required message permission cannot dispatch.

- [x] **Step 2: Verify the expected red state**

Run: `npm test`

Expected: tests fail because the relay module and test harness do not yet exist. Confirm the failure is an import/missing behavior failure, not a malformed test or dependency setup failure. Install exact pinned SDK dependencies in CI before relying on the test result.

- [x] **Step 3: Implement only the minimum behavior**

Create `src/relay/agent-registry.mjs` with an in-memory registry and explicit same-tenant visibility and tool allowlist checks.

Create `src/relay/mcp-handler.mjs` with:
- An inbound MCP handler exposing `discover_agents` and `send_message`.
- Principal resolution from validated MCP `authInfo` supplied by the hosting authentication layer.
- No caller identity, tenant ID, endpoint URL, or credentials in tool input schemas.
- Outbound `Client.listTools()` verification before `Client.callTool()`.
- Structured response with generated message/trace IDs, source/target identity, remote tool name, and returned result.
- Sanitized errors for missing agent, tenant mismatch, missing permission, unapproved tool, changed remote tool, and remote failure.

Create `tests/fixtures/mock-agent.mjs` with a separate MCP server exposing one deterministic tool, and a test helper that connects the caller and relay to independent SDK handlers through the SDK's in-process Streamable HTTP fetch transport.

Update CI to install Node 26, install the pinned dependencies, and run `npm test`, while preserving the existing Python tests, Wellness Doctor, and YAML syntax validation.

- [x] **Step 4: Verify the focused green state**

Run: `npm test`

Expected: all seven behavior groups pass, including positive dispatch and negative authorization/allowlist cases.

- [x] **Step 5: Run repository integration checks**

Run: `npm test && python -m unittest discover -s tests -v && python scripts/wellness_doctor.py`

Expected: JavaScript MCP integration tests pass, all existing Python unit tests pass, and the Wellness Doctor reports no new findings. GitHub Actions must run the same checks on the branch.

- [x] **Step 6: Commit the independently passing deliverable**

```bash
git add package.json .nvmrc src tests/mcp-relay.integration.test.mjs tests/fixtures .github/workflows/quality.yml docs/plans/2026-10-31-mcp-relay-lab.md
git commit -m "feat: add MCP relay laboratory"
```

---

### Task 2: Prove the actual remote transport boundary

**Files:**
- Modify: `tests/mcp-relay.integration.test.mjs`
- Create: `tests/fixtures/mock-agent-process.mjs`
- Modify: `src/relay/mcp-handler.mjs`

**Interfaces:**
- The outbound connector accepts a preconfigured MCP endpoint and a `StreamableHTTPClientTransport` connection.
- The test mock agent runs as a separately spawned Node process with its own MCP server instance and loopback HTTP listener.
- The caller remains an MCP client connecting to the MeepSheep inbound handler.

- [x] **Step 1: Add failing transport tests**

Assert that the relay performs MCP initialization and tool discovery against a separately instantiated remote HTTP handler, calls only the approved tool, and returns the remote output. Add a timeout/failure case and assert the caller receives a sanitized error.

- [x] **Step 2: Verify red**

Run: `npm test`

Expected: the new remote transport test fails because only the in-memory registry/client seam is available.

- [x] **Step 3: Implement outbound transport adapter**

Implement and verify a `StreamableHTTPClientTransport` connection to the child-process mock server over loopback TCP. Endpoint configuration is test-owned and never supplied by a model-callable tool. Do not implement arbitrary URL registration, OAuth onboarding, or production SSRF policy in this task.

- [x] **Step 4: Verify green**

Run: `npm test`

Expected: local caller-to-relay-to-separate-process HTTP agent test passes; failure case returns a bounded, sanitized error.

- [x] **Step 5: Run repository integration checks**

Run: `npm test && python -m unittest discover -s tests -v && python scripts/wellness_doctor.py`

Expected: all 8 MCP tests, 10 Python tests, and repository checks pass with 0 warnings/errors/critical findings.

- [x] **Step 6: Commit**

```bash
git add src/relay/mcp-handler.mjs tests/mcp-relay.integration.test.mjs tests/fixtures/http-mock-agent.mjs
git commit -m "test: prove outbound MCP HTTP relay"
```

---

### Task 3: Harden the lab contract and prepare the live-connection gate

**Files:**
- Create: `AI/MCP_LAB.md`
- Modify: `AI/API_SPEC.md`
- Modify: `AI/TEST_STRATEGY.md`
- Modify: `AI/BUILD_PLAN.md`
- Modify: `AI/STATE.md`

**Interfaces:**
- Document the exact tool schemas, auth context seam, connection record, result envelope, and failure mapping implemented by Tasks 1 and 2.
- Separate verified mock behavior from unverified provider compatibility.

- [ ] **Step 1: Add failing contract assertions**

Add tests for response envelope shape, no credential leakage, duplicate message idempotency behavior if implemented in the lab, and malformed remote output handling.

- [x] **Step 2: Verify red**

Run: `npm test`

Expected: each new assertion fails on its intended missing contract behavior.

- [ ] **Step 3: Implement the minimum contract behavior**

Add only the fields and handling required by the API contract. Do not add a database, multi-tenant production auth, arbitrary remote endpoint registration, task queue, dashboard, or A2A adapter to this local lab.

- [x] **Step 4: Verify green**

Run: `npm test`

Expected: all protocol, response-shape, authorization, and failure tests pass.

- [ ] **Step 5: Run full checks and review**

Run: `npm test && python -m unittest discover -s tests -v && python scripts/wellness_doctor.py`

Expected: all tests pass and the Doctor reports zero warnings/errors/critical findings. Review the diff for secrets, hardcoded production endpoints, unapproved scope expansion, and README claims that confuse mocks with live integrations.

- [x] **Step 6: Commit**

```bash
git add AI/MCP_LAB.md AI/API_SPEC.md AI/TEST_STRATEGY.md AI/BUILD_PLAN.md AI/STATE.md src tests
git commit -m "docs: specify verified MCP relay lab"
```

## Unresolved product decisions

These are intentionally not silently decided by this local lab:

1. Which exact external AI client will be the first real caller (ChatGPT API, a ChatGPT UI connection surface, Grok API/CLI, or another MCP host)?
2. Which independently operated remote AI agent and MCP endpoint will be the first real target?
3. Which Cloudflare account actually contains `meepsheep.com`, and is the domain zone accessible from the connected account?
4. Which production identity provider and authoritative relational database will own users, tenants, agent connections, grants, and tasks?
5. Which production transport/auth profile and OAuth onboarding experience should be exposed to external MCP hosts?
6. What default task/message retention and deletion policy should be published?

The local lab can proceed without these answers. A live provider connection or production deployment cannot.
