#!/usr/bin/env node
// Zero-dependency Google Search Console client (Search Analytics API).
// Auth: service account JSON via GSC_SERVICE_ACCOUNT_FILE (path) or GSC_SERVICE_ACCOUNT_JSON (inline).
// The service account's client_email must be added as a user on the GSC property.
//
// Usage:
//   node gsc.mjs --list-sites
//   node gsc.mjs --site sc-domain:example.com --days 28 --dimensions query,page --compare --out seo/.cache/gsc.json
//   node gsc.mjs --site https://example.com/ --start 2026-09-01 --end 2026-09-28 --filter page:contains:/blog/
//
// Flags:
//   --site <property>     sc-domain:example.com or https://example.com/ (exact GSC property string)
//   --days <n>            window length, default 28 (ignored when --start/--end are given)
//   --lag <n>             days to skip at the end for GSC data lag, default 3
//   --start/--end         explicit YYYY-MM-DD range
//   --dimensions <list>   comma list of query,page,country,device,date,searchAppearance; default query,page
//   --type <t>            web|image|video|news|discover|googleNews; default web
//   --filter <d:op:expr>  repeatable; op = equals|contains|notEquals|notContains|includingRegex|excludingRegex
//   --max-rows <n>        total row cap across pages, default 50000
//   --compare             also fetch the previous window of equal length -> { current, previous }
//   --out <file>          write JSON there (dirs created); otherwise print to stdout
//
// Exit codes: 0 ok, 2 no credentials, 3 auth/API error, 4 bad arguments.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { createSign } from 'node:crypto';
import { dirname } from 'node:path';

const API = 'https://searchconsole.googleapis.com/webmasters/v3';
const SCOPE = 'https://www.googleapis.com/auth/webmasters.readonly';
const PAGE = 25000;

function parseArgs(argv) {
  const a = { filters: [] };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined) fail(4, `missing value for ${k}`);
      return v;
    };
    switch (k) {
      case '--list-sites': a.listSites = true; break;
      case '--site': a.site = next(); break;
      case '--days': a.days = Number(next()); break;
      case '--lag': a.lag = Number(next()); break;
      case '--start': a.start = next(); break;
      case '--end': a.end = next(); break;
      case '--dimensions': a.dimensions = next().split(',').map((s) => s.trim()).filter(Boolean); break;
      case '--type': a.type = next(); break;
      case '--filter': a.filters.push(next()); break;
      case '--max-rows': a.maxRows = Number(next()); break;
      case '--compare': a.compare = true; break;
      case '--out': a.out = next(); break;
      case '-h': case '--help':
        process.stdout.write(readFileSync(new URL(import.meta.url)).toString().split('\n').filter((l) => l.startsWith('//')).map((l) => l.slice(3)).join('\n') + '\n');
        process.exit(0);
      default: fail(4, `unknown flag ${k}`);
    }
  }
  return a;
}

function fail(code, msg) {
  process.stderr.write(`gsc: ${msg}\n`);
  process.exit(code);
}

function loadCredentials() {
  let raw = process.env.GSC_SERVICE_ACCOUNT_JSON;
  const file = process.env.GSC_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!raw && file) {
    try { raw = readFileSync(file, 'utf8'); } catch (e) { fail(2, `cannot read credentials file: ${e.message}`); }
  }
  if (!raw) fail(2, 'no credentials: set GSC_SERVICE_ACCOUNT_FILE or GSC_SERVICE_ACCOUNT_JSON');
  let creds;
  try { creds = JSON.parse(raw); } catch { fail(2, 'credentials are not valid JSON'); }
  if (!creds.client_email || !creds.private_key) fail(2, 'credentials lack client_email/private_key (service account JSON expected)');
  return creds;
}

const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

