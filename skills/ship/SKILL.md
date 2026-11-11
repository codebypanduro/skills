---
name: ship
description: Ship current changes as a new branch, commit, push and pull request against the default branch.
argument-hint: "[branch hint]"
disable-model-invocation: true
---

Ship the current changes: create a branch, commit, push, and open a pull request.

`$ARGUMENTS` is an optional hint for the branch name and PR context.

## Steps

1. **Understand what changed.**
   - Run `git status` (never `-uall`) to see untracked and modified files.
   - Run `git diff` for unstaged changes and `git diff --cached` for staged ones.
   - If there are no changes at all (no untracked files, modifications or staged changes), stop and tell the user there is nothing to ship.
2. **Find the default branch.** Use `gh repo view --json defaultBranchRef -q .defaultBranchRef.name`, or `git symbolic-ref --short refs/remotes/origin/HEAD` (strip `origin/`). Call it `<base>` below; it is usually `main`.
3. **Learn the commit style.** Run `git fetch origin <base>`, then `git log --oneline -10 origin/<base>` and follow whatever convention the target repo uses (mood, prefixes, ticket keys, casing). Do not impose a style of your own.
4. **Branch from fresh `origin/<base>`.**
   - Derive a short, descriptive branch name from the changes (`feature/add-user-auth`, `fix/spot-price-calculation`), using `$ARGUMENTS` as a hint when given.
   - `git checkout -b <branch-name> origin/<base>`. Uncommitted changes carry over to the new branch.
5. **Stage and commit.**
   - Stage relevant files by name; avoid `git add -A`. Never stage files that likely contain secrets (`.env`, credentials, keys).
   - Write a clear, concise message in the repo's style from step 3.
   - End the message with the commit attribution trailer the running harness provides. Never hardcode a model name.
   - Pass the message via a HEREDOC to keep the formatting.
6. **Push with upstream tracking.** `git push -u origin <branch-name>`.
7. **Open the pull request.**
   - Run `gh pr create --base <base>` and always pass `--base` explicitly. Target the default branch unless the user said otherwise in this conversation. `gh`'s own default (often the current upstream) is not acceptable: it can land the PR in a stacked branch that never reaches the default branch.
   - Title: short (under 70 characters), in the repo's commit style.
   - Body via HEREDOC:

     ```
     ## Summary
     <1-3 bullets describing the changes>

     ## Test plan
     <bulleted checklist of testing steps>
     ```

     End the body with the PR attribution line the harness provides, if any.
8. **Report back.** Show the user the PR URL.
