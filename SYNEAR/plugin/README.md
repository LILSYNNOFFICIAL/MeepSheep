# SYNEAR MCP plugin

This plugin descriptor connects ChatGPT to the SYNEAR Streamable HTTP MCP service at https://synear.meepsheep.com/mcp.

The current descriptor uses bearer API-key authentication. It contains no credential. The production Worker configuration has a secret binding named SYNEAR_API_KEY, but the secret value is private and its validity is not established by inspecting the binding name.

Do not put API keys in plugin.json, mcp.json, GitHub, public URLs, or prompt text. Never publish a shared user credential.

The Worker exposes GET /health for liveness and requires the bearer secret for MCP requests. Verify the target MCP client's authentication support before relying on this descriptor for onboarding. OAuth-compatible authentication is a separate planned upgrade.
