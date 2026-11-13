---
name: video-walkthrough
description: Record a short narrated MP4 walkthrough of a feature running in the browser, with a visible cursor, captions and a voice-over, for a task's proof or a PR. Use when asked for a demo video, screen recording or walkthrough of working UI.
argument-hint: "[what to show] [voice=openai:nova|macos:Sara] [lang=da] [pr=<n>]"
---

# video-walkthrough

Drive the running app with Playwright, narrate each scene, and ship an MP4 plus an `.srt`. Scripts live in `scripts/` next to this file; call them by absolute path from this skill's folder.

## Arguments

`$ARGUMENTS` is free text naming what to show, plus optional `key=value` words:

- `voice=<engine>:<voice>`: `openai:coral|nova|alloy`, `macos:Sara|Samantha`, `piper:<model.onnx>`. Overrides `~/.config/video-walkthrough/config.toml`.
- `lang=<code>`: narration language, default `en`. `da` picks the Danish macOS voice Sara; for openai, say the language in the config `instructions` ("Tal roligt og naturligt på dansk") and write the narration in that language.
- `pr=<n>`: upload the video to the PR (see Output).
- `out=<dir>`, `name=<stem>`, `captions=srt` (keep captions out of the picture).

## Steps

1. **Check setup.** Run `scripts/setup.sh status`. Playwright missing: run `scripts/setup.sh` for the user (it installs Playwright; its key prompt takes Enter to skip). Done when `playwright: installed`.
2. **Serve the feature.** Start the dev server, or open a built page, and confirm the URL loads. The walkthrough shows what works, so reach every state you narrate by hand-checking it first. Done when each step you plan to film succeeds against the live app.
3. **Write the scene script** as JSON (format below), one scene per beat of the feature. Done when every scene has one narration line and the steps that make the screen match it.
4. **Record.** `node scripts/walkthrough.mjs <script.json> [key=value…]`. Done when it prints the JSON result with `mp4`, `srt`, `narration`.
5. **Look at it.** Extract two or three frames (`ffmpeg -ss <t> -i out.mp4 -frames:v 1 f.png`) and read them: cursor visible, caption readable, right state on screen. A scene reported as "steps ran … past its narration" has dead video after its voice: lengthen the line or cut steps, then record again.
6. **Report** the paths, the engine used (and any fallback notice), duration and size.

## Scene script

```json
{
  "title": "Checkout coupon",
  "url": "http://localhost:3000/cart",
  "language": "en",
  "viewport": { "width": 1280, "height": 720 },
  "scenes": [
    { "caption": "Apply a coupon", "say": "Enter the coupon code and apply it.",
      "steps": [{ "type": ["#coupon", "SPRING10"] }, { "click": "button[type=submit]" }] }
  ]
}
```

- A **scene** is one narration line (`say`, spoken) with the steps that happen while it plays, and a short on-screen `caption` (3 to 5 words). Each clip is as long as its narration plus a beat; steps that finish early hold the final frame, so audio and video stay in sync.
- **Steps** (exactly one key each): `goto` (URL, relative allowed), `click`, `hover`, `fill` / `type` (`[selector, text]`; `type` shows keystrokes), `press` (key), `scroll` (pixels), `wait` (ms), `eval` (JS in page). Selectors are Playwright selectors. The cursor glides to each target before it acts.
- `assets/sample-app.html` with `assets/sample-script.json` (and `.da.json`) is a working example: replace `SAMPLE_APP` with the absolute path of the HTML file.
- Keep a clip to 4 to 12 seconds and the video under about 60 seconds. One idea per line.
- Sign-in or other state: do it in the first scene's steps, or point `url` at a page that needs none. Never put credentials in the script file.

## Voices

One interface, three engines, chosen by `voice=` or the config file:

| Engine | Needs | Notes |
| --- | --- | --- |
| `openai` | API key | `gpt-4o-mini-tts` via the audio/speech API; honours `instructions` for tone and language. Natural voice. |
| `macos` | macOS | `say -v <voice>`; Sara for Danish, Samantha for English. Free, offline. |
| `piper` | `piper` on PATH | Local neural voice; `voice=piper:/path/to/model.onnx`. |

Config (`~/.config/video-walkthrough/config.toml`): `engine`, `voice`, `model`, `instructions`, `language`. Without a config the engine is `macos`.

**The narration text is sent to OpenAI when the openai engine is used.** Tell the user when narrating non-public material, and use `macos` or `piper` for anything confidential.

An openai request with no key, or one the API rejects (bad key, no credit), falls back to `macos` for the whole video and says so in the run output; relay that to the user.

## OpenAI key

A ChatGPT subscription does not include the API. The key comes from platform.openai.com and is billed per use.

- The user stores it once with `scripts/setup.sh` (hidden prompt, saved to the macOS Keychain as `video-walkthrough-openai`). You cannot answer that prompt: ask the user to run `! scripts/setup.sh` from this skill's folder.
- At runtime `OPENAI_API_KEY` wins, else the Keychain item is read by the script.
- The key stays inside the process environment and the HTTPS request. Handle it by name only: leave it out of commands, logs, files, commits and your replies.

## Output

Always in `out` (default `./walkthrough-out/`, keep it out of commits): `<name>.mp4` (H.264/AAC, at most 1080p, re-encoded under about 25 MB), `<name>.srt` (the captions), `<name>.narration.txt` (the spoken lines).

`pr=<n>` commits the MP4 and `.srt` onto the `pr-assets/<current-branch>` branch with git plumbing (own temp index; working tree, index and feature branch untouched), pushes it, and comments the links on the PR via `gh` (links, not an inline player). `<n>` must be the PR of the current branch. Mention in your report that the `pr-assets/<branch>` branch can be deleted after merge. The video never goes into the feature branch.

When a task needs visual proof that a change works, attach the MP4 or link it in the report.

## Tests

`node --test scripts/test/*.test.mjs` covers config parsing, script validation, engine fallback, the OpenAI request shape and key handling.
