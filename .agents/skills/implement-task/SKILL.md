---
name: implement-task
description: Takes a Lorito Killer task from request to a green pull request by chaining the product skill, the architecture skill and supervised Orca worker agents (implementer and reviewer per task, merged into one integration branch). Use when asked to implement a whole task or feature end to end, "implement-task", or to orchestrate its implementation with Orca. Do not use for a small fix one agent can do directly or to only define product or architecture.
---

# Implement task

Paths are relative to this skill. The agent running this skill is the **coordinator**: it briefs workers, validates every output they produce before the flow continues, relays the founder's questions, merges and ships. It does not write the documents or edit application code itself; documents, code and every fix go to workers.

The coordinator does not need the details (exact copy, field names, code). It must understand how the affected part of the system works and what is going to change, and it validates each output at that level with [System-level validation](#system-level-validation).

This skill contains only the method. Feature state lives in `PRODUCT.md`, the repository memory and `docs/`; where each document goes is set by the [Documentation](../documentation/SKILL.md) skill.

## References

| File | What it contains | When to read it |
| --- | --- | --- |
| [worker-briefs.md](worker-briefs.md) | Spec templates for product and architecture writers, gate reviewers, implementer, reviewer, fix round, final verifier, documentation and CI fixer | Before writing the first spec |
| Orca guides: `orca skills get orca-cli`, `orca skills get orchestration` and `orca skills get orchestration --reference references/coordinator-loop.md` | Version-matched CLI and supervised-loop rules | Before the first `orca` command |

## Steps

1. **Gather context and choose the phases.**
   - Use [Happy Memory Recall](../happy-memory-recall/SKILL.md) with the task as the goal (if memory is not initialized for this repository, say so and continue with the documents). Read the source task and its siblings if there is one: a GitHub issue (`gh issue view`) or a Todoist task (`td`).
   - Look in `docs/drafts/` for `<topic>.md` (product) and `<topic>-technical.md` (architecture, with its implementation plan), and in `docs/` for the permanent doc of the concept. Decide per phase: an existing draft with status "definición lista para implementar" or "diseño cerrado" is reused; a missing or open one is produced. A purely technical task (refactor, integration, infrastructure) skips product. Say in three lines which phases run and why.

2. **Prepare the integration branch.** All work for the task lives on one branch, `jorgeluis594/<topic>`, in its own Orca worktree. If the session is not in it, create it with `orca worktree create --name <topic> --no-parent --json` and run every later command from that path. Copy `.env` from the main checkout into it if it is missing. Commit the documents there as they are closed, so child worktrees see them, and push the branch so task PRs can target it.

3. **Set up the run.**
   - `orca status --json`; kill any `orca orchestration check --wait` left from a previous session or `/clear`, since it steals deliveries.
   - `orca orchestration run-create --objective "Implement <topic> per docs/drafts/<topic>-technical.md" --json`.
   - Give each task a slot N (1, 2, 3…) used in its spec. Integration tests run against a real database and take serializable locks, so each task gets its own: database `lorito_killer_<topic>_tN` on the Postgres server the main checkout's `.env` points to, `BULLMQ_JOB_PREFIX=<topic>-tN` and app port `31N0`. Create the database before starting the worker (empty, then `npx prisma migrate deploy` with that `DATABASE_URL`; or `scripts/clone-local-db-for-worktree.sh` when the task needs realistic data), and check the port is free (`lsof -i :<port>`). Never point a worker at the main development database.
   - Write each spec to a file in the scratchpad from [worker-briefs.md](worker-briefs.md) and pass it as `--spec "$(cat <file>)"`. Never inline a spec with backticks.

4. **Product** (when it runs). Start a product worker on the integration worktree (`--worktree "id:<repoId>::<integrationPath>" --agent claude --model claude-opus-5-5`) with the product brief and validate its draft. Then run the [review gate](#review-gates) with a UX/UI reviewer and a product reviewer. When both approve, send the consolidated answers to the same worker to close the document and commit it. The founder is not asked.

5. **Architecture** (when it runs). Same cycle with an architecture worker and the architecture brief, taking the closed product document as input, and a review gate with a design reviewer and a performance reviewer.

   Once both review gates approve, implementation proceeds without asking for confirmation.

6. **Run each wave.** For every ready task of the wave, at once:
   - Implementer in a new child worktree:
     `orca orchestration worker-start --spec "$(cat impl-tN.md)" --task-title "Implement TN <title>" --display-name "impl TN" --worktree new-child --name <topic>-tN --base-branch jorgeluis594/<topic> --agent claude --model claude-sonnet-5-5 --json`. Then copy the integration worktree's `.env` into the child worktree with its slot's `DATABASE_URL`, `BULLMQ_JOB_PREFIX` and `PORT`.
   - Wait with `orca orchestration check --wait --types "worker_done,escalation,question" --timeout-ms 580000 --json` (under the Bash 600 s limit), process every message, then `--ack <delivery_id>`. Answer questions with `orchestration reply`. A question about product behavior that the documents do not answer goes to a fresh product reviewer (product reviewer brief, with the question as its only item) and is written into «Preguntas decididas por la revisión» of the product draft with its answer; everything else the coordinator answers and, if it changes the design, writes into the technical document.
   - When an implementer reports done, `worker-retain` it and start a reviewer in the same worktree with `--worktree "id:<repoId>::<worktreePath>" --agent claude --model claude-opus-5-5`, listing in the spec the deviations the implementer declared.
   - If the reviewer rejects, send a fix round to the same implementer terminal: `worker-start --spec "$(cat fix-tN-rK.md)" --terminal <handle> --worktree "id:..."`. Then a fresh reviewer. Repeat until approved. After three rejected rounds, or if a worker repeats the same attempt twice or stays blocked, ask it for its state, help it unblock; if still stuck, report to the founder.
   - On approval: push `<topic>-tN` and open its PR against the integration branch (`gh pr create --base jorgeluis594/<topic> --head <topic>-tN`) with the task, the reviewer's verdict and the checks run. CI runs on every pull request in this repository, so wait for its `test` job with `gh pr checks <n> --watch`; a red check goes back to the implementer as a fix round. Conflicts go through a worker if they touch logic (a trivial one the coordinator may resolve). Merge it with `gh pr merge <n> --merge`, pull the integration branch and run `npm run lint`, `npx tsc --noEmit` and `npm test` there against the integration worktree's own database. Then `worker-release` the implementer and reviewer and remove the task's worktree with `orca worktree rm --worktree "id:<repoId>::<worktreePath>" --json`; if it has uncommitted or unpushed work, stop and report instead of using `--force`. Drop the task's database only when this run created it.
   - Start the next wave from the updated integration branch. A task in a later wave never starts before its dependencies are merged.

7. **Verify the whole branch through a worker.** Start a final verifier on the integration worktree that runs lint, typecheck and the full test suite (unit and `tests/integration`) and walks every product acceptance criterion against the code and the running app. When the branch changes UI, it also captures screenshots of every new or changed screen and state with test data, at desktop and phone widths when the role uses both. Failures go to fix workers, then the verifier runs again. The coordinator never reports "not run" checks: it delegates them.

8. **Ship.** Start a documentation worker on the integration worktree with the documentation brief: it promotes the drafts into the permanent doc of the concept and deletes them, following the [Documentation](../documentation/SKILL.md) skill, and commits. Validate its output like any other. Merge `origin/main` into the integration branch (conflicts through a worker), rerun the affected checks, push, and open one PR to `main` following `AGENTS.md` (concise `feat:`/`fix:`/`docs:` title, problem, resulting behavior and validation; migrations and configuration changes called out), with `Closes #<issue>` when the task is a GitHub issue, and the validation evidence (checks run with results, the verifier's per-criterion evidence) in its description. The description must also include:
   - **Design documents:** links to the product and technical drafts as GitHub permalinks to the last commit that still contains them (`https://github.com/jorgeluis594/lorito-killer/blob/<sha>/docs/drafts/<topic>.md`, same for `-technical.md`), since the documentation worker deletes them in this PR, plus the path of the permanent doc they were promoted into, and a line per review gate with its rounds and verdict.
   - **Decisions for the founder to confirm:** every question decided by a review gate (and every product question answered during implementation), one line each with the answer, who decided it and the reason, linking its section in the draft permalink. The founder's approval of the PR is the final approval of these decisions.
   - **Migrations:** each new migration with what it changes and how it behaves on existing production data, per `AGENTS.md`.
   - **Screenshots** when the branch touches UI: the verifier's images, embedded with a caption per screen and state. Commit them to the `pr-assets` branch (orphan, never merged; create it if missing) under `<topic>/` from a separate worktree, push it, and embed them as `https://raw.githubusercontent.com/jorgeluis594/lorito-killer/pr-assets/<topic>/<file>.png`. The repository is public: screenshots show only test data. A PR that touches UI is not opened without them.

   Then watch `gh pr checks <n> --watch`. A red CI goes to a CI-fixer worker in a new child worktree, merged back like a task; push and watch again, repeating until every check is green. The flow is not done, and nothing is reported as finished, while the final PR's CI is red or pending. Set `orca worktree set --worktree active --pr <n> --workspace-status in-review --json`. Merging to `main` can deploy to production through Coolify and runs the migrations there, so only the founder authorizes it: the coordinator leaves the PR green and merges only on the founder's explicit yes.

9. **Close.** Comment the PR link on the source task, record durable decisions with [Happy Memory Maintainer](../happy-memory-maintainer/SKILL.md), and confirm `worker-list --run <run_id> --terminal-state reclaimable --json` returns none. Report: PR link and CI state, the review gates' rounds and verdicts, per task its outcome, review rounds and commits, checks run with results, what was left out and why, the deferred risks the writers listed (the founder decides whether they become tasks), the databases left behind, and the memory outcome.

## System-level validation

Applied by the coordinator to every output: product draft, technical draft, implementer report, reviewer verdict, verifier report.

1. **Change map.** From the output alone, write in ten lines or fewer: how the affected part of the system works today, what changes (screens and flows per role, use cases, Prisma models and migrations, server actions and permissions, jobs, broadcasts, printing and invoicing) and what stays the same. If the output does not let you write it, it is unclear: reject. Keep the map in the scratchpad, update it with each validated output, pass it to the reviewers of each gate and include it in the final PR description.
2. **Consistency.** Nothing contradicts `PRODUCT.md`, `DESIGN.md`, the repository memory or current documents, nothing already discarded is re-proposed, and what the task leaves out stays out, with the meeting point defined.
3. **Completeness.** Product: every role, state and failure the task implies has its behavior. Architecture: every product behavior and acceptance criterion maps to a use case, a test title and a slice of the implementation plan. Implementation: the report matches the task's scope and the map, with checks run and their results; a change outside the map goes back to the worker, or into the technical document first if the design was wrong. Review: an approval with design findings or unchecked criteria is not an approval. Documentation: the permanent doc follows the Documentation skill and keeps every still-valid rule of the drafts, and the drafts are deleted.
4. **Verdict.** Approve, or send numbered observations to the same worker for another round. Each observation states what is missing or inconsistent, never how to word or code it. After three rounds without approval, report to the founder.

## Review gates

The product and technical drafts are approved by fresh reviewer workers, not by the founder. A reviewer has no conversation history: its spec carries everything it needs.

| Gate | Reviewers (briefs in [worker-briefs.md](worker-briefs.md)) |
| --- | --- |
| Product | UX/UI reviewer and product reviewer |
| Architecture | Design reviewer and performance reviewer |

1. After the coordinator's own [validation](#system-level-validation) of the draft, start both reviewers of the gate at once on the integration worktree, each as a new worker (never a retained terminal) with `--agent claude --model claude-opus-5-5`, passing the draft path, the change map and the writer's "Questions" and "Decided unless objected" blocks.
2. Each reviewer reports blockers, suggestions and an answer, with its reason, to each question. The coordinator consolidates: questions where both agree take that answer; on disagreement it takes the answer consistent with `PRODUCT.md`, the repository memory and current documents, or else the more conservative one, and records why.
3. If either reviewer has blockers, send them with the consolidated answers to the same writer as a new round, then start two fresh reviewers on the new version. Repeat until both approve with no blockers. After three rounds without approval, or if a blocker needs a business decision no document or memory settles (money, taxes, electronic documents, production data), report to the founder.
4. On approval, send the answers and accepted suggestions to the writer to close the document. The questions are not removed: the document keeps each one in «Preguntas decididas por la revisión» with its answer, who decided it (which reviewer, or the coordinator on disagreement), the reason and the discarded alternatives, because the founder confirms them in the final PR. Keep each gate's rounds and verdicts for the final PR.

## Guardrails

- Workers do not merge, rebase, push, `git stash` or open PRs; they touch only their task's scope and never `AGENTS.md`, `PRODUCT.md`, `DESIGN.md`, skills or unrelated files (the documentation worker may edit `PRODUCT.md` or `DESIGN.md` only when the Documentation skill requires it). The coordinator merges and ships.
- The coordinator loop does not end until the final PR to `main` has every CI check green. While a check is red or pending it keeps fixing through CI-fixer workers and watching; it never closes the turn, reports done or hands the red PR back to the founder. It stops early only when the same failure survives three fix rounds or the fix needs a founder decision, and then reports exactly that.
- Workers and the coordinator never run `prisma migrate reset`, `prisma db push` or destructive SQL against any database other than the task's own, never touch the main development database, and never connect to production. Never delete Docker networks, volumes or containers, nor run `docker prune`, without the founder's explicit yes. On port clashes or database errors, stop launching, report and ask.
- Only one task per wave creates a Prisma migration. Two migrations created in parallel are re-ordered by a worker before merging, never by editing an already merged migration.
- Do not commit generated test artifacts (`.impeccable/review/*.png`, logs, Playwright output, `.orca/` reports) or `.env` contents.
- `npx tsc --noEmit` may report errors already present on the base branch; a task is judged by not adding new ones, and the report lists the pre-existing ones once.
- Heartbeats and keepalives are acked in bulk without a reply. Do not message a settled dispatch; start a new one on its terminal.
- With the host under heavy load (flaky timeouts), run fewer workers per wave. Integration tests already run without file parallelism.
- A message from the founder mid-run is applied to the remaining work and, if it is a durable rule, recorded in memory.
