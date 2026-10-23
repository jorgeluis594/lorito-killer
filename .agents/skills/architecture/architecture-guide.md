# Guide for defining architecture in Lorito Killer

This guide describes how the technical side of a feature is defined from a behavior definition: which use cases exist, which data is stored, how it is typed, which layer does what, how consistency is guaranteed, how features connect, what runs in the background, what is tested and what is logged. It does not describe the current state of the code or decisions already made: that comes from the repository memory, `AGENTS.md`, the [Architecture Design](../architecture-design/SKILL.md) skill, `docs/asincronia.md`, `docs/impresoras.md`, `prisma/schema.prisma` and the current documents in `docs/`.

It is used by walking through the steps in order. Each step has rules with an example and, when it helps, what is not done. The examples are illustrative: they show the shape of the decision, not how Lorito Killer is built today.

Stable context: Lorito Killer is one Next.js App Router application in TypeScript, with tenant dashboards under `src/app/[subdomain]`, organized by business features under `src/<feature>` (types, schemas, use cases, `db_repository.ts`, `actions.ts`, components and `__TEST__/`), Prisma on PostgreSQL with company isolation by `companyId`, server actions protected by role permissions, a BullMQ worker in `src/worker.ts`, realtime broadcasts per company and printing through the Print Gateway. Fallible operations return `response<T>` from `src/lib/types.ts`. External input is validated with Zod. Everything else is verified.

---

## Step 1. Start from the code, not the idea

**1.1 The design opens with the verified current state and the gaps.**
Before proposing, list which pieces exist (use case, repository, action, schema, permission, Prisma model, job, broadcast, route, component), where they are and in what state, with the reference commit or branch. Then list the gaps the design closes. A design that does not name what exists proposes things that are already there.
- Example: "`submitOrderRound` exists in `src/order/rounds/db_repository.ts` and broadcasts to the kitchen after commit; no use case moves items between table sessions."
- Do not: propose a new print pipeline when print jobs already go through `src/printing/jobs`.

**1.2 The existing module, pattern and flow are reused as is.**
If a capability already exists (`withinTransaction`, `protectedAction`, `createDomainQueue`, the realtime broadcaster, the printing jobs, the tax dispatch outbox, feature flags), it is used with its current usage flow. A new parameter, a special limit or a "for this case" variant needs a written reason; if there is none, it is not added.
- Example: a new background step is a job declared with `domainQueue.job(...)` in the feature's `jobs.ts` and registered in `src/worker.ts`, not a `setTimeout` in a server action.

**1.3 A library's default behavior wins over a custom adaptation.**
If a library (NextAuth, Prisma, BullMQ, Next.js caching) already solves the case with its native flow, that flow is adopted. Adapting it requires a nameable risk the native flow does not cover.

**1.4 What memory or a current document records as discarded is not proposed again.**
Neither under another name nor as "option B". If there is a new reason, it goes to the questions block once, with the reason.

**1.5 When in doubt about the model, compare with a market reference.**
Before choosing between two data models, look at how a mature POS in the same domain solves it and note the conclusion in one line.

---

## Step 2. Name the intentions before the infrastructure

**2.1 First list the business use cases; infrastructure is a consequence.**
The document names each complete intention with a business verb: `sendOrderRound`, `payTable`, `cancelOrderItem`, `closeCashShift`, `issueDocument`, `reprintKitchenTicket`. Then the repositories, actions, jobs and routes those intentions need are derived.
- Do not: a file tree with repositories and actions without saying which business intention uses them.

**2.2 A use case receives explicit input, trusted context and injected dependencies.**
Input carries only the operation's data. The trusted context (`companyId`, the acting user and role) is resolved at the edge from the session, never from the client. Dependencies (repository functions, gateways, clock, id generator) come in as parameters, so the use case imports no Next.js, Prisma, session, cache, queue or concrete repository (see the Architecture Design skill).

