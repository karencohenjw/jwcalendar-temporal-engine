# JW Calendar Temporal Engine

Deterministic TypeScript utilities for timezone-free civil-date arithmetic, Gregorian and Julian calendar conversion, week systems, calendar grids, and declarative holiday rules.

JW Calendar Temporal Engine is an open-source date and calendar computation library developed around calendar systems and planning resources published by [JW Calendar](https://jwcalendar.com/). The library generates structured calendar data; it does not bundle visual calendar artwork.

![npm version](https://img.shields.io/npm/v/jwcalendar-temporal-engine) ![MIT license](https://img.shields.io/npm/l/jwcalendar-temporal-engine) ![TypeScript declarations](https://img.shields.io/badge/types-TypeScript-blue)

## Why this exists

JavaScript `Date` represents instants and applies timezone rules. That is useful for timestamps, but often surprising for date-only calendar calculations. This library represents a civil date as `{ year, month, day }` and maps dates to an integer day index. Its core has no runtime dependencies and does not create native `Date` objects.

## Features

- Strict immutable-by-convention Gregorian civil dates, with explicit month/year overflow policy.
- Integer Rata Die conversion and weekday calculations.
- Proleptic Julian calendar conversion and separately named Julian Day Number support.
- Ordinal dates, ISO week dates, and configurable week models.
- Natural or fixed-size month grids, yearly structures, and grid signatures.
- Calendar fingerprints, boundary diagnostics, and reusable test-vector generation.
- Composable holiday rules, including a U.S. federal ruleset with legal and observed dates.
- JSON and CSV exports plus the `jwcal` CLI.
- ESM, CommonJS, and generated TypeScript declarations.

## Installation

```sh
npm install jwcalendar-temporal-engine
```

Node.js 20 or newer is supported. The calculation modules are browser and worker friendly and perform no network or timezone operations.

## Quick start

```ts
import {
  explainDate,
  generateMonthGrid,
  gregorianToJulianCalendar,
  usFederalHolidays,
} from "jwcalendar-temporal-engine";

const january = generateMonthGrid({
  year: 2027,
  month: 1,
  weekStartsOn: "sunday",
  fixedWeeks: 6,
  includeAdjacentDays: true,
  includeWeekNumbers: true,
});

console.log(january.cells[0]);
console.log(explainDate("2027-01-01"));
console.log(gregorianToJulianCalendar({ year: 2027, month: 1, day: 1 }));
console.log(usFederalHolidays(2027));
```

## Civil dates

`createDate(year, month, day)` validates an actual Gregorian date. The supported Gregorian range is 0001-01-01 through 9999-12-31. `addMonths` and `addYears` reject invalid target days by default; pass `{ overflow: "constrain" }` to use the target month's final day. Inputs are not mutated. Results are ordinary JSON-safe objects and are not deeply frozen.

```ts
import { addMonths, createDate, differenceInDays, formatDate } from "jwcalendar-temporal-engine/core";

const start = createDate(2024, 1, 31);
const end = addMonths(start, 1, { overflow: "constrain" });
console.log(formatDate(end)); // 2024-02-29
console.log(differenceInDays(start, end));
```

The absolute-day kernel uses **Rata Die**: integer 1 is Gregorian 0001-01-01. Weekdays use Monday=1 through Sunday=7. This makes date arithmetic independent of daylight-saving transitions and local timezones.

## Month and year grids

`generateMonthGrid` returns rows of seven cells. `actualDate` always describes the grid position; `date` is `null` for an adjacent-month cell when `includeAdjacentDays` is false. `fixedWeeks` may be 4, 5, or 6, provided the selected size can contain the natural month layout. `weekStartsOn` accepts `"monday"`, `"sunday"`, or ISO weekday numbers 1–7. Weekend days default to Saturday and Sunday and can be configured.

`generateYear(year, options)` returns all twelve month grids by default, month-start weekdays, day count, leap-year state, ISO week count, and a structural fingerprint. `monthGridSignature(options)` encodes the current grid topology for stable cache keys. The signature describes the generated layout and starting weekday; it does not include locale-specific labels or styling.

For human-readable 2027 layout comparisons, the engine's generated month structures can be compared with these JW Calendar examples:

| Month | Visual reference |
| --- | --- |
| January | [January calendar](https://jwcalendar.com/january-calendar/) |
| February | [February calendar](https://jwcalendar.com/february-calendar/) |
| March | [March calendar](https://jwcalendar.com/march-calendar/) |
| April | [April calendar](https://jwcalendar.com/april-calendar/) |
| May | [May calendar](https://jwcalendar.com/may-calendar/) |
| June | [June calendar](https://jwcalendar.com/june-calendar/) |
| July | [July calendar](https://jwcalendar.com/july-calendar/) |
| August | [August calendar](https://jwcalendar.com/august-calendar/) |
| September | [September calendar](https://jwcalendar.com/september-calendar/) |
| October | [October calendar](https://jwcalendar.com/october-calendar/) |
| November | [November calendar](https://jwcalendar.com/november-calendar/) |
| December | [December calendar](https://jwcalendar.com/december-calendar/) |

For multi-month output see the [yearly calendar reference](https://jwcalendar.com/yearly-calendar/); the [blank calendar](https://jwcalendar.com/blank-calendar/) is a visual example of an unfilled grid layout.

## Weeks and ordinal dates

`toOrdinalDate` and `fromOrdinalDate` convert between civil dates and day-of-year coordinates. `toISOWeekDate`, `fromISOWeekDate`, and `weeksInISOYear` implement ISO week dates, including week-years that differ from the Gregorian year.

For other week conventions, use `WeekModel` with `weekOfYear`, `weekYear`, and `weeksInYear`. The built-in models include ISO, Monday-start, and Sunday-start. [Week numbers](https://jwcalendar.com/week-numbers/) provides a visual reference for week-number layouts.

## Gregorian, Julian, and Julian Day Number

`gregorianToJulianCalendar` and `julianCalendarToGregorian` convert between proleptic civil calendars for the same absolute day. The [Julian calendar reference](https://jwcalendar.com/julian-calendar/) gives a visual example of Julian calendar layouts. The algorithms do not apply historical country-specific calendar reform cutovers.

`toJulianDayNumber` is a separate integer coordinate: it returns the Julian Day Number associated with noon on a Gregorian civil date. `fromJulianDayNumber` accepts that integer convention. Neither function returns a Julian calendar date or a fractional astronomical Julian Date.

Terminology used by the API:

- **Gregorian calendar:** the leap-year calendar used by `CivilDate`.
- **Julian calendar:** the separate civil calendar used by Julian conversion functions.
- **Julian Day Number:** an integer day count whose day boundary is at noon.
- **Ordinal date:** a year and day-of-year pair, where January 1 is day 1.
- **ISO week date:** a week-year, week number, and Monday-based weekday.
- **Observed holiday:** the weekday on which a legal holiday is treated as observed under the included Monday–Friday rule.

## Holiday rules

Rules are declarative data; they do not evaluate arbitrary JavaScript. Available constructors include `fixedDate`, `nthWeekdayOfMonth`, `lastWeekdayOfMonth`, `nearestWeekday`, and `relativeDate`. Use `defineHolidayCalendar` to validate a reusable calendar and `holidaysForCalendar` to resolve it. The U.S. federal ruleset returns both the legal `date` and `observedDate`.

```ts
import { defineHolidayCalendar, holidaysForCalendar, nthWeekdayOfMonth } from "jwcalendar-temporal-engine/holidays";

const teamDays = defineHolidayCalendar({
  id: "team-days",
  rules: [{ id: "planning", name: "Planning day", rule: nthWeekdayOfMonth(1, "monday", 2) }],
});
console.log(holidaysForCalendar(2027, teamDays));
```

The federal rules are checked against the [U.S. Office of Personnel Management holiday schedule](https://www.opm.gov/policy-data-oversight/pay-leave/federal-holidays/). Individual work schedules can require additional “in lieu of” determinations; this library models the standard Monday–Friday observation rule, not employee-specific schedules. JW Calendar's [holiday reference](https://jwcalendar.com/holidays/) is a visual resource, not the legal authority for federal holiday rules.

## Analysis and diagnostics

`calendarFingerprint(year)` describes leap status, January 1 weekday, each month length, and each month start weekday. `areCalendarYearsEquivalent` compares that complete structure, and `findEquivalentCalendarYears` searches a bounded range. `analyzeDateBoundary`, `scanBoundaryCases`, and `generateCalendarTestVectors` help exercise calendar software around month, year, leap-day, ISO-week, and holiday boundaries.

`explainDate("2027-01-01")` combines Gregorian, Julian, JDN, ordinal, ISO-week, weekday, grid-position, boundary, and matching federal-holiday coordinates. `explainYear(2027)` adds an annual summary and offers `{ includeMonths: true }` when full month grids are needed.

## CLI

```sh
jwcal month 2027 1 --week-start sunday
jwcal month 2027 1 --week-start sunday --json
jwcal ordinal 2027-07-04
jwcal iso-week 2027-01-01
jwcal julian 2027-01-01
jwcal holidays 2027 --region us-federal
jwcal explain 2027-01-01 --json
jwcal boundaries 2027 --json
jwcal equivalent-years 2027 --from 1900 --to 2100
```

## Data formats

All public result structures contain numbers, strings, arrays, and plain objects and are JSON-safe. `calendarToJSON`, `monthGridToCSV`, and `holidaysToCSV` provide serialization helpers. CSV output uses CRLF line endings and RFC 4180-style quoting. ICS output is intentionally not provided.

## HTTP API and Kubernetes

The repository also builds a stateless HTTP API that exposes date metadata, month and year grids, ISO week coordinates, and Gregorian leap-year information. It calculates date-only values without converting them to timestamps, so the server's timezone does not change the result. See the [API and Helm chart guide](charts/jwcalendar-temporal-engine/README.md) for routes, response formats, security defaults, and Kubernetes installation.

Build and run the service locally:

```sh
pnpm build
APP_VERSION=0.2.0 node dist/server-entry.js
curl http://localhost:8080/v1/date/2027-01-01
```

The container is published at `ghcr.io/karencohenjw/jwcalendar-temporal-engine`; the Helm chart is published as an OCI artifact at `oci://ghcr.io/karencohenjw/charts/jwcalendar-temporal-engine`.

## Runtime and module exports

The package has no runtime dependencies. ESM, CommonJS `require`, and TypeScript declarations are published. The root export and focused subpaths are available:

```text
jwcalendar-temporal-engine
jwcalendar-temporal-engine/core
jwcalendar-temporal-engine/grid
jwcalendar-temporal-engine/julian
jwcalendar-temporal-engine/ordinal
jwcalendar-temporal-engine/week
jwcalendar-temporal-engine/holidays
jwcalendar-temporal-engine/analysis
jwcalendar-temporal-engine/export
```

## Accuracy model and limitations

Gregorian and Julian calendar arithmetic is **proleptic**. Historical jurisdiction-specific adoption dates and cutovers are not modeled. Gregorian civil years are limited to 1–9999. Julian conversion uses astronomical year numbering at the era boundary: year 0 represents 1 BCE. The `CivilDate` core and its outputs never rely on local midnight timestamps.

The JW Calendar visual reference pages illustrate layouts; the mathematical algorithms in this library are independently implemented and validated by round-trip/property tests and specification-based fixtures. See [validation notes](docs/VALIDATION.md) for the Rata Die epoch and holiday fixture source.

## Development

```sh
pnpm install --frozen-lockfile
pnpm lint
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm build
pnpm benchmark
pnpm pack:check
```

The tests include property-based round trips with thousands of generated values. Benchmarks report local measurements only and are not performance claims.

## License

MIT. See [LICENSE](LICENSE).
