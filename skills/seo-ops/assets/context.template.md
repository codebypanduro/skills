---
# seo-ops project context. The YAML is machine-read every run; the notes below are for judgement.
domain: example.com
site_url: https://example.com
preview_url:               # optional: staging/preview build to crawl until it is live on site_url
market: DK                 # primary country (ISO 3166)
language: da-DK            # content, SERP and prompt-panel language; reports stay English
site_type: affiliate       # affiliate | saas | ecommerce | local | publisher | portfolio | other
conversion_goal: outbound affiliate clicks

stack:
  framework: nextjs        # nextjs | astro | laravel | wordpress | static | other
  content:
    source: repo-files     # repo-files | sanity | wordpress | contentful | other
    location: content/     # repo path, or CMS project/dataset id
  checks: [npm run lint, npm run build]   # run before any apply commit

data:
  gsc_property: sc-domain:example.com
  ahrefs_max_calls: 15     # per run, when an Ahrefs MCP is connected
  pagespeed: true          # PageSpeed Insights on top templates (PSI_API_KEY optional)

competitors:               # confirmed by the user; candidates go to the report, never here
  - competitor-a.dk
  - competitor-b.dk

priority_topics:
  - example topic

prompt_panel:              # 10-30 real buyer questions in the site language
  - "example question people ask an AI assistant"

thresholds:                # defaults suit small/medium sites; raise for large ones
  striking_min_impressions: 50
  low_ctr_min_impressions: 200
  decay_min_clicks: 30
  decay_drop: 0.25

autopilot: off             # off | dry-run | on  (headless runs only)
autonomy:
  allow_pr: []             # item types autopilot may deliver as a PR/patch/CMS draft, e.g. [meta-title-rewrite, internal-links, jsonld-fix, faq-block]
  never: [new-page, url-change, redirect, noindex, delete, robots-change]
  max_prs_per_run: 2
  open_issues: false       # headless: open GitHub issues for top items
  max_issues_per_run: 3
---

# Notes

Audience, tone of voice, editorial rules, claims that need care (prices, legal, health), pages that must not be touched, and anything else a new SEO hire would need to know.
