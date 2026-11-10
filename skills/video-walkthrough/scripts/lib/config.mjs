import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const CONFIG_DIR = process.env.VIDEO_WALKTHROUGH_HOME || path.join(os.homedir(), '.config', 'video-walkthrough');

/** Flat `key = "value"` TOML subset: strings, bare words, # comments. */
export function parseToml(text) {
  const out = {};
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#') || line.startsWith('[')) continue;
    const m = line.match(/^([A-Za-z_][\w-]*)\s*=\s*(.*)$/);
    if (!m) continue;
    let v = m[2].trim();
    if (v.startsWith('"')) {
      const end = v.lastIndexOf('"');
      v = JSON.parse(v.slice(0, end + 1));
    } else {
      v = v.replace(/\s+#.*$/, '');
    }
    out[m[1]] = v;
  }
  return out;
}

export function loadConfig(dir = CONFIG_DIR) {
  try {
    return parseToml(fs.readFileSync(path.join(dir, 'config.toml'), 'utf8'));
  } catch {
    return {};
  }
}

/** `key=value` words and one script path. Anything else is an error. */
export function parseArgs(argv) {
  const opts = {};
  let script = null;
  for (const a of argv) {
    const m = a.match(/^(voice|lang|pr|out|captions|name)=(.*)$/);
    if (m) opts[m[1]] = m[2];
    else if (!script && !a.startsWith('-')) script = a;
    else throw new Error(`Unknown argument: ${a}`);
  }
  return { script, opts };
}

export function parseVoice(spec) {
  if (!spec) return {};
  const i = spec.indexOf(':');
  return i < 0 ? { engine: spec } : { engine: spec.slice(0, i), voice: spec.slice(i + 1) || undefined };
}
