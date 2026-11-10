#!/usr/bin/env node
// Usage: node walkthrough.mjs <script.json> [voice=engine:voice] [lang=da] [out=dir] [name=file-stem] [pr=<n>] [captions=burn|srt]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { loadConfig, parseArgs, parseVoice } from './lib/config.mjs';
import { normaliseScript, slug } from './lib/script.mjs';
import { resolveTts, synthesize, probeDuration } from './lib/tts.mjs';
import { recordScenes } from './lib/record.mjs';
import { assemble } from './lib/assemble.mjs';
import { checkPr, uploadToPr } from './lib/pr.mjs';

const log = (m) => console.error(`[video-walkthrough] ${m}`);

async function main() {
  const { script: scriptPath, opts } = parseArgs(process.argv.slice(2));
  if (!scriptPath) throw new Error('Usage: walkthrough.mjs <script.json> [voice=openai:nova|macos:Sara] [lang=da] [pr=<n>] [out=dir]');
  if (opts.pr) checkPr(opts.pr);
  const script = normaliseScript(JSON.parse(fs.readFileSync(scriptPath, 'utf8')));
  const config = loadConfig();
  const language = opts.lang || script.language || config.language || 'en';
  const fromArg = parseVoice(opts.voice);
  let tts = resolveTts({
    engine: fromArg.engine || config.engine || 'macos',
    // a per-call engine switch drops the config voice, which belongs to the config engine
    voice: fromArg.engine ? fromArg.voice : config.voice,
    model: config.model,
    instructions: config.instructions,
    language,
  });
  tts.notes.forEach(log);
  log(`voice: ${tts.engine}${tts.voice ? ':' + path.basename(tts.voice) : ''}, language ${language}`);
  if (tts.engine === 'openai') log('script text is sent to OpenAI for speech synthesis.');

  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'vw-'));
  const stem = slug(opts.name || script.title);
  const outDir = path.resolve(opts.out || 'walkthrough-out');
  fs.mkdirSync(outDir, { recursive: true });

  try {
  const narrate = async (voice) => {
    const audio = [], holdFor = [];
    for (const [i, s] of script.scenes.entries()) {
      if (!s.say) { audio.push(null); holdFor.push(1.8); continue; }
      const f = path.join(workDir, `scene${i}.${voice.ext}`);
      await synthesize(voice, s.say, f);
      audio.push(f);
      holdFor.push(probeDuration(f) + 0.7); // lead-in 0.3s + tail 0.4s: no dead air beyond a beat
    }
    return { audio, holdFor };
  };
  let narration;
  try {
    narration = await narrate(tts);
  } catch (e) {
    if (!e.openai || process.platform !== 'darwin') throw e;
    log(`openai speech failed (${e.message}); falling back to macos voice for the whole video.`);
    tts = resolveTts({ engine: 'macos', language });
    narration = await narrate(tts);
  }
  const { audio, holdFor } = narration;

  log('recording…');
  const { raw, timings } = await recordScenes({ script, holdFor, workDir });
  const overrun = timings.map((t, i) => ({ i, extra: t.end - t.start - holdFor[i] })).filter((x) => x.extra > 0.5);
  overrun.forEach((x) => log(`scene ${x.i + 1}: steps ran ${x.extra.toFixed(1)}s past its narration; trim steps or lengthen the line.`));

  const outMp4 = path.join(outDir, `${stem}.mp4`);
  const outSrt = path.join(outDir, `${stem}.srt`);
  log('assembling…');
  const { duration, bytes } = assemble({
    raw,
    scenes: timings.map((t, i) => ({ ...t, audio: audio[i], caption: script.scenes[i].caption })),
    outMp4, outSrt, burn: opts.captions !== 'srt', workDir,
  });
  const narrationTxt = path.join(outDir, `${stem}.narration.txt`);
  fs.writeFileSync(narrationTxt, script.scenes.map((s, i) => (s.say ? `${i + 1}. ${s.say}` : null)).filter(Boolean).join('\n') + '\n');

  const result = { mp4: outMp4, srt: outSrt, narration: narrationTxt, seconds: +duration.toFixed(1), megabytes: +(bytes / 1048576).toFixed(2), engine: tts.engine, voice: tts.voice || null };
  if (opts.pr) result.pr = uploadToPr({ prNumber: opts.pr, files: [outMp4, outSrt], dir: `walkthrough/${stem}` });
  console.log(JSON.stringify(result, null, 2));
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}

main().catch((e) => { console.error(`[video-walkthrough] ${e.message}`); process.exit(1); });
