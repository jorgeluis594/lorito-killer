# Template for the technical document

The technical document is a draft in `docs/drafts/<concept>-technical.md`, written in Spanish following the [Documentation](../documentation/SKILL.md) skill, and describes only the current design. Sections marked as constant always go in; optional ones only when the feature needs them. No content is invented to fill a section: if it does not apply, it is omitted.

It contains no product definition (what each role sees, screen texts, visible business rules): that is in `docs/drafts/<concept>.md` and is linked. It contains no implemented code: the snippets are design contracts.

## Style

- Title with the pattern "<Tema>: diseño técnico".
- Below the title, one **Estado** line ("diseño cerrado, pendiente de implementación" or "borrador con preguntas abiertas"), the product document it starts from and the base branch or commit.
- Impersonal voice, declarative present. Subjects: "la acción", "el caso de uso", "el repositorio", "el job", "el worker".
- Each decision asserts and closes the alternative: "El job recibe `printJobId`. No recibe el contenido de la comanda."
- Code names in backticks: `submitOrderRound`, `TablePaymentInput`, `src/table/payment-repository.ts`. File paths relative to the repo.
- TypeScript snippets only for contracts: input types, dependencies, errors, unions, Zod schemas. No function bodies unless the algorithm is the decision.
- Tables for decisions (`| Tema | Decisión |`), current state (`| Pieza | Ubicación | Estado |`), changes per file (`| Archivo | Cambio |`), retries (`| Situación | Decisión |`) and observability (`| Evento | Nivel | Dónde | Campos |`).
- Decisions are asserted without a marker. Assumptions are marked: "Supuesto: …". What depends on the founder goes in the questions block, never disguised as a decision.
- No history of discarded decisions. Reorganizing never loses detail.

## Technical document skeleton

```markdown
# <Tema>: diseño técnico

**Estado:** <diseño cerrado, pendiente de implementación | borrador con preguntas abiertas>. Basado en `docs/drafts/<concept>.md`. Base: <branch or commit>.

## 1. Objetivo técnico                  (constant)
## 2. Decisiones                        (constant)
## 3. Estado actual verificado          (constant)
## 4. Brechas que cierra este diseño    (constant)
## 5. Casos de uso                      (constant)
## 6. Dominio y tipos                   (constant)
## 7. Persistencia                      (when the Prisma schema or data access changes)
## 8. Bordes de aplicación              (when server actions, route handlers or pages change)
## 9. Jobs, realtime e integraciones    (when there is a BullMQ job, a broadcast, printing or an external service)
## 10. Interfaz                         (when components or client state change)
## 11. Transacciones y concurrencia     (when there are writes with effect)
## 12. Organización del código          (constant)
## 13. Observabilidad                   (constant)
## 14. Pruebas                          (constant)
## 15. Límites y verificaciones durante la implementación (constant)
## 16. Plan de implementación           (constant)
## 17. Pendientes y preguntas           (only while they exist; removed when closed)
## 18. Preguntas decididas por la revisión (only when a review gate answered the questions)
```

## Section guide

### 1. Objetivo técnico
Five lines: what the system does when done, from which input to which effect. A `text` diagram of entities or of the flow between browser, server action, database, worker and printer when there are more than two pieces.

### 2. Decisiones
Table `| Tema | Decisión |` with everything the founder might want to change: technical scope, which branch resolves what, what is deferred (with its task link if the founder had one created), chosen libraries, feature flags, initial values. It is the section read first.

### 3. Estado actual verificado
Table `| Pieza | Ubicación | Estado |` of what exists and is reused or modified: use cases, repositories, actions, schemas, permissions, Prisma models, migrations, jobs, broadcasts, routes, components. With file paths and, when it matters, the commit. What was not verified in the code is marked as an assumption.

### 4. Brechas que cierra este diseño
Numbered list of what the code lacks to meet the defined behavior. Each gap is referenced from the section that closes it.

### 5. Casos de uso
One entry per use case, new or modified, with: name, owning feature, file under `use-cases/`, `input`, trusted context (`companyId`, user and role, resolved at the edge), injected dependencies (each with its `response<T>` signature), output, expected failures (message and `type` when the caller decides by it), and the flow as a numbered list (load, verify, apply rule, write, return). Existing ones that change are listed separately with the exact change.

