const MCP_PROTOCOL_VERSION = "2025-11-25";
const SUPPORTED_PROTOCOL_VERSIONS = new Set([
  "2025-03-26",
  "2025-06-18",
  "2025-11-25",
]);
const MODEL_ID = "@cf/cloudflare/clef-omni";
const MODEL_NAME = "clef-omni";
const MAX_AUDIO_BYTES = 8 * 1024 * 1024;
const MAX_COMPARE_TOTAL_BYTES = 8 * 1024 * 1024;
const MAX_REDIRECTS = 3;
const USER_AGENT = "SYNEAR/0.1.0";

const QUESTIONS = {
  media_type: {
    type: "choice",
    instructions: "Classify the dominant audible content. Choose music when music is the primary content, including music with vocals.",
    criteria: {
      music: "Music is the primary audible content, with or without vocals.",
      speech: "Spoken language is the primary audible content, without music dominating.",
      environmental_sound: "Real-world environmental or mechanical sounds dominate.",
      mixed_audio: "Music and speech or environmental sound are both prominent.",
      noise_or_silence: "Noise, silence, or content too unclear to classify dominates."
    }
  },
  genre_family: {
    type: "choice",
    instructions: "Identify the broadest well-supported musical genre family. Do not guess a narrow subgenre. Use other_unclear if the clip is not clearly classifiable as music.",
    criteria: {
      pop: "Pop and mainstream melodic popular music.",
      rock: "Rock, alternative rock, punk, or related guitar-band styles.",
      hip_hop_rap: "Hip-hop, rap, trap, or related beat-led styles.",
      rnb_soul: "R&B, soul, funk, or related vocal groove styles.",
      electronic_dance: "Electronic, house, techno, EDM, or dance-oriented music.",
      metal_hardcore: "Metal, hardcore, or heavy aggressive guitar-based music.",
      country_folk: "Country, folk, acoustic singer-songwriter, or roots music.",
      jazz_blues: "Jazz, blues, or improvisation-led music.",
      classical_orchestral: "Classical, orchestral, chamber, or traditionally scored music.",
      ambient_soundtrack: "Ambient, cinematic, soundtrack, or atmospheric instrumental music.",
      world_latin: "Latin, world, regional, or culturally specific traditional styles.",
      other_unclear: "Not music, too mixed, or no genre family is sufficiently supported."
    }
  },
  vocal_presence: {
    type: "choice",
    instructions: "Identify the clearest vocal content in the audio. Distinguish singing from speech.",
    criteria: {
      lead_singing: "Clearly audible lead singing is present.",
      rap_or_spoken_rhythm: "Rhythmic spoken or rapped vocal delivery is present.",
      backing_vocals_or_chants: "Backing vocals, choir, chants, or vocal textures are prominent without a clear lead.",
      ordinary_speech: "Ordinary speech or dialogue is present.",
      instrumental_no_clear_voice: "No clear human voice is audible.",
      uncertain: "Voice may be present but cannot be identified confidently."
    }
  },
  rhythm_feel: {
    type: "choice",
    instructions: "Choose the most clearly audible rhythmic feel. Base the answer on the sound, not genre stereotypes.",
    criteria: {
      straight_backbeat: "Straight pulse with a clear backbeat, common in pop and rock.",
      hip_hop_half_time: "Half-time or hip-hop/trap-style pulse with space between major beats.",
      four_on_floor: "Steady four-on-the-floor kick pattern.",
      swing_or_shuffle: "Swinging, shuffled, or swung subdivision.",
      breakbeat_or_syncopated: "Breakbeat, syncopated, or irregularly accented groove.",
      free_time_or_ambient: "Free-time, rubato, droning, or ambient with no clear groove.",
      unclear: "No rhythmic feel is sufficiently clear."
    }
  },
  tempo_feel: {
    type: "choice",
    instructions: "Estimate the perceived tempo category. Do not report a BPM value.",
    criteria: {
      slow: "Perceived as slow or spacious.",
      moderate: "Perceived as moderate or mid-tempo.",
      brisk: "Perceived as brisk or energetic but not very fast.",
      fast: "Perceived as fast.",
      very_fast: "Perceived as very fast.",
      unclear: "Tempo cannot be judged reliably from this clip."
    }
  },
  lead_instrument_family: {
    type: "choice",
    instructions: "Identify the most prominent melodic or featured instrumental family, if one is clearly audible. Do not infer an instrument hidden in the mix.",
    criteria: {
      guitar_or_string_plucked: "Guitar or another plucked string instrument is featured.",
      piano_or_keys: "Piano, electric piano, or keyboard is featured.",
      synth_or_electronic: "Synthesizer or electronic tone is featured.",
      orchestral_strings: "Bowed strings or orchestral string layers are featured.",
      brass_or_winds: "Brass or woodwind instruments are featured.",
      voice_led: "Voice is the dominant melodic focus.",
      percussion_led: "Percussion or drums are the dominant featured element.",
      ensemble_or_unclear: "No single family dominates or the source is unclear."
    }
  },
  low_end: {
    type: "choice",
    instructions: "Describe the audible low-frequency foundation. Do not identify a specific bass instrument unless it is clearly distinguishable.",
    criteria: {
      electronic_sub_bass: "Deep electronic sub-bass or synthesized low end is prominent.",
      electric_or_acoustic_bass: "A pitched electric or acoustic bass instrument is prominent.",
      kick_driven_low_end: "The kick drum supplies most of the perceived low-frequency weight.",
      drone_or_sustained_low_end: "A sustained low drone or pad is prominent.",
      minimal_low_end: "There is little prominent low-frequency content.",
      unclear: "Low-end source cannot be distinguished."
    }
  },
  energy: {
    type: "choice",
    instructions: "Estimate the perceived energy and intensity of the audio.",
    criteria: {
      very_low: "Very restrained, quiet, or low-energy.",
      low: "Gentle or subdued energy.",
      medium: "Moderate energy.",
      high: "High energy or intensity.",
      very_high: "Very high intensity or forceful energy.",
      dynamic_or_variable: "Energy changes substantially within the clip."
    }
  },
  mood: {
    type: "choice",
    instructions: "Choose the dominant emotional or atmospheric impression conveyed by the sound. This is an interpretation of the audio, not a claim about the artist's intent.",
    criteria: {
      dark_or_melancholic: "Dark, melancholic, mournful, or introspective.",
      uplifting_or_triumphant: "Uplifting, hopeful, celebratory, or triumphant.",
      aggressive_or_intense: "Aggressive, confrontational, or intensely forceful.",
      romantic_or_tender: "Tender, intimate, affectionate, or romantic.",
      tense_or_suspenseful: "Tense, anxious, ominous, or suspenseful.",
      dreamy_or_ethereal: "Dreamy, floating, hazy, or ethereal.",
      playful_or_light: "Playful, light, humorous, or carefree.",
      neutral_or_ambiguous: "Neutral, mixed, or not clearly classifiable."
    }
  },
  production_texture: {
    type: "choice",
    instructions: "Describe the dominant recording or production texture that is directly audible.",
    criteria: {
      polished_studio: "Controlled, polished studio production.",
      raw_or_live: "Raw, live, room-recorded, or performance-like sound.",
      lo_fi_or_degraded: "Lo-fi, noisy, distorted, filtered, or intentionally degraded texture.",
      cinematic_spacious: "Wide, cinematic, reverberant, or spacious production.",
      dense_layered: "Dense, layered, or heavily arranged production.",
      minimal_sparse: "Sparse, exposed, or minimally arranged production.",
      unclear_or_mixed: "The texture is mixed or cannot be judged confidently."
    }
  },
  vocal_delivery: {
    type: "choice",
    instructions: "If a human vocal is clearly audible, classify the dominant delivery. Do not mistake distortion or an instrument for a vocal. If no voice is apparent, choose not_applicable.",
    criteria: {
      clean_melodic: "Clean melodic singing.",
      breathy_intimate: "Breathy, close, intimate, or soft vocal delivery.",
      rap_or_spoken: "Rap, rhythmic speech, or spoken delivery.",
      screamed_or_growled: "Screamed, shouted, or growled vocal delivery.",
      layered_harmonies: "Stacked harmonies, choir, or layered vocal arrangement dominates.",
      heavily_processed: "Strongly processed, chopped, pitched, or effected vocals dominate.",
      not_applicable: "No clearly audible human vocal or insufficient vocal evidence."
    }
  },
  arrangement: {
    type: "choice",
    instructions: "Describe how the arrangement behaves within the provided excerpt.",
    criteria: {
      steady_loop_or_section: "A relatively steady loop or stable section.",
      builds_or_intensifies: "The arrangement builds or intensifies.",
      drops_or_strips_back: "The arrangement drops, pauses, or strips back.",
      changing_sections: "A clear transition or section change occurs.",
      free_form_or_improvised: "Free-form or improvisational development.",
      unclear: "The excerpt is too short or ambiguous to judge."
    }
  },
  spatial_mix: {
    type: "choice",
    instructions: "Assess the perceived space and separation in the mix, not technical stereo measurements.",
    criteria: {
      dry_and_close: "Dry, close, and intimate presentation.",
      reverberant_and_wide: "Reverberant, wide, or spacious presentation.",
      centered_and_compact: "Centered, compact, or narrow presentation.",
      layered_and_separated: "Multiple layers are perceptually separated.",
      dense_or_masked: "Dense or masked presentation with limited separation.",
      unclear: "The mix space cannot be judged from the excerpt."
    }
  }
};

