# Contributing

Issues and pull requests are welcome. Please describe the calendar convention involved and include a source or a reproducible date example for behavior changes.

Before opening a pull request, run `pnpm install --frozen-lockfile`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. Add regression tests for boundary behavior. Keep core functions timezone-free and avoid native `Date` objects in public results.
