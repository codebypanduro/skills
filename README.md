# Skills

My personal collection of Claude Code skills.

## Install

With the [skills CLI](https://skills.sh):

```bash
npx skills add codebypanduro/skills                     # pick skills interactively
npx skills add codebypanduro/skills --skill explain-fix -g  # one skill, user-level
```

Or, from a clone, symlink them all:

```bash
./install.sh
```

This symlinks every folder in `skills/` into `~/.claude/skills`, so edits here go live right away. Set `CLAUDE_SKILLS_DIR` to install somewhere else. Folders that already exist and aren't symlinks are left untouched.

## Skills

| Skill | Invocation | What it does |
| --- | --- | --- |
| [`issue-brief`](skills/issue-brief/SKILL.md) | `/issue-brief [focus]` | Captures the current conversation as short issues to spec later, then optionally creates them with `gh`. |
| [`explain-fix`](skills/explain-fix/SKILL.md) | `/explain-fix [#issue]` | After a fix, posts a short, jargon-free comment on the related GitHub issue: what was wrong, why, and how it was fixed. |

## Adding a skill

1. Create `skills/<name>/SKILL.md` with `name` and `description` in the frontmatter.
2. Add `disable-model-invocation: true` if the skill should only run when you type its name.
3. Run `./install.sh` and add a row to the table above.
