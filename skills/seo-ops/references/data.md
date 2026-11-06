# Data sources

Resolve once per run, in order. The first source that works serves the signal; record it for the report. A source that fails is itself a finding under **Needs you** ("GSC script: 403, service account lacks access to sc-domain:x").

## Search Console

1. **MCP.** A connected tool whose name or description covers Search Console / search analytics. Use it for the same queries the script would run.
2. **Script.** `GSC_SERVICE_ACCOUNT_FILE`, `GSC_SERVICE_ACCOUNT_JSON` or `GOOGLE_APPLICATION_CREDENTIALS` is set:
   ```bash
   node <skill-dir>/scripts/gsc.mjs --site "<data.gsc_property>" --days 28 --dimensions query,page --compare --out seo/.cache/gsc-<date>-qp.json
   node <skill-dir>/scripts/gsc.mjs --site "<data.gsc_property>" --days 28 --dimensions page --compare --out seo/.cache/gsc-<date>-p.json
   ```
   Add `--dimensions date` for a daily trend, `--filter page:equals:<url>` for a single page (ledger baselines and measurement).
3. **CSV.** Files matching `seo/inputs/gsc-*.csv` (the Performance report export: `Queries.csv`, `Pages.csv`, renamed with a `gsc-` prefix). A CSV holds no query×page pairs and one date range only; say so where it limits a check.
4. **None.** Skip GSC-dependent checks with "skipped: no GSC source".

GSC data lags 2–3 days (the script skips the last 3 by default). Compare windows of equal length; never react to a single day.

## Ahrefs

1. **MCP.** A connected tool whose name or description says Ahrefs. Spend at most `data.ahrefs_max_calls` calls per run; plan the calls before making them and prefer site-level reports over per-URL ones. Useful reports: organic keywords (ours and competitors'), organic competitors, top pages, referring domains, and keyword overview for gap candidates.
2. **CSV.** `seo/inputs/ahrefs-*.csv`: Site Explorer exports (organic keywords, top pages, referring domains), Content Gap and Keywords Explorer exports. Use the filename to tell which report it is.
3. **None.** Competitors and gaps fall back to web search and SERP sampling. Mark rankings-derived claims as estimates.

## Web search and SERP sampling

Use the host's web search tool with the query in the site language and market. One query returns one sample from one engine at one moment: record the date, and treat positions as approximate. Spread sampling across the priority topics instead of spending it on one.

## PageSpeed Insights

`GET https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=<url>&strategy=mobile&category=performance` (append `&key=$PSI_API_KEY` when set). Read field data (`loadingExperience`) first and lab data second.

## The live site and the codebase

**Crawl target.** Crawl `preview_url` when it is set, with `--alias <site_url>` so the preview's sitemap, links and canonicals (which usually point at production) map back onto the preview. Everything about rankings and citations stays on `site_url`/`domain`: GSC, Ahrefs, SERP sampling, the prompt panel. Name the crawled origin in the report's Sources, and clear `preview_url` (ask, or list under **Needs you** when headless) once `site_url` serves the same build.

The crawl (`scripts/crawl.mjs`) is always available. The codebase is available when the run is inside the project repo; without it, findings stay at URL/template level and `cause` is omitted.