const PROFILES = {
  quick: ["media_type", "genre_family", "vocal_presence", "energy", "mood"],
  music: ["media_type", "genre_family", "vocal_presence", "rhythm_feel", "tempo_feel", "lead_instrument_family", "low_end", "energy", "mood", "production_texture", "arrangement", "spatial_mix"],
  vocal: ["media_type", "vocal_presence", "vocal_delivery", "rhythm_feel", "energy", "mood", "production_texture", "spatial_mix"],
  mix: ["media_type", "rhythm_feel", "lead_instrument_family", "low_end", "energy", "production_texture", "arrangement", "spatial_mix"],
  full: Object.keys(QUESTIONS)
};

const TOOL_DEFINITIONS = [
  {
    name: "analyze_audio",
    title: "Analyze audio",
    description: "Perceive and classify an audio excerpt with Cloudflare Clef-Omni. Returns model-scored evidence for musical content, broad genre family, vocals, rhythm, tempo feel, instrumental family, low end, energy, mood, arrangement, and production texture. Supply a public direct-download HTTPS audio URL. This is perceptual inference, not waveform-only analysis. Results are estimates with confidence scores, not definitive stem separation or exact BPM/transcription.",
    inputSchema: {
      type: "object",
      properties: {
        audio_url: { type: "string", format: "uri", description: "Public direct-download HTTPS URL for one audio file. The URL must not require cookies, login, or a browser session." },
        profile: { type: "string", enum: ["quick", "music", "vocal", "mix", "full"], default: "music", description: "Question set to run. music is the standard musical analysis; full asks the complete question bank." }
      },
      required: ["audio_url"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  },
  {
    name: "compare_audio",
    title: "Compare two audio excerpts",
    description: "Compare two public direct-download HTTPS audio files with the same audio-perception model. Assesses relative energy, vocal presence, production space, and arrangement character. Each file is limited to 4 MiB and the combined payload to 8 MiB. The comparison is perceptual and excerpt-dependent, not a mastering meter or objective loudness measurement.",
    inputSchema: {
      type: "object",
      properties: {
        audio_a_url: { type: "string", format: "uri", description: "Public direct-download HTTPS URL for reference A." },
        audio_b_url: { type: "string", format: "uri", description: "Public direct-download HTTPS URL for reference B." }
      },
      required: ["audio_a_url", "audio_b_url"],
      additionalProperties: false
    },
    annotations: { readOnlyHint: true, openWorldHint: true }
  },
  {
    name: "synear_status",
    title: "SYNEAR status",
    description: "Returns the SYNEAR audio-perception service's runtime, model, limits, and configured capabilities. Does not access or transmit audio.",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
    annotations: { readOnlyHint: true, openWorldHint: false }
  }
];

function jsonResponse(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...headers }
  });
}

