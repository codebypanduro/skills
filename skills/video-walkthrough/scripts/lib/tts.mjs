import { execFile, execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { promisify } from 'node:util';
import { getOpenAIKey } from './keychain.mjs';

const run = promisify(execFile);

const MACOS_VOICES = { en: 'Samantha', da: 'Sara', de: 'Anna', sv: 'Alva', nb: 'Nora', no: 'Nora', fr: 'Thomas', es: 'Monica', it: 'Alice', nl: 'Xander' };
const OPENAI_DEFAULT_VOICE = 'coral';
const OPENAI_DEFAULT_MODEL = 'gpt-4o-mini-tts';

function stdinRun(cmd, args, input) {
  return new Promise((resolve, reject) => {
    const p = execFile(cmd, args, (err, _o, stderr) => (err ? reject(new Error(`${cmd} failed: ${stderr || err.message}`)) : resolve()));
    p.stdin.end(input);
  });
}

const engines = {
  openai: {
    ext: 'mp3',
    async synth({ key, voice, model, instructions, text, outFile }) {
      const body = { model, voice, input: text, response_format: 'mp3' };
      if (instructions && model.startsWith('gpt-4o')) body.instructions = instructions;
      const res = await fetch('https://api.openai.com/v1/audio/speech', {
        method: 'POST',
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        // OpenAI's error message can echo part of the key; report only status and error code.
        const err = (await res.json().catch(() => ({}))).error || {};
        throw Object.assign(new Error(`OpenAI speech API ${res.status}${err.code ? ` (${err.code})` : ''}`), { openai: true });
      }
      fs.writeFileSync(outFile, Buffer.from(await res.arrayBuffer()));
    },
  },
  macos: {
    ext: 'aiff',
    async synth({ voice, text, outFile }) {
      const args = ['-o', outFile, '-f', '-'];
      if (voice) args.unshift('-v', voice);
      await stdinRun('say', args, text);
    },
  },
  piper: {
    ext: 'wav',
    async synth({ voice, text, outFile }) {
      await stdinRun('piper', ['--model', voice, '--output_file', outFile], text);
    },
  },
};

/**
 * Pick the engine once, up front. openai without a key falls back to macos
 * and says so in `notes`. Pure given its inputs, so it is testable.
 */
export function resolveTts({ engine = 'macos', voice, model, instructions, language = 'en' }, { getKey = getOpenAIKey, platform = process.platform } = {}) {
  const notes = [];
  let key = null;
  if (!engines[engine]) throw new Error(`Unknown TTS engine "${engine}". Use openai, macos or piper.`);
  if (engine === 'openai') {
    key = getKey();
    if (!key) {
      if (platform !== 'darwin') throw new Error('No OpenAI key (set OPENAI_API_KEY) and no macos fallback on this platform.');
      notes.push('openai engine selected but no API key found (OPENAI_API_KEY or Keychain): falling back to macos voice.');
      engine = 'macos';
      voice = undefined;
    }
  }
  if (engine === 'openai') {
    voice ||= OPENAI_DEFAULT_VOICE;
    model ||= OPENAI_DEFAULT_MODEL;
  } else if (engine === 'macos') {
    voice ||= MACOS_VOICES[language.slice(0, 2)];
  } else if (engine === 'piper' && !voice) {
    throw new Error('piper needs voice=piper:<path to .onnx model>.');
  }
  const tts = { engine, voice, model, instructions, language, notes, ext: engines[engine].ext };
  Object.defineProperty(tts, 'key', { value: key, enumerable: false }); // keeps the key out of JSON/console output
  return tts;
}

export async function synthesize(tts, text, outFile) {
  try {
    await engines[tts.engine].synth({ ...tts, key: tts.key, text, outFile });
  } catch (e) {
    if (tts.engine === 'openai') e.openai = true; // network errors too: the caller falls back to macos
    throw e;
  }
  return outFile;
}

export function probeDuration(file) {
  const out = execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  return parseFloat(out);
}
