# Host: GitHub Actions

Runs Claude Code in CI on a schedule. Write the workflow file into the project only when the user asks for it.

`.github/workflows/seo-ops.yml`:
```yaml
name: seo-ops
on:
  schedule:
    - cron: "0 5 * * 1"        # weekly, Monday 05:00 UTC
  workflow_dispatch:
    inputs:
      mode:
        description: "seo-ops mode"
        default: weekly

jobs:
  run:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      issues: write
      pull-requests: write
      id-token: write
    steps:
      - uses: actions/checkout@v6
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
      - name: Install skill
        run: npx -y skills add codebypanduro/skills --skill seo-ops -y
      - name: GSC credentials
        env:
          GSC_JSON: ${{ secrets.GSC_SERVICE_ACCOUNT_JSON }}
        run: printf '%s' "$GSC_JSON" > "$RUNNER_TEMP/gsc.json"
      - uses: anthropics/claude-code-action@v1
        env:
          SEO_OPS_HEADLESS: "1"
          GSC_SERVICE_ACCOUNT_FILE: ${{ runner.temp }}/gsc.json
          PSI_API_KEY: ${{ secrets.PSI_API_KEY }}
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        with:
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          prompt: |
            REPO: ${{ github.repository }}
            Use the seo-ops skill. Mode: ${{ inputs.mode || 'weekly' }}. Headless. The working directory is the project repo.
          claude_args: |
            --allowedTools "Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,Bash(node:*),Bash(git:*),Bash(gh:*),Bash(npm:*),Bash(npx:*)"
      - name: Commit seo/ state
        run: |
          git config user.name "seo-ops"
          git config user.email "seo-ops@users.noreply.github.com"
          git checkout "${{ github.event.repository.default_branch }}"
          git add seo/ && git diff --cached --quiet || \
            (git checkout -B seo-ops/state && git commit -m "seo-ops: ${{ inputs.mode || 'weekly' }} run state" && \
             git push -f origin seo-ops/state && \
             (gh pr view seo-ops/state >/dev/null 2>&1 || gh pr create --head seo-ops/state --title "seo-ops: run state" --body "Reports, backlog and ledger updates from scheduled seo-ops runs."))
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

Notes:
- CI is ephemeral, so `seo/` state is committed to a rolling `seo-ops/state` PR. Merge it to keep history; until it is merged, the next run starts from the default branch's `seo/`.
- PRs opened with `GITHUB_TOKEN` don't trigger other workflows. Use a GitHub App or fine-grained PAT for `GH_TOKEN` if the project's CI must run on them.
- Secrets: `ANTHROPIC_API_KEY`, `GSC_SERVICE_ACCOUNT_JSON`, optional `PSI_API_KEY`. MCP servers (Ahrefs, CMS) need their own config via `claude_args --mcp-config`; without them the run uses CSV inputs and web search.
