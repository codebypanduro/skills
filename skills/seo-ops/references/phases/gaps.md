# gaps: content gaps

Combine demand signals, check them against our own inventory, and classify what is missing.

## Inputs

- **Unmapped demand** from this run's or the latest `perf.md`.
- **Competitor clusters and page types** from the latest `competitors.md`.
- **Prompt-panel misses** from the latest `geo.md`.
- **Questions people ask.** For each priority topic, web-search the head terms in the site language and collect "People also ask", related searches, and the question-shaped headings of the top 3 results.
- **Ahrefs Content Gap** (MCP or `seo/inputs/ahrefs-*gap*.csv`): keywords two or more competitors rank for and we don't.

## Steps

1. **Our inventory.** Titles, H1s and H2s from the latest crawl, plus the content files or CMS documents when the codebase is available.
2. **Match each demand item** to an existing page that targets it in its title, H1 or a heading. Check GSC for which of our pages already gets impressions for it: that page is the natural home.
3. **Classify** each unmatched or weakly matched item:
   - `content-extend`: an existing page is the right home but lacks the section, table or FAQ.
   - `content-refresh`: the page covers it, but outdated, thin or behind competitors on format.
   - `new-page`: no page fits, and the topic belongs to an existing cluster. Before proposing it, confirm no existing page would be cannibalized.
   - `strategy-decision`: a new cluster, a programmatic pattern (e.g. `[product] × [city]` with real data behind each page), or a format we don't have (calculator, tool). These go to the user with options.
4. **Size it.** Per item: the target query or question, intent (informational, commercial, transactional, navigational), the evidence of demand (GSC impressions, Ahrefs volume as an estimate, number of SERPs or prompts it appeared in), and which page it should link to and from.

Group closely related questions into one item per page. Ten FAQ questions for the same page are one `content-extend`, not ten items.

Done when every input item is matched to a page or classified, with evidence.