async function getToken(creds) {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(JSON.stringify({
    iss: creds.client_email, scope: SCOPE, aud: 'https://oauth2.googleapis.com/token', iat: now, exp: now + 3600,
  }));
  const signer = createSign('RSA-SHA256');
  signer.update(`${header}.${claim}`);
  const sig = b64url(signer.sign(creds.private_key));
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion: `${header}.${claim}.${sig}` }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.access_token) fail(3, `token exchange failed (${res.status}): ${body.error_description || body.error || 'unknown'}`);
  return body.access_token;
}

async function api(token, path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json', ...(init.headers || {}) },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) fail(3, `API ${res.status} on ${path}: ${body.error?.message || 'unknown error'}`);
  return body;
}

const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + n * 86400000);

function windows(a) {
  let start; let end;
  if (a.start && a.end) {
    start = new Date(`${a.start}T00:00:00Z`);
    end = new Date(`${a.end}T00:00:00Z`);
  } else {
    const today = new Date(`${iso(new Date())}T00:00:00Z`);
    end = addDays(today, -(a.lag ?? 3));
    start = addDays(end, -((a.days ?? 28) - 1));
  }
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) fail(4, 'invalid date range');
  const len = Math.round((end - start) / 86400000) + 1;
  const prevEnd = addDays(start, -1);
  const prevStart = addDays(prevEnd, -(len - 1));
  return { current: [iso(start), iso(end)], previous: [iso(prevStart), iso(prevEnd)] };
}

function filterGroups(filters) {
  if (!filters.length) return undefined;
  return [{
    groupType: 'and',
    filters: filters.map((f) => {
      const [dimension, operator, ...rest] = f.split(':');
      if (!dimension || !operator || !rest.length) fail(4, `bad --filter "${f}" (expected dimension:operator:expression)`);
      return { dimension, operator, expression: rest.join(':') };
    }),
  }];
}

async function query(token, a, [startDate, endDate]) {
  const dimensions = a.dimensions ?? ['query', 'page'];
  const maxRows = a.maxRows ?? 50000;
  const rows = [];
  for (let startRow = 0; startRow < maxRows; startRow += PAGE) {
    const body = await api(token, `/sites/${encodeURIComponent(a.site)}/searchAnalytics/query`, {
      method: 'POST',
      body: JSON.stringify({
        startDate, endDate, dimensions, type: a.type ?? 'web',
        rowLimit: Math.min(PAGE, maxRows - startRow), startRow,
        dimensionFilterGroups: filterGroups(a.filters),
      }),
    });
    const batch = body.rows ?? [];
    for (const r of batch) {
      const row = {};
      dimensions.forEach((d, i) => { row[d] = r.keys[i]; });
      row.clicks = r.clicks;
      row.impressions = r.impressions;
      row.ctr = Number(r.ctr.toFixed(4));
      row.position = Number(r.position.toFixed(2));
      rows.push(row);
    }
    if (batch.length < PAGE) break;
  }
  return { range: { start: startDate, end: endDate }, dimensions, rowCount: rows.length, rows };
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  const creds = loadCredentials();
  const token = await getToken(creds);

  let out;
  if (a.listSites) {
    const body = await api(token, '/sites');
    out = { serviceAccount: creds.client_email, sites: body.siteEntry ?? [] };
  } else {
    if (!a.site) fail(4, '--site is required (or use --list-sites)');
    const w = windows(a);
    const current = await query(token, a, w.current);
    out = a.compare
      ? { site: a.site, type: a.type ?? 'web', current, previous: await query(token, a, w.previous) }
      : { site: a.site, type: a.type ?? 'web', ...current };
  }

  const json = JSON.stringify(out, null, 2);
  if (a.out) {
    mkdirSync(dirname(a.out), { recursive: true });
    writeFileSync(a.out, json);
    const n = out.sites ? out.sites.length : (out.current?.rowCount ?? out.rowCount);
    process.stderr.write(`gsc: wrote ${a.out} (${n} ${out.sites ? 'sites' : 'rows'})\n`);
  } else {
    process.stdout.write(json + '\n');
  }
}

main().catch((e) => fail(3, e.message));
