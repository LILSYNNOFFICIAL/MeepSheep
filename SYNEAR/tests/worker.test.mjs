import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { handleRpc, isSafeAudioUrl, detectAudioType, toDataUrl, serviceStatus, TOOL_DEFINITIONS } from '../src/worker.js';

function wavBytes() {
  const sampleRate = 16000;
  const sampleCount = 160;
  const bytes = new Uint8Array(44 + sampleCount * 2);
  const view = new DataView(bytes.buffer);
  const write = (offset, text) => { for (let i = 0; i < text.length; i++) bytes[offset + i] = text.charCodeAt(i); };
  write(0, 'RIFF'); view.setUint32(4, 36 + sampleCount * 2, true); write(8, 'WAVE'); write(12, 'fmt ');
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); write(36, 'data'); view.setUint32(40, sampleCount * 2, true);
  for (let i = 0; i < sampleCount; i++) view.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * 440 * i / sampleRate) * 4000), true);
  return bytes;
}

function rpcRequest(body, key = 'unit-test-key', extraHeaders = {}) {
  return new Request('https://synear.test/mcp', {
    method: 'POST',
    headers: { authorization: `Bearer ${key}`, 'content-type': 'application/json', ...extraHeaders },
    body: JSON.stringify(body)
  });
}

const baseEnv = { SYNEAR_API_KEY: 'unit-test-key', AI: { run: async () => ({ result: { answers: { media_type: { choice: 'music', probabilities: { music: 0.98 }, confidence: 0.97 } }, usage: { input_tokens: 12 } } }) } };

test('health endpoint is readable and reports backend state without revealing secrets', async () => {
  const response = await worker.fetch(new Request('https://synear.test/health'), baseEnv);
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.service, 'SYNEAR');
  assert.equal(data.audioPerception.enabled, true);
  assert.equal(data.authentication.bearerKeyConfigured, true);
  assert.equal(JSON.stringify(data).includes('unit-test-key'), false);
});

test('MCP endpoint fails closed when secret is missing or bearer key is wrong', async () => {
  const init = { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-11-25', capabilities: {}, clientInfo: { name: 'test', version: '1' } } };
  const missing = await worker.fetch(rpcRequest(init), { AI: baseEnv.AI });
  assert.equal(missing.status, 503);
  const wrong = await worker.fetch(rpcRequest(init, 'wrong'), baseEnv);
  assert.equal(wrong.status, 401);
});

test('MCP initialize negotiates supported protocol and advertises tools capability', async () => {
  const result = await handleRpc({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } }, baseEnv);
  assert.equal(result.result.protocolVersion, '2025-06-18');
  assert.equal(result.result.capabilities.tools.listChanged, false);
  assert.equal(result.result.serverInfo.name, 'synear');
});

test('tools/list publishes the three expected tools with strict schemas', async () => {
  const result = await handleRpc({ jsonrpc: '2.0', id: 2, method: 'tools/list' }, baseEnv);
  assert.deepEqual(result.result.tools.map(x => x.name), ['analyze_audio', 'compare_audio', 'synear_status']);
  assert.equal(result.result.tools[0].inputSchema.additionalProperties, false);
  assert.equal(TOOL_DEFINITIONS.length, 3);
});

test('MCP notification returns HTTP 202 with no body', async () => {
  const request = rpcRequest({ jsonrpc: '2.0', method: 'notifications/initialized' });
  const response = await worker.fetch(request, baseEnv);
  assert.equal(response.status, 202);
  assert.equal(await response.text(), '');
});

test('GET is explicitly rejected for stateless POST-only transport', async () => {
  const response = await worker.fetch(new Request('https://synear.test/mcp'), baseEnv);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST, OPTIONS');
});

test('safe URL validation blocks HTTP, local host, embedded credentials, and IP literals', () => {
  assert.throws(() => isSafeAudioUrl('http://audio.example/test.wav'), /HTTPS/);
  assert.throws(() => isSafeAudioUrl('https://127.0.0.1/test.wav'), /IP-literal/);
  assert.throws(() => isSafeAudioUrl('https://user:pass@audio.example/test.wav'), /credentials/);
  assert.throws(() => isSafeAudioUrl('https://service.local/test.wav'), /Private or local/);
  assert.equal(isSafeAudioUrl('https://cdn.example.net/music/song.wav').hostname, 'cdn.example.net');
});

test('WAV signature is recognized and converted to a model-ready data URL', () => {
  const bytes = wavBytes();
  assert.equal(detectAudioType(bytes, 'application/octet-stream'), 'audio/wav');
  const dataUrl = toDataUrl(bytes, 'audio/wav');
  assert.match(dataUrl, /^data:audio\/wav;base64,/);
});

test('analyze_audio fetches real audio bytes and passes the audio clip to model inference', async () => {
  const originalFetch = globalThis.fetch;
  let seenModel = null;
  let seenPayload = null;
  globalThis.fetch = async () => new Response(wavBytes(), { status: 200, headers: { 'content-type': 'audio/wav' } });
  try {
    const env = { SYNEAR_API_KEY: 'unit-test-key', AI: { run: async (model, payload) => {
      seenModel = model; seenPayload = payload;
      return { result: { answers: { media_type: { choice: 'music', probabilities: { music: 0.98 }, confidence: 0.97 } }, usage: { input_tokens: 12 } } };
    } } };
    const req = rpcRequest({ jsonrpc: '2.0', id: 4, method: 'tools/call', params: { name: 'analyze_audio', arguments: { audio_url: 'https://cdn.example/song.wav', profile: 'quick' } } });
    const response = await worker.fetch(req, env);
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.result.isError, false);
    assert.equal(seenModel, '@cf/cloudflare/clef-omni');
    assert.equal(seenPayload.audio.length, 1);
    assert.match(seenPayload.audio[0], /^data:audio\/wav;base64,/);
    assert.deepEqual(Object.keys(seenPayload.questions), ['media_type', 'genre_family', 'vocal_presence', 'energy', 'mood']);
    assert.equal(body.result.structuredContent.answers.media_type.choice, 'music');
  } finally { globalThis.fetch = originalFetch; }
});

test('analyze_audio rejects non-audio sources before model inference', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('not audio', { status: 200, headers: { 'content-type': 'text/html' } });
  try {
    const result = await handleRpc({ jsonrpc: '2.0', id: 5, method: 'tools/call', params: { name: 'analyze_audio', arguments: { audio_url: 'https://cdn.example/not-audio' } } }, baseEnv);
    assert.equal(result.result.isError, true);
    assert.match(result.result.content[0].text, /audio-compatible content type/);
  } finally { globalThis.fetch = originalFetch; }
});

test('status reports limits and model without leaking the API key', () => {
  const status = serviceStatus(baseEnv);
  assert.equal(status.audioPerception.model, '@cf/cloudflare/clef-omni');
  assert.equal(status.audioPerception.maxAudioBytes, 8 * 1024 * 1024);
  assert.equal(status.status, 'ready');
  assert.equal(JSON.stringify(status).includes(baseEnv.SYNEAR_API_KEY), false);
});
