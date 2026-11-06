# technical: crawl, templates, speed

Depth `defects` (daily/weekly) crawls up to 60 sitemap URLs plus the top 10 GSC pages and skips PageSpeed. Depth `full` (monthly or a direct `technical` run) crawls up to 300 and runs PageSpeed.

## Steps

1. **Crawl.**
   ```bash
   node <skill-dir>/scripts/crawl.mjs --site <target> [--alias <site_url>] --limit <60|300> --out seo/.cache/crawl-<date>.json
   node <skill-dir>/scripts/crawl.mjs --site <target> [--alias <site_url>] --urls <top GSC pages as paths> --out seo/.cache/crawl-<date>-top.json
   ```
   `<target>` is `preview_url` when set (with `--alias <site_url>`), else `site_url`; see `references/data.md`.
   The output groups pages by URL pattern and pre-computes issue groups. Use `issues` as the starting list, then read `pages` for the checks below that the script cannot judge.
2. **Map each issue group to its cause** (codebase available). Find the route/template that renders the group (Next.js `app/**/page.tsx` and `layout.tsx`, `generateMetadata`; Astro `src/pages`; Laravel Blade views; WP theme templates; the CMS field that feeds it). The finding's `cause` is a file:line, and the finding covers the whole group: one template fix, one item.
3. **Check what the script cannot:**
   - **Rendering.** Main content present in the server HTML (`firstWords`, `words` in the crawl). Content that only appears after client JS is invisible to most AI crawlers and slows Google: high severity.
   - **Indexability policy.** Sitemap generator output vs routes that exist: indexable routes missing from the sitemap, and sitemap entries that should not be indexed (search, filters, thin tag pages).
   - **Canonical and hreflang logic** in code: self-referencing canonicals, consistent trailing slash and host, hreflang reciprocity and an `x-default` when there are multiple locales.
   - **Structured data fit.** Per group, the expected schema for the page type (Article/BlogPosting with author, datePublished, dateModified; Product/Offer; FAQPage only where a visible FAQ exists; BreadcrumbList; Organization/WebSite on the home page; ItemList for listing pages; LocalBusiness for local sites). A template missing its expected type is a `jsonld-fix`.
   - **Internal linking.** Groups with low average inlinks; orphaned money pages; important pages more than 3 clicks deep (infer from nav and hub pages).
   - **robots.txt.** Search engines must not be blocked. AI bot policy is reported by the crawl; whether blocking a given bot is intended is a question for the user, never assumed.
4. **PageSpeed** (`full` only, when `data.pagespeed` is true): the top URL of each of the 5 highest-traffic groups, mobile. Report LCP, INP, CLS from field data with the lab LCP element. A regression vs the previous run's `technical.md` is a finding. Item type `cwv-fix`, with `cause` pointing at the component or asset when you can find it.

Done when every issue group from the crawl and every check in step 3 has a finding, "ok", or "skipped: <reason>".
