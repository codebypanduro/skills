# backlog: merge, score, render

`seo/backlog.jsonl` is the source of truth; `seo/backlog.md` is rendered from it every backlog run.

## Item types

The policy in `seo/context.md` (`autonomy.allow_pr`, `autonomy.never`) refers to these names:

| Type | Typical change |
| --- | --- |
| `meta-title-rewrite` | title and/or meta description text |
| `internal-links` | add or retarget links and anchors |
| `jsonld-fix` | add or fix structured data in a template or page |
| `faq-block` | add a visible FAQ + FAQPage JSON-LD |
| `alt-text` | image alt text |
| `heading-fix` | H1/H2 structure |
| `broken-link` | fix or remove a broken link |
| `content-extend` | add a section, table or answer block to an existing page |
| `content-refresh` | update outdated facts, dates, depth on an existing page |
| `cwv-fix` | performance fix in a component or asset |
| `template-change` | other SEO change to a route template |
| `new-page` | a new page in an existing cluster |
| `url-change` / `redirect` | change, merge or redirect URLs |
| `noindex` / `delete` | remove pages from the index or the site |
| `robots-change` | `robots.txt`, AI bot policy, sitemap rules |
| `backlink-outreach` | off-site work: digital PR, link reclamation |
| `strategy-decision` | a choice for the user: clusters, cannibalization, programmatic sets |

## Steps

1. **Collect** findings from every phase file in `seo/runs/` dated within the last 35 days, newest first. A newer finding with the same `key` replaces an older one.
2. **Match to existing items** by `key`. Matched: update its evidence and score, keep its id and status. New: assign the next id (`S-<n>`, never reused).
3. **Drop or hold:**
   - status `dismissed`, `applied` or `done` stays out of the ranking (rendered in a short "Closed" list).
   - URL in **cooldown** (a ledger row touching it within 21 days, see `references/ledger.md`): keep, mark `cooldown until <date>`, rank below the rest.
4. **Score:**
   ```
   score = impact × confidence × value / effort
   impact      1–5    expected clicks/citations gained; fan-out counts (a template fix on 200 URLs beats one page)
   confidence  0.3–1  1 = clear defect with evidence; 0.5 = strong signal; 0.3 = hunch
   value       1–3    3 = page/cluster drives conversions (conversion_goal) or is a winner to protect
   effort      1–5    1 = text change; 3 = template change; 5 = new cluster or migration
   ```
   Halve `confidence` for types the ledger has suppressed. Round to one decimal.
5. **Render** `seo/backlog.md`: open items sorted by score, then cooldown items, then the Closed list.
   ```markdown
   ## S-12 · Rewrite title/meta: /kreditkort  [8.4]
   type: meta-title-rewrite · effort S · policy: allow_pr | needs you | never
   Evidence: "bedste kreditkort" pos 6.2, 4.1k impr, CTR 1.1% vs ~4% expected (GSC 28d)
   Change: title → "…", description → "…"
   Verify: CTR on the page's top 3 queries, 28 days after shipping
   ```
6. **Issues** (optional). Interactive: offer to open GitHub issues for the top items (the user picks which). Headless: only when `autonomy.open_issues` is true and `autopilot` is `on`, up to `max_issues_per_run`. Title `[seo-ops S-12] <title>`; skip items that already have an open issue with that prefix (`gh issue list --search "[seo-ops S-12]"`). Store the issue number on the item.

backlog.jsonl line:
```json
{"id":"S-12","key":"meta-title-rewrite//kreditkort/bedste kreditkort","type":"meta-title-rewrite","title":"…","urls":["/kreditkort"],"fanout":1,"evidence":"…","cause":null,"change":"…","verify":"…","impact":4,"confidence":0.9,"value":3,"effort":1,"score":10.8,"status":"open","first_seen":"2026-11-06","last_seen":"2026-11-06","source":"perf","issue":null,"draft":null}
```

## dismiss <ids>

Set `status: dismissed` and `dismissed_reason` (ask for it when interactive; headless never dismisses). A dismissed key is not re-opened by later findings unless its evidence changes materially (e.g. impressions doubled).

Done when every finding from the collected phase files is either matched to an item or dropped with a reason, and backlog.md is rendered.
