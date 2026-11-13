---
name: synear-audio-intelligence
description: Use when the user wants an audio recording, music track, vocal performance, arrangement, sound design, or two audio excerpts perceptually analyzed or compared using SYNEAR tools.
---

# SYNEAR audio intelligence workflow

SYNEAR is an audio-perception system. Use its tools when the user asks what is audible, what musical or production character a recording has, how a vocal is delivered, or how two excerpts differ.

## Select a tool

- Use `analyze_audio` for one recording. Choose `quick` for a compact overview, `music` for the standard musical analysis, `vocal` for voice-led analysis, `mix` for production and arrangement, or `full` for the full question set.
- Use `compare_audio` for two recordings or mix versions.
- Use `synear_status` only when checking service capabilities or availability.

## Initial connection setup

The service requires a bearer API key. The Cloudflare Worker secret must be named `SYNEAR_API_KEY`, and the exact same key must be entered into the SYNEAR plugin connection when ChatGPT prompts for its API key. Never put the key in audio URLs, prompts, GitHub, or public documents. The public `/health` endpoint reports whether the secret is configured without revealing it.

## Audio input

The current service accepts a public direct-download HTTPS URL. It cannot fetch a private streaming page, a link that requires browser cookies, or a file behind a login. Ask for a direct file URL when the user has not supplied one. Do not claim that a track was analyzed unless the tool call succeeds and returns model output.

## Interpret evidence carefully

SYNEAR uses Cloudflare Workers AI Clef-Omni to evaluate raw audio against typed questions and return categorical probabilities. It is real audio-model inference, not just waveform or frequency statistics. However, the first backend is a decision model, not a free-form captioner.

When reporting results:

1. Lead with the strongest, clearest findings.
2. Explain probabilities as model preference among the offered options, not calibrated confidence intervals.
3. Treat close probability margins, low confidence, or `unclear` outcomes as uncertain.
4. Distinguish an audible family (for example, guitar-like or orchestral strings) from a specific instrument that cannot be confirmed.
5. Do not invent exact BPM, musical key, chord progression, lyrics, stem isolation, source identity, or mastering measurements. These are not returned by the MVP.
6. Do not infer artist intent, personal emotion, or biographical facts from the sound.
7. Mention that conclusions apply to the submitted excerpt, not necessarily the entire track.

## Privacy and handling

Use only the audio URL the user intentionally supplies for the requested analysis. Do not attempt to locate private files, bypass access controls, or retrieve content from authenticated accounts. The service returns only the source hostname and path in its evidence summary, not URL query parameters.

## Result formatting

Present a concise but substantive listening report. Separate direct model findings from interpretation. For comparisons, describe A-versus-B findings individually and note when the model judged a dimension similar or unclear. If the analysis has weak evidence, say so plainly instead of embellishing.
