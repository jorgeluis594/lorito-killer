# Reusable components in Storybook

## Scope

Add Storybook stories for every React component exported from
`src/shared/components/ui`. Exclude `time-picker-utils.tsx`, which only exports
utility functions, and application components tied to routing, authentication,
server data, or feature state.

## Approach

- Keep Storybook's existing Next.js Vite configuration and global stylesheet.
- Place colocated CSF stories beside the components they document.
- Use local fixtures and small stateful render functions for interactive inputs.
- Group primitives from the same source module in one story file.
- Add no addons, production abstractions, or network-backed mocks.

## Verification

Run `npm run build-storybook`. A successful static build proves Storybook can
discover, type-check, and render the complete reusable-component catalog.
