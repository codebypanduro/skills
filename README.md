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
| [`seo-ops`](skills/seo-ops/SKILL.md) | `/seo-ops [mode] [--headless]` | SEO, GEO/AEO, competitor, content-gap and GSC/Ahrefs audits for any site, ending in a scored backlog. Drafts content, applies only approved items as PRs/CMS drafts, and runs headless on any agent's scheduler. |
| [`video-walkthrough`](skills/video-walkthrough/SKILL.md) | `/video-walkthrough [what to show] [voice=openai:nova] [lang=da] [pr=<n>]` | Records a short narrated MP4 of a feature in the browser (Playwright, visible cursor, captions, OpenAI/macOS/Piper voice-over via ffmpeg), plus an `.srt`, optionally attached to a PR. |
| [`ship`](skills/ship/SKILL.md) | `/ship [branch hint]` | Ships current changes: branches from the fresh default branch, commits in the repo's own style, pushes, and opens a PR against the default branch. Only runs when typed. |
| [`brainstorm`](skills/brainstorm/SKILL.md) | `/brainstorm <idea>` | Brainstorms from a single sentence: each turn pushes back on the strongest direction, asks sharp questions and adds safe/stretch/wild ideas, then wraps up with liked directions, parked ideas and riskiest assumptions. |
| [`pr`](skills/pr/SKILL.md) | `/pr` | Writes a short PR title and description: a Risk line and Heads-up callout up top, 3–5 bullets of what changed, what was verified, long output folded away. |

## Adding a skill

1. Create `skills/<name>/SKILL.md` with `name` and `description` in the frontmatter.
2. Add `disable-model-invocation: true` if the skill should only run when you type its name.
3. Run `./install.sh` and add a row to the table above.
