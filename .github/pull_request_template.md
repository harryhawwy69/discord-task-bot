Fixes #

<!--
  Put the number of your issue after "Fixes #". A maintainer must assign
  that issue to you BEFORE you open this pull request. If not, a workflow
  closes the pull request automatically. See "Making a change" in
  CONTRIBUTING.md.
-->

## What changed

<!-- One or two sentences. -->

## Why

<!-- The problem this solves. -->

## How I tested it

- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] New logic has a test (pure functions in `src/lib/` or `src/roost/joinGate.ts`-style modules)
- [ ] Tried it on my own test server (for anything that talks to Discord)

<!-- For anything visible in Discord, add a screenshot. -->

## Checklist

- [ ] No tokens, IDs from the real server, or `.env` contents in this PR
- [ ] Nothing grants `Neighbor` except the join button
