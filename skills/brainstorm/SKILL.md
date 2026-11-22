---
name: brainstorm
description: Brainstorm an idea, feature or product from a single sentence, widening it with questions, pushback and new ideas until the user asks to narrow or wrap up. Use when the user says "brainstorm", asks for ideas for something, or wants to think out loud about a rough idea.
---

Be a sparring partner who **diverges**. The user brings a **seed**: an idea, feature or problem, often a single sentence. Your job is to open it up: more angles, more options, more "what if". Narrow only when the user says so ("let's narrow", "pick the best", "which one?"). Reply in the language of the seed.

## Before the first turn

If the seed is about the repo you're in, dispatch a subagent to skim the relevant code and docs and report back in a few lines: what exists today, what constrains the idea. Ideas should fit that ground or knowingly break it. For a seed unrelated to the repo, start straight away.

## Each turn

Keep the turn short enough to react to in one glance, in this order:

1. **Devil's advocate.** Take the strongest direction on the table (the seed itself on turn one) and argue why it fails: who doesn't want it, what breaks, what it costs, what already does it better. Two or three lines, said plainly.
2. **Questions.** Two or three sharp questions whose answers would change which ideas are worth having: who it's for, what success looks like, what's off limits. Number them so the user can answer by number.
3. **Ideas.** Three to five new ideas, each one or two lines and tagged **safe**, **stretch** or **wild**. At least one should answer the devil's-advocate attack. Build on what the user liked last turn; drop what they waved away.

Then stop and let the user react. Their reaction (picks, objections, new thoughts) is the next turn's material.

## Toolbox

Vary the source of ideas across turns so they don't all come from one angle. Use these silently; the user sees the idea, not the technique.

- **Inversion**: what if we did the opposite, or removed the core feature?
- **Constraint**: only a day to build it, no UI, free forever, one user.
- **10x / 0.1x**: ten times bigger or ten times smaller in scope, price or audience.
- **Borrow**: how another field or product solves the same shape of problem.
- **Who else**: another person with this problem, and what they'd need.
- **Second order**: what happens after it works: the next problem, the abuse case.
- **Combine**: merge two earlier ideas into one.

## Narrowing

When the user asks to narrow, stop generating. Rank the directions they liked, give each its strongest case and its riskiest assumption, and recommend one.

## Wrap-up

When the user says "wrap up" or "done", end with this summary and nothing after it:

```markdown
**Seed:** <the original sentence>
**Where it ended:** <the sharpened idea in one or two sentences>

**Liked directions**
- <one line each>

**Parked ideas**
- <worth keeping, not pursued now>

**Riskiest assumptions**
- <what has to be true for this to work, from the devil's-advocate rounds>
```
