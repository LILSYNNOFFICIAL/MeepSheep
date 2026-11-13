# SYNEAR Audio Intelligence

**Hear More. See More. Know More.**

SYNEAR is an audio-perception service exposed through the Model Context Protocol (MCP). Its current inference backend is Cloudflare Workers AI @cf/cloudflare/clef-omni, which evaluates supplied audio against typed questions and returns probability distributions.

## Current MCP surface

- analyze_audio: classify a public, direct-download HTTPS audio URL using quick, music, vocal, mix, or full question profiles.
- compare_audio: compare two short public audio excerpts for perceived energy, vocal prominence, spatial presentation, and arrangement density.
- synear_status: report service, model, authentication, and limit status.

This is actual audio-model inference, not merely waveform or spectrum analysis. The model is a typed decision model, not a free-form caption generator. The calling AI should explain the results in natural language while retaining uncertainty.

## Audio constraints

- Public direct-download HTTPS URLs only. Sources requiring browser cookies or login are not accessible.
- Single-file request limit: 8 MiB.
- Two-file comparison: 4 MiB per file and 8 MiB combined.
- The service validates redirects, disallows non-HTTPS and IP-literal URLs, checks media type and audio signatures, and reads response bodies with a hard byte ceiling.
- The model supports clips up to 300 seconds. The MVP does not attempt to infer duration from container metadata, so use clips well under that limit.

## Deployment and authentication

The Cloudflare Worker is named synear, uses an AI binding named AI, and has a secret binding named SYNEAR_API_KEY. The secret value is not stored in this repository and must never be copied into source, plugin descriptors, logs, or documentation.

The inspected production Worker configuration contained both binding names. This confirms the bindings exist, not that the secret value is valid or that an authenticated production request succeeds.

The MCP endpoint is https://synear.meepsheep.com/mcp; the public liveness endpoint is /health. The current plugin descriptor uses bearer API-key authentication. Compatibility with each target MCP client must be verified before claiming that client onboarding works. OAuth is a separate planned authentication upgrade and must preserve the existing tools and audio behavior.

## Verified source provenance

The recovered source archive contains the exact Worker source currently deployed to Cloudflare.

- src/worker.js: 30,408 bytes.
- SHA-256: f3a0c1900c3584507cc8c4caebdd91c4bfff6392049d218d248cbd8e9c1fef0d.
- The deployed Worker source was retrieved from Cloudflare's script-content endpoint, its multipart boundary and module body were parsed, and the SHA-256 matched the recovered source file exactly.
- The source archive SHA-256 is recorded in source-manifest.json.

## Local verification

No third-party package installation is required.

```bash
npm test
npm run check
```

The recovered test suite passed 11 of 11 tests under Node.js 22.16.0, and node --check src/worker.js passed. CI repeats these checks from this repository.

## MCP protocol

The server implements stateless Streamable HTTP POST, JSON-RPC 2.0, initialize negotiation for MCP revisions 2025-03-26, 2025-06-18, and 2025-11-25, tool listing, and tool calls. GET and DELETE return 405. It does not issue session IDs or expose server-initiated SSE notifications.

## Limitations

This MVP does not perform source separation, exact BPM/key detection, lyric transcription, musical transcription, objective LUFS/true-peak/phase measurements, or full natural-language captioning in the inference model. It returns model-scored categorical evidence. Confidence/probability values are not calibrated statistical confidence intervals.

## Project boundaries

SYNEAR remains an independent MCP service. Do not merge its Worker runtime into SynTalk or repurpose the existing MeepSheep MCP hub. Shared MeepSheep identity is intended to grant access to both products, while SYNEAR-specific authorization and data remain isolated.
