# perf: search performance

Input: GSC query×page and page tables for the last 28 days and the 28 before (see `references/data.md`), Ahrefs organic keywords when available. Depth `light` (daily) runs checks 1–3 only.

Thresholds come from `thresholds` in `seo/context.md`.

## Checks

1. **Totals.** Clicks, impressions, CTR and average position vs the previous window. One line in the report's Signals.
2. **Low CTR.** Pages with ≥ `low_ctr_min_impressions` impressions whose CTR is under half of what their position predicts. Expected CTR by position: 1 ≈ 28%, 2 ≈ 15%, 3 ≈ 10%, 4 ≈ 7%, 5 ≈ 5.5%, 6–7 ≈ 4%, 8–10 ≈ 2.5%. Check the live SERP for the main query before blaming the snippet: a SERP full of ads, AI Overview or rich results explains low CTR too. Item type `meta-title-rewrite`; `change` holds the proposed title and description text in the site language.
3. **Striking distance.** Query×page pairs at position 8–20 with ≥ `striking_min_impressions` impressions. Item type `content-extend` (add a section or FAQ answering that query) or `internal-links` (when the page has few inlinks: check the crawl).
4. **Decay.** Pages whose clicks fell ≥ `decay_drop` vs the previous window, with ≥ `decay_min_clicks` baseline clicks. Look at why before proposing: lost positions (content-refresh), lost CTR at the same position (SERP change: check the SERP), or seasonality (compare with the same window last year when the date dimension allows; otherwise say "possibly seasonal"). Item type `content-refresh`.
5. **Unmapped demand.** Queries with impressions where no page has the query's core terms in its title or H1. Feeds `gaps` (write them to this file; `gaps` reads it).
6. **Cannibalization.** Queries where two or more of our URLs get impressions and none sits in the top 5. Item type `strategy-decision` (merge, differentiate, or canonicalize: a choice for the user).
7. **Winners to protect.** The top 10 pages by clicks. List them; any later item touching these URLs gets a note in its `change` and needs an extra careful title/content diff.
8. **Ahrefs (when available).** Keywords we rank for on page 2–3 with meaningful volume that GSC under-reports, and top pages that lost referring domains. Mark Ahrefs volumes as estimates.

Done when each check has findings, "ok", or "skipped: <reason>".
