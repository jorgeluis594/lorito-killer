---
name: architecture-design
description: Design Lorito Killer feature architecture using the repo's current conventions. Use when deciding whether to create a new feature folder, where to place domain types, schemas, use-cases, repositories, actions, components, tests, or cross-cutting code, and when reviewing or planning architecture changes without coupling guidance to current domain entities.
---

# Architecture Design

## Core Rule

Organize domain code by feature, not by technical layer and not by one folder per database model. A feature is a cohesive business capability under `src/<feature-name>`. An entity is a persisted model or domain concept that may live inside a feature, but an entity alone does not require a new feature folder.

Use kebab-case for new feature folders. Keep legacy casing only where the local feature already uses it.

## When To Create A Feature

Create `src/<feature-name>/` when the change introduces a business capability with its own language, rules, workflows, or ownership boundary.

Prefer an existing feature when the behavior mainly extends an existing capability, uses the same invariants, or is only a sub-flow of that capability.

Do not create a feature for:

- a generic helper, adapter, hook, or UI primitive;
- a single route page with no domain rules;
- a database table that has no independent behavior yet;
- reusable presentation-only code.

Place truly cross-cutting code in `src/lib`, `src/shared`, or `src/ui` only when it has no feature-specific business vocabulary.

## Feature Shape

A feature may contain only the files it needs. Use this structure as the default:

```txt
src/<feature>/
  types.ts                # domain types, discriminated unions, type guards
  schema.ts or schemas/   # Zod validation for external input
  use-cases/              # business rules; pure or dependency-injected
  db_repository.ts        # Prisma access, queries, transactions, mapping
  api_repository.ts       # client-side API/action adapter when needed
  actions.ts              # protected Server Actions and server-side wiring
  components/             # feature UI and presentation state
  __TEST__/               # unit tests near the feature
```

Use `use-cases/` for new code unless the feature already uses `use_cases/`.

## Layer Boundaries

Keep use-cases framework-agnostic. They receive explicit inputs, return `response<T>`, and import no Next.js, Prisma, cache, sessions, route handlers, UI, queues, or concrete repositories. Inject repositories, gateways, and side-effect functions through parameters.

Use `actions.ts`, jobs, route handlers, or workers as application edges. They handle auth, permissions, trusted `companyId`, Zod validation, transaction orchestration, revalidation, broadcasts, queues, and dependency wiring.

Keep `db_repository.ts` as the Prisma boundary for the feature. It must enforce tenant scoping with `companyId` for tenant-aware reads and writes and return domain shapes when the domain differs from Prisma models.

Keep `api_repository.ts` as a client adapter only. It should not contain business rules.

Keep `components/` focused on UI and presentation state. Delegate persistence and domain rules to actions or API repositories.

## Transversal Hierarchy

- `src/app`: Next.js App Router routes, layouts, pages, and route handlers. Treat it as a delivery layer, not the home of domain logic.
- `src/lib`: cross-cutting infrastructure and utilities with no feature-specific business vocabulary.
- `src/shared`: reusable application components and shared UI/layout pieces that are not owned by one feature.
- `src/ui`: shared UI types or design-system-level primitives when present in the repo.
- `prisma`: persisted entity definitions and migrations. Do not mirror Prisma models directly into feature folders unless the feature owns behavior around them.
- `public`: static assets.
- `docs`: project documentation and architecture notes.

## Style Defaults

Prefer functional domain code: small functions, explicit data, composition, and dependency injection. Avoid new service classes for domain behavior.

Validate external input with Zod at the boundary. Use `safeParse` and controlled `response<T>` errors for expected business failures. Reserve `throw` for impossible states or programming errors.

Keep side effects outside the use-case core. For external integrations, define an injected gateway interface or function and wire the concrete implementation at the application edge.
