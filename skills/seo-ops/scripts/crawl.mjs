#!/usr/bin/env node
// Zero-dependency, capped SEO crawler. Reads the sitemap, samples URLs evenly across URL groups
// (so every template is covered), fetches each page and extracts on-page SEO/GEO signals.
//
// Usage:
//   node crawl.mjs --site https://example.com --limit 300 --out seo/.cache/crawl.json
//   node crawl.mjs --site https://example.com --urls /,/pricing,/blog/post-a --out seo/.cache/crawl-top.json
//
// Flags:
//   --site <origin>        required; https://example.com
//   --sitemap <url>        override sitemap discovery (default: robots.txt Sitemap: lines, then /sitemap.xml)
//   --urls <list>          comma list of paths/URLs to crawl instead of the sitemap
//   --limit <n>            max pages to fetch, default 300
//   --concurrency <n>      parallel requests, default 4
//   --delay <ms>           pause between requests per worker, default 250
//   --link-check <n>       max internal link targets outside the crawl set to status-check, default 150
//   --alias <origins>      comma list of origins that mean this site, e.g. the production origin when
//                          --site is a preview. Sitemap locs, links and canonicals on them are mapped to --site.
//   --out <file>           write JSON there; otherwise stdout
//
//   --similarity <0-1>     how alike two pages' structure must be to count as one template, default 0.6
//
// Output: { site, crawledAt, robots, llmsTxt, sitemap: {urls, sampled}, pages: [...], groups: {...}, issues: [...] }
// Groups are page templates, found by clustering pages on their HTML structure (tag+class tokens inside
// <main>, minus header/nav/footer, plus JSON-LD types), so /fyn/ and /romantisk/ rendered by one template
// form one group even though their URLs share no prefix. Each group: { pages, urlPatterns, examples,
// sitemapUrlsEst, jsonLdTypes, avgWords }. Each issue: { check, severity, group, count, fanoutEst, urls(sample) };
// fanoutEst extrapolates the crawled share to the whole sitemap.

import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const UA = 'seo-ops-crawler/1.0 (site audit)';
const AI_BOTS = ['GPTBot', 'OAI-SearchBot', 'ChatGPT-User', 'ClaudeBot', 'Claude-SearchBot', 'Claude-User', 'PerplexityBot', 'Perplexity-User', 'Google-Extended', 'Applebot-Extended', 'CCBot', 'Bingbot', 'Googlebot'];

function parseArgs(argv) {
  const a = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = () => argv[++i];
    if (k === '--site') a.site = v().replace(/\/+$/, '');
    else if (k === '--sitemap') a.sitemap = v();
    else if (k === '--urls') a.urls = v().split(',').map((s) => s.trim()).filter(Boolean);
    else if (k === '--limit') a.limit = Number(v());
    else if (k === '--concurrency') a.concurrency = Number(v());
    else if (k === '--delay') a.delay = Number(v());
    else if (k === '--link-check') a.linkCheck = Number(v());
    else if (k === '--similarity') a.similarity = Number(v());
    else if (k === '--alias') a.alias = v().split(',').map((s) => new URL(s.trim()).origin);
    else if (k === '--out') a.out = v();
    else { process.stderr.write(`crawl: unknown flag ${k}\n`); process.exit(4); }
  }
  if (!a.site) { process.stderr.write('crawl: --site is required\n'); process.exit(4); }
  return { limit: 300, concurrency: 4, delay: 250, linkCheck: 150, similarity: 0.6, ...a };
}

