# Repository Guidelines

## Project Structure & Module Organization

Lorito Killer is a Next.js 16, React 19, and TypeScript point-of-sale application. Routes live in `src/app`, including tenant dashboards under `[subdomain]`. Domain modules such as `src/product`, `src/order`, and `src/customer` own their components, schemas, types, repositories, actions, and `use-cases` where applicable. Keep domain logic within its feature; reuse UI from `src/shared/components/ui` and infrastructure from `src/lib`.

Prisma schema and migrations live in `prisma/`; static assets belong in `public/`. Background processing starts at `src/worker.ts`. Design documentation lives in `docs/design`, with component stories beside UI components.

## Build, Test, and Development Commands

- `npm ci`: install locked dependencies; use the Node version in `.node-version`.
- `docker compose up --build`: start the local application, PostgreSQL, Redis, and worker after creating `.env` from `.env.example`. Startup applies migrations automatically.
- `npm run dev`: run the web development server with configured backing services.
- `npm run build:dev`: build the application without deploying migrations.
- `npm run build`: deploy Prisma migrations, generate the client, then build; verify the target database first.
- `npm run lint`: run ESLint with Next.js Core Web Vitals rules.
- `npm test`: run Vitest once.
- `npm run storybook`: open component development on port 6006.

## Coding Style & Naming Conventions

Use strict TypeScript, two-space indentation, semicolons, and double quotes, matching surrounding code. Prefer `@/` imports for `src/`. Use PascalCase component names, camelCase functions, and descriptive kebab-case filenames for new components and use-cases; preserve existing local conventions. Prettier is available for formatting. Keep changes focused and reuse existing helpers.

## Testing Guidelines

Place feature tests in `src/<feature>/__TEST__/`, named `*.test.ts` or `*.test.tsx`; Vitest also accepts `*.spec.*`. Its default environment is Node. Run a focused test with `npm test -- src/order/__TEST__/calculate-order-item-totals.test.ts`. Cover changed behavior and relevant failure cases, especially money calculations and authorization. No coverage threshold is configured. CI runs `npm ci` and `npm test` for pull requests.

## Commit & Pull Request Guidelines

Follow history's concise prefixes: `feat:`, `fix:`, and `docs:`. Describe the concrete change. Pull requests should explain the problem, resulting behavior, and validation; link relevant issues and include screenshots for visual changes. Call out migrations and configuration changes. Never commit credentials or `.env` contents.