```ts
export type CancelOrderItemInput = Readonly<{ orderItemId: string; reason: string }>;
export type CancelOrderItemContext = Readonly<{ companyId: string; userId: string; role: UserRole }>;
export type CancelOrderItemDependencies = Readonly<{
  findOrderItemForUpdate: (id: string, companyId: string) => Promise<response<OrderItemWithKitchenState | null>>;
  saveCancellation: (cancellation: OrderItemCancellation, companyId: string) => Promise<response<null>>;
  now: () => Date;
}>;
export async function cancelOrderItem(input: CancelOrderItemInput, context: CancelOrderItemContext, deps: CancelOrderItemDependencies): Promise<response<OrderItemCancellation>>
```

**2.3 Every dependency returns `response<T>`; valid absence is success with `null`.**
No dependency throws for expected failures or returns a bare value. `throw` is reserved for impossible states and programming errors.

**2.4 Dependencies are named by intention, not by channel or technology.**
`sendToTaxEntity`, not `postToFactpro`; `enqueuePrintJob`, not `bullAdd`. The provider, the template and the transport live in the adapter.

**2.5 Expected failures carry a message for the user and, when the caller decides by it, a stable `type`.**
The message is in Spanish and names the remedy. A caller that branches on the failure uses the `type` (extending the `ErrorResponse["type"]` union when needed), never the text of `message`. Technical errors are translated in the adapter into a message without provider details.

**2.6 The use case returns domain shapes, not the UI projection.**
It returns the order, the payment or the shift as the feature's types define them. Components and actions build what the screen shows.

**2.7 An interface is left stable so future modules only add.**
If a total will be fed by items, delivery and discounts, the type exposes `itemsTotal` and `total` from the start and each module adds its part; the signature does not change when the next one arrives.

**2.8 No intermediate states or steps are created to wait for another branch.**
What another branch resolves is integrated at the end on the meeting contract; no "pending" state is added in the meantime.

---

## Step 3. Type strongly and validate at runtime

**3.1 Exact types, inferred from schemas where input is external.**
Input that crosses a boundary (form data, server action arguments, route handler bodies, job payloads, Print Gateway and invoicing responses) is validated with Zod and typed with `z.infer`. There is no DTO layer, no generic mappers and no aliases that repeat a type under another name.
- Do not: `OrderLine` as an alias of `OrderItem`; a type that duplicates a Prisma model just to rename fields.

**3.2 Each new type is justified in one line or not created.**
The document says for each new type why an existing one does not work. A type that only renames, wraps or duplicates is removed.

**3.3 One name per concept across the code.**
One concept has one name in the Prisma model, the feature types, actions and components (`Order`, not `Sale` in one place and `Order` in another). Existing local names are kept even when another would be nicer.

**3.4 Values with rules are parsed, not assumed.**
A RUC, a DNI, a document series, an amount in soles or a Lima business day is parsed with a function or Zod refinement that checks the real rule and returns a controlled failure. A regular expression alone is not a rule when the value has a check digit or a calendar.

**3.5 Variants and absence are expressed with discriminated unions, never with pairs of nulls or sentinels.**
`Fulfillment = { kind: "table"; tableSessionId } | { kind: "delivery"; address } | { kind: "takeaway" }` replaces three nullable fields. Unknown data is optional or `null`; never `0`, `""` or a fake date. In a partial update, `undefined` means "do not touch" and `null` means "remove".

**3.6 Money is computed exactly and in one place.**
Totals, discounts, taxes and change are computed by the feature's pure functions (as `calculate-order-totals` does) with the precision the existing helpers use. The client may display a total, but the recorded one is computed on the server.

**3.7 Writes are bounded to the change.**
A repository function receives the specific fields it changes, not a `Partial` of the whole entity to "update whatever comes".

**3.8 No `any`, no `as` on external data, no unexhausted discriminants.**
Prisma JSON columns, remote responses and job payloads are validated before use; invalid stored data is a data error, not an empty result.

---

## Step 4. Put each thing in its layer

The folder shape and layer boundaries are those of the [Architecture Design](../architecture-design/SKILL.md) skill. This step adds the rules a design must state.

