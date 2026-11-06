# init: project context

`init` creates `seo/` and `seo/context.md` from `assets/context.template.md`. It is the only mode that writes `context.md` without being asked; later runs edit it only when the user approves a specific change (e.g. adding a competitor).

## Steps

1. **Infer before asking.** Fill every field you can from the environment:
   - `domain`/`site_url`: env files (`NEXT_PUBLIC_SITE_URL`, `APP_URL`, `SITE_URL`), framework config, `metadataBase`, sitemap/robots generators, `package.json` homepage.
   - `stack.framework`, `stack.content.source`/`location`: dependencies (`next`, `astro`, `@sanity/client`, `laravel/framework`, WP theme files) and content folders (`content/`, `posts/`, `*.mdx`).
   - `stack.checks`: the lint/typecheck/test/build scripts that exist in `package.json`/`composer.json`.
   - `language`/`market`: `<html lang>` on the live homepage, i18n config, TLD.
   - `data.gsc_property`: run `node <skill-dir>/scripts/gsc.mjs --list-sites` if credentials exist and pick the matching property; prefer `sc-domain:`.
2. **Interview for the rest** (interactive only). Ask in small batches, offering the inferred value as the recommended option: site type, conversion goal, priority topics (offer candidates from the top GSC queries and the main nav), notes on tone and sensitive claims. Headless: leave unknowns as the template's placeholder and list them under **Needs you**.
3. **Competitors.** Run competitor discovery from `references/phases/competitors.md` (discovery section only). Interactive: the user confirms which candidates go into `competitors`. Headless: put candidates in the report only.
4. **Prompt panel.** Draft 15–20 prompts in the site language: what a buyer would ask an AI assistant about the priority topics (comparisons, "best X for Y", costs, how-to, trust questions). Interactive: the user trims or edits. Headless: write them and flag "prompt panel unreviewed" in **Needs you**.
5. **Autonomy stays safe.** Write `autopilot: off` and an empty `allow_pr`. Only the user raises them.
6. **Scaffold** `seo/backlog.jsonl`, `seo/ledger.jsonl`, `seo/citations.jsonl` (empty), and `seo/.gitignore` containing `inputs/` and `.cache/`.

Done when `seo/context.md` has no template placeholders left (or each remaining one is listed under **Needs you**) and the scaffold exists.

## init --autopilot <host>

Prints the setup recipe from `references/hosts/<host>.md` for this project: schedule, prompt, required env vars, and what to change in `context.md` (`autopilot`, `allow_pr`). Write files outside `seo/` (e.g. a workflow YAML) only when the user asks for it in this run.
