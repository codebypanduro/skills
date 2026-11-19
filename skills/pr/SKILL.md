---
name: pr
description: Write a pull request title and description that a reviewer can scan in seconds, with the Risk and every Heads-up up top. Use when opening a PR or writing or rewriting a PR body.
metadata:
  credits:
    inspired-by: show-me by Dex Horthy (Humanlayer)
    url: "https://github.com/humanlayer/skills/blob/main/plugins/show-me/skills/show-me/SKILL.md"
---

Write a PR description a busy reviewer reads in ten seconds: what the danger is, what changed, how it was checked. The reader is the repo owner or a client developer arriving cold, so use plain words a newcomer understands and the repo's own domain terms (its `GLOSSARY.md` or `CONTEXT.md`, if any). Write in English.

## Terms

- **Risk**: the one-line verdict that opens every body.
  - `low`: safe to revert, nothing to do. No callout.
  - `medium`: revertible, but a Heads-up needs action. `> [!WARNING]` callout.
  - `high`: not revertible (data loss, one-way migration, sent emails, external state), or it touches auth, payments or tracking. `> [!CAUTION]` callout.
- **Heads-up**: one thing the reviewer must act on or know before merging, written as the action: "Set `STRIPE_WEBHOOK_SECRET` in production before deploy", not "Added a webhook secret".

## Steps

1. **Gather facts.** Find the base branch (`gh repo view --json defaultBranchRef -q .defaultBranchRef.name` unless the PR targets another). Read the full `git diff <base>...HEAD`, `git log <base>..HEAD`, and the linked issue or Spec. Done when you have read every changed file in the diff, not just the commit messages.
2. **Hunt Heads-ups.** Walk the diff against each class below and write one Heads-up per hit. Done when every class has been checked against every changed file.
   - **Data**: migrations, schema changes, backfills, deletes, anything a revert does not undo.
   - **Deploy and config**: new or renamed env vars, config files, deploy order, cron or queue changes, manual steps, new or upgraded dependencies.
   - **Breaking**: removed or renamed public APIs, routes, events, props or URLs; changed response shapes.
   - **Sensitive**: auth, permissions, payments, affiliate or analytics tracking, emails or anything else that reaches users.
   - **Gaps**: something deliberately left out, half done, behind a flag, or not verified.
3. **Set the Risk** from the Heads-ups: the highest class that applies wins.
4. **Write the title**: the outcome a reader cares about, imperative, under 60 characters, in plain words (`Cache price lookups on the offers page`).
5. **Write the body** from the template below.
6. **Check it.** Done when all hold:
   - The visible part (everything outside `<details>`) fits on one screen.
   - Every Heads-up is an action the reader can take or a fact they must know, and sits inside the callout.
   - The Risk level matches the Heads-ups.
   - **Verified** lists only what was actually run or looked at. If nothing was, it says `Not verified` and a Gaps Heads-up says what to check.

## Template

```markdown
**Risk:** <low|medium|high> · <a few words: safe to revert | needs a manual step | not revertible>

> [!CAUTION]
> <Heads-up as an action>
> <Heads-up as an action>

Closes #<issue>

## What changed
- <3–5 bullets, outcome first, file or symbol in backticks when it helps>

## Verified
- <tests run, page checked, command output, in one line each>

<details><summary>Test output</summary>

<output, screenshots, long lists>

</details>
```

- Use `[!WARNING]` for medium and `[!CAUTION]` for high. Leave the callout out entirely for low.
- Leave out `Closes` when there is no issue.
- Put anything long (test or Checks output, screenshots, per-criterion proof, loop history, file lists) in its own `<details>` block under **Verified**, one block per kind.

## Sketches

Add a sketch under **What changed** only when the change is structural (a new flow, a moved module, a reshaped component tree) and the sketch says it in fewer words than the bullets. A `diff` of the shape is usually the shortest:

```diff
 submitForm
   createSession
     persistPrompt
+    expandSkillMention
     launchAgent
```

Use a file tree for moved modules and Mermaid only for a flow between several actors. One sketch at most.