**4.1 Domain rules are pure functions in `use-cases/` with state as input.**
Calculations, invariants, transitions and eligibility (`canCancelOrder`) receive the state and return the decision or the next state. The clock comes in as a parameter. No I/O.

**4.2 `actions.ts`, route handlers, jobs and the worker are the edges.**
They authenticate, check the permission with `protectedAction({ resource, action })`, take `companyId` and the actor from the session, validate input with Zod, orchestrate the transaction, call the use cases, revalidate paths, broadcast and enqueue. They make no business decision a use case should own.

**4.3 `db_repository.ts` is the Prisma boundary of the feature.**
Every tenant-aware read and write filters by `companyId`. The repository stores the state it receives; it does not decide the next one. It returns the feature's domain shapes when they differ from the Prisma model.

**4.4 Components render and collect; they do not implement rules.**
Feature UI lives in `src/<feature>/components`, reuses `src/shared/components/ui` and follows `DESIGN.md`. Client state holds only what the screen needs; persistence goes through actions or `api_repository.ts`.

**4.5 Logs are written where the action happens and only once.**
The edge or adapter that knows the result logs the event with `log.<level>(event, data)`; a use case is not wrapped just to log, and the same fact is not repeated in two layers. A success summary that depends on the commit waits for the real commit.

**4.6 Between features: exported functions or injected capability. Never another feature's Prisma access inline.**
A feature uses another's repository functions or use cases through their exports, or receives the capability through its dependencies. The feature that owns the complete intention coordinates; the other participates.

**4.7 The feature that owns the concept computes or renders; the generic module does not know it.**
The kitchen ticket content is built by the kitchen or printing feature that owns it; `src/lib` and the Print Gateway client only transport ESC/POS bytes and know nothing about orders.

**4.8 Pages stay thin.**
Routes under `src/app` load data through the feature and render its components. Domain logic does not live in `src/app`.

---

## Step 5. Place work in the request, the worker or the client

**5.1 The server is the authority; the client guides and recovers.**
Prices, stock, totals, permissions and tenant isolation are decided on the server. The client may compute a total to display it, but the action compares what the user saw (`expectedTotal`) with the current one and rejects with a clear message when it changed.

**5.2 Slow or retryable work goes to a BullMQ job.**
Sending documents to SUNAT, processing print jobs and reconciliations run in the worker, following `docs/asincronia.md`. The request records the intention and returns; the job carries ids, not payload copies.

**5.3 What must be durable before a job runs is written in the same transaction.**
If losing the enqueue would lose a document or a print, the pending work is recorded in the database inside the transaction (as the tax dispatch outbox does) and a reconciler retries what was not enqueued.

**5.4 Realtime broadcasts notify; they do not carry state.**
A broadcast (`broadcast(companyId, feature, event, payload)`) tells other screens to reload. Screens never apply a broadcast payload as the source of truth, and a lost broadcast only delays the update.

**5.5 Native and external pieces are minimal bridges.**
The Print Gateway and the invoicing provider expose general operations; Lorito Killer validates their input and output and keeps the rules in TypeScript.

**5.6 Secrets stay on the server.**
Billing tokens, gateway credentials and database URLs never reach the browser or a log.

---

## Step 6. Guarantee consistency

**6.1 What must happen together goes in one transaction.**
Recording a payment, issuing its document record, closing the table session and moving stock are one transaction: everything commits or everything rolls back (`withinTransaction` or `prisma().$transaction`). Partial states "reconcilable later" are not designed when a transaction avoids them.

**6.2 The isolation and lock are chosen per operation, reusing the existing helpers.**
If a decision depends on stored mutable state, the read and the write go in a short transaction with the lock it needs: row lock on the aggregate, a conditional `UPDATE … WHERE` for counters and stock, `Serializable` with a bounded retry on `P2034` when several rows decide together (as table payments do), or an `updatedAt` version check for edits made from a stale screen. No new lock system is added.

**6.3 Internal identifiers are UUIDs; human-readable ones are per-company sequences.**
A visible order or document number is a per-company counter or a SUNAT series and correlative, assigned inside the transaction that creates the record. Nothing alphanumeric or "clever".