function rpcError(id, code, message, data) {
  const error = { code, message };
  if (data !== undefined) error.data = data;
  return { jsonrpc: "2.0", id: id ?? null, error };
}

function validateOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    if (parsed.protocol !== "https:" && parsed.hostname !== "localhost") return false;
    const host = parsed.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host === "127.0.0.1" || host === "::1") return false;
    return true;
  } catch {
    return false;
  }
}

function isSafeAudioUrl(raw) {
  let url;
  try { url = new URL(raw); } catch { throw new Error("audio_url must be a valid absolute HTTPS URL."); }
  if (url.protocol !== "https:") throw new Error("Only HTTPS audio URLs are accepted.");
  if (url.username || url.password) throw new Error("Audio URLs must not contain embedded credentials.");
  if (url.port && url.port !== "443") throw new Error("Only the default HTTPS port is accepted.");
  if (url.hash) throw new Error("Audio URLs must not contain fragments.");
  const host = url.hostname.toLowerCase();
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new Error("Private or local hostnames are not accepted.");
  }
  if (/^[0-9.]+$/.test(host) || host.startsWith("[") || host.includes(":")) {
    throw new Error("IP-literal audio URLs are not accepted. Use a public DNS hostname.");
  }
  return url;
}

async function fetchWithSafeRedirects(rawUrl, maxBytes) {
  let url = isSafeAudioUrl(rawUrl);
  for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount++) {
    const response = await fetch(url.toString(), {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(20_000),
      headers: { "accept": "audio/*, application/octet-stream;q=0.8", "user-agent": USER_AGENT }
    });
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || redirectCount === MAX_REDIRECTS) throw new Error("Audio source redirected too many times or returned an invalid redirect.");
      url = isSafeAudioUrl(new URL(location, url).toString());
      continue;
    }
    if (!response.ok) throw new Error(`Audio source returned HTTP ${response.status}.`);
    const declaredSize = Number(response.headers.get("content-length") || 0);
    if (declaredSize && declaredSize > maxBytes) throw new Error(`Audio file exceeds the ${maxBytes} byte limit.`);
    const contentType = (response.headers.get("content-type") || "application/octet-stream").split(";")[0].trim().toLowerCase();
    if (!(contentType.startsWith("audio/") || contentType === "application/octet-stream" || contentType === "video/mp4")) {
      throw new Error(`The source did not return an audio-compatible content type (received ${contentType || "unknown"}).`);
    }
    const bytes = await readBoundedBody(response.body, maxBytes);
    if (!bytes.length) throw new Error("Audio source returned an empty file.");
    const detectedType = detectAudioType(bytes, contentType);
    return { bytes, contentType: detectedType, url };
  }
  throw new Error("Audio source redirect handling failed.");
}

