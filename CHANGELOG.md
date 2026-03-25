# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [2.1.0] - 2026-03-23

### Added
- `FetcherState.Stale` status for stale-while-revalidate semantics
- `stale(ref)` — mark query as stale without immediate fetch; refetches on next proxy access
- `refetch(ref)` — mark stale and fetch immediately, returns `Promise`
- `ensure(ref)` — resolve with cached data or wait for fetch (test-friendly)
- `retry(ref)` — retry from `Error` state

### Changed
- `invalidate` now transitions to `Stale` instead of `Idle`, preserving existing data during refetch
- `produce` skips listener notification when Immer returns the same reference (no-op recipe)

### Fixed
- Re-entrancy loop when `invalidate` triggers synchronous proxy access chain
- Data cleared to `undefined` on fetch error — now preserves last successful data

### Migration

No breaking changes. `invalidate(ref)` behavior is backward-compatible.

For finer control, new APIs are available:

```typescript
queryClient.stale(ref);                    // lazy invalidation
const data = await queryClient.refetch(ref); // eager refetch
const data = await queryClient.ensure(ref);  // ensure data available
queryClient.retry(ref);                    // retry after error
```

## [2.0.2] - 2026-03-20

Initial release.