// Origins treated as this site (see --alias); set in main().
let ORIGIN = '';
let ALIASES = new Set();
/** Map a URL on an alias origin to the crawl origin; other URLs pass through. */
function toLocal(href, base) {
  try {
    const u = new URL(href, base);
    if (ALIASES.has(u.origin)) return ORIGIN + u.pathname + u.search + u.hash;
    return u.toString();
  } catch { return href; }
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function get(url, { method = 'GET', follow = true } = {}) {
  const chain = [];
  let current = url;
  const t0 = Date.now();
  for (let hop = 0; hop < 6; hop++) {
    let res;
    try {
      res = await fetch(current, { method, redirect: 'manual', headers: { 'user-agent': UA, accept: 'text/html,application/xml;q=0.9,*/*;q=0.8' }, signal: AbortSignal.timeout(20000) });
    } catch (e) {
      return { url, finalUrl: current, status: 0, error: e.cause?.code || e.name, chain, ms: Date.now() - t0 };
    }
    if (res.status >= 300 && res.status < 400 && res.headers.get('location') && follow) {
      chain.push({ url: current, status: res.status });
      current = new URL(res.headers.get('location'), current).toString();
      continue;
    }
    const body = method === 'GET' ? await res.text().catch(() => '') : '';
    return { url, finalUrl: current, status: res.status, headers: res.headers, body, chain, ms: Date.now() - t0 };
  }
  return { url, finalUrl: current, status: 0, error: 'redirect-loop', chain, ms: Date.now() - t0 };
}

// ---------- robots / sitemap ----------

function parseRobots(txt) {
  const groups = [];
  let cur = null;
  const sitemaps = [];
  for (const line of txt.split(/\r?\n/)) {
    const m = line.replace(/#.*/, '').trim().match(/^([A-Za-z-]+)\s*:\s*(.*)$/);
    if (!m) continue;
    const [, key, val] = m;
    const k = key.toLowerCase();
    if (k === 'sitemap') { sitemaps.push(val); continue; }
    if (k === 'user-agent') {
      if (!cur || cur.rules.length) { cur = { agents: [], rules: [] }; groups.push(cur); }
      cur.agents.push(val.toLowerCase());
    } else if ((k === 'allow' || k === 'disallow') && cur) {
      cur.rules.push({ type: k, path: val });
    }
  }
  const verdict = (bot) => {
    const g = groups.find((x) => x.agents.includes(bot.toLowerCase())) || groups.find((x) => x.agents.includes('*'));
    if (!g) return { matched: null, blockedRoot: false };
    const blockedRoot = g.rules.some((r) => r.type === 'disallow' && r.path === '/') && !g.rules.some((r) => r.type === 'allow' && r.path === '/');
    return { matched: g.agents.includes(bot.toLowerCase()) ? bot : '*', blockedRoot, disallows: g.rules.filter((r) => r.type === 'disallow' && r.path).map((r) => r.path) };
  };
  return { sitemaps, bots: Object.fromEntries(AI_BOTS.map((b) => [b, verdict(b)])) };
}

async function readSitemap(url, seen = new Set(), depth = 0) {
  if (seen.has(url) || depth > 3 || seen.size > 50) return [];
  seen.add(url);
  const res = await get(url);
  if (res.status !== 200) return [];
  const locs = [...res.body.matchAll(/<loc>\s*(?:<!\[CDATA\[)?\s*([^<\]]+?)\s*(?:\]\]>)?\s*<\/loc>/gi)].map((m) => toLocal(m[1].replace(/&amp;/g, '&')));
  if (/<sitemapindex/i.test(res.body)) {
    const out = [];
    for (const loc of locs) out.push(...(await readSitemap(loc, seen, depth + 1)));
    return out;
  }
  return locs;
}

// ---------- grouping / sampling ----------

/** URL pattern used for sampling and for naming templates: "/", "/*", "/blog/*", "/shop/:n/*". */
function groupOf(path) {
  const segs = path.split('?')[0].split('/').filter(Boolean);
  if (!segs.length) return '/';
  if (segs.length === 1) return '/*';
  return `/${segs.slice(0, segs.length - 1).join('/')}/*`.replace(/\/\d+(?=\/)/g, '/:n');
}

function sample(urls, limit) {
  const byGroup = new Map();
  for (const u of urls) {
    const g = groupOf(new URL(u).pathname);
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(u);
  }
  const picked = [];
  const queues = [...byGroup.values()];
  let i = 0;
  while (picked.length < limit && queues.some((q) => q.length)) {
    const q = queues[i % queues.length];
    if (q.length) picked.push(q.shift());
    i++;
  }
  return picked;
}

// ---------- HTML extraction ----------

const decode = (s = '') => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();

/** Attributes of one tag, including bare ones (`<img alt>` → { alt: '' }). */
function attrs(tag) {
  const o = {};
  const inner = tag.replace(/^<\/?[a-zA-Z][\w:-]*/, '').replace(/\/?>$/, '');
  for (const m of inner.matchAll(/([^\s"'=<>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    o[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  }
  return o;
}

function jsonLdTypes(blocks) {
  const types = new Set();
  const fields = {};
  const walk = (n) => {
    if (Array.isArray(n)) return n.forEach(walk);
    if (!n || typeof n !== 'object') return;
    if (n['@type']) [].concat(n['@type']).forEach((t) => types.add(String(t)));
    for (const k of ['datePublished', 'dateModified']) if (n[k] && !fields[k]) fields[k] = n[k];
    if (n.author && !fields.author) fields.author = [].concat(n.author).map((x) => (typeof x === 'string' ? x : x?.name)).filter(Boolean).join(', ');
    Object.values(n).forEach(walk);
  };
  let invalid = 0;
  for (const b of blocks) {
    try { walk(JSON.parse(b)); } catch { invalid++; }
  }
  return { types: [...types], invalid, ...fields };
}

/** The page's own content: <main>, or the body without header/nav/footer. Scripts, styles and SVG removed. */
function contentRegion(bodyHtml) {
  let region = (bodyHtml.match(/<main\b[\s\S]*<\/main>/i) || [])[0];
  if (!region) region = bodyHtml.replace(/<(header|footer|nav)\b[\s\S]*?<\/\1>/gi, ' ');
  return stripNonText(region);
}

const stripNonText = (html) => html.replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ');
const textOf = (html) => decode(html.replace(/<[^>]+>/g, ' '));

/** Distinct tag+class tokens of the page's own content region: the template's fingerprint. */
function structure(region) {
  const tokens = new Set();
  for (const m of region.matchAll(/<([a-z][a-z0-9-]*)\b([^>]*)>/gi)) {
    const cls = (m[2].match(/\bclass\s*=\s*("([^"]*)"|'([^']*)')/i) || [])[2] ?? '';
    tokens.add(`${m[1].toLowerCase()}.${cls.split(/\s+/).filter(Boolean).sort().join('.')}`);
  }
  return tokens;
}

function jaccard(a, b) {
  if (!a.size && !b.size) return 1;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

/** Cluster fetched pages into templates; sets p.group and returns the groups summary. */
function clusterTemplates(pages, sitemapUrls, threshold) {
  const clusters = [];
  for (const p of pages) {
    p.pattern = groupOf(new URL(p.url).pathname);
    if (!p.html) continue;
    const sig = new Set(p.html.skeleton);
    let best = null; let bestScore = 0;
    for (const c of clusters) {
      const s = jaccard(sig, c.sig);
      if (s > bestScore) { best = c; bestScore = s; }
    }
    if (best && bestScore >= threshold) best.members.push(p);
    else clusters.push({ sig, members: [p] });
  }

  // One-off pages ("/", "/about/") are named by their path; templates by their URL pattern, or by the
  // shared prefix ("/docs/**") when one template spans several patterns.
  const oneOff = (c) => c.members.length === 1 && ['/', '/*'].includes(c.members[0].pattern);
  const label = (c) => {
    if (oneOff(c)) return new URL(c.members[0].url).pathname;
    const pats = [...new Set(c.members.map((m) => m.pattern))].sort();
    if (pats.length === 1) return pats[0] === '/*' ? '/:slug' : pats[0];
    const segs = pats.map((x) => x.split('/').filter((t) => t && t !== '*'));
    const common = [];
    for (let i = 0; segs.every((sg) => sg[i] !== undefined && sg[i] === segs[0][i]); i++) common.push(segs[0][i]);
    if (common.length) return `/${common.join('/')}/**`;
    return pats.slice(0, 3).map((x) => (x === '/*' ? '/:slug' : x)).join(' + ') + (pats.length > 3 ? ' + …' : '');
  };

  const crawledByPattern = new Map();
  for (const p of pages) if (p.html) crawledByPattern.set(p.pattern, (crawledByPattern.get(p.pattern) || 0) + 1);
  const sitemapByPattern = new Map();
  for (const u of sitemapUrls) { const k = groupOf(new URL(u).pathname); sitemapByPattern.set(k, (sitemapByPattern.get(k) || 0) + 1); }

  const groups = {};
  for (const c of clusters) {
    let name = label(c);
    for (let n = 2; groups[name]; n++) name = `${label(c)} #${n}`;
    const byPattern = new Map();
    for (const m of c.members) { m.group = name; byPattern.set(m.pattern, (byPattern.get(m.pattern) || 0) + 1); }
    let est = 0;
    for (const [pat, n] of byPattern) est += (n / crawledByPattern.get(pat)) * (sitemapByPattern.get(pat) || 0);
    const types = new Set();
    c.members.forEach((m) => m.html.jsonLd.types.forEach((t) => types.add(t)));
    groups[name] = {
      pages: c.members.length,
      urlPatterns: [...byPattern.keys()],
      examples: c.members.slice(0, 3).map((m) => new URL(m.url).pathname),
      sitemapUrlsEst: oneOff(c) ? 1 : Math.max(c.members.length, Math.round(est)),
      jsonLdTypes: [...types],
      avgWords: Math.round(c.members.reduce((sum, m) => sum + m.html.words, 0) / c.members.length),
    };
  }
  for (const p of pages) if (!p.html) p.group = `${p.pattern} (status ${p.status})`;
  return groups;
}

function extract(rawHtml, pageUrl, origin) {
  // Comments can hold markup and prose (`<!-- <dialog> instead of … -->`) that would leak into text and links.
  const html = rawHtml.replace(/<!--[\s\S]*?-->/g, ' ');
  const head = html.slice(0, 200000);
  const metas = [...head.matchAll(/<meta\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const links = [...head.matchAll(/<link\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const meta = (key) => metas.find((m) => (m.name || m.property || '').toLowerCase() === key)?.content;
  const h1s = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, '')));
  const h2s = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => decode(m[1].replace(/<[^>]+>/g, '')));
  const ld = jsonLdTypes([...html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]));
  const bodyHtml = (html.match(/<body\b[^>]*>([\s\S]*)<\/body>/i) || [, html])[1];
  const region = contentRegion(bodyHtml);
  const skeleton = structure(region);
  const text = textOf(region);
  const allText = textOf(stripNonText(bodyHtml));
  const imgs = [...bodyHtml.matchAll(/<img\b[^>]*>/gi)].map((m) => attrs(m[0]));
  const internal = new Set();
  let external = 0;
  for (const m of bodyHtml.matchAll(/<a\b[^>]*href\s*=\s*("([^"]*)"|'([^']*)')/gi)) {
    const href = m[2] ?? m[3];
    if (!href || /^(#|mailto:|tel:|javascript:)/i.test(href)) continue;
    try {
      const u = new URL(toLocal(href, pageUrl));
      if (u.origin === origin) { u.hash = ''; internal.add(u.toString()); } else external++;
    } catch { /* ignore */ }
  }
  return {
    lang: (html.match(/<html\b[^>]*\blang\s*=\s*["']?([^"'\s>]+)/i) || [])[1] || null,
    title: decode((head.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || '') || null,
    description: meta('description') ? decode(meta('description')) : null,
    robots: meta('robots') || null,
    canonical: links.find((l) => (l.rel || '').toLowerCase() === 'canonical')?.href || null,
    hreflang: links.filter((l) => (l.rel || '').toLowerCase() === 'alternate' && l.hreflang).map((l) => ({ lang: l.hreflang, href: l.href })),
    ogTitle: meta('og:title') || null,
    ogImage: meta('og:image') || null,
    h1: h1s, h2: h2s.slice(0, 30),
    questionHeadings: h2s.filter((h) => /\?$/.test(h)).length,
    tables: (bodyHtml.match(/<table\b/gi) || []).length,
    lists: (bodyHtml.match(/<(ul|ol)\b/gi) || []).length,
    jsonLd: ld,
    words: text ? text.split(' ').length : 0, // main content only
    wordsTotal: allText ? allText.split(' ').length : 0, // including header/nav/footer
    firstWords: text.split(' ').slice(0, 60).join(' '),
    images: imgs.length,
    imagesNoAlt: imgs.filter((i) => i.alt === undefined).length,
    imagesEmptyAlt: imgs.filter((i) => i.alt === '').length, // decorative: valid, listed for review
    internalLinks: [...internal],
    skeleton: [...skeleton, ...ld.types.map((t) => `ld:${t}`)],
    externalLinks: external,
  };
}

// ---------- issues ----------

function buildIssues(pages, origin) {
  const ok = pages.filter((p) => p.status === 200 && p.html);
  const issues = [];
  const add = (check, severity, list) => {
    if (!list.length) return;
    const byGroup = new Map();
    for (const p of list) {
      const g = p.group;
      if (!byGroup.has(g)) byGroup.set(g, []);
      byGroup.get(g).push(p.url);
    }
    for (const [group, urls] of byGroup) issues.push({ check, severity, group, count: urls.length, urls: urls.slice(0, 5) });
  };
  add('non-200-in-sitemap', 'high', pages.filter((p) => p.fromSitemap && p.status !== 200));
  add('redirect-in-sitemap', 'medium', pages.filter((p) => p.fromSitemap && p.chain.length));
  add('noindex-in-sitemap', 'high', ok.filter((p) => p.fromSitemap && /noindex/i.test(`${p.html.robots || ''} ${p.xRobots || ''}`)));
  add('missing-title', 'high', ok.filter((p) => !p.html.title));
  add('title-too-long', 'low', ok.filter((p) => p.html.title && p.html.title.length > 62));
  add('title-too-short', 'low', ok.filter((p) => p.html.title && p.html.title.length < 25));
  add('missing-description', 'medium', ok.filter((p) => !p.html.description));
  add('description-length', 'low', ok.filter((p) => p.html.description && (p.html.description.length < 70 || p.html.description.length > 165)));
  add('h1-count-not-1', 'medium', ok.filter((p) => p.html.h1.length !== 1));
  add('missing-canonical', 'medium', ok.filter((p) => !p.html.canonical));
  add('canonical-elsewhere', 'medium', ok.filter((p) => p.html.canonical && toLocal(p.html.canonical, p.finalUrl).replace(/\/$/, '') !== p.finalUrl.replace(/\/$/, '')));
  add('missing-json-ld', 'medium', ok.filter((p) => !p.html.jsonLd.types.length));
  add('invalid-json-ld', 'high', ok.filter((p) => p.html.jsonLd.invalid));
  add('no-date-modified', 'low', ok.filter((p) => p.html.jsonLd.types.some((t) => /Article|BlogPosting|NewsArticle/.test(t)) && !p.html.jsonLd.dateModified));
  add('thin-content', 'medium', ok.filter((p) => p.html.words < 250)); // main-content words
  add('images-missing-alt', 'low', ok.filter((p) => p.html.imagesNoAlt > 0));
  add('missing-lang', 'low', ok.filter((p) => !p.html.lang));
  add('missing-og-image', 'low', ok.filter((p) => !p.html.ogImage));
  add('slow-response', 'medium', pages.filter((p) => p.ms > 1500));
  add('orphan-in-crawl', 'low', ok.filter((p) => p.inlinks === 0 && new URL(p.url).pathname !== '/'));
  for (const field of ['title', 'description']) {
    const seen = new Map();
    for (const p of ok) if (p.html[field]) seen.set(p.html[field], [...(seen.get(p.html[field]) || []), p]);
    add(`duplicate-${field}`, 'medium', [...seen.values()].filter((l) => l.length > 1).flat());
  }
  const order = { high: 0, medium: 1, low: 2 };
  return issues.sort((a, b) => order[a.severity] - order[b.severity] || b.count - a.count);
}

// ---------- main ----------

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const origin = new URL(a.site).origin;
  ORIGIN = origin;
  ALIASES = new Set((a.alias || []).filter((o) => o !== origin));

  const robotsRes = await get(`${origin}/robots.txt`);
  const robots = robotsRes.status === 200 ? parseRobots(robotsRes.body) : { sitemaps: [], bots: {}, missing: true };
  const llms = await get(`${origin}/llms.txt`, { method: 'HEAD' });

  let sitemapUrls = [];
  let targets;
  if (a.urls) {
    targets = a.urls.map((u) => new URL(u, origin).toString());
  } else {
    const maps = a.sitemap ? [a.sitemap] : (robots.sitemaps.length ? robots.sitemaps.map((m) => toLocal(m)) : [`${origin}/sitemap.xml`]);
    const seen = new Set();
    for (const m of maps) sitemapUrls.push(...(await readSitemap(m, seen)));
    sitemapUrls = [...new Set(sitemapUrls)];
    targets = sitemapUrls.length ? sample(sitemapUrls, a.limit) : [`${origin}/`];
  }
  const fromSitemap = new Set(sitemapUrls);

  const pages = [];
  const queue = [...targets];
  await Promise.all(Array.from({ length: a.concurrency }, async () => {
    while (queue.length) {
      const url = queue.shift();
      const r = await get(url);
      const isHtml = (r.headers?.get('content-type') || '').includes('html');
      pages.push({
        url, finalUrl: r.finalUrl, status: r.status, error: r.error, ms: r.ms,
        chain: r.chain, fromSitemap: fromSitemap.has(url),
        xRobots: r.headers?.get('x-robots-tag') || null,
        cache: r.headers?.get('cache-control') || null,
        html: r.status === 200 && isHtml ? extract(r.body, r.finalUrl, origin) : null,
      });
      await sleep(a.delay);
    }
  }));

  // inlinks + broken internal links
  const crawled = new Map(pages.map((p) => [p.finalUrl.replace(/\/$/, ''), p]));
  for (const p of pages) p.inlinks = 0;
  const outside = new Map();
  for (const p of pages) {
    for (const l of p.html?.internalLinks || []) {
      const key = l.replace(/\/$/, '');
      const target = crawled.get(key);
      if (target && target !== p) target.inlinks++;
      else if (!target) outside.set(l, [...(outside.get(l) || []), p.url]);
    }
  }
  const broken = [];
  const toCheck = [...outside.keys()].slice(0, a.linkCheck);
  const checkQueue = [...toCheck];
  await Promise.all(Array.from({ length: a.concurrency }, async () => {
    while (checkQueue.length) {
      const l = checkQueue.shift();
      let r = await get(l, { method: 'HEAD' });
      if (r.status === 405 || r.status === 0) r = await get(l);
      if (r.status >= 400 || r.status === 0) broken.push({ url: l, status: r.status, linkedFrom: outside.get(l).slice(0, 5) });
      await sleep(a.delay);
    }
  }));

  const groups = clusterTemplates(pages, sitemapUrls, a.similarity);
  const issues = buildIssues(pages, origin);
  for (const i of issues) {
    const g = groups[i.group];
    i.fanoutEst = g ? Math.max(i.count, Math.round((i.count / g.pages) * g.sitemapUrlsEst)) : i.count;
  }
  if (broken.length) issues.unshift({ check: 'broken-internal-links', severity: 'high', group: '*', count: broken.length, urls: broken.slice(0, 20) });
  for (const [bot, v] of Object.entries(robots.bots || {})) {
    if (v.blockedRoot) issues.push({ check: 'bot-blocked', severity: /Googlebot|Bingbot/.test(bot) ? 'high' : 'medium', group: 'robots.txt', count: 1, urls: [bot] });
  }

  for (const p of pages) if (p.html) { p.html.internalLinks = p.html.internalLinks.length; delete p.html.skeleton; }

  const out = {
    site: origin,
    aliases: [...ALIASES],
    crawledAt: new Date().toISOString(),
    robots: { missing: !!robots.missing, sitemaps: robots.sitemaps, bots: robots.bots },
    llmsTxt: llms.status === 200,
    sitemap: { urls: sitemapUrls.length, sampled: targets.length },
    groups,
    issues,
    brokenLinksChecked: toCheck.length,
    pages,
  };
  const json = JSON.stringify(out, null, 2);
  if (a.out) {
    mkdirSync(dirname(a.out), { recursive: true });
    writeFileSync(a.out, json);
    process.stderr.write(`crawl: ${pages.length} pages, ${issues.length} issue groups -> ${a.out}\n`);
  } else process.stdout.write(json + '\n');
}

main().catch((e) => { process.stderr.write(`crawl: ${e.stack || e.message}\n`); process.exit(3); });
