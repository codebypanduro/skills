import test from 'node:test';
import assert from 'node:assert/strict';
import { parseToml, parseArgs, parseVoice } from '../lib/config.mjs';
import { normaliseScript } from '../lib/script.mjs';
import { resolveTts } from '../lib/tts.mjs';
import { toSrt, srtTime } from '../lib/srt.mjs';

test('parseToml reads strings, bare words, comments', () => {
  const c = parseToml('# x\nengine = "openai"\nvoice = "coral" # trailing\nlanguage = da\ninstructions = "Tal \\"roligt\\" på dansk"\n');
  assert.deepEqual(c, { engine: 'openai', voice: 'coral', language: 'da', instructions: 'Tal "roligt" på dansk' });
});

test('parseArgs and parseVoice', () => {
  const { script, opts } = parseArgs(['s.json', 'voice=openai:nova', 'pr=12', 'lang=da']);
  assert.equal(script, 's.json');
  assert.deepEqual(opts, { voice: 'openai:nova', pr: '12', lang: 'da' });
  assert.deepEqual(parseVoice('macos:Sara'), { engine: 'macos', voice: 'Sara' });
  assert.deepEqual(parseVoice('macos'), { engine: 'macos' });
  assert.throws(() => parseArgs(['a.json', '--wat']));
});

test('normaliseScript validates steps and defaults', () => {
  const s = normaliseScript({ url: 'http://x', scenes: [{ say: 'Hi', steps: [{ click: 'a' }] }] });
  assert.equal(s.scenes[0].caption, 'Hi');
  assert.equal(s.viewport.width, 1280);
  assert.throws(() => normaliseScript({ url: 'http://x', scenes: [{ say: 'a', steps: [{ click: 'a', hover: 'b' }] }] }), /exactly one/);
  assert.throws(() => normaliseScript({ url: 'http://x', scenes: [{ say: 'a', steps: [{ fill: 'a' }] }] }), /selector, text/);
  assert.throws(() => normaliseScript({ scenes: [{ say: 'a' }] }), /url/);
  assert.throws(() => normaliseScript({ url: 'u', scenes: [{}] }), /say/);
});

test('openai without a key falls back to macos and says so', () => {
  const t = resolveTts({ engine: 'openai', voice: 'nova', language: 'da' }, { getKey: () => null, platform: 'darwin' });
  assert.equal(t.engine, 'macos');
  assert.equal(t.voice, 'Sara');
  assert.match(t.notes[0], /falling back to macos/);
});

test('openai with a key keeps defaults and the key', () => {
  const t = resolveTts({ engine: 'openai' }, { getKey: () => 'k', platform: 'darwin' });
  assert.deepEqual([t.engine, t.voice, t.model, t.key, t.notes.length], ['openai', 'coral', 'gpt-4o-mini-tts', 'k', 0]);
});

test('macos picks a voice by language; unknown engine and piper without model throw', () => {
  assert.equal(resolveTts({ engine: 'macos', language: 'en' }).voice, 'Samantha');
  assert.equal(resolveTts({ engine: 'macos', voice: 'Alex' }).voice, 'Alex');
  assert.throws(() => resolveTts({ engine: 'nope' }), /Unknown TTS engine/);
  assert.throws(() => resolveTts({ engine: 'piper' }), /piper needs/);
});

test('srt formatting', () => {
  assert.equal(srtTime(3661.5), '01:01:01,500');
  assert.equal(toSrt([{ start: 0, end: 1.25, text: 'A' }]), '1\n00:00:00,000 --> 00:00:01,250\nA\n');
});

test('the API key is not enumerable, so it cannot leak through logging', () => {
  const t = resolveTts({ engine: 'openai' }, { getKey: () => 'sk-secret', platform: 'darwin' });
  assert.equal(t.key, 'sk-secret');
  assert.ok(!JSON.stringify(t).includes('sk-secret'));
});

test('openai engine posts the documented speech request (fetch stubbed)', async () => {
  const { synthesize } = await import('../lib/tts.mjs');
  const fs = await import('node:fs');
  const os = await import('node:os');
  const real = globalThis.fetch;
  let seen;
  globalThis.fetch = async (url, init) => { seen = { url, init }; return new Response(new Uint8Array([1, 2, 3])); };
  try {
    const tts = resolveTts({ engine: 'openai', voice: 'nova', instructions: 'Tal roligt', language: 'da' }, { getKey: () => 'sk-x', platform: 'darwin' });
    const out = `${os.tmpdir()}/vw-test-${process.pid}.mp3`;
    await synthesize(tts, 'Hej', out);
    const body = JSON.parse(seen.init.body);
    assert.equal(seen.url, 'https://api.openai.com/v1/audio/speech');
    assert.equal(seen.init.headers.Authorization, 'Bearer sk-x');
    assert.deepEqual([body.model, body.voice, body.input, body.instructions], ['gpt-4o-mini-tts', 'nova', 'Hej', 'Tal roligt']);
    assert.equal(fs.statSync(out).size, 3);
    fs.rmSync(out);
  } finally { globalThis.fetch = real; }
});
