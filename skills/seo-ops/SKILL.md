---
name: seo-ops
description: Run SEO, GEO/AEO, competitor, content-gap and GSC/Ahrefs performance audits on any site, turn them into a scored backlog of concrete follow-ups, draft content, and apply approved items. Works interactively or headless on a schedule in any agent.
disable-model-invocation: true
argument-hint: "[daily|weekly|monthly|init|perf|technical|geo|competitors|gaps|write <url|topic|id>|backlog|apply <ids>|dismiss <ids>|measure] [--headless]"
---

# seo-ops

One skill, one project at a time. Every run reads the project's state from `seo/`, does its phases, writes findings back to `seo/`, and ends with a ranked list of follow-ups. The skill is host-neutral: it relies only on a shell, file read/write, HTTP fetch, web search, and optionally `git`/`gh` and whatever MCP servers the host has connected.

## Run contract

Parse the arguments as `<mode> [target] [--headless]`.

- **mode**: one of the modes below. No mode: `monthly` when interactive, `daily` when headless.
- **headless**: true if `--headless` is passed or `SEO_OPS_HEADLESS=1` is set. A headless run never asks questions; every decision that needs the user is written under **Needs you** in the report and the run continues without it.
- **interactive**: ask the user only for decisions, via the host's question tool when it has one (multiple choice, recommended option first), otherwise in plain text.

The canonical headless prompt for any scheduler is:

> Use the seo-ops skill. Mode: `<mode>`. Headless. The working directory is the project repo.

Host-specific scheduling recipes live in `references/hosts/` (`claude-code.md`, `hermes.md`, `codex.md`, `github-actions.md`). Read the matching one only for `init --autopilot <host>`.

## Safety rules

These hold in every mode and every host. They are the single source; other files refer back here.

1. **Propose by default.** Phases write only inside `seo/`. Code, content, CMS documents, `robots.txt`, redirects, and anything else outside `seo/` change only through `apply`.
2. **`apply` needs a go-ahead.** Interactive: the user typed `apply <ids>` or named the items in chat. Headless: the item's type is in `autonomy.allow_pr` in `seo/context.md`, `autopilot` is `on`, and the per-run caps are not reached. Types under `autonomy.never` are applied only interactively, after the user confirms the specific risk.
3. **Deliver for review.** Changes go out as a branch + PR (or a patch file), and CMS content as drafts. Merging and publishing are the user's job.
4. **seo/ is written, not committed.** The skill leaves `seo/` changes in the working tree for the user to commit, except inside an `apply` branch, where the ledger row ships with the change.
5. **Kill switch.** `autopilot: off` in `seo/context.md` makes a headless run stop after one line: "seo-ops autopilot is off." `dry-run` runs everything but opens no issues, PRs or patches.
6. **Secrets stay in the environment.** Read credentials from env vars; never print, log or write them to `seo/`.
7. **Evidence or nothing.** Every finding and every factual claim in drafted content traces to a source: a GSC row, a crawl result, a URL, a file:line. Unverifiable claims are cut.

## Modes

| Mode | Phases, in order | Reference |
| --- | --- | --- |
| `init` | context interview, competitor discovery, scaffold `seo/` | `references/context.md` |
| `perf` | GSC + Ahrefs performance | `references/phases/perf.md` |
| `technical` | live crawl + codebase mapping + CWV | `references/phases/technical.md` |
| `geo` | GEO/AEO readiness + prompt panel | `references/phases/geo.md` |
| `competitors` | discover + compare | `references/phases/competitors.md` |
| `gaps` | content gaps | `references/phases/gaps.md` |
| `write <url\|topic\|id>` | brief + full draft, no source edits | `references/phases/write.md` |
| `backlog` | merge findings, score, render, optional issues | `references/backlog.md` |
| `apply <ids>` | deliver approved items + ledger rows | `references/apply.md` |
| `dismiss <ids>` | mark items dismissed with a reason | `references/backlog.md` |
| `measure` | score ledger rows that are due | `references/ledger.md` |
| `daily` | perf (light) → technical (defects) → backlog | |
| `weekly` | perf → technical (defects) → geo → measure → backlog | |
| `monthly` | perf → technical (full) → geo → competitors → gaps → measure → backlog | |

Presets pass their depth to each phase; the phase file says what `light`, `defects` and `full` mean for it. When a preset runs headless and `autopilot` is `on`, finish with `apply` on the items the policy allows (rule 2).

## Every run

1. **Load state.** Read `seo/context.md`. Missing: interactive → run `init` first, then the requested mode; headless → write `seo/runs/<date>/report.md` with "Needs you: run `seo-ops init`" and stop. Also read the project's `AGENTS.md`/`CLAUDE.md` when present: their content and code rules bind every phase.
2. **Resolve data sources** once per run, per `references/data.md`. Record which source served each signal (or that it was skipped) — the report lists them.
3. **Run the phases** for the mode. Each phase reads its reference file and writes `seo/runs/<date>/<phase>.md` (date = today, `YYYY-MM-DD`; a second run on the same day overwrites that phase's file). A phase is done when every check in its reference has a result in the file: a finding, "ok", or "skipped: <reason>".
4. **Write the report** to `seo/runs/<date>/report.md` and print it as the final answer:
   - **Top items**: the 5 highest-scored open backlog items, one line each with id, score and the change.
   - **Shipped**: PRs, patches and CMS drafts from this run.
   - **Needs you**: decisions, confirmations, broken data sources, new competitor candidates.
   - **Signals**: clicks and impressions vs the previous window, citation share trend, measured ledger outcomes.
   - **Sources**: which data source served GSC, Ahrefs, the crawl, and the prompt panel.

   Keep it under ~25 lines, in English. No preamble.

## The seo/ folder

```
seo/
  context.md          # project config + autonomy policy (template: assets/context.template.md)
  backlog.md          # rendered, human-readable
  backlog.jsonl       # one item per line: the source of truth for ids and status
  ledger.jsonl        # shipped changes, baselines, outcomes
  citations.jsonl     # prompt-panel results over time
  inputs/             # CSV drops (GSC/Ahrefs exports): gitignored
  .cache/             # raw API and crawl dumps: gitignored
  runs/<date>/        # perf.md technical.md geo.md competitors.md gaps.md report.md drafts/ patches/
```

## Findings format

Every phase file is a list of findings in this shape, so `backlog` can merge them mechanically:

```markdown
### <phase>-<n>: <concrete title>
- type: <item type from references/backlog.md>
- key: <type>/<url-or-template>/<query-or-topic>
- urls: /a, /b (fan-out: 38)
- evidence: <numbers and sources: "pos 6.2, 4.1k impr, CTR 1.1% (GSC 28d)">
- cause: <file:line or template, when known>
- change: <the exact change: new title text, the section to add, the schema to emit>
- verify: <metric + window, or a check>
```

One template fix is one finding, not one per URL; put the URL count in `fan-out`.

## Scripts

Both are zero-dependency Node 18+ and print their flags with `--help`. Run them from the project root with the skill's path, e.g. `node <skill-dir>/scripts/crawl.mjs`.

- `scripts/gsc.mjs`: Search Console Search Analytics with a service account.
- `scripts/crawl.mjs`: capped sitemap crawl with on-page SEO/GEO extraction and grouped issues.
