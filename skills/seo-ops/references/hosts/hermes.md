# Host: Hermes

**Install:** place (or symlink) the `seo-ops` folder in the agent's skills directory, or install with `npx skills add codebypanduro/skills --skill seo-ops` and pick Hermes as the target agent. Check `hermes skills list` (or the equivalent in your Hermes version) to confirm it is loaded.

**Schedule:** create a cron job whose prompt is the canonical prompt from SKILL.md, with the repo as the working directory, e.g.:
> every Monday at 06:00: Use the seo-ops skill. Mode: weekly. Headless. The working directory is /path/to/repo. Run `git pull --ff-only` first.

Every cron run starts with no memory; all state the skill needs is in `seo/` and GitHub, so that is fine.

**Env on the Hermes host:** `SEO_OPS_HEADLESS=1`, `GSC_SERVICE_ACCOUNT_FILE`, optional `PSI_API_KEY`, `gh` authenticated for PRs and issues. Connect the Ahrefs or CMS MCP servers in Hermes' own MCP config if the run should use them.

**Reporting:** Hermes can deliver the final report to a chat channel. The report is the skill's final answer, so route that output where you want it.

Verify the command names above against your Hermes version; the skill itself depends on none of them.
