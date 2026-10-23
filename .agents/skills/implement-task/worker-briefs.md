# Worker briefs

Each spec is self-contained: the worker has no conversation history. Replace `<...>`. Write in English or Spanish, as the documents are written. Keep the common block identical across workers of a run.

## Common block (prepend to every spec)

```text
CONTEXT: Lorito Killer, a Next.js 16 + React 19 + TypeScript multi-tenant POS for restaurants and bars (Prisma on PostgreSQL, BullMQ worker). Read AGENTS.md and follow it; read PRODUCT.md for users and principles and DESIGN.md before any UI change. Use happy-memory-recall before designing (if memory is not initialized, say so and continue); happy-memory-maintainer before reporting when business rules or contracts change; the architecture-design skill for where code goes and implement-vitest-tests for tests. Documents: docs/drafts/<topic>.md (product), docs/drafts/<topic>-technical.md (design and implementation plan, normative). Integration branch: jorgeluis594/<topic>.
CONSTRAINTS: Work only in your worktree and branch. Do only your task; sibling tasks run in parallel on other branches, so keep edits to shared files minimal and say which ones you touched. Do not merge, rebase, push, use git stash or open PRs. Do not edit AGENTS.md, PRODUCT.md, DESIGN.md, skills or unrelated files. Do not commit generated artifacts (.impeccable/review/*.png, logs, Playwright output, .orca/ reports) or .env. Never run prisma migrate reset, prisma db push or destructive SQL except against your own database below; never touch the main development database or production. Never delete Docker networks, volumes or containers; if Docker or the database fails, report it with `ask`.
QUESTIONS: If the design is ambiguous or wrong, or you are blocked after two attempts, ask the coordinator with the `ask` command of your preamble instead of guessing.
TEST ISOLATION: Your .env already points to your own database (DATABASE_URL=.../lorito_killer_<topic>_tN), BULLMQ_JOB_PREFIX=<topic>-tN and PORT=31N0; check them before running anything. Apply migrations with `npx prisma migrate deploy && npx prisma generate`. Run tests with `npm test` (or `npm test -- <path>` for a focused run). ECONNREFUSED noise from Redis in tests is harmless.
```

## Product writer

Use only CONTEXT and the first two sentences of CONSTRAINTS from the common block; this worker writes documents, not code.

```text
TASK: define <task, or issue/Todoist id> at the product level following the Product skill (.agents/skills/product/SKILL.md), and write docs/drafts/<topic>.md. Do not implement.
KNOWN CONTEXT: <three-line summary of what the task asks, what exists and what is out of scope>.
REPORT (worker_done): document path, the "Questions" block and the "Decided unless objected" list exactly as the skill delivers them. Do not ask the founder anything yourself; the coordinator takes the questions to the review gate.
```

Later rounds: `ROUND <K>: address these observations from the coordinator: <numbered list>. Report as before.` Closing: `REVIEW ANSWERS (approved by the review gate, act on them as the founder's answers): <answers and accepted suggestions>. Close the document as in step 6 of the Product skill (skip the source task; the coordinator updates it), keeping every question in «Preguntas decididas por la revisión» with its answer, who decided it, the reason and the discarded alternatives, and commit it. Report the commit.`

## Architecture writer

Same restrictions as the product writer.

```text
TASK: design docs/drafts/<topic>.md (closed product definition) following the Architecture skill (.agents/skills/architecture/SKILL.md), and write docs/drafts/<topic>-technical.md including its implementation plan. Do not write a tasks document. Do not implement, create migrations or code files.
The implementation plan must show the waves (which tasks run in parallel after which) and give each task scope, out of scope, acceptance criteria, test titles, the files it owns and dependencies. Only one task per wave may create a Prisma migration.
REPORT (worker_done): the path, the "Questions" block and the "Decided unless objected" list. Do not ask the founder anything yourself.
```

Rounds and closing as for the product writer, following step 6 of the Architecture skill.

