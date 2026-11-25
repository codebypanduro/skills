---
name: to-deck
description: Turn an agreed plan into a visual slide deck that walks it A to Z. Use when the user asks for a visual presentation, deck or slides of a plan, issue, spec, ADR or grilling outcome.
---

Build a Slides artifact (claude-artifacts MCP) that tells the plan as a **journey**: one thing travelling through the system from start to finish, then what it earns or costs, how it's run, and how we get there. The reader is a colleague who missed every meeting, and the deck has to stand alone for them.

## 1. Gather the source

Read everything the plan lives in. Don't ask the user for facts you can look up:

- the issue and every sub-issue, with comments (`gh issue view <n> --comments`);
- the ADRs and glossary or `CONTEXT.md` terms the plan names;
- decisions settled in this conversation (a grilling round counts);
- the code, only where a slide states how something works today.

Done when you can list every **decision** in the source, and every gap or contradiction between sources (an ADR missing a rule the issues cite, for example).

## 2. Outline the arc

Fit the source to this arc. Drop beats it has no material for, and add beats it needs:

1. **Cover**: the plan's name, a one-line promise, and the dates of its decisions.
2. **Why**: today versus after, as two cards.
3. **Vocabulary**: one card per domain term, colour-coded by group (configured, created per run, money). The footer explains the colours.
4. **Journey overview**: the steps in a row, lettered A, B, C… Every later step slide carries its letter in the eyebrow.
5. **One slide per step**: a code or JSON panel when the step is an API, numbered gates when it's validation, a timeline of pills when it's retries.
6. **Outcomes**: a table of scenarios × what each one yields (revenue, payout, status).
7. **Operations**: how a person runs it day to day, as numbered steps ending in the action they take.
8. **Migration**: old flow dashed and new flow solid, converging on one model.
9. **Gates**: a statement slide on the accent colour with the conditions that must all hold.
10. **Roadmap**: a table of issue × what lands × what it starts after.
11. **What was settled**: the newest decisions on a dark slide. Include it when this conversation added any.

Done when every decision from step 1 has a slide, and every slide traces back to a source.

## 3. Build it

1. Call `list_types` and pick **Slides**. Read `describe_type`: its instructions plus `fonts.md`, `format.md`, `deck-files.md`, and `diagrams.md` when a slide pins boxes and connectors. Those files are the format's source of truth. Follow them over anything here.
2. Look for a design system with `list_artifacts` (type "Design System"). If one is marked default, use it. If there are none, use the look in [STYLE.md](STYLE.md).
3. Call `create_from_type` once. Write `project/deck.json` and one file per slide into `<scratchpad>/deck/project/`, then publish them all in one `publish_files` call (mode `patch`).
4. Don't render or re-read the deck after publishing. The type forbids it unless the user asks.

Content rules while writing:

- Write the deck in the source's language.
- Example payloads, names and figures are **illustrative**: say so in the footer. Give no statistic the source doesn't hold.
- Put caveats, rationale and open questions in the `<aside>` speaker notes. Note any gap you spotted while writing there too.
- Bold the terms the slide is about. Inline `<b>`, `<i>` and `<span style="color">` take no other styling: a `style` on `<b>` is dropped.

## 4. Hand over

Reply with:

- the link;
- the outline, one line per section;
- every gap or contradiction found in step 1, or while writing, that the user hasn't seen yet. These are often worth more than the deck.