async function readBoundedBody(body, maxBytes) {
  if (!body) throw new Error("Audio source returned no body.");
  const reader = body.getReader();
  const chunks = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error(`Audio file exceeds the ${maxBytes} byte limit.`);
      }
      chunks.push(value);
    }
  } finally {
    try { reader.releaseLock(); } catch {}
  }
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}

function detectAudioType(bytes, declaredType) {
  const ascii = (start, length) => String.fromCharCode(...bytes.subarray(start, start + length));
  const starts = (...values) => values.every((v, i) => bytes[i] === v);
  if (ascii(0, 4) === "RIFF" && ascii(8, 4) === "WAVE") return "audio/wav";
  if (ascii(0, 4) === "fLaC") return "audio/flac";
  if (ascii(0, 4) === "OggS") return "audio/ogg";
  if (starts(0x1a, 0x45, 0xdf, 0xa3)) return "audio/webm";
  if (ascii(4, 4) === "ftyp") return "audio/mp4";
  if (ascii(0, 3) === "ID3" || (bytes.length > 1 && bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0)) return "audio/mpeg";
  if (declaredType.startsWith("audio/")) return declaredType;
  throw new Error("The downloaded file did not have a recognized audio signature. Supported examples include WAV, MP3, FLAC, Ogg, WebM audio, and M4A/MP4 audio.");
}

