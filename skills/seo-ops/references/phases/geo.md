# geo: GEO/AEO readiness and citations

Two halves: whether our pages are easy for answer engines to extract and trust, and whether they actually get cited.

## 1. Readiness

Check the pages behind the prompt panel and the top 10 GSC pages (use the crawl output; fetch any missing page from the crawl target, i.e. `preview_url` when set). Citations in part 2 are always looked up for `domain`. Per page:

- **Answer first.** The first 40–60 words under the H1, or under each question heading, answer the question directly. Intros that warm up before answering are the most common miss.
- **Question-shaped headings** that match how people ask (`questionHeadings` in the crawl), with the answer in the paragraph straight after.
- **Extractable structure.** Comparisons as real HTML tables, steps as ordered lists, key numbers in text (not only in images or client-rendered widgets).
- **Specifics with sources.** Prices, stats and claims carry a number, a date context and a named source. Vague superlatives get cut, not hedged.
- **Freshness.** A visible updated date, `dateModified` in JSON-LD, and content that matches it.
- **Who is behind it.** Author or organization, with an about page and contact info reachable; Organization JSON-LD with `sameAs` on the home page.
- **Entities.** Products, brands and places named consistently across pages, as people search for them.
- **FAQ.** A visible FAQ where the page answers several related questions, with FAQPage JSON-LD that mirrors it exactly.
- **Server-rendered content** (see technical step 3): answer engines that cannot run JS see nothing else.

Site-level: AI bot access in `robots.txt` (from the crawl, reported as fact, with the policy question to the user), and `llms.txt` presence. Treat `llms.txt` as low-priority: no major engine has confirmed using it.

Items: `content-extend` (add an answer block, table, FAQ), `faq-block`, `jsonld-fix`, `content-refresh`, each naming the page and the exact block to add. Block patterns: definition (one-sentence answer, then context), steps (numbered, one action each), comparison table with a "best for" row, pros/cons with a verdict, FAQ (answers of 40–80 words that begin with the answer).

## 2. Prompt panel

For each prompt in `prompt_panel` (all of them weekly/monthly; skip in daily):

1. Run it through the answer engines available, tagging each result with its `engine`: the host's web search (`websearch`, always), plus any connected AI-search or answer-engine tool (e.g. a Perplexity MCP).
2. Record which domains are cited or ranked in the top results, whether our domain appears, and which of our URLs.
3. Append one line per prompt × engine to `seo/citations.jsonl`:
   ```json
   {"date":"2026-11-06","engine":"websearch","prompt":"…","us":false,"our_urls":[],"cited":["competitor-a.dk","wikipedia.org"],"competitors_cited":["competitor-a.dk"]}
   ```

Report: **citation share** (prompts where `us` is true ÷ prompts run) per engine, vs the average of the previous 4 runs from `citations.jsonl`. For each prompt where a competitor is cited and we are not, look at the cited page and say what it has that ours lacks (a direct answer, a table, fresher data, a page at all). That becomes the item's `evidence`.

A web search result is a proxy for AI retrieval, not a reading of ChatGPT or Gemini answers. Say so in the report the first time the panel runs.

Done when every readiness check has a result for every page in scope and every panel prompt has a `citations.jsonl` row for this run.
