# write: briefs and drafts

`write <target>` produces a draft for review. It never edits the source content: getting the draft into the site is `apply`.

Target forms:
- a backlog id (`S-12`): write what the item's `change` describes.
- an existing URL or path: modify that page (refresh, extend, re-target).
- a topic or query: a new page.

## Steps

1. **Gather.** The project's content rules (`AGENTS.md`/`CLAUDE.md`, the `# Notes` in `seo/context.md`, an editorial or voice guide if the repo has one). For an existing page: its current content from the source (repo file or CMS document), its GSC queries, and its crawl data. Then the top 3 ranking pages for the target query, and the matching prompt-panel results.
2. **Brief** (top of the draft file):
   - target query + secondary queries, intent, and the page's job (which conversion it serves)
   - what the top results do that this draft must match, and the one thing it does better
   - outline (H1, H2s as questions where natural)
   - title (≤ 60 chars) and meta description (≤ 155 chars), in the site language
   - internal links: which pages link in (with anchor text) and which this page links out to
   - structured data to emit, and the facts that need sources
3. **Draft** in the site language, following the content source's format (MDX with the repo's frontmatter and components; Portable Text-ready markdown for Sanity; HTML blocks for WordPress). Use the GEO block patterns from `references/phases/geo.md` where they fit the query. For a modification, write the full revised page, then a **Change summary** listing what was added, cut and moved, and why.
4. **Fact pass.** Every number, price, date, and claim about a third party gets a source URL listed under **Sources** at the end. A claim without a source is cut. Dates are relative to today.
5. **Voice pass.** If the host has a humanizer or editorial-voice skill, run the draft through it. Otherwise remove the usual AI tells yourself: staged openers, "not X but Y" contrasts, forced triads, stacked dashes, inflated adjectives, filler closers.

Output: `seo/runs/<date>/drafts/<slug>.md`, and a backlog item for it (type `new-page`, `content-extend` or `content-refresh`) that points at the draft in its `change` field.

Done when the draft file has a complete brief, a full draft, a Sources list covering every factual claim, and (for modifications) a change summary.