function toDataUrl(bytes, contentType) {
  let binary = "";
  const blockSize = 0x8000;
  for (let i = 0; i < bytes.length; i += blockSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + blockSize));
  }
  return `data:${contentType};base64,${btoa(binary)}`;
}

function buildQuestionSet(names) {
  const selected = {};
  for (const name of names) selected[name] = QUESTIONS[name];
  return selected;
}

function getCoreModelResult(result) {
  if (result && result.result && result.result.answers) return result.result;
  if (result && result.answers) return result;
  throw new Error("Clef-Omni returned an unexpected response shape.");
}

function sanitizeSource(url) {
  return { host: url.hostname, path: url.pathname.slice(0, 180) };
}

async function runAudioAnalysis(env, audioUrl, profile) {
  const chosenProfile = PROFILES[profile] ? profile : "music";
  const clip = await fetchWithSafeRedirects(audioUrl, MAX_AUDIO_BYTES);
  if (!env.AI || typeof env.AI.run !== "function") throw new Error("Cloudflare Workers AI binding is not configured.");
  const aiResult = await env.AI.run(MODEL_ID, {
    model: MODEL_NAME,
    state: "You are evaluating a supplied audio excerpt. Answer only the typed questions using evidence directly audible in the clip. Prefer uncertainty over guessing. A probability is a model estimate, not a calibrated measurement.",
    audio: [toDataUrl(clip.bytes, clip.contentType)],
    questions: buildQuestionSet(PROFILES[chosenProfile])
  });
  const core = getCoreModelResult(aiResult);
  return {
    service: "SYNEAR",
    model: MODEL_ID,
    profile: chosenProfile,
    source: sanitizeSource(clip.url),
    media: { contentType: clip.contentType, bytes: clip.bytes.length },
    answers: core.answers,
    usage: core.usage || aiResult.usage || null,
    interpretationGuidance: "Probabilities rank the supplied choices. They are model estimates, not calibrated confidence intervals. Treat low-margin or low-confidence classifications as uncertain; do not infer exact instruments, BPM, lyrics, key, or stems from these labels."
  };
}

async function runAudioComparison(env, urlA, urlB) {
  const [clipA, clipB] = await Promise.all([
    fetchWithSafeRedirects(urlA, 4 * 1024 * 1024),
    fetchWithSafeRedirects(urlB, 4 * 1024 * 1024)
  ]);
  if (clipA.bytes.length + clipB.bytes.length > MAX_COMPARE_TOTAL_BYTES) {
    throw new Error(`The combined audio payload exceeds ${MAX_COMPARE_TOTAL_BYTES} bytes.`);
  }
  if (!env.AI || typeof env.AI.run !== "function") throw new Error("Cloudflare Workers AI binding is not configured.");
  const questions = {
    relative_energy: {
      type: "choice",
      instructions: "Which excerpt sounds more energetic or intense overall?",
      criteria: { audio_a: "Audio A sounds more energetic.", audio_b: "Audio B sounds more energetic.", similar: "The excerpts have broadly similar perceived energy.", unclear: "Not enough evidence to compare." }
    },
    relative_vocals: {
      type: "choice",
      instructions: "Which excerpt has more prominent human vocals?",
      criteria: { audio_a: "Audio A has more prominent vocals.", audio_b: "Audio B has more prominent vocals.", similar: "Vocal prominence is broadly similar.", unclear: "Not enough evidence to compare." }
    },
    relative_space: {
      type: "choice",
      instructions: "Which excerpt sounds wider, more reverberant, or more spacious?",
      criteria: { audio_a: "Audio A sounds wider or more spacious.", audio_b: "Audio B sounds wider or more spacious.", similar: "Spatial presentation is broadly similar.", unclear: "Not enough evidence to compare." }
    },
    relative_density: {
      type: "choice",
      instructions: "Which excerpt has a denser or more layered arrangement?",
      criteria: { audio_a: "Audio A sounds denser or more layered.", audio_b: "Audio B sounds denser or more layered.", similar: "Arrangement density is broadly similar.", unclear: "Not enough evidence to compare." }
    }
  };
  const raw = await env.AI.run(MODEL_ID, {
    model: MODEL_NAME,
    state: "Compare audio clip A followed by audio clip B. Base each answer on perceptual differences, not presumed artist, genre, loudness metadata, or recording history.",
    audio: [toDataUrl(clipA.bytes, clipA.contentType), toDataUrl(clipB.bytes, clipB.contentType)],
    questions
  });
  const core = getCoreModelResult(raw);
  return {
    service: "SYNEAR",
    model: MODEL_ID,
    comparison: { audioA: { source: sanitizeSource(clipA.url), contentType: clipA.contentType, bytes: clipA.bytes.length }, audioB: { source: sanitizeSource(clipB.url), contentType: clipB.contentType, bytes: clipB.bytes.length } },
    answers: core.answers,
    usage: core.usage || raw.usage || null,
    interpretationGuidance: "The results compare the supplied excerpts only. Differences may reflect excerpt selection or recording levels. No LUFS, peak, phase, or objective mastering measurements are performed."
  };
}

