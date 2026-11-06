# ledger: did it work?

`seo/ledger.jsonl` records every shipped change with a baseline, so later runs can see whether it moved anything and stop proposing what doesn't work.

## Row (written by apply)

```json
{"id":"L-7","item":"S-12","date":"2026-11-06","type":"meta-title-rewrite","key":"meta-title-rewrite//kreditkort/bedste kreditkort","urls":["/kreditkort"],"queries":["bedste kreditkort"],"change_summary":"Title and description rewritten to lead with the annual fee comparison","hypothesis":"CTR on the top 3 queries rises from 1.1% toward ~4% at an unchanged position","metric":"ctr","baseline":{"window":["2026-10-07","2026-11-03"],"clicks":45,"impressions":4100,"ctr":0.011,"position":6.2},"delivered":{"kind":"pr","ref":null},"outcome":null}
```

- `metric` is the one number the change is meant to move: `ctr` (snippet changes), `clicks` (content, links), `position` (content depth, schema), `citations` (GEO changes: share of panel prompts citing these URLs).
- Baseline comes from GSC for exactly these URLs (and queries, when the item names them), the 28 days before shipping. No GSC source → `baseline: null` and the row can only be measured qualitatively.
- `ref` is filled in by `measure` once the PR or draft exists (look it up by the `[seo-ops <id>]` marker).

## measure

1. Rows with `outcome: null` and a merge/publish at least 28 days ago. Find the ship date from the PR's merge date (`gh pr view`) or the CMS document's publish date; unmerged after 28 days → `outcome: {status: "not-shipped"}`.
2. Pull the same metric for the same URLs/queries over the 28 days after shipping (skip the ship day).
3. **Moved** when the metric improved by ≥ 15% relative (position: improved by ≥ 1.0) and the baseline had at least 100 impressions; otherwise `moved: false`, or `inconclusive` for small baselines. Note site-wide movement in the same window: if the whole site moved as much, call it inconclusive.
4. Write `outcome: {measured_at, window, value, moved}` back to the row.

## Rules other files use

- **Cooldown.** A URL in any row dated within the last 21 days is in cooldown: no new items for it ship, except a fix for a defect the row's change introduced.
- **Suppression.** A `type` with ≥ 3 measured rows and none `moved: true` is suppressed for this project: `backlog` halves its confidence, and the report says so once.
- **Learning.** Monthly runs list which types moved and which didn't in the report's Signals line.
