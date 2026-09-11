# Server-compatible table skeleton columns

## Design

Products and stock adjustments will follow the cash shifts pattern: each server page defines a local `skeletonColumns` array containing only the table metadata needed by `DataTableSkeleton`. The interactive tables continue using their existing client-side columns.

This keeps client component references out of server-rendered Suspense fallbacks while preserving headers, alignment, and mobile roles. Validation consists of the existing shared table tests plus linting the changed pages.
