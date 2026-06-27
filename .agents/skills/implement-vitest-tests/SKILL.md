---
name: implement-vitest-tests
description: Implement Vitest tests for Lorito Killer. Use when adding, updating, or reviewing unit tests for feature modules, use-cases, schemas, utilities, repositories, actions, or React components in this Next.js TypeScript repo. Applies the project convention that every entity or feature owns a __TEST__ folder for its tests, with integration-only flows in tests/integration.
---

# Implement Vitest Tests

## Core Convention

Place entity-owned tests in a `__TEST__` folder at the root of the entity or feature module:

```txt
src/
  table/
    __TEST__/
      validate-table-action.test.ts
      open-table-session.test.ts
    use-cases/
      validate-table-action.ts
      open-table-session.ts

  order/
    __TEST__/
      calculate-order-item-totals.test.ts
      cancel.test.ts
    use-cases/
      calculate-order-item-totals.ts
      cancel.ts
```

Use `tests/integration/` only for flows that cross several entities, touch external systems, or are not owned by one feature:

```txt
tests/
  integration/
    order-flow.test.ts
    table-session-flow.test.ts
  helpers/
    factories.ts
    test-data.ts
```

Do not use scattered `__tests__` folders, root-level unit tests, or test files beside source files unless the user explicitly asks for a different layout.

## Workflow

1. Inspect the feature structure before writing tests. Identify the entity root, source file, dependencies, and existing patterns.
2. Create or reuse `src/<entity>/__TEST__/`.
3. Name tests after the source behavior: `source-file.test.ts` for TypeScript logic and `source-file.test.tsx` for React components.
4. Prefer unit tests for pure use-cases, schemas, validators, helpers, and utility functions first. They give the best signal with the least setup.
5. Mock boundaries, not the behavior under test. Mock Prisma/db repositories, Redis, queues, NextAuth, external APIs, tax providers, payment providers, and browser-only APIs.
6. Run the narrowest useful command first, then broader validation if the change is risky.

## Vitest Style

- Import test APIs explicitly from `vitest`; do not rely on globals.
- Prefer `test(...)` consistently over mixing `test` and `it`.
- Use `describe` for the module or exported function. Keep nesting shallow.
- Use behavior-focused names: `returns false when moving from CLOSED to OPEN`.
- Use `test.for` for case matrices.
- Keep arrange, act, assert readable inside each test.
- Avoid permanent `test.only`, `test.skip`, and broad snapshots.
- Use `beforeEach` for per-test state and `afterEach` for cleanup.
- Clear or restore mocks between tests, especially when using `vi.spyOn`, fake timers, stubbed globals, or changed env values.

Example:

```ts
import { describe, expect, test } from "vitest";
import { getTransitionError, isValidTransition } from "../use-cases/validate-table-action";

describe("isValidTransition", () => {
  test.for([
    { from: "OPEN", to: "BILL_REQUESTED", expected: true },
    { from: "OPEN", to: "CLOSED", expected: false },
    { from: "CLOSED", to: "OPEN", expected: false },
  ] as const)("$from -> $to returns $expected", ({ from, to, expected }) => {
    expect(isValidTransition(from, to)).toBe(expected);
  });
});

describe("getTransitionError", () => {
  test("returns null for a valid transition", () => {
    expect(getTransitionError("OPEN", "BILL_REQUESTED")).toBeNull();
  });
});
```

## Environment Selection

The repo's default Vitest environment is `node`. Keep it for:

- use-cases
- validators
- schemas
- repositories tested with mocked dependencies
- utility functions
- server-only code

Use a browser-like environment only for tests that render React components or require DOM APIs:

```ts
// @vitest-environment jsdom
```

For React component tests, use Testing Library patterns:

- Prefer `screen.getByRole`, `getByLabelText`, and visible text over implementation details.
- Use `userEvent.setup()` and `await user.click/type/selectOptions(...)` for interactions.
- Avoid assertions against CSS classes unless visual state is the actual contract.
- Do not unit-test async Server Components with Vitest; prefer E2E for those paths.

## What To Test

For use-cases and pure functions, cover:

- successful path
- invalid inputs
- domain errors
- boundary values
- tenant isolation inputs such as `companyId` when relevant
- side-effect calls when dependencies are mocked

For schemas and validators, cover:

- valid payloads
- required fields
- coercion or transforms
- localized/domain error messages when they are part of behavior

For repositories and actions, prefer mocking at the boundary unless the user asks for integration tests. Treat document generation, tax submission, payments, and tenant isolation as high-risk paths and add broader coverage when touched.

## Commands

Use the available scripts:

```bash
npm run test
npm run lint
npm run build:dev
```

For focused local runs, pass the test path through npm:

```bash
npm run test -- src/table/__TEST__/validate-table-action.test.ts
```

If `vitest` is not found, dependencies are not installed; run `npm install` before validating.