## Gate reviewers

All four use the same frame with their own FOCUS. Use only CONTEXT and the first two sentences of CONSTRAINTS from the common block.

```text
REVIEW-ONLY TASK: you are the <role> reviewer of <docs/drafts/<topic>.md | docs/drafts/<topic>-technical.md>. You replace the founder's approval, so review as the person accountable for the result. Do not edit or commit.
Read the draft in full, the guide of its skill (<.agents/skills/product/product-guide.md | .agents/skills/architecture/SKILL.md and its guide>), PRODUCT.md, the documents it builds on<, docs/drafts/<topic>.md for architecture> and the code it touches. Use happy-memory-recall for prior decisions.
CHANGE MAP: <coordinator's change map>.
QUESTIONS FROM THE WRITER: <block>. DECIDED UNLESS OBJECTED: <list>.
FOCUS: <role focus below>.
REPORT: write gate-<product|architecture>-<role>-rK.md with (1) numbered findings: section, blocker or suggestion, what is wrong or missing and why it matters, never the rewording; (2) per question: your answer and reason; (3) objections to the decided list. worker_done --outcome succeeded with "APPROVED" when there are no blockers, otherwise --outcome failed with "REJECTED"; --report-path <file>.
```

FOCUS per role:

- **UX/UI:** every flow is complete for each role and the device it uses (waiter's phone or tablet, kitchen or bar display, cashier terminal, owner's phone or laptop), with entry points, empty, loading, error and success states; it works during live service (glanceable, one main action, few taps, touch targets of at least 44 px, readable at a distance on fixed displays); the user always knows what happened and what to do next; Spanish copy is clear and consistent with existing screens; reuses components from src/shared/components/ui and follows DESIGN.md; accessibility (labels, contrast, focus, never color alone); nothing asks for more steps or data than the goal needs.
- **Product:** the definition solves the task's problem for a restaurant or bar and respects the principles in PRODUCT.md; every role, permission, state and failure has its behavior, consistent with src/authorization/permissions.ts; acceptance criteria are verifiable; scope is the smallest that delivers value, with what is left out and its meeting point; no contradiction with memory, current docs or business rules; edge cases with money, cash shifts, stock, electronic documents (SUNAT), printing and company isolation.
- **Design:** every product behavior and acceptance criterion maps to a use case, test title and plan task; layering per the architecture-design skill (framework-agnostic use cases returning response<T>, actions as edges with protectedAction and session-derived companyId, db_repository as the only Prisma boundary, Zod at boundaries); jobs per docs/asincronia.md; transactions, isolation, locks and idempotency; tenant isolation by companyId in every query; migrations safe for existing production data; observability; the plan's waves and file ownership let tasks run in parallel without touching the same files, with at most one migration per wave.
- **Performance:** for every read and write path, the queries it issues: N+1 patterns (queries inside loops, per-row lookups, Prisma includes in lists), missing or wrong indexes for each filter, join, sort and uniqueness rule, including companyId-leading composite indexes; unbounded lists without pagination; over-fetching (select only what the screen uses); work inside transactions that holds locks during service (external calls, printing, SUNAT inside a transaction); serializable retries that can storm; locking migrations on large tables; server component and client payload size, request count and realtime reload fan-out per screen.

## Implementer

```text
TASK: T<N> "<title>" of the implementation plan in docs/drafts/<topic>-technical.md. Read its Alcance, Fuera de alcance, Criterios de aceptación, Pruebas and the design sections it references, and implement exactly that.
ALREADY MERGED IN YOUR BASE: <tasks and commits, or "nothing">.
RUNNING IN PARALLEL: <sibling tasks and the files they own>.
METHOD: write the listed tests first, then the code. Commit per logical unit with concise feat:/fix: messages.
ACCEPTANCE: `npm run lint` passes; `npx tsc --noEmit` adds no errors over the base (list the pre-existing ones); `npm test` passes, including tests/integration when persistence, actions or concurrency changed; Storybook stories updated when a shared component changed.
REPORT (worker_done): branch, commits, each check command with its result, migrations created, deviations from the design with the reason, known debt. Use --files-modified.
```

