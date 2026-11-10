---
name: brain-store
description: Store/save this conversation in my brain, second brain, vault or notes as one distilled entry.
argument-hint: "[focus] [--brain <path>]"
disable-model-invocation: true
---

Distill the current conversation into **one entry** and store it in the user's **brain**: a folder of notes, such as a git markdown vault, an Obsidian vault or a plain directory. An entry is a distillation that lets a future reader pick up the thread. It is never a transcript.

`$ARGUMENTS` is `[what to focus on] [--brain <path>]`. A focus ("the pricing decision") limits the entry to that part of the conversation. `--brain <path>` names the brain.

## Steps

1. **Find the brain.** Take the first that applies:
   1. `--brain <path>` in `$ARGUMENTS`
   2. the `BRAIN_DIR` environment variable (`echo "$BRAIN_DIR"`)
   3. a location stated in your memory or the project/user `CLAUDE.md`/`AGENTS.md`
   4. otherwise ask the user for the path via `AskUserQuestion`, and suggest they set `BRAIN_DIR` so it is found next time.

   Done when you hold an existing directory path. Every location comes from one of these sources, never from a guess.
2. **Learn the brain's own rules.** Read each of these that exists at the brain's root: `AGENTS.md` / `agents.md`, `CLAUDE.md`, `README.md`, `.brain-store.md` (see below). Where they conflict with this skill's defaults, the brain's rules win: an append-only `raw/` area, an `inbox/`, "only a compile job edits `wiki/`", commit and push policy. Then open the newest existing entry in the target location and copy its format exactly (headings, frontmatter, tags, language). The format of existing entries wins over the default in step 3. Done when you know the target path, the entry format, and whether to commit and push.
3. **Default target** when the brain states no rules: create `inbox/<YYYY-MM-DD>-<slug>.md` (`<slug>` is the topic in short kebab-case; create `inbox/` if missing; if the path exists, add `-2`, `-3`… and never overwrite), with this frontmatter followed by the entry:

   ```
   ---
   date: <YYYY-MM-DD>
   source: <agent or harness name, e.g. claude-code>
   tags: [<1-3 topic tags>]
   ---
   ```
4. **Distill.** Write the entry from what the conversation established, within the focus if one was given:
   - **Topic:** one line.
   - **Context:** who, what, where.
   - **Decisions** and why they were made.
   - **Done:** what was done, with durable links (PRs, commits, artifacts, docs).
   - **Open questions and next steps**, each with an owner.
   - **Facts worth recalling:** IDs, URLs, names of systems.

   Write absolute dates (`2026-03-14`), never "today" or "last week". Cut every line a future reader would not miss. Omit sections that have nothing in them.
5. **Check safety.** Scan the entry before saving. Secrets, passwords, tokens, API keys, and full personal identifiers (CPR/SSN, card or bank numbers) are replaced by a pointer to where the credential lives ("the API key is in the client's 1Password vault"). Done when the entry contains none of them.
6. **Write.** If the target file already exists in a git repo, run `git status --porcelain -- <target>` first; when it shows unrelated changes, ask the user before touching the file. Create a new file or append to the file the brain's rules name. Leave existing entries as they are unless the brain's rules say to edit them.
7. **Commit.** If the brain is a git repo (and its rules don't say never to commit): stage only the file(s) you wrote with `git add <path>`, never `-A`, and commit with a clear message such as `Add brain entry: <topic>`. Commit with `git commit -m "<message>" -- <path>…` so files the user already staged stay out of your commit, and leave other uncommitted changes untouched. Push only if the brain's rules, `.brain-store.md` or the user say so. Not a git repo: the saved file is the end.
8. **Report** the path written, the commit hash if any, and a 3–5 line summary of what was stored.

## `.brain-store.md`

Optional file at the brain root, read in step 2. Plain markdown; every key is optional.

```
# brain-store config

- target: raw/sessions/<YYYY-MM>.md   # folder or file pattern; <YYYY-MM-DD>, <YYYY-MM>, <slug> are filled from the entry date and topic
- mode: append                        # append to the target file, or "new" for a file per entry
- template: |
    ## <date> — <source> — <topic>
    <entry>                           # <date>, <source>, <topic> as in the default frontmatter; <entry> is the distilled body
- tags: [session]
- commit: true
- push: false
```
