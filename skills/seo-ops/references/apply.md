# apply: deliver approved items

`apply <ids>` turns backlog items into reviewable changes. It runs only under the go-ahead in SKILL.md safety rule 2.

## Gate each item

For each id, in order:

1. Look it up in `seo/backlog.jsonl`. Unknown, `applied`, `done` or `dismissed` → skip and say why.
2. **Policy.**
   - Headless: type must be in `autonomy.allow_pr`, never in `autonomy.never`; stop when `max_prs_per_run` is reached. In `dry-run`, gate and plan but deliver nothing.
   - Interactive: allowed. For a type in `autonomy.never`, first state the specific risk (e.g. "redirecting /a to /b drops /a's 1.2k clicks if /b doesn't satisfy the same queries") and wait for the user's explicit confirmation of that item.
3. **Cooldown.** URL touched by a ledger row in the last 21 days → skip (headless) or warn and ask (interactive).
4. **Winners.** Item touches a top-10 page from `perf.md` → headless: deliver only if the type is a pure addition (`faq-block`, `jsonld-fix`, `internal-links`, `alt-text`); interactive: show the before/after first.

## Deliver

Pick the route from `stack.content.source` and what the environment allows. One item per branch, PR, patch or CMS draft.

**Repo files (code, MDX, markdown, templates):**
1. `git fetch` and branch `seo-ops/<id>-<slug>` from the default branch's latest remote state. A dirty working tree outside `seo/` → stop and report it; never stash or discard the user's work.
2. Make the minimal change the item's `change` describes, following the repo's conventions and the project's `AGENTS.md`/`CLAUDE.md`. Content from a `write` draft is used as reviewed text; regenerate only what's missing. Bump the page's updated date when the content changed substantively.
3. Run `stack.checks`. Red → fix if the cause is in your change (max 2 attempts), else abandon the branch and record the failure on the item.
4. Append the ledger row (see `references/ledger.md`) in the same branch and commit: `seo(<type>): <what> [seo-ops <id>]`.
5. Push and open a PR with `gh` when a remote and auth exist. Body: **Why** (evidence numbers), **Change** (per URL/template), **Hypothesis** (from the ledger row), **Sources**, **Checks run**, **Verify** (metric + window). Without push access or `gh`: write `seo/runs/<date>/patches/<id>.diff` (`git format-patch -1 --stdout`) and return to the original branch.

**CMS (Sanity, WordPress, Contentful, …):** use the connected MCP or API to create a **draft** (Sanity: a draft or release version of the document; WordPress: status `draft`, or a revision for a published post). Never call publish. Then write the ledger row to `seo/ledger.jsonl` in the working tree. Without CMS access: leave the draft file from `write` and add the steps under **Needs you**.

**Off-site and decisions** (`backlink-outreach`, `strategy-decision`): nothing to apply. Write the outreach plan or the decision options into the item and list it under **Needs you**.

## After

Set the item to `status: applied` with `delivered: {kind: pr|patch|cms-draft, ref: <url|path|doc id>}` and `applied_at`. Report each delivery under **Shipped**.

Done when every requested id is delivered or skipped with a stated reason.