**6.4 Duplicates: an automatic retry returns what exists; a human retry gets a clear rejection.**
A job or reconciler that repeats a creation with the same id gets success with the existing result. A person who repeats the action (double tap on **Cobrar**) gets a message that names what was already created. Database uniqueness closes the race; no request fingerprint tables.

**6.5 Idempotency in the consumer with table uniqueness, not separate deduplication state.**
Whoever persists checks by stable identity (primary key or unique index) whether it already has it. BullMQ `idempotency` is used for jobs that must not duplicate.

**6.6 Frozen copies for what was sold; current for what is instructed.**
What is part of a sale (product name and price, discounts, customer data on the document) is copied into the order or document and does not change when the catalog changes. What is an instruction (which printer a station uses) is read current.

**6.7 Effects outside the database happen after commit.**
Broadcasts, enqueues that are not covered by an outbox, and `revalidatePath` run once the transaction has committed. A failure there does not roll back the sale; it is logged and recovered by the reconciler or the next reload.

**6.8 Operational values per environment, never fixed in code.**
Batch sizes, attempts, timeouts and keys go in environment variables with a documented default ("valor inicial, ajustable"), as `DOCUMENT_TAX_DISPATCH_MAX_ATTEMPTS` does, and are added to `.env.example`.

**6.9 Migrations are safe for the data that exists.**
Check in the repository memory and with the founder whether businesses operate in production. When they do, a migration is additive first (new nullable column or table, backfill, then constraint), does not lock large tables during service hours, and the PR calls it out as `AGENTS.md` requires. Electronic documents already sent are never rewritten.

---

## Step 7. Model data and integrate features

**7.1 Between features, identifiers, never copies of another feature's state.**
A job payload, a broadcast or a cross-feature call carries ids (`{ companyId, printJobId }`); the consumer loads what it needs.

**7.2 One fact, one owner.**
The feature that persists a fact owns it; others react through its exports, a job or a broadcast. No secondary record is added to carry what the first already references.

**7.3 What belongs to the system and what belongs to each company are modeled separately.**
A global catalog (ubigeo, document types) and per-company configuration (stations, printers, wallets) are distinct models; a company model carries `companyId` and every query filters by it.

**7.4 Each concept with its own identity gets its own model.**
A delivery's recipient data is not stored as loose columns on the order if it forms a concept. Conversely, data that is only an attribute does not get a model.

**7.5 Persist the essential; the ephemeral is not stored.**
A rendered ticket, a loaded list or a filter is not persisted. The minimum to recover from doubt is stored: the job's state and what the user saw.

---

## Step 8. Define tests and observability as part of the design

**8.1 Tests are written as behavior titles, per level.**
Unit tests in `src/<feature>/__TEST__/` for pure rules, schemas and use cases with fakes; integration tests in `tests/integration/` against a real database for repositories, actions, transactions and concurrency, covering every new behavior and every money path. Each title states the situation and the observable result; no implementation is written.
- Example: `test("rechaza cobrar la mesa cuando el total cambió desde que el cajero lo vio")`.
- Do not: categories ("validation tests") or test bodies in the document.

**8.2 Concurrency is tested when two roles can act on the same thing.**
Two waiters on one table, a cashier charging while a round is sent, two payments on the same delivery: a test runs them in parallel and checks the single valid outcome.

**8.3 Manual checks are named at the end.**
What can only be verified with a real printer, the Print Gateway, the SUNAT sandbox or a device during service is listed as a pending manual check, with what is observed.

**8.4 Observability is defined as event → level → fields.**
For each critical point (business rejection, technical failure, success after commit, job retry exhausted), write the event name in `snake_case`, the level and the list of fields with the context for debugging (`companyId`, ids, `stage`, `durationMs`, `attempt`). Never customer personal data, document contents, billing tokens or credentials.

---

## Step 9. Split into tasks for agents

The split is the «Plan de implementación» section of the technical draft; no separate tasks document is written.

