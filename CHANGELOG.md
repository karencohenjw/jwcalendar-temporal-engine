# Changelog

## 0.2.0 — 2026-10-02

- Added a stateless HTTP API for date metadata, month and year grids, ISO weeks, and leap years.
- Added API boundary tests for leap centuries, leap days, and ISO week-year transitions.
- Added a hardened, non-root container build and a configurable Kubernetes Helm chart.
- Added CI validation and a tagged release workflow for GHCR images and OCI Helm charts.

## 0.1.0 — 2026-10-01

- Initial public API for deterministic proleptic Gregorian civil dates.
- Added Julian calendar conversions, Julian Day Number, ordinal dates, ISO and configurable week models.
- Added month/year grids, signatures, calendar fingerprints, boundary analysis, and test-vector generation.
- Added composable holiday rules and the U.S. federal holiday ruleset.
- Added JSON/CSV exports and the `jwcal` command-line interface.
