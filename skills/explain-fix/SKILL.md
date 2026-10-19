---
name: explain-fix
description: After a fix, post a short plain-language comment on the related GitHub issue — what was wrong, why, and how it was fixed.
disable-model-invocation: true
---

Write a **plain-language comment** for the people who reported or follow the issue, usually non-developers (sales, management, the client), and post it on the GitHub issue. It explains three things: what was wrong, why it happened, and how it is fixed now.

`$ARGUMENTS` may name the issue (`#123`, a URL) or add context. Otherwise, take the issue from the conversation, the current PR body (`Closes #N`) or the branch's commit messages.

## Steps

1. **Find the issue.** Resolve its number and repo, and read it with `gh issue view <n> --comments`. Find the PR that fixes it (`gh pr list --search "<n>" --state all`). Done when you have the issue, its existing comments, and the fix PR, or you know there is no PR yet.
2. **Collect the substance.** From the conversation, the PR description and the diff, work out:
   - **the symptom**, as the reporter saw it. Use their numbers or screenshots when they exist ("the dashboard showed 645.000 kr, the report 715.000 kr").
   - **every distinct cause**, ordered by how much of the symptom it explains.
   - **the fix for each cause**, described by what the user will see change.
   - **what can still differ or is left for later**, so nobody reads the comment as "everything is now identical".

   Use only what the work established. A cause that was suspected but never confirmed goes in as "presumably" or is left out. Done when every cause the fix addresses has a symptom-level explanation.
3. **Draft** using the format below.
4. **Post** with `gh issue comment <n> --body-file <file>`. If an earlier explain-fix comment is already on the issue, add a new comment that covers only what changed. Do not restate the earlier one. Reply with the comment URL.

## Format

Write in the issue's language. If it is unclear, write Danish. Aim for about 150–300 words.

```
## <The question the issue asks, as one heading>

<One or two sentences: the symptom with concrete numbers, and how many causes there were.>

**1. <Cause, in the user's words>**
<Why the numbers or behaviour differed. 2–4 sentences.>

*Rettelse:* <What works differently now, as the user will see it.>

**2. …**

**Det du stadig kan se** <or the equivalent in the issue's language>
- <Remaining difference or follow-up, and why.>

Rettelserne ligger i #<PR>. <What to expect after deploy.>
```

## Plain language

The reader knows the product, not the code. Name things by what they are called in the UI ("månedskortet", "rapporten", "kurven") and describe effects ("the month card counted only the days that had passed").

- **Code stays out:** no file, class, function, column or table names, and no SQL, cache keys, endpoints or ADR numbers.
- **Translate domain terms the first time** if the reader might not know them: "betaling per klik (CPC)".
- **Show it with an example** when a mechanism is abstract: "on 19 October only 19 of 31 days were included".
- **Be honest about uncertainty.** If it hasn't been verified on production yet, write it as an expectation ("bør vise", "should show"), not as a fact.
