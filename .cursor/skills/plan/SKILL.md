---
name: plan
description: >-
  Produce a test-driven, design-aligned implementation plan for a feature or
  change. Use when the user runs /plan or asks for a plan, design, or approach
  before writing code. Prioritizes TDD, follows the repo's AGENTS.md design
  guidelines, parallelizes work, refuses to assume, and always outputs a design
  summary plus acceptance criteria mapped to tests.
disable-model-invocation: true
---

# /plan

Turn a feature request into a TDD-first implementation plan. The plan is a
document, not code — do not edit source files while planning. Switch to Plan
mode if available.

## Non-negotiable rules

1. **No assumptions.** If a requirement, edge case, scope boundary, or design
   choice is unclear, STOP and ask the user. Never silently pick a behavior.
   Every question must carry a recommended default ("I'd recommend X because
   …") so the user can confirm in one step. Batch open questions with the
   `AskQuestion` tool when available; otherwise list them and wait.
2. **TDD first.** The plan is organized around tests. For each behavior, the
   failing test comes before the implementation that makes it pass
   (red → green → refactor). Every acceptance criterion maps to at least one
   named test.
3. **Follow AGENTS.md.** Read the root [`AGENTS.md`](../../../AGENTS.md) and any
   scoped `AGENTS.md` for directories the change touches (`src/editor`,
   `src/data`, `src/store`, `e2e`, `src-tauri`, …). Honor design guidelines,
   architecture boundaries, naming/format conventions, and the testing
   baseline. Call out any constraint the plan must respect.
4. **Parallelize.** Structure implementation so independent work runs
   concurrently. Identify what is independent vs. sequential and group tasks
   into parallel tracks; only serialize on real dependencies.
5. **Always output the required sections.** The plan MUST include a Design
   Summary and an Acceptance Criteria → Tests table (see template).

## Workflow

```
- [ ] 1. Restate the goal in one sentence; confirm it with the user
- [ ] 2. Read root AGENTS.md + scoped AGENTS.md for affected areas
- [ ] 3. Explore the codebase to ground the design in existing patterns
- [ ] 4. List ALL open questions/ambiguities; ask the user (with recommendations)
- [ ] 5. Wait for answers — do not proceed past unresolved blockers
- [ ] 6. Write the plan using the template below
- [ ] 7. Verify the plan against the checklist
```

**Step 1 — Goal.** Restate the request precisely. If the request itself is
ambiguous, that is your first clarifying question.

**Step 2 — Read the rules.** Read the root `AGENTS.md` and each scoped
`AGENTS.md` covering directories you expect to touch. Extract the design
guidelines, architecture boundaries, and testing baseline that constrain the
solution.

**Step 3 — Explore.** Inspect the relevant code so the design reuses existing
patterns, tokens, components, and data/store layers rather than inventing new
ones. Prefer the `explore` subagent or semantic search for unfamiliar areas.

**Step 4–5 — Clarify (no assumptions).** Enumerate every ambiguity: unclear
requirements, scope edges, error/empty/loading states, data shape, UX/visual
decisions, migration/compat concerns, and non-goals. Ask the user, each
question paired with a recommended default and a one-line rationale. Do not
write the plan until blockers are resolved (the user may accept all
recommendations at once).

**Step 6 — Write the plan.** Use the template. Lead every implementation unit
with its test. Mark parallelizable tracks explicitly.

**Step 7 — Verify.** Run the final checklist before presenting.

## Output template

```markdown
# Plan: <feature name>

## Design summary

<2–5 sentences: what we're building, the chosen approach, and why. Name the
key components/files involved and how they fit the existing architecture.>

**AGENTS.md constraints honored**

- <design guideline / boundary / convention this plan respects>
- <…>

**Decisions confirmed with user**

- <question> → <resolved answer> (recommended: <default>)

## Acceptance criteria → tests

| #   | Acceptance criterion (observable behavior) | Test(s)       | Type                   | File             |
| --- | ------------------------------------------ | ------------- | ---------------------- | ---------------- |
| AC1 | <user-visible behavior>                    | `<test name>` | unit / component / e2e | `<path>.test.ts` |
| AC2 | <edge / error / empty case>                | `<test name>` | …                      | `<path>`         |

## TDD implementation strategy

Each task: write the failing test(s) first, then the minimal code to pass, then
refactor. Tasks within the same track are parallelizable; tracks are ordered by
dependency.

**Track A (parallel) — <area>**

- [ ] A1. Test `<name>` (AC1) → implement <thing>
- [ ] A2. Test `<name>` (AC2) → implement <thing>

**Track B (parallel) — <area>**

- [ ] B1. Test `<name>` (AC3) → implement <thing>

**Track C (depends on A, B) — integration**

- [ ] C1. e2e test `<name>` (AC4) → wire together

## Risks & non-goals

- **Risk:** <risk> → <mitigation>
- **Out of scope:** <explicit non-goal>

## Verification

- [ ] `npm run verify` passes (typecheck, lint, madge, knip, format, tests, build)
- [ ] All acceptance criteria have passing tests
```

## Parallelization guidance

- Group tasks into **tracks** that share no files/state; these run concurrently
  (and may be dispatched to parallel agents during execution).
- Serialize only on genuine dependencies (e.g. integration after units land).
- Keep tracks aligned to architecture boundaries so they don't collide.

## Final checklist

Before presenting the plan, confirm:

- [ ] No unresolved assumptions — every ambiguity was raised with a recommendation
- [ ] Relevant AGENTS.md files were read; their constraints are listed
- [ ] Design summary section present and concrete
- [ ] Every acceptance criterion maps to at least one named test
- [ ] Tests precede implementation in every task (TDD)
- [ ] Independent work is grouped into parallel tracks
- [ ] Test types match the testing baseline (Vitest unit/component, Playwright e2e)