function serviceStatus(env) {
  const aiEnabled = Boolean(env.AI && typeof env.AI.run === "function");
  const bearerKeyConfigured = Boolean(env.SYNEAR_API_KEY);
  return {
    service: "SYNEAR",
    version: "0.1.0",
    status: aiEnabled && bearerKeyConfigured ? "ready" : "setup_required",
    mcp: { transport: "Streamable HTTP", endpointPath: "/mcp", protocolVersion: MCP_PROTOCOL_VERSION, stateless: true },
    audioPerception: { provider: "Cloudflare Workers AI", model: MODEL_ID, enabled: aiEnabled, maxAudioBytes: MAX_AUDIO_BYTES, maxDurationSeconds: 300, acceptedClipCount: 4, supportedProfiles: Object.keys(PROFILES) },
    authentication: { bearerKeyConfigured },
    limitations: [
      "Inputs are public direct-download HTTPS URLs; browser-only private links are not accessible.",
      "Clef-Omni returns typed choices and probability distributions, not a free-form audio caption.",
      "This MVP does not perform source separation, exact BPM/key detection, lyric transcription, or calibrated loudness measurement."
    ]
  };
}

async function handleToolCall(name, args, env) {
  if (name === "synear_status") return serviceStatus(env);
  if (name === "analyze_audio") {
    if (typeof args?.audio_url !== "string" || !args.audio_url) throw new Error("audio_url is required.");
    const profile = args.profile || "music";
    if (!PROFILES[profile]) throw new Error(`Unsupported profile. Choose one of: ${Object.keys(PROFILES).join(", ")}.`);
    return runAudioAnalysis(env, args.audio_url, profile);
  }
  if (name === "compare_audio") {
    if (typeof args?.audio_a_url !== "string" || !args.audio_a_url || typeof args?.audio_b_url !== "string" || !args.audio_b_url) {
      throw new Error("audio_a_url and audio_b_url are both required.");
    }
    return runAudioComparison(env, args.audio_a_url, args.audio_b_url);
  }
  throw Object.assign(new Error(`Unknown tool: ${name}`), { code: -32601 });
}

