const STEP_KEYS = ['goto', 'click', 'hover', 'fill', 'type', 'press', 'scroll', 'wait', 'eval'];

/** Validate and normalise the scene script. Throws with the first problem found. */
export function normaliseScript(raw) {
  if (!raw || typeof raw !== 'object') throw new Error('Script must be a JSON object.');
  if (!Array.isArray(raw.scenes) || !raw.scenes.length) throw new Error('Script needs a non-empty "scenes" array.');
  const scenes = raw.scenes.map((s, i) => {
    const at = `scenes[${i}]`;
    if (!s.say && !s.caption) throw new Error(`${at} needs "say" (narration) or "caption".`);
    const steps = s.steps || [];
    steps.forEach((st, j) => {
      const keys = Object.keys(st).filter((k) => STEP_KEYS.includes(k));
      if (keys.length !== 1) throw new Error(`${at}.steps[${j}] needs exactly one of: ${STEP_KEYS.join(', ')}.`);
      const k = keys[0];
      if ((k === 'fill' || k === 'type') && !(Array.isArray(st[k]) && st[k].length === 2)) throw new Error(`${at}.steps[${j}].${k} must be [selector, text].`);
    });
    return { say: s.say || '', caption: s.caption || s.say || '', steps };
  });
  const first = scenes[0].steps[0];
  if (!raw.url && !(first && first.goto)) throw new Error('Script needs a "url" or a first step with "goto".');
  return {
    title: raw.title || 'walkthrough',
    url: raw.url || null,
    language: raw.language || null,
    viewport: { width: raw.viewport?.width || 1280, height: raw.viewport?.height || 720 },
    scenes,
  };
}

export function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'walkthrough';
}
