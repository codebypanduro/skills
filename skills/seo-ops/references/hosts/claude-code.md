# Host: Claude Code

**Install** (per project): `npx skills add codebypanduro/skills --skill seo-ops`. Interactive use: `/seo-ops`, `/seo-ops weekly`, `/seo-ops apply S-3,S-5`.

**Headless, local schedule** (cron/launchd on a machine with the repo checked out and your MCPs connected):
```bash
cd /path/to/repo && git pull --ff-only && \
claude -p "Use the seo-ops skill. Mode: weekly. Headless. The working directory is the project repo." \
  --allowedTools "Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Bash(node:*),Bash(git:*),Bash(gh:*),Bash(npm run:*)"
```
Env: `SEO_OPS_HEADLESS=1`, `GSC_SERVICE_ACCOUNT_FILE`, optional `PSI_API_KEY`.

**Cloud routine** (`/schedule`): create a routine on the repo with the canonical prompt from SKILL.md and a cron such as `0 6 * * 1` (weekly) or `0 6 * * *` (daily). Check that the routine's environment has the GSC secret and any MCP servers the run should use; a routine has no access to MCPs connected only on your machine.

**What to change in `seo/context.md`** for autopilot: `autopilot: dry-run` for the first 1–2 runs, then `on`, and list the types autopilot may ship in `autonomy.allow_pr`.