async function handleRpc(payload, env) {
  if (Array.isArray(payload)) {
    if (payload.length === 0) return rpcError(null, -32600, "Invalid Request");
    const responses = [];
    for (const item of payload) {
      const response = await handleRpc(item, env);
      if (response !== null) responses.push(response);
    }
    return responses.length ? responses : null;
  }
  if (!payload || payload.jsonrpc !== "2.0" || typeof payload.method !== "string") {
    return rpcError(payload?.id, -32600, "Invalid Request");
  }
  const id = Object.prototype.hasOwnProperty.call(payload, "id") ? payload.id : undefined;
  const params = payload.params && typeof payload.params === "object" ? payload.params : {};
  if (payload.method === "initialize") {
    const requestedVersion = params.protocolVersion;
    const negotiatedVersion = SUPPORTED_PROTOCOL_VERSIONS.has(requestedVersion) ? requestedVersion : MCP_PROTOCOL_VERSION;
    return {
      jsonrpc: "2.0", id,
      result: {
        protocolVersion: negotiatedVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "synear", version: "0.1.0", title: "SYNEAR Audio Intelligence" },
        instructions: "SYNEAR analyzes audio through a multimodal audio perception model. Use analyze_audio for a single clip, compare_audio for two clips, and synear_status for runtime information. Analysis results are model-scored estimates; report uncertainty and do not invent exact BPM, keys, lyrics, stems, or instrument identities."
      }
    };
  }
  if (payload.method === "notifications/initialized" || payload.method === "notifications/cancelled" || payload.method === "notifications/progress") return null;
  if (payload.method === "ping") return { jsonrpc: "2.0", id, result: {} };
  if (payload.method === "tools/list") return { jsonrpc: "2.0", id, result: { tools: TOOL_DEFINITIONS } };
  if (payload.method === "tools/call") {
    const name = params.name;
    const args = params.arguments || {};
    try {
      const result = await handleToolCall(name, args, env);
      const text = JSON.stringify(result, null, 2);
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text }], structuredContent: result, isError: false } };
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown tool failure.";
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: message }], isError: true } };
    }
  }
  if (payload.method === "resources/list") return { jsonrpc: "2.0", id, result: { resources: [] } };
  if (payload.method === "prompts/list") return { jsonrpc: "2.0", id, result: { prompts: [] } };
  return rpcError(id, -32601, `Method not found: ${payload.method}`);
}

function constantTimeEqual(expected, supplied) {
  if (typeof expected !== "string" || typeof supplied !== "string") return false;
  const a = new TextEncoder().encode(expected);
  const b = new TextEncoder().encode(supplied);
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) mismatch |= a[i] ^ b[i];
  return mismatch === 0;
}

function getBearer(request) {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  return match ? match[1].trim() : "";
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/health" && request.method === "GET") {
      return jsonResponse(serviceStatus(env));
    }
    if (url.pathname === "/" && request.method === "GET") {
      return new Response("SYNEAR Audio Intelligence MCP service. Use POST /mcp or GET /health.\n", {
        headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" }
      });
    }
    if (url.pathname !== "/mcp") return jsonResponse({ error: "Not found" }, 404);
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: { "access-control-allow-methods": "POST, OPTIONS", "access-control-allow-headers": "content-type, authorization, mcp-protocol-version", "access-control-max-age": "86400" } });
    }
    if (request.method === "GET" || request.method === "DELETE") {
      return new Response(null, { status: 405, headers: { allow: "POST, OPTIONS" } });
    }
    if (request.method !== "POST") return new Response(null, { status: 405, headers: { allow: "POST, OPTIONS" } });
    if (!validateOrigin(request)) return jsonResponse({ error: "Origin rejected" }, 403);
    if (!env.SYNEAR_API_KEY) return jsonResponse({ error: "Service authentication is not configured." }, 503);
    if (!constantTimeEqual(env.SYNEAR_API_KEY, getBearer(request))) return jsonResponse({ error: "Unauthorized" }, 401, { "www-authenticate": "Bearer" });
    const protocolHeader = request.headers.get("mcp-protocol-version");
    if (protocolHeader && !SUPPORTED_PROTOCOL_VERSIONS.has(protocolHeader)) {
      return jsonResponse(rpcError(null, -32600, `Unsupported MCP protocol version: ${protocolHeader}`), 400);
    }
    let payload;
    try { payload = await request.json(); }
    catch { return jsonResponse(rpcError(null, -32700, "Parse error"), 400); }
    const rpcResponse = await handleRpc(payload, env);
    if (rpcResponse === null) return new Response(null, { status: 202, headers: { "cache-control": "no-store" } });
    return jsonResponse(rpcResponse, 200, { "mcp-protocol-version": protocolHeader || MCP_PROTOCOL_VERSION });
  }
};

export { handleRpc, handleToolCall, isSafeAudioUrl, fetchWithSafeRedirects, detectAudioType, toDataUrl, serviceStatus, TOOL_DEFINITIONS, PROFILES, QUESTIONS };
