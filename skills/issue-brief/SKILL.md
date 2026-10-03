---
name: issue-brief
description: Capture what we just discussed as short issues to be specced later, then optionally create them with gh.
disable-model-invocation: true
---

Turn the current conversation (an idea, a bug, a decision, a tangent worth keeping) into one or more **briefs**: short issues that hold the idea so it can be specced later. A brief records what was said. It does not design the solution. Speccing happens later, in a separate pass.

The source is the conversation so far. `$ARGUMENTS`, if given, narrows it ("the export idea", "the two bugs we found") or adds context.

## Steps

1. **Harvest.** Read back through the conversation and list every distinct piece of work it surfaced. For each one, note the *what*, the *why*, and anything already decided or ruled out. Use only what was actually said; mark anything you'd be guessing as an open question. Done when every work item in scope is listed.
2. **Split.** One brief per independently shippable piece of work. Merge items that only make sense together; split items someone could pick up separately. If the split is a judgement call, put the proposed list to the user via `AskUserQuestion`.
3. **Draft** each brief using the format below. If the repo has a GitHub remote, first run `gh issue list --limit 15 --state all` and match the title style used there.
4. **Cut.** Go through each brief sentence by sentence and keep only what a future specer would otherwise lose: context, intent, decisions, open questions. Done when you can't remove a line without that.
5. **Show** all briefs in fenced blocks, then use `AskUserQuestion` to offer: *Create with gh* (recommended when there is a GitHub remote), *Adjust*, or *Done, I'll copy them*.
6. **Create** if chosen: for each brief, write the body to a temp file and run `gh issue create --title "<title>" --body-file <file>`. Add a label only when an existing one (`gh label list`) clearly fits, such as `needs-spec` or `idea`. Reply with the issue URLs.

## Title

- 50–70 characters, sentence case, no trailing period.
- **Task/feature:** start with an imperative verb and a concrete object: `Add CSV export to invoice list`.
- **Bug:** describe the symptom and its trigger: `Checkout total ignores discount when cart has one item`.
- Name the specific screen, endpoint, or component. Swap vague verbs (*fix*, *improve*, *update*) for what actually changes.

## Body

Include only the sections the conversation gives you material for. Most briefs come in under 100 words.

```markdown
<1–3 sentences: what and why, in plain words. Lead with the user or business impact.>

**Decided**
- <choices already made in the conversation>

**Open questions**
- <what the spec has to answer>

**Notes**
<links, file paths, related issues, things explicitly ruled out>
```

- **Open questions** is the hand-off to speccing. Every gap, assumption, or unresolved choice from the conversation ends up here as a question.
- For bugs, add the repro steps and expected vs. actual behaviour if the conversation established them.

## Example

Conversation: a discussion that ran from a Sentry error into ideas about invoices.

```markdown
Title: Let clients download invoices as PDF from the portal

Clients email asking for invoice copies every month. A download button in the client portal removes that manual step.

**Decided**
- Reuse the existing e-conomic PDF; don't generate our own

**Open questions**
- Only paid invoices, or drafts too?
- Does the portal need auth changes so clients see only their own invoices?

**Notes**
Came up while debugging the Sentry "invoice not found" error, possibly related.
```
