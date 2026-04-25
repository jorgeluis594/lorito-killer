# Repository Guidelines

## Project Structure & Module Organization

Lorito Killer is a multi-tenant POS app built with Next.js, TypeScript, Prisma, PostgreSQL, Redis, Tailwind CSS, and shadcn/Radix UI. Routes live in `src/app`, including tenant routing under `src/app/[subdomain]` and APIs under `src/app/api`.

Feature code is organized by domain in `src/{feature}` such as `product`, `order`, `customer`, `table`, `document`, and `cash-shift`. Common files include `components/`, `db_repository.ts`, `api_repository.ts`, `actions.ts`, `use-cases/`, and `types.ts` or `schemas/`. Shared utilities live in `src/lib`, shared components in `src/shared`, shadcn UI in `src/ui`, assets in `public`, schema and migrations in `prisma`, and docs in `docs`.

## Build, Test, and Development Commands

- `npm install`: install locked dependencies.
- `cp .env.example .env`: create local settings; configure database, Redis, auth, and provider secrets.
- `npm run dev`: start the Next.js development server.
- `npm run worker`: start the BullMQ worker from `src/worker.ts`.
- `npm run build`: deploy migrations, generate Prisma client, and build production assets.
- `npm run build:dev`: build without deploying migrations.
- `npm run start`: run the production Next.js server.
- `npm run prisma:deploy`: deploy migrations and generate Prisma client.
- `npm run lint`: run ESLint across the repository.

## Coding Style & Naming Conventions

Use TypeScript with `strict` enabled and the `@/*` alias for `src/*`. Follow existing 2-space indentation, keep feature modules domain-focused, and prefer server components unless interactivity requires `"use client"`. Use kebab-case for most component filenames (`customer-selector.tsx`) and snake_case where the module already does (`department_selector.tsx`). Keep Prisma access in `db_repository.ts`, client network calls in `api_repository.ts`, and tenant data isolated by `companyId`.

## Testing Guidelines

No automated test script is currently configured. Before submitting changes, run `npm run lint` and, for behavior changes, `npm run build:dev`. If adding tests, place them near the feature they cover and use clear names such as `validate-table-action.test.ts`.

## Commit & Pull Request Guidelines

Recent commits use short conventional-style prefixes such as `feat:`, `fix:`, `refactor:`, and `Chore:`. Keep subjects imperative and specific, for example `fix: preserve table session waiter`. Pull requests should include a concise description, affected areas, validation commands, linked issue when available, and screenshots for UI changes.

## Security & Configuration Tips

Do not commit `.env` or production secrets. After changing `prisma/schema.prisma`, generate a migration with `npx prisma migrate dev` and regenerate the Prisma client. Treat document generation, tax submission, payments, and tenant isolation as high-risk paths.