**9.1 A task covers a probable flow, not a file.**
Each task leaves something verifiable end to end (migration + use case + action + component + tests for that flow). Tasks are not split by layer or by file.

**9.2 Blockers are isolated in small tasks to free the rest in parallel.**
What everyone needs (a Prisma migration, a shared type, a permission) is the first task, minimal; the others declare they depend on it and run in parallel in the next wave.

**9.3 Parallel tasks own disjoint files.**
Each task lists the files it owns. Two tasks of the same wave never both edit `prisma/schema.prisma`, the same `actions.ts` or `src/worker.ts`; if they must, they go in different waves.

**9.4 Each task carries scope, out of scope, acceptance criteria and test titles.**
Criteria are concrete scenarios with data and an observable result, not categories.

**9.5 Deferred items with real risk are flagged to the founder.**
If what is left out can cause loss, duplication, a cash difference or a wrong document, the draft marks it and the delivery lists it so the founder can ask for a task; the agent creates it only if asked, and the draft links it. What is only an improvement is listed in the document.

---

## Step 10. Decide what the agent decides and what it asks

The agent decides everything routine on its own and writes it down. It asks only what changes scope, data that is kept, migrations on production data, priorities between branches, security, money or taxes, or contradicts a previous decision. It asks with a recommendation.

### The agent decides and writes it down

- **Names of use cases, types, files, jobs and events**, following the existing ones.
- **Shape of inputs, dependencies and `response<T>` failures** per Step 2.
- **Where each piece lives** per Step 4 and the Architecture Design skill.
- **Transaction, isolation and lock of each write** per Step 6, reusing the existing helpers.
- **Zod validations for input, job payloads, JSON columns and external responses.**
- **Permissions required by each action**, when they follow from `src/authorization/permissions.ts`.
- **Test titles and the fields of each log.**
- **Initial calibration values** (limits, timeouts, batch sizes, attempts), marked as "valor inicial, ajustable" and configurable per environment.
- **Split into tasks, waves and their dependency order.**
- **What is already recorded in the repository memory or in a current document.** If the task contradicts them, they prevail and it is noted.
- **Facts verifiable in the code:** whether a use case, a model, a job exists. It is verified, not asked.

### Requires the founder

- **Technical scope of the first version:** which branch resolves each part, what is deferred, whether it goes behind a feature flag.
- **Migrations that rewrite or drop existing production data**, and any change to how electronic documents are issued.
- **What is kept and in what shape** when the behavior does not resolve it: copy or current, own model or attribute, retention.
- **New permissions or role changes** not settled by the product definition.
- **Additional protection** (approvals, PINs, encryption) when there is no named risk that requires it.
- **A data model with two valid readings**, presenting both with consequences.
- **New external services or infrastructure** (a new queue, a new provider, a new deploy component).
- **Anything that contradicts a previous decision.** The contradiction is exposed and asked about; it is never reintroduced on the agent's own initiative.

---

## Step 11. Present the result

**11.1 The documents are delivered complete, with routine decisions made and visible.**
Neither a skeleton nor a list of options is delivered. Every decision the founder might want to change appears under "Decided unless objected".

**11.2 Questions go in a single block, numbered, with a recommendation.**
Each question carries the context in one line, the recommended option first with its reason, the alternatives and the consequence of each in data, migrations or effort, so it can be answered with a number.

```
Questions (answer with the option number):

1. Where is the reason for cancelling a kitchen item stored?
   (1) On the order item, with who cancelled and when. Recommended: one cancellation per item; reports read it with the item.
   (2) In its own cancellation model. Allows several cancellations per item, which the product does not define.

Decided unless objected:
- Cancelling an item uses `Serializable` with up to three retries on `P2034`.
- The kitchen display reloads on the `kitchen` broadcast; the broadcast carries no item data.
```

**11.3 A founder question like "what does X do?" or "what is X for?" is an objection.**
Answer in two lines and offer the version without X. X is not defended.

**11.4 A short message with two readings is rephrased and the agent asks which one it is.**
It is the only question asked before writing the document.
