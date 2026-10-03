# Skills

My personal collection of Claude Code skills.

## Install

```bash
./install.sh
```

This symlinks every folder in `skills/` into `~/.claude/skills`, so edits here go live right away. Set `CLAUDE_SKILLS_DIR` to install somewhere else. Folders that already exist and aren't symlinks are left untouched.

## Skills

| Skill | Invocation | What it does |
| --- | --- | --- |
| [`issue-brief`](skills/issue-brief/SKILL.md) | `/issue-brief [focus]` | Captures the current conversation as short issues to spec later, then optionally creates them with `gh`. |

## Adding a skill

1. Create `skills/<name>/SKILL.md` with `name` and `description` in the frontmatter.
2. Add `disable-model-invocation: true` if the skill should only run when you type its name.
3. Run `./install.sh` and add a row to the table above.