## Reviewer

```text
REVIEW-ONLY TASK for T<N> in this worktree (branch <topic>-tN). Validate, do not edit or commit.
Review `git diff jorgeluis594/<topic>...HEAD` against T<N> in the implementation plan of docs/drafts/<topic>-technical.md and the design:
(a) scope and every acceptance criterion; (b) correctness and failure cases, especially money calculations; (c) security: tenant isolation by companyId in every query, permissions via protectedAction, nothing trusted from the client (companyId, actor, totals), validation at boundaries; (d) migrations safe for existing data; (e) declared deviations; (f) AGENTS.md and the architecture-design skill; (g) UI follows DESIGN.md when touched; (h) tests cover the listed titles and meaningful failures.
Run lint, typecheck and the task's tests yourself against this worktree's database.
COORDINATOR NOTES — deviations declared by the implementer: <list>.
REPORT: write review-tN-rK.md with numbered findings (file:line, blocker or suggestion, and whether it is a design finding). worker_done --outcome succeeded with "APPROVED" when there are no blockers, otherwise --outcome failed with "REJECTED"; --report-path review-tN-rK.md.
```

## Fix round

```text
ROUND <K> for T<N>. Apply only these findings from review-tN-r<K-1>.md, verifying each against the current code first: <numbered list>. Do exactly this and nothing more.
<If the base moved:> First run `git merge jorgeluis594/<topic>` and `npx prisma migrate deploy` against your database.
Then rerun: <exact commands>. REPORT as in the implementer task, per finding: fixed or why not.
```

## Final verifier

```text
VERIFY the integration branch jorgeluis594/<topic> in this worktree. Do not edit application code.
Run `npx prisma migrate deploy && npx prisma generate` against this worktree's database, then `npm run lint`, `npx tsc --noEmit` (compare with the base) and `npm test`. Then walk every acceptance criterion of docs/drafts/<topic>.md and say for each where it is satisfied or that it is missing.
<If the branch touches UI:> SCREENSHOTS: seed test data in this worktree's database, run the app with `npm run dev` on PORT=<port> (NEXTAUTH_URL=http://<test-subdomain>.localhost:<port>) and, with the playwright-cli skill, sign in with each affected role and capture every new or changed screen and state (empty, error and success included) at 1440 px and 390 px wide when the role uses both, as PNG into <scratchpad>/screenshots/ named <role>-<screen>-<state>-<width>.png. Do not commit them. Never show real customer data, RUCs or billing credentials.
REPORT: each command with its result, each criterion with its evidence, the screenshot files with a one-line caption each, and the failures with file:line, written so the coordinator can paste it into the PR description. --outcome failed if anything fails or is missing.
```

## Documentation

Use only CONTEXT and the first two sentences of CONSTRAINTS from the common block.

```text
TASK: promote docs/drafts/<topic>.md and docs/drafts/<topic>-technical.md following the Documentation skill (.agents/skills/documentation/SKILL.md): rewrite their still-valid rules and decisions, as implemented on this branch, into the permanent doc of the concept in docs/ (update the existing one without losing detail, in Spanish), update PRODUCT.md or DESIGN.md only if the skill requires it, then delete both drafts. Commit. Do not edit application code.
REPORT (worker_done): permanent doc path, what was rewritten and what was left out and why, the commit.
```

## CI fixer

```text
CI FAILED on PR #<n> (branch jorgeluis594/<topic>). Read `gh run view <run-id> --log-failed`, reproduce locally against your own database, fix the cause (not the test, unless the test is wrong, which you must justify), and commit. Do not push.
REPORT: cause, fix, commits and the commands that now pass.
```
