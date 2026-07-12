---
name: mvilla-execute
description: >-
  Scribe-repo only. Execute an mvilla-plan (or compatible plan) on a feature
  branch: clarify gaps, move the linked GitHub issue to In Progress, implement
  TDD tasks, then open a PR linked to the ticket. Use when the user runs
  /mvilla-execute.
disable-model-invocation: true
---

# /mvilla-execute

Load a written plan, clarify anything unclear, implement on a **feature
branch**, keep the linked ticket moving, and finish by opening a PR linked to
that ticket.

**Announce at start:** "I'm using the mvilla-execute skill to implement this
plan."

Companion to [`.cursor/skills/mvilla-plan/SKILL.md`](../mvilla-plan/SKILL.md).
For bite-sized TDD steps and verify gates, also honor root `AGENTS.md`.

## Non-negotiable rules

1. **Never implement on `main`/`master`.** Create or check out the plan’s
   feature branch before the first code change. If already on `main`, stop and
   create the branch first.
2. **Clarify before coding.** Unclear steps, missing acceptance criteria,
   contradictory tasks, or unresolved decisions → ask the user (with a
   recommended default). Do not guess.
3. **Ticket hygiene.** If the plan cites a GitHub issue, move it to
   **In Progress** before implementation starts.
4. **TDD + verify.** Follow the plan’s test-first steps. Before declaring
   done, run `npm run verify` (or the plan’s verification section).
5. **PR is automatic.** When implementation is complete and verify passes,
   push the branch and create a PR that links the issue — do not wait to be
   asked (unless the user explicitly said not to open a PR).

## Workflow

```
- [ ] 1. Load plan; resolve issue link / plan path
- [ ] 2. Critical review — list clarifying questions; wait if blockers
- [ ] 3. Create/check out feature branch (never main)
- [ ] 4. Move linked ticket to In Progress
- [ ] 5. Execute tasks (TDD); use parallelism map when dispatching work
- [ ] 6. Run verification (`npm run verify`)
- [ ] 7. Push branch and open PR linked to the issue
- [ ] 8. Report PR URL + remaining follow-ups
```

### Step 1 — Load plan

- Read the plan file or the plan content from the conversation
- Extract: goal, branch name, issue number/URL, tracks, parallelism map,
  acceptance criteria
- If no plan is attached, ask for the path or paste

### Step 2 — Clarify anything unclear

Review critically. Raise questions when:

- A step is ambiguous or missing concrete files/tests
- Architecture or UX choices were left open
- The issue and plan disagree
- Dependencies in the parallelism map look wrong

Batch questions with recommended defaults. **Do not start Step 3 until
blockers are resolved** (user may accept all recommendations at once).

Update the plan document only if the user wants the clarifications recorded;
otherwise proceed with the agreed answers.

### Step 3 — Feature branch

Use the plan’s **Execution branch** section. If missing, derive
`feat/<n>-<short-slug>` from the issue or goal.

```bash
git fetch origin
git checkout main   # or confirmed base
git pull
git checkout -b feat/<n>-<short-slug>
```

If the branch already exists locally or on the remote, check it out / track it
instead of recreating.

**Scribe worktrees:** if isolation is needed, use the project
`using-git-worktrees` skill / `./scripts/git-worktree-add.sh` so `.env.local`
is synced — still on the feature branch, never main.

Refuse to proceed if HEAD is `main`/`master` and the user has not allowed an
exception.

### Step 4 — Move ticket to In Progress

When an issue is linked:

1. Confirm issue number from the plan header
2. Set status to **In Progress**:
   - If the issue is on a GitHub Project with a Status field, set that field
     to `In Progress` (`gh project item-edit` / GraphQL / MCP as available)
   - Else apply or create an `in progress` label
   - Else comment: `Starting work on this in \`feat/<branch>\`.`
3. Do not close the issue here — the PR link closes it on merge when using
   `Fixes`/`Closes`

If there is no linked issue, skip and note “no ticket to update.”

### Step 5 — Execute

- Create a TodoWrite list from plan tasks
- Follow each task’s TDD order (failing test → implement → pass → commit when
  the plan says to)
- Honor the **Parallelism map**: independent tracks may run via parallel
  subagents; dependent tracks wait
- Stop immediately on blockers, repeated verify failures, or unclear
  instructions — ask rather than invent

### Step 6 — Verify

```bash
npm run verify
```

Fix failures before opening the PR. Match any extra checks listed in the plan.

### Step 7 — Open PR linked to the ticket

After verify passes:

1. Push: `git push -u origin HEAD`
2. Create the PR with `gh pr create` (or GitHub MCP). Body must include a
   closing keyword when an issue exists:

```markdown
## Summary

- <1–3 bullets of what shipped>

## Test plan

- [ ] <from acceptance criteria>

Fixes #<n>
```

Use `Fixes #<n>` or `Closes #<n>` so merge closes the issue. Link the full
issue URL in the summary if useful.

3. If the repo has a PR template, fill it and still include `Fixes #<n>`.

### Step 8 — Report

Return:

- Branch name
- PR URL
- Issue status note (moved to In Progress; will close on merge)
- Anything deferred / out of scope

## When to stop and ask

**STOP when:**

- Plan or issue is missing critical info
- On `main` without a feature branch
- Verification fails repeatedly for the same reason
- Ticket cannot be updated and the user required it
- A step would expand scope past the plan’s non-goals

## Remember

- Feature branch first, always
- Clarify → then code
- Ticket → In Progress before implementation
- Parallelism map guides concurrent work
- PR linked with `Fixes #N` is part of done — not optional
