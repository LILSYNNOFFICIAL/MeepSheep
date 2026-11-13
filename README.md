# MeepSheep

**Connected intelligence, thoughtfully built.**

MeepSheep is the product home for focused AI tools that help systems communicate and help people understand audio and other signals. Built by **NeuroSyn-Dev**.

The ecosystem brings together two independent products with a shared direction.

## Products

### SynTalk
**Connect. Communicate. Coordinate.**

SynTalk is the MCP-first communication and coordination layer for independently operated AI agents and tools. It is designed around controlled discovery, permission-aware messaging, and bounded task delegation.

- [SynTalk overview](SYNTALK/README.md)
- [Engineering documentation](SYNTALK/AI/PROJECT.md)

### SYNEAR
**Hear More. See More. Know More.**

SYNEAR is an MCP audio-intelligence service. Its current service analyzes and compares audio using Cloudflare Workers AI and returns structured, probabilistic evidence.

- [SYNEAR overview and verified implementation notes](SYNEAR/README.md)
- [MCP plugin descriptor](SYNEAR/plugin/mcp.json)

## One MeepSheep identity

The accepted product direction is one MeepSheep account for both SynTalk and SYNEAR. A person registering through either product should receive access to both without creating a second account.

The products remain separate services. Shared identity is not shared authorization: each product must continue to enforce its own data access, permissions, and service boundaries. Cross-product provisioning is an implementation milestone and must not be described as live until end-to-end tests verify it.

## Company website

The responsive company website lives in **WEBSITE/**. It is a dependency-free static site intended for Cloudflare Pages. Production Pages and DNS cutover are configured separately after the current domain origin is verified.

## Repository layout

| Path | Purpose |
|---|---|
| WEBSITE/ | MeepSheep company website |
| SYNTALK/ | SynTalk product documentation, AI engineering notes, scripts, and tests |
| SYNEAR/ | SYNEAR Worker source, tests, Wrangler configuration, and plugin assets |
| .github/workflows/ | Repository-wide GitHub Actions |

GitHub workflows stay at the repository root so GitHub Actions can discover them.

## Working with AI contributors

Before making changes to MeepSheep, SynTalk, or SYNEAR, inspect the repository and read the authorized private engineering notes for the affected product. Follow the documented product boundaries, security rules, and verification workflow.

If private notes are unavailable, do not guess at hidden architecture or credentials. Report the missing context and work only within what can be verified from the repository.

Never commit credentials, API keys, private user data, or secret-bearing configuration. Use the appropriate secret manager and keep public documentation free of private access instructions.

## Project status

- The company website source and automated validation are in place.
- The original SynTalk README, AI documentation, scripts, and tests are grouped under SYNTALK/.
- SYNEAR source is restored from the archived release and independently verified against the currently deployed Worker.
- Shared identity provisioning and the website's production deployment remain separate release gates.
