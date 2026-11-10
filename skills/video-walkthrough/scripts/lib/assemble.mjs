import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { toSrt } from './srt.mjs';

const ff = (args, cwd) => execFileSync('ffmpeg', ['-y', '-hide_banner', '-loglevel', 'error', ...args], { cwd, stdio: ['ignore', 'inherit', 'inherit'] });
const MAX_BYTES = 24.5 * 1024 * 1024;
const AUDIO_LEAD = 0.3;

/**
 * scenes: [{ start, end, audio (file|null), caption }] against raw video seconds.
 * Each clip is exactly end-start long: video padded with its last frame if the raw
 * ends early, narration delayed by AUDIO_LEAD and padded with silence.
 */
export function assemble({ raw, scenes, outMp4, outSrt, burn, workDir }) {
  const segs = [];
  const cues = [];
  let at = 0;
  scenes.forEach((s, i) => {
    const len = +(s.end - s.start).toFixed(3);
    const seg = `seg${i}.mp4`;
    const vf = `[0:v]scale=-2:'min(1080,ih)',fps=30,tpad=stop_mode=clone:stop_duration=3,format=yuv420p[v]`;
    const args = ['-ss', String(s.start), '-i', raw];
    let af;
    if (s.audio) {
      args.push('-i', s.audio);
      af = `[1:a]aresample=48000,aformat=channel_layouts=stereo,adelay=${Math.round(AUDIO_LEAD * 1000)}:all=1,apad[a]`;
    } else {
      args.push('-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=stereo');
      af = '[1:a]anull[a]';
    }
    args.push('-filter_complex', `${vf};${af}`, '-map', '[v]', '-map', '[a]', '-t', String(len),
      '-c:v', 'libx264', '-crf', '18', '-preset', 'fast', '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2', seg);
    ff(args, workDir);
    segs.push(seg);
    cues.push({ start: at + 0.15, end: at + len - 0.15, text: s.caption });
    at += len;
  });
  fs.writeFileSync(path.join(workDir, 'list.txt'), segs.map((s) => `file '${s}'`).join('\n'));
  ff(['-f', 'concat', '-safe', '0', '-i', 'list.txt', '-c', 'copy', 'joined.mp4'], workDir);
  fs.writeFileSync(outSrt, toSrt(cues));
  fs.copyFileSync(outSrt, path.join(workDir, 'captions.srt'));

  const encode = (extra) => {
    const vf = burn
      ? ['-vf', "subtitles=captions.srt:force_style='FontName=Helvetica,FontSize=10,Bold=1,BorderStyle=3,Outline=3,Shadow=0,BackColour=&H99000000,MarginV=18'"]
      : [];
    ff(['-i', 'joined.mp4', ...vf, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'medium', ...extra, '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', path.resolve(outMp4)], workDir);
  };
  encode(['-crf', '23']);
  if (fs.statSync(outMp4).size > MAX_BYTES) {
    const dur = at;
    const kbps = Math.max(150, Math.floor((MAX_BYTES * 8) / dur / 1000 - 140));
    encode(['-b:v', `${kbps}k`, '-maxrate', `${kbps}k`, '-bufsize', `${kbps * 2}k`]);
  }
  return { duration: at, bytes: fs.statSync(outMp4).size };
}
