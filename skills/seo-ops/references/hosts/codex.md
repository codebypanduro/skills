# Host: Codex (CLI / ChatGPT agents)

**Install:** `npx skills add codebypanduro/skills --skill seo-ops` and pick Codex as the target agent (installs into the agent's skills folder for the repo or user). In interactive Codex, ask for the skill by name: "use seo-ops, mode gaps".

**Headless:**
```bash
cd /path/to/repo && git pull --ff-only && \
SEO_OPS_HEADLESS=1 codex exec "Use the seo-ops skill. Mode: weekly. Headless. The working directory is the project repo."
```
Give the run network access and permission to write in the working tree (the sandbox and approval flags differ between Codex versions; pick the mode that allows workspace writes and network). Schedule it with cron/launchd, or a Codex cloud task where your plan supports scheduling.

**Env:** `GSC_SERVICE_ACCOUNT_FILE`, optional `PSI_API_KEY`, `gh` authenticated. Web search must be enabled for competitor, gap and prompt-panel checks; without it those checks report "skipped: no web search".

Verify the flags above against your Codex version; the skill itself depends on none of them.
