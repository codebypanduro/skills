# competitors: discover and compare

## Discovery

Runs at `init`, in `monthly`, and on a direct `competitors` run.

1. Take the top 15 GSC queries by impressions plus one or two head terms per priority topic.
2. Web-search each one in the site language and market, and count how often each domain appears in the top 10. Add Ahrefs organic competitors when available.
3. Separate **competitors** (sites chasing the same visitors and conversions) from **SERP occupants** (Wikipedia, Reddit, YouTube, government sites, marketplaces, big media). SERP occupants are reported as context; they show which formats win (video, forum, official answer), and they are never added as competitors.
4. Candidates are domains that appear for at least 3 queries and are not already in `competitors`. They go to **Needs you** with their hit count; only the user adds them to `context.md`.

## Comparison

For each confirmed competitor (max 5 per run, rotating when there are more):

1. **Inventory.** Fetch their sitemap (`/robots.txt` → `Sitemap:`, else `/sitemap.xml`) and cluster the URL paths into page types and topics. Count pages per cluster vs ours.
2. **Head-to-head.** For our 5 most valuable queries (by clicks or by priority topic), compare the ranking pages: our page vs theirs on format (table, calculator, list, long-form), depth (headings covered), freshness (visible date), trust (author, sources), and structured data. Use `scripts/crawl.mjs --site <their origin> --urls <their pages>` to get their on-page data cheaply.
3. **What they have that we don't**: clusters, page types (comparison pages, calculators, glossary, location pages, programmatic patterns), and recurring formats. Pass these to `gaps`.
4. **Ahrefs (when available):** their top pages by traffic, and keywords where they rank top 10 and we are absent or below 20.

Findings describe a specific advantage and the move it suggests, e.g. "competitor-a.dk ranks #2 for 'x' with a 12-row comparison table updated monthly; our /x has prose only → add a comparison table (content-extend)". Strategy-level moves (a new cluster, a programmatic set) are `strategy-decision` items.

Done when every confirmed competitor in this run's rotation has an inventory and a head-to-head, and discovery candidates are listed.