### 6. Dominio y tipos
New or modified types in `types.ts` with their justification in one line. Discriminated unions and type guards. State machine or transitions if there is a lifecycle. Zod schemas for external input. Table `| Capa | Tipos y autoridad |` when the feature crosses layers.

### 7. Persistencia
New or modified Prisma models, fields, enums, unique constraints and indexes (with `companyId` leading tenant-scoped composite indexes), relations, and the migration name. Whether the migration is additive or rewrites data, how it behaves on existing production rows and whether it locks large tables. Repository functions in `db_repository.ts` with their tenant scope.

### 8. Bordes de aplicación
Server actions (`actions.ts` with `protectedAction({ resource, action })`), route handlers and pages that change: permission required, Zod schema of the input, what is taken from the session and never from the client (`companyId`, actor, totals), `revalidatePath` targets, and the user-facing message for each expected failure.

### 9. Jobs, realtime e integraciones
BullMQ jobs (domain queue, name, payload with ids, idempotency, retries, what the handler calls), realtime broadcasts (channel, event, who listens), printing through the Print Gateway, electronic invoicing and other external services. What happens in each failure window (table `| Ventana de falla | Qué pasa | Efecto para el usuario |`).

### 10. Interfaz
Table `| Archivo | Cambio |` for components, client state, hooks and `api_repository.ts`. Which shared components from `src/shared/components/ui` are reused. Stories added or updated. How the screen reacts to stale data and realtime updates.

### 11. Transacciones y concurrencia
Numbered list of the transaction step by step: tenant scope, isolation level, lock, re-reads under the lock, checks, writes, commit, retry on serialization conflict. What each lock guarantees and what happens with two simultaneous operations (two waiters on one table, a cashier charging while a round is sent). Duplicate policy.

### 12. Organización del código
What goes in `types.ts`, `schema.ts`, `use-cases/`, `db_repository.ts`, `actions.ts`, `jobs.ts` and `components/` of each feature touched, per the Architecture Design skill. Map of new and modified files. Capabilities one feature exposes to another.

### 13. Observabilidad
Table `| Evento | Nivel | Dónde | Campos |` for `log.<level>(event, data)` from `src/lib/log.ts`. Fields as a JSON list of names. What is never logged.

### 14. Pruebas
`test("…")` titles grouped by level: unit in `src/<feature>/__TEST__/` (rules, use cases with fakes, schemas), integration in `tests/integration/` (repositories, actions and flows with a real database, concurrency). At the end, pending manual checks (printer, Print Gateway, SUNAT sandbox, a real device during service).

### 15. Límites y verificaciones durante la implementación
What the design explicitly leaves out and why; what must be verified when implementing (a library version, a Postgres behavior, a printer limit).

### 16. Plan de implementación
The slices implementation agents take, in the format of the skeleton below. There is no separate tasks document.

### 17. Pendientes y preguntas
Only the open questions with the founder, in the format of Step 11 of the guide. Removed when closed.

### 18. Preguntas decididas por la revisión
Only when the questions were answered by a review gate of the implement-task skill. Each question with its answer, who decided it, the reason and the discarded alternatives. It stays until the founder approves the final pull request and is not promoted into the permanent doc.

---

## Implementation plan skeleton

Section 16 of the technical draft. Implementation agents take it as their definition.

```markdown
## 16. Plan de implementación

### Orden y paralelismo
Waves: which tasks run in parallel after which. Example: Ola 1: T0. Ola 2: T1 y T2 en paralelo. Ola 3: T3.

### T0. <Minimal blocker: Prisma migration, shared type or schema>
**Alcance:** …
**Fuera de alcance:** …
**Criterios de aceptación:**
1. <scenario with data and observable result>
**Pruebas:** <titles from section 14>
**Archivos:** <files it owns, so parallel tasks do not collide>
**Depende de:** nada.

### T1. <Complete verifiable flow>
**Alcance:** …
**Fuera de alcance:** …
**Criterios de aceptación:** …
**Pruebas:** …
**Archivos:** …
**Depende de:** T0.

### Verificación final
Manual or on-device checks that close the feature. Their results go in the pull request description, not in the draft.
```

Rules: a task covers a probable end-to-end flow, not a file or a layer; blockers are isolated in the smallest possible task; only one task in the plan creates Prisma migrations per wave, so parallel branches do not produce conflicting migrations; each task names the tests from section 14 it must leave green and the files it owns; deferred items with risk link their task when the founder had one created.
