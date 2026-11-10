import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { CONFIG_DIR } from './config.mjs';

const CURSOR_JS = `(() => {
  if (window.__vwCursor) return; window.__vwCursor = true;
  const mount = () => {
    const c = document.createElement('div');
    c.style.cssText = 'position:fixed;left:0;top:0;width:26px;height:26px;z-index:2147483647;pointer-events:none;transform:translate(-100px,-100px)';
    c.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M3 2l7.5 19 2.6-7.9L21 10.5z" fill="#fff" stroke="#111" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(c);
    addEventListener('mousemove', e => { c.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
    addEventListener('mousedown', e => {
      const r = document.createElement('div');
      r.style.cssText = 'position:fixed;left:' + (e.clientX - 18) + 'px;top:' + (e.clientY - 18) + 'px;width:36px;height:36px;border-radius:50%;background:rgba(255,200,0,.45);z-index:2147483646;pointer-events:none;transition:transform .45s,opacity .45s';
      document.documentElement.appendChild(r);
      requestAnimationFrame(() => { r.style.transform = 'scale(1.8)'; r.style.opacity = '0'; });
      setTimeout(() => r.remove(), 500);
    }, true);
  };
  document.documentElement ? mount() : addEventListener('DOMContentLoaded', mount);
})();`;

async function loadPlaywright() {
  for (const base of [CONFIG_DIR, process.cwd(), import.meta.dirname]) {
    try {
      return createRequire(path.join(base, 'noop.js'))('playwright');
    } catch {}
  }
  throw new Error('playwright not found. Run scripts/setup.sh (installs it into ~/.config/video-walkthrough).');
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Record all scenes in one continuous video. Each scene runs its steps, then
 * holds until `holdFor[i]` seconds have passed so the clip is never shorter than its narration.
 * Returns the raw video path and each scene's [start, end] in video seconds.
 */
export async function recordScenes({ script, holdFor, workDir }) {
  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch();
  const t0 = Date.now();
  const context = await browser.newContext({
    viewport: script.viewport,
    recordVideo: { dir: workDir, size: script.viewport },
  });
  await context.addInitScript(CURSOR_JS);
  const page = await context.newPage();
  const now = () => (Date.now() - t0) / 1000;
  let mouse = { x: script.viewport.width / 2, y: script.viewport.height / 2 };

  const glide = async (x, y) => {
    const n = 22;
    const from = mouse;
    for (let i = 1; i <= n; i++) {
      const t = i / n, e = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
      await page.mouse.move(from.x + (x - from.x) * e, from.y + (y - from.y) * e);
      await sleep(14);
    }
    mouse = { x, y };
  };
  const target = async (sel) => {
    const loc = page.locator(sel).first();
    await loc.scrollIntoViewIfNeeded();
    const b = await loc.boundingBox();
    if (!b) throw new Error(`No box for selector: ${sel}`);
    await glide(b.x + b.width / 2, b.y + b.height / 2);
    return loc;
  };

  const doStep = async (st) => {
    if ('goto' in st) {
      await page.goto(new URL(st.goto, page.url() === 'about:blank' ? script.url : page.url()).href, { waitUntil: 'load' });
      await page.mouse.move(mouse.x, mouse.y);
    } else if ('click' in st) { const l = await target(st.click); await sleep(150); await l.click(); }
    else if ('hover' in st) await target(st.hover);
    else if ('fill' in st) { const l = await target(st.fill[0]); await l.click(); await l.fill(st.fill[1]); }
    else if ('type' in st) { const l = await target(st.type[0]); await l.click(); await l.pressSequentially(st.type[1], { delay: 70 }); }
    else if ('press' in st) await page.keyboard.press(st.press);
    else if ('scroll' in st) await page.mouse.wheel(0, st.scroll);
    else if ('wait' in st) await sleep(st.wait);
    else if ('eval' in st) await page.evaluate(st.eval);
    await sleep(250);
  };

  if (script.url && !(script.scenes[0].steps[0] && script.scenes[0].steps[0].goto)) {
    await page.goto(script.url, { waitUntil: 'load' });
  }
  const timings = [];
  for (const [i, scene] of script.scenes.entries()) {
    const start = now();
    for (const st of scene.steps) await doStep(st);
    const wait = holdFor[i] - (now() - start);
    if (wait > 0) await sleep(wait * 1000);
    timings.push({ start, end: now() });
  }
  await sleep(300);
  const video = page.video();
  await context.close();
  const raw = await video.path();
  await browser.close();
  return { raw, timings };
}
